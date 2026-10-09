# 📑 Supabase Database Chunks Guide (Free-Tier Friendly)

These bite-sized SQL files are chunked to run within the request size and execution timeout limits of the **Supabase Web SQL Editor** (including Free Tier accounts).

### 🚀 Execution Order:
Run each file in your Supabase Dashboard (**SQL Editor** → **New query** → Paste & Run) in this sequence:

| Step | File | Contents | Size |
| :--- | :--- | :--- | :--- |
| **1** | [`01_extensions_and_enums.sql`](./01_extensions_and_enums.sql) | Extensions (`uuid-ossp`, `pgcrypto`), custom types & default permissions | 1.4 KB |
| **2** | [`02_tables_and_types.sql`](./02_tables_and_types.sql) | Core table definitions, columns, primary & foreign keys | 11.5 KB |
| **3** | [`03_functions_and_procedures.sql`](./03_functions_and_procedures.sql) | Stored procedures, invitation resolvers, and calculation routines | 93.0 KB |
| **4** | [`04_rls_and_policies.sql`](./04_rls_and_policies.sql) | Row Level Security (RLS) policies and performance indexes | 131.9 KB |
| **5** | [`05_seed_system_reference.sql`](./05_seed_system_reference.sql) | Permissions, roles, ATO tax classifications, categories, and subscription plans | 82.2 KB |
| **6** | [`06_seed_workspaces_and_users.sql`](./06_seed_workspaces_and_users.sql) | Organizations, workspaces, user profiles, and team memberships | 7.6 KB |
| **7** | [`07_seed_properties_and_leases.sql`](./07_seed_properties_and_leases.sql) | Properties, units, tenants, leases, and rent schedules | 145.2 KB |
| **8** | [`08_seed_invoices_and_templates.sql`](./08_seed_invoices_and_templates.sql) | Invoices, invoice items, and predefined invoice blueprints | 572.0 KB |
| **9** | [`09_seed_transactions_and_reports.sql`](./09_seed_transactions_and_reports.sql) | Ledger transactions, Vercel Blob receipts, condition reports, automations | 132.8 KB |

---
> **Note on Data Chunks (05–09):** Each data file includes `SET session_replication_role = replica;` at the top and `SET session_replication_role = DEFAULT;` at the bottom to ensure foreign keys do not block row insertion during restore.
