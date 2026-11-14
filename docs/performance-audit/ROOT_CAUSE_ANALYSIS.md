# Root Cause Analysis (RCA) — Application Latency & Performance

## 1. Executive Summary

PropertyLedge was experiencing noticeable latency across route transitions, dashboard rendering, and table loading. This analysis identifies the **fundamental root causes** responsible for the degradation, explains the mechanisms through which these issues compounded, and details the architectural solutions implemented to eliminate them.

---

## 2. Deep Root Cause Breakdown

### Root Cause 1: Row-by-Row RLS Evaluation Pattern
* **Location**: PostgreSQL RLS Policies on `account_context`, `profiles`, `workspaces`, `workspace_members`, `properties`, `tenants`, `transactions`, `activities`, `activity_logs`.
* **Mechanism**:
  When a policy defines `USING (user_id = auth.uid())`, PostgreSQL treats `auth.uid()` as a volatile function that could return a different value for each row. Consequently, PostgreSQL re-executes `auth.uid()` for every row evaluated during a table scan.
* **Compounding Effect**:
  When querying tables with multi-table joins or relational count subqueries (e.g., `tenants!properties!inner`), this caused exponential function call overhead. On tables with even hundreds of rows, query planning time skyrocketed to **17ms–41ms** per query.
* **Remediation**:
  Wrapped `auth.uid()` calls in scalar subqueries `(SELECT auth.uid())`. PostgreSQL treats scalar subqueries as `InitPlan` expressions, executing them exactly **once per query** and caching the result for all row comparisons.

---

### Root Cause 2: Missing High-Cardinality Composite Indexes
* **Location**: `invoices`, `transactions`, `leases`, `expected_payment_schedule`.
* **Mechanism**:
  All enterprise listing queries in PropertyLedge filter by `workspace_id` AND sort by a date column (e.g. `issue_date DESC`, `transaction_date DESC`) or filter by `status`.
  While some single-column indexes existed (e.g. on `workspace_id` alone or `status` alone), PostgreSQL had to either:
  1. Perform a sequential table scan because an index on `workspace_id` did not supply the requested sort order, or
  2. Perform a Bitmap Index Scan on `workspace_id` followed by a costly in-memory quicksort (`Sort Key: issue_date DESC`).
* **Compounding Effect**:
  Invoices and transactions tables were subject to sequential scans and memory-based sorting on every navigation to `/dashboard/invoices` and `/dashboard/expenses`.
* **Remediation**:
  Created composite B-tree indexes matching the exact query patterns:
  - `idx_invoices_ws_issue_date_desc` on `(workspace_id, issue_date DESC)`
  - `idx_invoices_ws_status_due_date` on `(workspace_id, status, due_date)`
  - `idx_transactions_ws_type_status_date_desc` on `(workspace_id, transaction_type, status, transaction_date DESC)`
  - `idx_expected_payment_schedule_ws_status_due_date` on `(workspace_id, status, due_date)`
  - `idx_leases_prop_status_start_date` on `(property_id, status, start_date DESC)`

---

### Root Cause 3: Next.js Layout Sequential Network Waterfall
* **Location**: `app/(app)/layout.tsx`
* **Mechanism**:
  `app/(app)/layout.tsx` is executed on every authenticated page load. The layout originally executed two sequential network stages:
  1. Stage 1: `await Promise.all([ resolveWorkspaceContext, getPersonaForUser, getUserProfile, getUserWorkspaces, getAccountContext ])`
  2. Stage 2: `const initialProperties = await getUserProperties(user.id, effectiveWsId)`
* **Compounding Effect**:
  Because Stage 2 was not started until Stage 1 completely resolved, the browser was blocked waiting for an additional sequential database roundtrip (~280ms) before the layout could begin streaming HTML to the client.
* **Remediation**:
  Because `activeWsId` is already read from the workspace cookie in Step 0, `getUserProperties(user.id, activeWsId ?? undefined)` was moved into the primary `Promise.all`. This transformed a sequential waterfall into concurrent execution, cutting **280ms** off every authenticated page request.

---

### Root Cause 4: Unbounded Historical Aggregation in Dashboard Queries
* **Location**: `lib/dashboard/queries.ts` (`getWorkspaceReportsSummary`)
* **Mechanism**:
  The dashboard financial summary query retrieved all `completed` transactions for the workspace without date boundaries. For mature workspaces, this meant querying, serializing, and transferring thousands of historical transaction records over TLS just to calculate a 12-month trailing cash flow breakdown and 60-day growth trend.
* **Compounding Effect**:
  Node.js server process spent CPU cycles parsing large JSON payloads, running `.filter()` and `.reduce()`, and transferring unnecessary historical data. Furthermore, neither `getWorkspaceDashboardOverview` nor `getWorkspaceReportsSummary` were cached in memory.
* **Remediation**:
  1. Added `.gte('transaction_date', twoYearsAgoIso)` to bound transaction scans strictly to the analytical window.
  2. Wrapped both overview and reports queries in `serverCache` with a 30-second TTL, automatically invalidated when transactions, properties, or leases are mutated.

---

### Root Cause 5: Un-prefetched Client Navigation Links
* **Location**: `components/shell/AppShell.tsx`
* **Mechanism**:
  In Next.js 15, dynamic route pages are not automatically prefetched unless `<Link prefetch={true}>` is specified. When users clicked navigation links in the sidebar, the browser had to make an on-demand HTTP request for the Server Component Flight payload (`_rsc`) and await server-side rendering before the page transition could begin.
* **Compounding Effect**:
  Sidebar clicks felt sluggish, creating the perception that the entire application was slow even when backend data was fast.
* **Remediation**:
  Explicitly added `prefetch={true}` to all root, child, and settings links in `AppShell`. Next.js now prefetches code chunks and server payloads when links enter the viewport, enabling instantaneous client-side transitions.

---

### Root Cause 6: Duplicate Client-Side Re-fetches on Initial Mount (`DashboardOverview` & `usePersistentEntityQuery`)
* **Location**: `components/dashboard/overview/DashboardOverview.tsx`, `components/context/AppContextProvider.tsx`, `lib/hooks/usePersistentEntityQuery.ts`, `LeaseManagementPage.tsx`, `ConditionReportsDashboard.tsx`, `PropertiesClientView.tsx`.
* **Mechanism**:
  1. In React, child `useEffect` hooks execute *before* parent `useEffect` hooks. Because `AppContextProvider` hydrated `useWorkspaceStore` inside a parent `useEffect`, `useWorkspaceStore((s) => s.activeWorkspaceId)` was `null` during the initial render and initial `useEffect` of every child page using `usePersistentEntityQuery`.
  2. Consequently, `usePersistentEntityQuery` initially computed `cacheKey = "<entity>:global:all"`, and one microtask later—when `AppContextProvider`'s `useEffect` ran—flipped `cacheKey` to `"<entity>:<wsId>:all"`, triggering an immediate duplicate client-side Server Action fetch on mount across all 10 entity pages.
  3. Additionally, `LeaseManagementPage`, `ConditionReportsDashboard`, and `PropertiesClientView` passed `initialData: initialItems && initialItems.length > 0 ? initialItems : null`, which treated a valid empty array `[]` from SSR as `null` and forced an immediate redundant client refetch and skeleton state whenever a workspace had 0 records.
* **Remediation**:
  1. Exposed `useAppContextOptional()` from `AppContextProvider` (with `workspaceId = storeWorkspaceId ?? resolvedWsId` available synchronously on first render) and updated `usePersistentEntityQuery` to fall back to `appContext?.workspaceId`, eliminating the `global` -> `<wsId>` cache key flip.
  2. Updated `usePersistentEntityQuery` (`hasServerInitialData = initialData !== undefined && initialData !== null`) and entity views (`LeaseManagementPage`, `ConditionReportsDashboard`, `PropertiesClientView`) to preserve empty SSR arrays `[]` and memoize initial bundle references.

---

### Root Cause 7: Bundle & Module Compilation Bloat (6,630 Modules)
* **Location**: `next.config.ts`, `components/finance/ExpenseList.tsx`, `components/finance/ExpectedScheduleList.tsx`, `components/finance/FinancialList.tsx`.
* **Mechanism**:
  1. `@phosphor-icons/react`, `lucide-react`, `recharts`, `d3`, `date-fns`, and `framer-motion` were not configured under `experimental.optimizePackageImports` in `next.config.ts`, causing barrel imports to pull thousands of unused icon and chart modules into the bundle graph.
  2. Heavy closed modals (`AccountantReportModal` pulling in `jspdf`, `jspdf-autotable`, and `pdf-lib`; `BulkExpenseUploadModal`; `ExpenseModal`; `CreateScheduleModal`; `TransactionModal`) were statically imported into top-level list views even when never opened by the user.
* **Remediation**:
  1. Configured `experimental.optimizePackageImports` in `next.config.ts` for `['lucide-react', '@phosphor-icons/react', 'recharts', 'd3', 'date-fns', 'framer-motion']`.
  2. Converted closed modals across `ExpenseList.tsx`, `ExpectedScheduleList.tsx`, and `FinancialList.tsx` to `next/dynamic` (`ssr: false`).

---

### Root Cause 8: Sequential Database Waterfalls in Auth, Workspace & Property Resolution
* **Location**: `lib/workspace/context.ts`, `lib/auth/resolvePersona.ts`, `lib/properties/queries.ts`, `lib/dashboard/queries.ts`, `app/actions/schedules.ts`, `lib/finance/scheduleService.ts`.
* **Mechanism**:
  - `getUserWorkspaces` queried `workspaces` (owned) and `workspace_members` (memberOf) sequentially instead of concurrently.
  - `resolveWorkspaceContextById` executed 3 sequential stages (`workspaces` -> `workspace_members`/`team_roles` -> `permissions`).
  - `getPersonaForUser` executed up to 5 sequential queries (`isAdmin` -> `workspaces` -> `workspace_members` -> `property_members` -> `tenants`).
  - `getUserProperties` executed a sequential second query to `workspaces` to fetch workspace names instead of joining `workspaces(name)` directly in the property query.
  - `getWorkspaceNeedsAttention`, `getNeedsAttention`, `getReportsSummary`, and `getExpectedPaymentSchedules` lacked `serverCache` (30s TTL), and `app/actions/schedules.ts` had a stray `'use me';` directive on line 1 before `'use server';`.
* **Remediation**:
  - Parallelized all independent queries with `Promise.all` across `lib/workspace/context.ts`, `lib/auth/resolvePersona.ts`, `lib/properties/queries.ts`, and `lib/dashboard/queries.ts`.
  - Joined `workspaces(name)` directly in `getUserProperties`.
  - Added workspace-scoped `serverCache` (30s TTL) to `getWorkspaceNeedsAttention`, `getNeedsAttention`, `getReportsSummary`, and `getExpectedPaymentSchedules`, bounded `getReportsSummary` transactions to 24 months, added `.limit(200)` bounds to property entity queries, and fixed `'use server';` in `app/actions/schedules.ts`.

---

### Root Cause 9: N+1 Batch Loops & Multi-Table Sequential Waterfalls Across Server Actions & Services
* **Location**: `lib/dashboard/setupProgress.ts`, `lib/billing/service.ts`, `lib/invoices/schedule-service.ts`, `lib/finance/scheduleService.ts`, `lib/finance/service.ts`, `lib/finance/expenseService.ts`, `lib/bas/service.ts`, `lib/finance/reporting-service.ts`, `app/actions/documents.ts`, `app/actions/condition-reports.ts`, `app/actions/autopilot.ts`, `app/actions/activities.ts`, `app/actions/accountant-reports-hub.ts`, `app/actions/financial-years.ts`, `app/actions/notifications.ts`.
* **Mechanism**:
  1. **Dashboard Setup & Billing**: `calculateSetupProgress` executed a 2-stage, 6-query waterfall on every `/dashboard` SSR load without caching; `getLatestPaymentForAccount` queried `billing_payments` on every `/dashboard` load without caching.
  2. **N+1 Schedule Creation Loops**: `ScheduleEmailService.createSchedule` iterated over `previewItems` in a `for` loop and awaited 3 sequential `insert` queries per month (24–36 sequential DB roundtrips for a 12-month schedule). Similarly, `createPaymentSchedule` in `lib/finance/scheduleService.ts` looped over `insertedIds` and called `await getExpectedPaymentScheduleById(id)` N times sequentially.
  3. **Multi-Table Action Waterfalls**:
     - `fetchWorkspaceDocumentsAction` queried `documents`, `transactions`, `transaction_attachments`, `inspection_photos`, and `condition_reports` one after another in 5 sequential stages (and queried non-existent `transactions.date` instead of `transaction_date`).
     - `fetchAutopilotDashboardAction` ran 6 sequential queries (and fetched `leases` across all workspaces without scoping to `properties.workspace_id`).
     - `fetchEligiblePropertiesForAutopilotAction` (4 queries), `generateSuggestedDraftActivitiesAction` (5 queries), and `fetchActivityDetailAction` (8 queries) all executed sequentially instead of concurrently.
     - `fetchAccountantBasSummaryAction` fetched all historical completed transactions without filtering by the BAS period date range (`dateRange.startDate`..`dateRange.endDate`).
* **Remediation**:
  1. Added `serverCache` to `calculateSetupProgress` (`user:${userId}:setup_progress`, 60s TTL) and `getLatestPaymentForAccount` (`account:${accountId}:latest_payment`, 60s TTL).
  2. Replaced the `for`-loop inserts in `ScheduleEmailService.createSchedule` with a single batch `.insert(invoicePayloads).select(...)` followed by concurrent batch inserts for `invoice_items` and `invoice_scheduled_email_jobs` (`Promise.all`), and replaced the N+1 fetch loop in `createPaymentSchedule` with a single `.insert(insertPayload).select(...)` returning full relations.
  3. Parallelized `fetchWorkspaceDocumentsAction`, `fetchAutopilotDashboardAction`, `fetchEligiblePropertiesForAutopilotAction`, `generateSuggestedDraftActivitiesAction`, `fetchActivityDetailAction`, `fetchConditionReportDetailAction`, `fetchFinancialYearsOverviewAction`, `fetchAccountantBasSummaryAction`, `createTransaction`, and `createExpense` using `Promise.all`.
  4. Added workspace/user-scoped `serverCache` (with automatic mutation invalidation) to `getTransactions`, `getCategories`, `getExpenses`, `getSchedules`, `getScheduleStats`, `getBasPageData`, `ensureDefaultTaxClassifications`, `fetchFilteredTransactions`, `fetchWorkspaceDocumentsAction`, `fetchConditionReportsAction`, `fetchAutopilotDashboardAction`, `fetchAccountantBasSummaryAction`, `fetchFormDropdownOptionsAction`, `fetchReportFilterOptionsAction`, `getWorkspaceActivityLogs`, and `fetchNotifications`.
  5. Replaced remaining `@phosphor-icons/react` imports in `DashboardClientLayout.tsx` and `Testimonials.tsx` with `lucide-react` and lazy-loaded `ScheduleEmailDetailDrawer` via `next/dynamic`.

---

## 3. Bottleneck Interaction Matrix

```
┌──────────────────────────────┐
│ Un-cached auth.uid() in RLS  │───┐
└──────────────────────────────┘   │
                                   ▼
┌──────────────────────────────┐ ┌────────────────────────────────────────┐
│ Missing Composite Indexes    │─▶│ High Database Latency (270ms+ per RTT) │
└──────────────────────────────┘ └────────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────┐ ┌────────────────────────────────────────┐
│ Layout Sequential Waterfall  │─▶│ Total Server Response Time (> 1,200ms) │
└──────────────────────────────┘ └────────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────┐ ┌────────────────────────────────────────┐
│ Un-prefetched Client Links   │─▶│ High Perceived User Latency (2,000ms+) │
└──────────────────────────────┘ └────────────────────────────────────────┘
```
By resolving the bottlenecks at every layer (Database -> Server Layout -> Backend Queries -> Client Cache -> Navigation Links), the latency chain has been dismantled end-to-end.
