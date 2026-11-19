# Measurements and regression results — 18 November 2026

## Before / after

| Measurement | Before | After | Interpretation |
|---|---:|---:|---|
| Condition-report detail, Next First Load JS | 387 kB | 240 kB | Approximately 38% lower initial JS; PDF code now loads on export. |
| Condition-report detail manifest JS, gzip | 388,352 bytes | 240,834 bytes | Sum of gzipped entry chunks; not a browser transfer measurement. |
| Dashboard First Load JS | 234 kB | 234 kB | Essentially unchanged. |
| Properties First Load JS | 569 kB | 569 kB | Still heavy; AG Grid/module and list architecture work remains. |
| Money First Load JS | 561 kB | 561 kB | Essentially unchanged. |
| Grid state writes per synthetic 300-event drag | 300 | 1 | Executes real Zustand store and new event guard. |
| Grid synthetic median handler time, 50 runs | 1.821 ms | 0.0521 ms | CPU-only Node benchmark; excludes storage, React, layout, and paint. |
| Grid synthetic p95 handler time | 5.8314 ms | 0.0970 ms | Local benchmark, not an INP measurement. |
| Dashboard upcoming-lease query bound | Unbounded application query with full nested lease/tenant projection | At most 6 relevant leases, five lease fields | Live sample had no upcoming leases; this is a query contract, not a scale benchmark. |
| Checklist property retrieval | Every active owned property, two fields | At most one property, one field | Existence semantics retained using child-table joins. |
| Unused checklist units read | 1 query | 0 | No UI task consumed the result. |
| Lease-query failure path | Up to 2 queries, second unscoped | 1 query, propagated error | Correct alias fixes the normal workspace filter; failure does not broaden scope. |

Build compilation time is noisy and is not an application latency metric. The before build compiled in 22.6 seconds and the final build in 29.7 seconds. Full build outputs are retained alongside the JSON manifests; there is no claimed build-speed improvement.

## Read-only live payload sample

`payload-benchmark.json` contains three alternating before/after samples from one existing owner/workspace using the server credential. No record contents or identifiers are retained. These queries bypass RLS and are not ordinary-user authorization tests.

| Query | Before rows / decoded JSON bytes | After rows / decoded JSON bytes | Median HTTP elapsed before / after |
|---|---:|---:|---:|
| Dashboard leases | 1 / 1,060 | 0 / 2 | 754 / 275 ms |
| Checklist properties | 2 / 204 | 1 / 47 | 703 / 266 ms |

The existing lease was irrelevant to the upcoming window. This validates that it need not be transferred, but does not validate performance at thousands of records. The sample is tiny, uncontrolled for infrastructure load, and includes TLS/network/service overhead. Do not extrapolate a percentage latency improvement from it. The lease baseline uses the corrected workspace relation alias so that both payload probes succeed under the same scope.

Separate anonymous zero-row REST probes took 1,762 / 981 / 766 ms. Direct PostgreSQL access failed with `ENOTFOUND`; no query-plan comparison is available.

## Test coverage and results

- Baseline `npm run build`: passed.
- Baseline `npm run test:safe`: typecheck passed; **409 unit tests passed** in 14.9 seconds.
- Optimized `npm run test:safe`: typecheck passed; **415 unit tests passed** in 14.9 seconds. The additional six tests exercise actual query code with stubbed I/O, request-cache fallback behavior, and grid state persistence.
- Final optimized production build: **passed**, including all server-action cache changes. Output is recorded in `build-after.log`.
- `npm run lint`: baseline commit contains **38 errors and 94 warnings**, confirmed by linting original `HEAD` source with the same ESLint configuration. New CLI files initially triggered the CommonJS import rule; they now have narrowly documented Node-CLI exemptions. Remaining lint failures are pre-existing, including two unescaped-quote errors in the condition-report editor. Lint is not green.
- No connected write/delete E2E tests were executed, per the user's read-only constraint and absence of verified test accounts.
- No authenticated browser LCP, INP, CLS, navigation, React Profiler, or Lighthouse measurements were obtained. No claimed passing targets for those metrics.

The unit suite covers domain calculations, authorization helpers, in-memory CRUD journeys, invoice rendering, documents, BAS, scheduling, cache behavior, and routing. Many existing tests are pure/mocked or source assertions: **passing them does not prove live CRUD, RLS, uploads, responsive layout, or multi-user isolation works**. The repository's Windows testing guidance directs interactive UI checks to the developer's regular browser; no browser automation agent was launched.

During implementation, typechecking caught event callback typing and incomplete generated Supabase relationship types. Both were corrected. One VM-based test initially failed because its rejected promise crossed realms; the assertion now inspects the rejection message directly. These intermediate failures are not unresolved application errors.

## Reproduction

```powershell
npm run test:safe
npm run lint
npm run build
node scripts/performance/bundle-snapshot.cjs after
node scripts/performance/grid-benchmark.cjs
node scripts/performance/database-audit.cjs
node scripts/performance/payload-benchmark.cjs
```

The DB audit uses `PERFORMANCE_DATABASE_URL`, falling back to the existing `NEW_DB_URL`; configure it privately. The payload probe uses existing server environment credentials and only GET requests. Neither tool applies migrations. `bundle-snapshot.cjs before` should be run on a baseline build before rebuilding; rerunning it on the optimized build would overwrite the baseline.

See [the audit](PERFORMANCE_AUDIT_2026-11-18.md) for changed files, database findings, remaining scale/security risks, and release gates. The full optimization program remains incomplete until those gates are resolved.
