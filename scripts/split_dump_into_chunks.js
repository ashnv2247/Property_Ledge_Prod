const fs = require('fs');
const path = require('path');

const dumpPath = path.resolve(process.cwd(), 'supabase_dump.sql');
const fullContent = fs.readFileSync(dumpPath, 'utf8');

const outputDir = path.resolve(process.cwd(), 'supabase/chunks');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Clean old chunk files in directory
fs.readdirSync(outputDir).forEach(f => fs.unlinkSync(path.join(outputDir, f)));

const schemaSql = fs.readFileSync(path.resolve(process.cwd(), 'supabase/schema.sql'), 'utf8');
const lines = schemaSql.split('\n');

let funcStartIdx = lines.findIndex(l => l.includes('FUNCTIONS & STORED PROCEDURES'));
let tablesStartIdx = lines.findIndex(l => l.includes('TABLES & SCHEMAS') || l.includes('CREATE TABLE'));

// Chunk 1: Extensions & Defaults
let chunk1 = `-- ====================================================================\n`;
chunk1 += `-- CHUNK 01: EXTENSIONS & PRIVILEGES\n`;
chunk1 += `-- Step 1 of 9 — Run first in Supabase SQL Editor\n`;
chunk1 += `-- ====================================================================\n\n`;
chunk1 += lines.slice(0, funcStartIdx > 0 ? funcStartIdx : 25).join('\n') + '\n';
fs.writeFileSync(path.join(outputDir, '01_extensions_and_enums.sql'), chunk1, 'utf8');

// Extract functions, tables, and policies
let functionsLines = [];
let tableLines = [];
let rlsAndTriggerLines = [];

let currentSection = 'funcs';
for (let i = (funcStartIdx > 0 ? funcStartIdx : 25); i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('CREATE TABLE public.') || line.includes('CREATE TABLE IF NOT EXISTS public.')) {
    currentSection = 'tables';
  } else if (line.includes('ROW LEVEL SECURITY') || line.includes('CREATE POLICY ') || line.includes('CREATE TRIGGER ') || line.includes('CREATE INDEX ')) {
    currentSection = 'rls_triggers';
  }

  if (currentSection === 'funcs') {
    functionsLines.push(line);
  } else if (currentSection === 'tables') {
    if (line.startsWith('CREATE POLICY ') || (line.startsWith('ALTER TABLE ') && line.includes('ENABLE ROW LEVEL SECURITY')) || line.startsWith('CREATE TRIGGER ') || line.startsWith('CREATE INDEX ') || line.startsWith('CREATE UNIQUE INDEX ')) {
      rlsAndTriggerLines.push(line);
    } else {
      tableLines.push(line);
    }
  } else {
    rlsAndTriggerLines.push(line);
  }
}

// Chunk 2: Tables & Constraints
let chunk2 = `-- ====================================================================\n`;
chunk2 += `-- CHUNK 02: TABLE DEFINITIONS & CONSTRAINTS\n`;
chunk2 += `-- Step 2 of 9 — Run second in Supabase SQL Editor\n`;
chunk2 += `-- ====================================================================\n\n`;
chunk2 += tableLines.join('\n') + '\n';
fs.writeFileSync(path.join(outputDir, '02_tables_and_types.sql'), chunk2, 'utf8');

// Chunk 3: Functions & Procedures
let chunk3 = `-- ====================================================================\n`;
chunk3 += `-- CHUNK 03: FUNCTIONS & STORED PROCEDURES\n`;
chunk3 += `-- Step 3 of 9 — Run third in Supabase SQL Editor\n`;
chunk3 += `-- ====================================================================\n\n`;
chunk3 += functionsLines.join('\n') + '\n';
fs.writeFileSync(path.join(outputDir, '03_functions_and_procedures.sql'), chunk3, 'utf8');

// Chunk 4: Triggers, Indexes & RLS Policies
let chunk4 = `-- ====================================================================\n`;
chunk4 += `-- CHUNK 04: TRIGGERS, INDEXES & ROW LEVEL SECURITY (RLS) POLICIES\n`;
chunk4 += `-- Step 4 of 9 — Run fourth in Supabase SQL Editor\n`;
chunk4 += `-- ====================================================================\n\n`;
chunk4 += rlsAndTriggerLines.join('\n') + '\n';
fs.writeFileSync(path.join(outputDir, '04_rls_and_policies.sql'), chunk4, 'utf8');

// Data extraction helper
const dataStartIdx = fullContent.indexOf('-- DATA RECORDS DUMP (All Active Tables)');
const rawDataSection = dataStartIdx !== -1 ? fullContent.slice(dataStartIdx) : '';

function extractTableInserts(sql, tableName) {
  const marker = `-- Table: public.${tableName} `;
  const start = sql.indexOf(marker);
  if (start === -1) return '';
  const nextMarker = sql.indexOf('-- Table: public.', start + marker.length);
  if (nextMarker === -1) {
    const end = sql.indexOf('SET session_replication_role = DEFAULT;', start);
    return sql.slice(start, end !== -1 ? end : undefined);
  }
  return sql.slice(start, nextMarker);
}

// Chunk 5: System Reference Data
let chunk5 = `-- ====================================================================\n`;
chunk5 += `-- CHUNK 05: SEED DATA — SYSTEM ROLES, TAX CLASSIFICATIONS & CATEGORIES\n`;
chunk5 += `-- Step 5 of 9 — Run fifth in Supabase SQL Editor\n`;
chunk5 += `-- ====================================================================\n\n`;
chunk5 += `SET session_replication_role = replica;\n\n`;
['permissions', 'roles', 'role_permissions', 'tax_classifications', 'transaction_category_groups', 'transaction_categories', 'subscriptions', 'subscription_plans', 'entitlements'].forEach(t => {
  chunk5 += extractTableInserts(rawDataSection, t);
});
chunk5 += `\nSET session_replication_role = DEFAULT;\n`;
fs.writeFileSync(path.join(outputDir, '05_seed_system_reference.sql'), chunk5, 'utf8');

// Chunk 6: Workspaces, Organizations & Users
let chunk6 = `-- ====================================================================\n`;
chunk6 += `-- CHUNK 06: SEED DATA — ORGANIZATIONS, WORKSPACES & USERS\n`;
chunk6 += `-- Step 6 of 9 — Run sixth in Supabase SQL Editor\n`;
chunk6 += `-- ====================================================================\n\n`;
chunk6 += `SET session_replication_role = replica;\n\n`;
['organizations', 'workspaces', 'user_profiles', 'workspace_members', 'workspace_invitations', 'workspace_subscriptions'].forEach(t => {
  chunk6 += extractTableInserts(rawDataSection, t);
});
chunk6 += `\nSET session_replication_role = DEFAULT;\n`;
fs.writeFileSync(path.join(outputDir, '06_seed_workspaces_and_users.sql'), chunk6, 'utf8');

// Chunk 7: Properties, Units, Leases & Tenants
let chunk7 = `-- ====================================================================\n`;
chunk7 += `-- CHUNK 07: SEED DATA — PROPERTIES, UNITS, LEASES & TENANTS\n`;
chunk7 += `-- Step 7 of 9 — Run seventh in Supabase SQL Editor\n`;
chunk7 += `-- ====================================================================\n\n`;
chunk7 += `SET session_replication_role = replica;\n\n`;
['properties', 'units', 'tenants', 'leases', 'lease_tenants', 'lease_rent_schedules'].forEach(t => {
  chunk7 += extractTableInserts(rawDataSection, t);
});
chunk7 += `\nSET session_replication_role = DEFAULT;\n`;
fs.writeFileSync(path.join(outputDir, '07_seed_properties_and_leases.sql'), chunk7, 'utf8');

// Chunk 8: Invoices & Templates
let chunk8 = `-- ====================================================================\n`;
chunk8 += `-- CHUNK 08: SEED DATA — INVOICES, ITEMS & TEMPLATES\n`;
chunk8 += `-- Step 8 of 9 — Run eighth in Supabase SQL Editor\n`;
chunk8 += `-- ====================================================================\n\n`;
chunk8 += `SET session_replication_role = replica;\n\n`;
['invoices', 'invoice_items', 'invoice_templates'].forEach(t => {
  chunk8 += extractTableInserts(rawDataSection, t);
});
chunk8 += `\nSET session_replication_role = DEFAULT;\n`;
fs.writeFileSync(path.join(outputDir, '08_seed_invoices_and_templates.sql'), chunk8, 'utf8');

// Chunk 9: Financial Ledger, Attachments, Reports & Automations
let chunk9 = `-- ====================================================================\n`;
chunk9 += `-- CHUNK 09: SEED DATA — TRANSACTIONS, ATTACHMENTS, CONDITION REPORTS & LOGS\n`;
chunk9 += `-- Step 9 of 9 (FINAL) — Run ninth in Supabase SQL Editor\n`;
chunk9 += `-- ====================================================================\n\n`;
chunk9 += `SET session_replication_role = replica;\n\n`;
['transactions', 'transaction_attachments', 'expected_transactions', 'condition_reports', 'condition_report_areas', 'condition_report_items', 'condition_report_signatures', 'automations', 'automation_logs', 'audit_logs', 'documents'].forEach(t => {
  chunk9 += extractTableInserts(rawDataSection, t);
});
chunk9 += `\nSET session_replication_role = DEFAULT;\n`;
fs.writeFileSync(path.join(outputDir, '09_seed_transactions_and_reports.sql'), chunk9, 'utf8');

// Markdown Guide
const readmeContent = `# 📑 Supabase Database Chunks Guide (Free-Tier Friendly)

These bite-sized SQL files are chunked to run within the request size and execution timeout limits of the **Supabase Web SQL Editor** (including Free Tier accounts).

### 🚀 Execution Order:
Run each file in your Supabase Dashboard (**SQL Editor** → **New query** → Paste & Run) in this sequence:

| Step | File | Contents | Size |
| :--- | :--- | :--- | :--- |
| **1** | [\`01_extensions_and_enums.sql\`](./01_extensions_and_enums.sql) | Extensions (\`uuid-ossp\`, \`pgcrypto\`), custom types & default permissions | 1.4 KB |
| **2** | [\`02_tables_and_types.sql\`](./02_tables_and_types.sql) | Core table definitions, columns, primary & foreign keys | 11.5 KB |
| **3** | [\`03_functions_and_procedures.sql\`](./03_functions_and_procedures.sql) | Stored procedures, invitation resolvers, and calculation routines | 93.0 KB |
| **4** | [\`04_rls_and_policies.sql\`](./04_rls_and_policies.sql) | Row Level Security (RLS) policies and performance indexes | 131.9 KB |
| **5** | [\`05_seed_system_reference.sql\`](./05_seed_system_reference.sql) | Permissions, roles, ATO tax classifications, categories, and subscription plans | 82.2 KB |
| **6** | [\`06_seed_workspaces_and_users.sql\`](./06_seed_workspaces_and_users.sql) | Organizations, workspaces, user profiles, and team memberships | 7.6 KB |
| **7** | [\`07_seed_properties_and_leases.sql\`](./07_seed_properties_and_leases.sql) | Properties, units, tenants, leases, and rent schedules | 145.2 KB |
| **8** | [\`08_seed_invoices_and_templates.sql\`](./08_seed_invoices_and_templates.sql) | Invoices, invoice items, and predefined invoice blueprints | 572.0 KB |
| **9** | [\`09_seed_transactions_and_reports.sql\`](./09_seed_transactions_and_reports.sql) | Ledger transactions, Vercel Blob receipts, condition reports, automations | 132.8 KB |

---
> **Note on Data Chunks (05–09):** Each data file includes \`SET session_replication_role = replica;\` at the top and \`SET session_replication_role = DEFAULT;\` at the bottom to ensure foreign keys do not block row insertion during restore.
`;

fs.writeFileSync(path.join(outputDir, 'README.md'), readmeContent, 'utf8');

console.log('SUCCESS: All 9 clean chunks created in supabase/chunks/');
