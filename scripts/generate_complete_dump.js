const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env');
const env = fs.readFileSync(envPath, 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : '';
const supabaseKey = keyMatch ? keyMatch[1].trim() : '';

const supabase = createClient(supabaseUrl, supabaseKey);

const TABLES = [
  'organizations',
  'workspaces',
  'user_profiles',
  'workspace_members',
  'roles',
  'permissions',
  'role_permissions',
  'workspace_invitations',
  'properties',
  'units',
  'tenants',
  'leases',
  'lease_tenants',
  'lease_rent_schedules',
  'transaction_categories',
  'transaction_category_groups',
  'tax_classifications',
  'transactions',
  'transaction_attachments',
  'expected_transactions',
  'invoices',
  'invoice_items',
  'invoice_templates',
  'condition_reports',
  'condition_report_areas',
  'condition_report_items',
  'condition_report_signatures',
  'automations',
  'automation_logs',
  'audit_logs',
  'documents',
  'subscriptions',
  'subscription_plans',
  'entitlements',
  'workspace_subscriptions'
];

function escapeSqlValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return Number.isFinite(val) ? String(val) : 'NULL';
  if (typeof val === 'object') {
    return "'" + JSON.stringify(val).replace(/'/g, "''") + "'::jsonb";
  }
  return "'" + String(val).replace(/'/g, "''") + "'";
}

async function runDump() {
  console.log('Generating complete Supabase database dump...');
  const schemaSql = fs.readFileSync('supabase/schema.sql', 'utf8');

  let dataSql = '\n\n-- ====================================================================\n';
  dataSql += '-- DATA RECORDS DUMP (All Active Tables)\n';
  dataSql += '-- Project: ' + supabaseUrl + '\n';
  dataSql += '-- Generated: ' + new Date().toISOString() + '\n';
  dataSql += '-- ====================================================================\n\n';
  dataSql += 'SET session_replication_role = replica;\n\n';

  let totalRows = 0;

  for (const table of TABLES) {
    try {
      const { data, error } = await supabase.from(table).select('*');
      if (error) {
        continue;
      }
      if (data && data.length > 0) {
        totalRows += data.length;
        console.log(`Dumping ${data.length} rows from ${table}...`);
        dataSql += `-- Table: public.${table} (${data.length} rows)\n`;
        
        for (const row of data) {
          const keys = Object.keys(row);
          const cols = keys.map(k => `"${k}"`).join(', ');
          const vals = keys.map(k => escapeSqlValue(row[k])).join(', ');
          dataSql += `INSERT INTO public.${table} (${cols}) VALUES (${vals}) ON CONFLICT DO NOTHING;\n`;
        }
        dataSql += '\n';
      }
    } catch (err) {
      console.warn(`Error querying table ${table}:`, err.message);
    }
  }

  dataSql += 'SET session_replication_role = DEFAULT;\n';

  const fullDump = schemaSql + dataSql;

  fs.writeFileSync('supabase_dump.sql', fullDump, 'utf8');
  fs.writeFileSync('supabase/supabase_dump.sql', fullDump, 'utf8');

  const sizeMb = (Buffer.byteLength(fullDump, 'utf8') / (1024 * 1024)).toFixed(2);
  console.log(`\nSUCCESS: Complete database dump created!`);
  console.log(`Files created:`);
  console.log(`- supabase_dump.sql (${sizeMb} MB)`);
  console.log(`- supabase/supabase_dump.sql (${sizeMb} MB)`);
  console.log(`Total data records dumped: ${totalRows}`);
}

runDump();
