# 📑 Supabase Database Chunks Guide (Free-Tier Friendly)

These bite-sized SQL files are chunked to run within the request size and execution timeout limits of the **Supabase Web SQL Editor** (including Free Tier accounts).

### 🚀 Sequential Execution Order:
Run each file in your Supabase Dashboard (**SQL Editor** → **New query** → Paste & Run) in this sequence:

| Step | SQL File | What It Does |
| :---: | :--- | :--- |
| **1** | [\`01_extensions_and_enums.sql\`](./01_extensions_and_enums.sql) | Extensions (\`uuid-ossp\`, \`pgcrypto\`), custom types & default permissions |
| **2** | [\`02_tables_and_types.sql\`](./02_tables_and_types.sql) | Core table definitions (\`workspaces\`, \`properties\`, \`leases\`, etc.) ordered by dependency |
| **3** | [\`03_functions_and_procedures.sql\`](./03_functions_and_procedures.sql) | Stored procedures, invitation resolvers, and calculation routines |
| **4** | [\`04_rls_and_policies.sql\`](./04_rls_and_policies.sql) | Row Level Security (RLS) policies and performance indexes |
| **5** | [\`05_seed_system_reference.sql\`](./05_seed_system_reference.sql) | Permissions, roles, ATO tax classifications, categories, and subscription plans |
| **6** | [\`06_seed_workspaces_and_users.sql\`](./06_seed_workspaces_and_users.sql) | Organizations, workspaces, user profiles, and team memberships |
| **7** | [\`07_seed_properties_and_leases.sql\`](./07_seed_properties_and_leases.sql) | Properties, units, tenants, leases, and rent schedules |
| **8** | [\`08_seed_invoices_and_templates.sql\`](./08_seed_invoices_and_templates.sql) | Invoices, invoice items, and predefined invoice blueprints |
| **9** | [\`09_seed_transactions_and_reports.sql\`](./09_seed_transactions_and_reports.sql) | Ledger transactions, Vercel Blob receipts, condition reports, automations |

---
> **Note on Data Chunks (05–09):** Each data file includes \`SET session_replication_role = replica;\` at the top and \`SET session_replication_role = DEFAULT;\` at the bottom to ensure foreign keys do not block row insertion during restore.
