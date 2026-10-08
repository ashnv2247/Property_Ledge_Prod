# PropertyLedge — Performance Baseline Report
Generated: 2026-10-09
Build: Production (`next build` 15.5.24, React 19)

## 1. Build & Bundle Baseline
- **Build Compilation Time**: 85.0s
- **Shared First Load JS**: 103 kB (chunks/8322 + chunks/e6154bf1)
- **Middleware Size**: 94 kB

### Route JavaScript Bundle Sizes
| Route | Page Size | First Load JS | Classification |
|---|---|---|---|
| `/` (Landing) | 88.8 kB | 390 kB | Heavy Marketing Bundle |
| `/login` | 3.65 kB | 183 kB | Normal Auth |
| `/dashboard` | 12.4 kB | 336 kB | High Client State Footprint |
| `/dashboard/properties` | 14.0 kB | 543 kB | Critical (AG Grid + Wizards) |
| `/dashboard/properties/[id]` | 13.9 kB | 555 kB | High |
| `/dashboard/leases` | 18.5 kB | 533 kB | Critical (AG Grid + Wizards) |
| `/dashboard/people` | 162 B | 536 kB | Critical (AG Grid) |
| `/dashboard/money` | 17.0 kB | 596 kB | Critical (AG Grid + Ledger) |
| `/dashboard/expenses` | 15.8 kB | 691 kB | Extremely Heavy (AG Grid + Recharts) |
| `/dashboard/invoices` | 13.1 kB | 532 kB | High |
| `/dashboard/schedules` | 17.6 kB | 554 kB | High |
| `/dashboard/bas` | 13.6 kB | 533 kB | High |
| `/dashboard/reports` | 35.8 kB | 298 kB | High Page Logic |
| `/dashboard/settings` | 4.83 kB | 216 kB | Normal |
| `/dashboard/team` | 10.1 kB | 542 kB | High (AG Grid) |
| `/admin` | 143 B | 209 kB | Normal |
| `/tenant` | 144 B | 209 kB | Normal |

## 2. Request & Lifecycle Baseline
- **Duplicate Initial Data Fetches**: 
  - `/dashboard/properties`: 1 server RSC fetch + 1 client Server Action fetch immediately on mount (`fetchDashboardProperties`)
  - `/dashboard/leases`: 1 server RSC fetch + 1 client Server Action fetch (`fetchAllWorkspaceLeases` + `fetchDashboardProperties`)
  - `/dashboard/people`: 1 server RSC fetch + 1 client Server Action fetch (`fetchAllWorkspaceTenants` + `fetchDashboardProperties`)
  - `/dashboard/money`: 1 server RSC fetch + 1 client Server Action fetch (`fetchFinancialPageDataAction`)
- **Edge Middleware Network Latency**: 90ms–180ms remote HTTPS RTT to Supabase `/auth/v1/user` + up to 6 database queries on direct protected hits.
- **RSC Layout Sequential Gating**: `getActiveWorkspaceId` (cookie) + `getCurrentUser` (remote auth) $\to$ 6 parallel database queries in `app/(app)/layout.tsx`.
- **Zustand Hydration Storm**: `AppContextProvider` calls `hydrate()` on every layout render due to recreated array references.
- **Database RLS Function Cost**: `can_access_property` evaluates un-cached `auth.uid()` for each row scanned without `(SELECT auth.uid())` initPlan optimization.
