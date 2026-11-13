# PropertyLedge — Remaining Issues & Future Architectural Recommendations

## 1. Physical Infrastructure Constraints

### 1.1 Geographic Network Latency (Australia / Sydney AWS Region)
* **Current Setup**:
  The Supabase PostgreSQL database and connection pooler are hosted in AWS Sydney (`ap-southeast-2`).
* **Observed Reality**:
  A single network roundtrip from local development machines or overseas servers to `aws-0-ap-southeast-2.pooler.supabase.com` incurs **240ms–280ms** of physical TLS transport latency, regardless of how fast PostgreSQL executes the query (< 1ms).
* **Mitigation Already Applied**:
  - Parallelized all layout queries into a single concurrent `Promise.all` flight.
  - Implemented in-memory `serverCache` with workspace and user invalidation tags.
  - Added route prefetching (`prefetch={true}`) so network flights occur in the background before the user clicks.
* **Long-Term Recommendation**:
  Deploy Vercel serverless functions in the `syd1` (Sydney) region rather than `iad1` (US East) or automatic default, ensuring compute and database reside in the exact same physical datacenter. This will reduce roundtrip latency from 250ms to **under 5ms**.

---

## 2. Unresolved Areas & Opportunities for Future Enhancement

### 2.1 AG Grid Vendor Bundle Size
* **Observation**:
  `ag-grid-community` contributes ~350 kB of minified JavaScript to pages that render data tables (`/dashboard/invoices`, `/dashboard/expenses`, `/dashboard/properties`, `/dashboard/tenants`).
* **Current Mitigation**:
  `DataGrid` dynamically imports `AgGridReact` with `ssr: false` to keep the initial server HTML payload lean (103 kB shared initial load).
* **Future Opportunity**:
  Evaluate tree-shaking specific AG Grid community modules (`@ag-grid-community/core`, `@ag-grid-community/client-side-row-model`) instead of importing the complete community bundle.

### 2.2 Next.js Static Page Revalidation on Marketing Routes
* **Observation**:
  Public marketing landing pages (`/`, `/solutions/owners`) currently take 2.5s–3s to compile on cold starts.
* **Future Opportunity**:
  Enable Incremental Static Regeneration (ISR) with `export const revalidate = 3600` on public marketing pages so that landing pages are served directly from Vercel Edge Cache with sub-50ms TTFB.

### 2.3 Read Replicas for Heavy Analytical Financial Reporting
* **Observation**:
  Consolidated Accountant Reports and BAS tax calculation exports scan transactions and generate multi-page PDF documents.
* **Future Opportunity**:
  If the application scales to tens of thousands of active tenants and millions of transactions, route analytical and tax export queries to a dedicated Supabase Read Replica to keep the primary transactional instance free from compute spikes.

---

## 3. Maintenance & Operational Guidelines

1. **New Schema Tables**: Always create foreign key indexes on `workspace_id`, `property_id`, `tenant_id`, and `created_by` in the migration that defines the table.
2. **New RLS Policies**: Never write bare `auth.uid() = user_id`. Always write `user_id = (SELECT auth.uid())` to enable PostgreSQL `InitPlan` single-execution caching.
3. **New Entity Queries**: Always enforce pagination limits (`limit(25)` or `limit(50)`) and select only the required scalar columns rather than `select('*')`.
4. **Cache Invalidation**: Whenever authoring a new Server Action or mutation, invoke `serverCache.invalidateWorkspace(workspaceId)` to ensure dashboard and entity lists remain synchronized.
