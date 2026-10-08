# PropertyLedge Dependency Usage Audit

## Overview
This document catalogs third-party dependencies identified in the performance audit, recording their import counts, client vs. server usage distribution, bundle footprint impact, and consolidation strategy.

---

## 1. Icon Ecosystems

| Package | Total Imports | Client Imports | Server Imports | Bundle Impact | Replacement Difficulty | Standard Decision |
|---|---|---|---|---|---|---|
| `lucide-react` | **278** | 260 | 18 | Medium (Tree-shaken) | N/A (Standard) | **RETAIN as Primary Icon System** |
| `@phosphor-icons/react` | **2** | 2 | 0 | Medium-High (Duplication) | Low (Used in 2 files) | **CONSOLIDATE to `lucide-react`** |

### Plan:
- `lucide-react` is the canonical icon library used in 278 components across the application.
- `@phosphor-icons/react` is only imported in `DashboardClientLayout.tsx` (navigation icons) and `Testimonials.tsx`.
- Consolidating `@phosphor-icons/react` to `lucide-react` will eliminate a duplicate icon ecosystem and remove ~150 kB of unused icon font/JS chunks.

---

## 2. Animation Ecosystems

| Package | Total Imports | Client Imports | Server Imports | Bundle Impact | Replacement Difficulty | Standard Decision |
|---|---|---|---|---|---|---|
| `framer-motion` | **36** | 34 | 2 | ~45 kB gzipped | Standard in Next.js UI | **RETAIN as Primary Animation System** |
| `motion` | **0** | 0 | 0 | 0 kB active (Dead dep) | Trivial (0 usages) | **REMOVE from package.json** |

### Plan:
- `motion` (v14) has 0 references in the codebase.
- Safely uninstall `motion` to avoid dependency conflicts and shrink `node_modules`.

---

## 3. Visualization & Chart Ecosystems

| Package | Total Imports | Client Imports | Server Imports | Bundle Impact | Replacement Difficulty | Standard Decision |
|---|---|---|---|---|---|---|
| `recharts` | **7** | 5 | 2 | ~110 kB gzipped | High | **RETAIN, LAZY LOADED via `next/dynamic`** |
| `d3` | **1** | 1 | 0 | ~75 kB gzipped | Low | Isolated to `contact-with-globe.tsx` (marketing) |

### Plan:
- Keep `recharts` lazy-loaded on demand (`PortfolioPatternPieChart` and `IncomeExpenseAnalytics`) so initial dashboard/report shell renders without blocking on charting bundles.

---

## 4. Document / PDF Generation Libraries

| Package | Total Imports | Client Imports | Server Imports | Bundle Impact | Recommendation |
|---|---|---|---|---|---|
| `jspdf` | 4 | 0 | 4 | 0 kB client (Server-only) | Verified server-only execution |
| `jspdf-autotable` | 2 | 0 | 2 | 0 kB client (Server-only) | Verified server-only execution |
| `docx` | 1 | 0 | 1 | 0 kB client (Server-only) | Verified server-only execution |
| `pdf-lib` | 5 | 0 | 5 | 0 kB client (Server-only) | Verified server-only execution |

### Findings:
- All PDF/DOCX generation libraries (`jspdf`, `jspdf-autotable`, `docx`, `pdf-lib`) are strictly located in server-side adapters (`lib/pdf/`, `modules/invoices/`, `lib/finance/export-service.ts`).
- Zero document libraries are shipped to browser client bundles. No client bundle bloat is caused by PDF engines.
