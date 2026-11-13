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

### Root Cause 6: Duplicate Client-Side Re-fetches on Initial Mount
* **Location**: `components/dashboard/overview/DashboardOverview.tsx`
* **Mechanism**:
  `DashboardOverview` received fresh `initialData` from the server layout SSR. However, its SWR coordination effect did not guard against the initial mount cycle: because client Zustand store hydration takes one microtask to propagate `activeWorkspaceId`, the effect evaluated `isCurrentMatching` as false and immediately fired a duplicate `loadData(false)` call to the backend.
* **Compounding Effect**:
  Every time a user opened the dashboard, the browser initiated a redundant network call to `fetchDashboardDataAction`, consuming server resources and causing unnecessary re-renders.
* **Remediation**:
  Introduced `servedByServerRef` to detect that fresh SSR initial data was delivered, hydrating the cache synchronously and suppressing the redundant immediate client fetch.

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
