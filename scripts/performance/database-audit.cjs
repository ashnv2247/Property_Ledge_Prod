/* eslint-disable @typescript-eslint/no-require-imports -- Node CLI without a transpiler. */
// Read-only schema/plan inspection. Never print connection strings or record data.
const { loadEnvConfig } = require('@next/env');
const { Client } = require('pg');
const fs = require('node:fs');
loadEnvConfig(process.cwd());
async function main() {
  const connectionString = process.env.PERFORMANCE_DATABASE_URL || process.env.NEW_DB_URL;
  if (!connectionString) throw new Error('No audit database connection configured');
  const client = new Client({ connectionString, connectionTimeoutMillis: 10000, statement_timeout: 15000 });
  try {
    await client.connect();
    await client.query('BEGIN READ ONLY');
    const indexes = await client.query("select tablename, indexname, indexdef from pg_indexes where schemaname = 'public' order by tablename, indexname");
    const policies = await client.query("select tablename, policyname, roles, cmd, qual, with_check from pg_policies where schemaname = 'public' order by tablename, policyname");
    const tables = await client.query("select relname, n_live_tup from pg_stat_user_tables where schemaname = 'public' order by relname");
    const scope = await client.query('select workspace_id from public.transactions group by workspace_id order by count(*) desc limit 1');
    const plans = {};
    if (scope.rows.length) {
      const workspace = scope.rows[0].workspace_id;
      for (const [name, query] of Object.entries({
        transactionList: "select id, amount, transaction_date from public.transactions where workspace_id = $1 order by transaction_date desc, created_at desc limit 100",
        dashboardTransactions: "select amount, status, transaction_type, transaction_date, property_id from public.transactions where workspace_id = $1 and status = 'completed' and transaction_date >= current_date - 730",
      })) {
        const result = await client.query('EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ' + query, [workspace]);
        // Redact identifiers embedded in plan predicates.
        plans[name] = JSON.parse(JSON.stringify(result.rows[0]['QUERY PLAN']).replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '[uuid]'));
      }
    }
    await client.query('ROLLBACK');
    fs.writeFileSync('docs/performance/database-baseline.json', JSON.stringify({ capturedAt: new Date().toISOString(), role: 'connection role; not authenticated RLS latency', tables: tables.rows, indexes: indexes.rows, policies: policies.rows, plans }, null, 2));
    console.log('Read-only database audit saved; tables:', tables.rowCount, 'indexes:', indexes.rowCount, 'policies:', policies.rowCount);
  } finally { await client.end(); }
}
main().catch(error => { console.error('Database audit failed:', error.code || error.name); process.exitCode = 1; });
