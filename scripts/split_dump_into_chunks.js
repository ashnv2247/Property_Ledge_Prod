const fs = require('fs');
const path = require('path');

const schemaSql = fs.readFileSync(path.resolve(process.cwd(), 'schema.sql'), 'utf8');
const dumpPath = path.resolve(process.cwd(), 'supabase_dump.sql');
const fullContent = fs.readFileSync(dumpPath, 'utf8');

const outputDir = path.resolve(process.cwd(), 'supabase/chunks');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Clean old files
fs.readdirSync(outputDir).forEach(f => fs.unlinkSync(path.join(outputDir, f)));

// 1. Extract Extensions & Initial Settings
const lines = schemaSql.split('\n');
let chunk1 = `-- ====================================================================\n`;
chunk1 += `-- CHUNK 01: EXTENSIONS & INITIAL PRIVILEGES\n`;
chunk1 += `-- Step 1 of 9 — Run first in Supabase SQL Editor\n`;
chunk1 += `-- ====================================================================\n\n`;
chunk1 += `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";\n`;
chunk1 += `CREATE EXTENSION IF NOT EXISTS "pgcrypto";\n\n`;
chunk1 += `ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT, UPDATE, USAGE ON SEQUENCES TO "service_role";\n`;
chunk1 += `ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON FUNCTIONS FROM PUBLIC;\n`;
chunk1 += `ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT EXECUTE ON FUNCTIONS TO "service_role";\n`;
chunk1 += `ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLES TO "service_role";\n`;
fs.writeFileSync(path.join(outputDir, '01_extensions_and_enums.sql'), chunk1, 'utf8');

// 2. Extract All Functions
let funcLines = [];
let inFunc = false;
let funcName = '';
for (let i = 0; i < 2965; i++) {
  const line = lines[i];
  if (line.startsWith('CREATE OR REPLACE FUNCTION ') || line.startsWith('CREATE FUNCTION ')) {
    inFunc = true;
  }
  if (inFunc) {
    funcLines.push(line);
  }
}
let chunk3 = `-- ====================================================================\n`;
chunk3 += `-- CHUNK 03: FUNCTIONS & STORED PROCEDURES\n`;
chunk3 += `-- Step 3 of 9 — Run third in Supabase SQL Editor\n`;
chunk3 += `-- ====================================================================\n\n`;
chunk3 += funcLines.join('\n') + '\n';
fs.writeFileSync(path.join(outputDir, '03_functions_and_procedures.sql'), chunk3, 'utf8');

// 3. Extract All Table Blocks and Order Them by Dependency
const tableBlocks = new Map();
let currentTable = null;
let currentBlock = [];

for (let i = 2966; i < lines.length; i++) {
  const line = lines[i];
  const tableMatch = line.match(/CREATE TABLE (?:IF NOT EXISTS )?(?:\"public\"\.)?\"?([a-zA-Z0-9_]+)\"?/i);
  
  if (tableMatch) {
    if (currentTable && currentBlock.length > 0) {
      tableBlocks.set(currentTable, currentBlock.join('\n'));
    }
    currentTable = tableMatch[1].toLowerCase();
    currentBlock = [line];
  } else if (currentTable) {
    // If we hit RLS or triggers section, finish tables
    if (line.includes('-- ROW LEVEL SECURITY POLICIES') || line.includes('-- TRIGGERS') || line.startsWith('CREATE POLICY ')) {
      tableBlocks.set(currentTable, currentBlock.join('\n'));
      currentTable = null;
      currentBlock = [];
    } else {
      currentBlock.push(line);
      if (line.startsWith(');')) {
        tableBlocks.set(currentTable, currentBlock.join('\n'));
        currentTable = null;
        currentBlock = [];
      }
    }
  }
}

// Dependency Ordered Table List
const orderedTableNames = [
  // Tier 1: Core Parent Entities
  'workspaces',
  'organizations',
  'profiles',
  'platform_roles',
  'permissions',
  'platform_role_permissions',
  'platform_admins',
  'platform_user_roles',
  'team_roles',
  'team_role_permissions',
  'entitlements',
  'subscription_plans',
  'subscriptions',
  'plan_entitlements',
  'subscription_events',
  'subscription_payments',
  'categories',
  'category_groups',
  'tax_classifications',
  'account_context',
  'email_events',
  'notifications',
  'automations',
  'automation_executions',
  'tasks',
  'activity_logs',
  // Tier 2: Workspace Domain Entities
  'workspace_members',
  'workspace_invitations',
  'properties',
  'property_members',
  'units',
  'tenants',
  'leases',
  'lease_tenants',
  'invoice_sequences',
  'invoice_templates',
  'invoices',
  'invoice_items',
  'invoice_documents',
  'transactions',
  'transaction_attachments',
  'expected_payment_schedule',
  'transaction_schedule_allocations',
  'payment_proofs',
  'documents',
  'condition_reports',
  'inspection_rooms',
  'inspection_items',
  'inspection_defects',
  'inspection_photos'
];

let chunk2 = `-- ====================================================================\n`;
chunk2 += `-- CHUNK 02: CORE TABLE DEFINITIONS & CONSTRAINTS\n`;
chunk2 += `-- Step 2 of 9 — Run second in Supabase SQL Editor\n`;
chunk2 += `-- (All tables arranged in strict parent-to-child dependency order)\n`;
chunk2 += `-- ====================================================================\n\n`;

const added = new Set();
for (const t of orderedTableNames) {
  if (tableBlocks.has(t)) {
    chunk2 += `-- --------------------------------------------------------------------\n`;
    chunk2 += `-- Table: public.${t}\n`;
    chunk2 += `-- --------------------------------------------------------------------\n`;
    chunk2 += tableBlocks.get(t) + '\n\n';
    added.add(t);
  }
}

// Add any remaining tables found
for (const [t, block] of tableBlocks.entries()) {
  if (!added.has(t)) {
    chunk2 += `-- --------------------------------------------------------------------\n`;
    chunk2 += `-- Table: public.${t}\n`;
    chunk2 += `-- --------------------------------------------------------------------\n`;
    chunk2 += block + '\n\n';
  }
}

fs.writeFileSync(path.join(outputDir, '02_tables_and_types.sql'), chunk2, 'utf8');

// 4. Extract RLS, Policies & Triggers
let rlsLines = [];
for (let i = 2966; i < lines.length; i++) {
  const line = lines[i];
  if (
    line.startsWith('CREATE POLICY ') ||
    line.startsWith('ALTER TABLE ') && line.includes('ENABLE ROW LEVEL SECURITY') ||
    line.startsWith('CREATE TRIGGER ') ||
    line.startsWith('CREATE INDEX ') ||
    line.startsWith('CREATE UNIQUE INDEX ') ||
    line.startsWith('NOTIFY ')
  ) {
    rlsLines.push(line);
  }
}

let chunk4 = `-- ====================================================================\n`;
chunk4 += `-- CHUNK 04: ROW LEVEL SECURITY (RLS) POLICIES, INDEXES & TRIGGERS\n`;
chunk4 += `-- Step 4 of 9 — Run fourth in Supabase SQL Editor\n`;
chunk4 += `-- ====================================================================\n\n`;
chunk4 += rlsLines.join('\n') + '\n';
fs.writeFileSync(path.join(outputDir, '04_rls_and_policies.sql'), chunk4, 'utf8');

// 5. Data Chunks (05 through 09)
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

// Chunk 5
let chunk5 = `-- ====================================================================\n`;
chunk5 += `-- CHUNK 05: SEED DATA — SYSTEM REFERENCE, ROLES, TAX & PLANS\n`;
chunk5 += `-- Step 5 of 9 — Run fifth in Supabase SQL Editor\n`;
chunk5 += `-- ====================================================================\n\n`;
chunk5 += `SET session_replication_role = replica;\n\n`;
['permissions', 'roles', 'role_permissions', 'tax_classifications', 'transaction_category_groups', 'transaction_categories', 'subscriptions', 'subscription_plans', 'entitlements'].forEach(t => {
  chunk5 += extractTableInserts(rawDataSection, t);
});
chunk5 += `\nSET session_replication_role = DEFAULT;\n`;
fs.writeFileSync(path.join(outputDir, '05_seed_system_reference.sql'), chunk5, 'utf8');

// Chunk 6
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

// Chunk 7
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

// Chunk 8
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

// Chunk 9
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

console.log('SUCCESS: Table-ordered chunks created!');
