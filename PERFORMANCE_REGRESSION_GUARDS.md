# PropertyLedge Performance Regression Guards

## Purpose
This document provides engineering rules and a pre-commit / PR checklist to prevent future developers from re-introducing duplicate fetching, middleware database lookups, hydration storms, or unstable AG Grid options.

---

## 1. Non-Negotiable Architecture Rules

### 1.1 Data Fetching & Hydration (P0)
- **Rule**: If a page receives server data via RSC (`initialData`, `initialProperties`, `initialResolved`), the client component **MUST NOT** immediately refetch that data on mount.
- **Pattern**:
  ```typescript
  const hasDataRef = useRef(Boolean(initialData));
  const prevWorkspaceIdRef = useRef(activeWorkspaceId);

  useEffect(() => {
    // Skip mount refetch if server data was provided
    if (hasDataRef.current) {
      if (prevWorkspaceIdRef.current === activeWorkspaceId) {
        return;
      }
    }
    prevWorkspaceIdRef.current = activeWorkspaceId;
    fetchData();
  }, [activeWorkspaceId]);
  ```
- **Guard**: Never add callback functions or object references (e.g., `availableProperties`, `reports`) to data-loading `useEffect` dependency arrays.

### 1.2 Edge Middleware (P0)
- **Rule**: Edge Middleware (`middleware.ts`, `lib/supabase/middleware.ts`) is strictly for route protection and cookie refresh.
- **Forbidden in Middleware**:
  - `supabase.from('profiles').select(...)`
  - `supabase.from('workspaces').select(...)`
  - `supabase.from('account_context').select(...)`
  - `supabase.from('subscriptions').select(...)`
  - Complex onboarding stage resolution
- **Guard**: All database-level user and workspace context resolution must occur inside Next.js Server Components (`AppLayout`) with React `cache()`.

### 1.3 State Management & Zustand Hydration (P0)
- **Rule**: `useWorkspaceStore.hydrate()` must remain 100% idempotent.
- **Guard**: If bootstrap state equals existing state, `hydrate()` must early-return without calling `set()`. Never trigger subscriber re-render cascades with identical data.
- **Subscribers**: Always use narrow selectors:
  ```typescript
  // CORRECT:
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  // FORBIDDEN:
  const state = useWorkspaceStore();
  ```

### 1.4 AG Grid Rendering (P1)
- **Rule**: Never pass object literals directly to `gridOptions={{ ... }}`.
- **Rule**: Never define anonymous inline cell renderers `cellRenderer: params => (...)`.
- **Pattern**:
  ```typescript
  // Memoize options
  const mergedGridOptions = useMemo(() => ({
    ...defaultGridOptions,
    ...customOptions
  }), [customOptions]);

  // Use top-level named cell component
  export const StatusCell = React.memo(function StatusCell(params) { ... });
  ```

### 1.5 Financial & Query Correctness (P1)
- **Rule**: Search and filter operations must execute in PostgreSQL before pagination.
- **Forbidden**: Fetching `limit(100)` and then applying `data.filter(...)` in JavaScript.
- **RLS Guard**: Security helper functions like `owns_property` and `can_access_property` must wrap auth lookups in `(SELECT auth.uid())` for PostgreSQL initPlan optimization.

---

## 2. Pull Request Performance Checklist

Before approving any PR touching routes, data tables, or dashboard views:

- [ ] Does this route trigger any duplicate network requests on mount? (Verify in Network tab)
- [ ] Does Edge Middleware perform any SQL or Supabase database calls? (Must be ZERO)
- [ ] Are initial RSC props used for the first render without flashing a loading spinner?
- [ ] Are Zustand store subscriptions narrowed with selectors?
- [ ] Are AG Grid options memoized with stable references?
- [ ] Are charting libraries dynamically imported using `next/dynamic`?
- [ ] Do search inputs filter at the PostgreSQL level rather than in-memory JS?
- [ ] Does switching properties only update the dependent view rather than remounting the global shell?
