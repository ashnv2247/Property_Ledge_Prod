# PropertyLedge performance engineering — 18 November 2026

## Status and evidence boundaries

Implemented and unit-tested the code changes below. This is **not a certification that the full application meets its performance targets**. Large-list pagination, database aggregation, authenticated browser profiling, live RLS regression testing, and production query-plan validation remain outstanding.

The existing October reports are historical, not the baseline for this change. The starting worktree had a staged `pnpm-lock.yaml` change; it was preserved. No dependencies, production records, indexes, policies, or database schema were changed. The user explicitly requested read-only connected-database checks.

Evidence collected:

- A fresh production build before edits; 409 baseline unit tests passed.
- Code inspection of App Router layouts/pages/actions, authentication, Supabase clients and middleware, workspace/property context, dashboard queries, finance/reporting services, invoices/schedules, shared grids, state stores, PDF loading, assets, and existing SQL migrations.
- Before/after production bundle manifests, a reproducible grid-handler benchmark, and regression tests executing the real dashboard query module with its database I/O replaced.
- A read-only PostgreSQL connection attempt failed with `ENOTFOUND`. Therefore no live schema/index inventory or `EXPLAIN ANALYZE` results are claimed. `scripts/performance/database-audit.cjs` records those when a working `PERFORMANCE_DATABASE_URL` is supplied. It uses `BEGIN READ ONLY`, timeouts, and redacts UUIDs in plans; it does not print connection strings or row data. Its connection-role plans are not substitutes for authenticated RLS plans.
- Supabase REST was reachable: three anonymous `GET properties?select=id&limit=0` requests returned HTTP 200 in 1,762 / 981 / 766 ms. These include network/TLS/service overhead from this workstation and are **not authenticated database execution timings**.

## Architecture findings

Next.js 15.5.24 uses App Router, dynamic authenticated layouts, Server Components for page entry points, and client components for interactive views. `createClient` and `getCurrentUser` already use React request memoization. The app layout already runs six independent context/profile/property reads concurrently. Middleware has an RSC fast path; authorization must continue at server actions and RLS boundaries. No authentication checks were removed.

Zustand supplies workspace, entity, widget, and grid state. Entity caches already have freshness tiers and in-flight deduplication. A second process-wide server cache was also retaining private results under workspace/property-only keys. That is an authorization/freshness hazard, not an acceptable shortcut for faster navigation.

AG Grid Community is installed; no Enterprise dependency/license was introduced. Shared grids have bounded-height containers, normal virtualization, stable row IDs, and memoized column/options configuration. Most callers still supply already-loaded arrays to a client-side row model. UI pagination alone does not provide database pagination. `AllCommunityModule` is registered; reducing modules requires an inventory of filtering, selection, export, and grid API usage.

Fonts already use `next/font` with swap. Next image configuration supports WebP/AVIF, and package import optimization is configured. Some inspection/photo views still use raw images; original document/receipt images must remain available for export. Compression and CDN headers were not verified against the deployment.

## Significant issues and disposition

“Impact” below is the expected mechanism unless a measurement is explicitly supplied. No estimated end-user speedups are presented as measurements.

| Priority | Location | Root cause and performance/correctness impact | Change or next action |
|---|---|---|---|
| Critical | `lib/dashboard/queries.ts`; finance, BAS, invoice schedule read caches | Process cache keys omit the authenticated reader. Same-workspace readers can have different property permissions; cache hits bypass the RLS query that produced the result. Independent server instances also cannot reliably invalidate each other's financial caches. | **Implemented:** private result caches now use React request lifetime. Fresh requests re-check underlying data; client freshness behavior remains. This can increase cross-request DB reads and is a necessary security tradeoff, not a latency win. |
| High | `getAllWorkspaceLeases`, `getAllWorkspaceTenants` | Queries name the embedded relation `property` but filtered `properties.workspace_id`. The lease error fallback performed a second query without workspace filtering. | **Implemented:** filter the actual alias; fail closed on lease query errors. Error path now makes one query instead of two. |
| High | `fetchDashboardDataAction` | Dashboard downloaded all leases, all lease columns, property addresses, and nested tenant contacts to show six upcoming items. | **Implemented:** one scoped query selecting five lease fields, active status, next 60 days, deterministic ordering, and `limit(6)`. Only dashboard callers changed; full lease management is preserved. |
| High | `lib/dashboard/setupProgress.ts` | Existence checks downloaded every owned property ID and sent an increasingly large `IN` list to child queries. A units query had no displayed task. | **Implemented:** at most one property ID; tenant/lease existence joins apply owner/active-property filters in the DB; remove unused units read. One fewer query and bounded existence payloads. |
| High | both `DataGrid` and `AdminDataGrid` column event handlers | Every intermediate drag event read all column state, updated Zustand, and synchronously serialized session storage. | **Implemented:** persist only the final drag event; non-drag visibility/pinning still persists. Synthetic 300-event benchmark: 300 writes → 1. |
| Medium | `ConditionReportWizard.tsx` | Static PDF import included jsPDF/report generation in the wizard's dependency graph before any export. | **Implemented:** import PDF generation on download inside existing error/finally handling. First export now pays module-loading cost. No change to PDF contents. |
| Critical | dashboard report summaries and `lib/finance/reporting-service.ts` | Financial aggregates are calculated from row arrays without complete pagination; server response limits can truncate totals. Two years of transaction rows are transferred to calculate chart buckets. | **Outstanding:** implement an RLS-preserving database aggregation RPC and compare totals/plans with >1,000 and >10,000 records. Do not hide truncation with another arbitrary limit. |
| High | property/people/lease/invoice list pages | Full records and nested data are supplied to client grids; pagination/filtering is often applied after fetch. Large portfolios risk large RSC payloads, response truncation, and incomplete search. | **Outstanding:** coordinate server-side search/sort/page contracts with summaries, bulk selection, export, drawers, and cards. A drop-in row-model switch would break current semantics. |
| High | `app/actions/documents.ts` | Five concurrent source queries collect documents, receipts, attachments, photos, and reports without database pagination, then combine/filter the arrays. | **Partially implemented:** private result-cache isolation fixed. Unified server pagination and independently aggregated counts remain outstanding; limiting each source arbitrarily would omit documents. |
| High | `lib/finance/expenseService.ts`, `scheduleService.ts` | Free-text filtering occurs after the limited result has been fetched. Matches outside that page are missing. | **Outstanding:** move relational search and computed-status filtering before pagination, with contract tests for result counts and cross-page selection. |
| High | `lib/hooks/usePersistentEntityQuery.ts` | Initial server data is not tagged with the scope that produced it; hydration is keyed to the current scope. Context changes need stronger stale-response/data ownership checks. | **Outstanding:** add scope-tagged initial data and mounted-hook tests for rapid workspace/property changes; do not claim existing mock-only cache tests cover this. |
| High | `lib/dashboard/service.ts` lease assignment loops | Tenant update and link mutations execute sequentially per tenant. | **Outstanding:** measure normal batch sizes; use transactional/batched writes with existing authorization and rollback semantics. Blind concurrency risks partial updates. |
| High | `lib/dashboard/service.ts` `deleteProperty`; maintenance detail action/query | Current source still contains explicit dependent deletes; maintenance detail uses an admin client after an access-check catch. The pasted historical report does not prove current source is safe. | **Outstanding security review:** no destructive paths were executed. Resolve authorization/deletion policy and regression-test in an isolated environment before release. |
| Medium | `AllCommunityModule` registrations and shared grid modules | Full Community registration broadens client dependency graphs. | **Outstanding:** identify used modules and validate every grid feature before removing registrations. No speculative module removal. |
| Medium | auth/profile/workspace/entitlement process caches | Some user/account caches remain process-local with TTLs; permission revocation and multi-instance invalidation need explicit tests. | **Outstanding:** audit revocation semantics separately. Private financial/list result sharing fixed here; this is not a claim all authorization caching is resolved. |
| Medium | inspection images, global providers, navigation | Raw images and large interactive routes are profiling candidates. Existing server page boundaries, prefetching, dynamic wizards, and request memoization already help. | **Outstanding measurement:** capture authenticated traces before changing UI or blanket-memoizing components. |
| High | infrastructure | Zero-row REST probes exceed the 300 ms simple-operation target from this machine; direct PG host fails DNS. | **Outstanding:** verify active database endpoint, database/Vercel regions, pooler and representative network path. Workstation timings alone cannot select a hosting change. |

## Database report

No indexes added or removed; no RLS policies changed; no migrations applied or proposed without live plan evidence. Existing migrations already include workspace/date/status and FK indexes, including `20260920000000_performance_indexes.sql`, `20260923000000_optimize_rls_and_indexes.sql`, `20261009000000_rls_initplan_and_index_cleanup.sql`, and `20261114010000_performance_optimization_indexes_and_rls.sql`. The last contains overlapping maintenance index definitions with an earlier migration, so adding more by column-name intuition would be especially risky. Checked-in SQL is not proof those definitions are deployed.

Query improvements in this change are projections, bounds, existence joins, corrected relation filters, and removal of an erroneous retry. No query-plan improvement or DB latency reduction is claimed. Database-side financial aggregation and authenticated RLS plans are the next release gates. Any future migration must include rollback SQL and preserve authorization under the invoker's role.

## Cache design and tradeoffs

`lib/cache/request-cache.ts` uses the existing memory-cache implementation inside React's request-scoped `cache` facility. It has no global private-data instance. Outside a supported React server render it intentionally does not retain entries, preferring fresh reads. It does not deduplicate overlapping promises; adding promise-level request memoization is a separate measured change.

Global category reference data retains its existing short TTL. Existing mutation invalidation calls remain for other process-cache consumers. Private reads no longer depend on process-local workspace invalidation propagating across server instances. No new dependency or long-lived cache system was added.

Reference: [React cache lifetime and limitations](https://react.dev/reference/react/cache); [AG Grid event API](https://www.ag-grid.com/javascript-data-grid/grid-events/). Installed AG Grid types and existing handlers were inspected as well.

## Modified-file inventory

| Files | Purpose |
|---|---|
| `app/actions/dashboard.ts`, `lib/dashboard/queries.ts` | Dashboard lease projection, scope corrections, fail-closed lease errors, request-local results. |
| `app/actions/accountant-reports-hub.ts`, `autopilot.ts`, `condition-reports.ts`, `documents.ts`, `finance.ts`, `financial-years.ts`, `reports.ts` | Remove outer process-wide private result caches as well, so they cannot bypass the corrected service-layer lifetime. |
| `lib/dashboard/setupProgress.ts` | Bounded existence queries and unused query removal. |
| `lib/cache/request-cache.ts` | Private result cache lifetime. |
| `lib/finance/service.ts`, `expenseService.ts`, `reporting-service.ts`, `scheduleService.ts` | Financial reads use request-local results. |
| `lib/bas/service.ts`, `lib/invoices/schedule-service.ts` | BAS/schedule result isolation; existing mutation invalidations retained. |
| `components/ui/data-grid/DataGrid.tsx`, `components/admin/data-grid/AdminDataGrid.tsx`, `lib/grid/persistence.ts` | Skip intermediate column drag persistence. |
| `components/dashboard/inspections/ConditionReportWizard.tsx` | On-demand PDF dependency. |
| `tests/unit/performance-query-regressions.spec.ts` | Query boundaries, failure behavior, cache fallback, and grid persistence regressions. |
| `scripts/performance/database-audit.cjs`, `bundle-snapshot.cjs`, `grid-benchmark.cjs`, `payload-benchmark.cjs` | Reproducible read-only audit and local measurement tools. |
| `docs/performance/*` | Measurements, audit, testing, and remaining work. |

## Release gates still open

1. Working read-only PG access for schema inventory and representative `EXPLAIN (ANALYZE, BUFFERS)` under authenticated roles.
2. An isolated test environment with realistic data and multiple roles for CRUD, uploads/downloads, RLS/data isolation, pagination, bulk selection, financial totals, and export tests. Existing E2E credentials are defaults, not verified accounts; the user authorized read-only connected checks.
3. Authenticated production-build Chrome traces/Lighthouse and React profiling. Record LCP, INP, CLS, navigation, HTTP payloads, duplicate requests, and grid interaction under fixed throttling; compare the same data and routes. No browser-vitals success is claimed by this report.
4. Complete database aggregation and list pagination work above, then resolve existing lint debt and the security findings before calling the application production-grade.
