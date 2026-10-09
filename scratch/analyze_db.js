const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const schemaSql = fs.readFileSync(path.join(rootDir, 'schema.sql'), 'utf8');

// Match CREATE TABLE
const tableMatches = [...schemaSql.matchAll(/CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+(?:public\.)?([a-zA-Z0-9_]+)/gi)];
const tables = [...new Set(tableMatches.map(m => m[1]))];

// Match CREATE INDEX
const indexMatches = [...schemaSql.matchAll(/CREATE\s+(?:UNIQUE\s+)?INDEX(?:\s+IF\s+NOT\s+EXISTS)?\s+([a-zA-Z0-9_]+)\s+ON\s+(?:public\.)?([a-zA-Z0-9_]+)\s*(?:USING\s+[a-zA-Z0-9_]+\s*)?\(([^)]+)\)/gi)];
const indexes = indexMatches.map(m => ({
  name: m[1],
  table: m[2],
  columns: m[3].replace(/\s+/g, ' ').trim()
}));

// Match CREATE POLICY
const policyMatches = [...schemaSql.matchAll(/CREATE\s+POLICY\s+"?([^"\n]+)"?\s+ON\s+(?:public\.)?([a-zA-Z0-9_]+)/gi)];
const policies = policyMatches.map(m => ({
  name: m[1],
  table: m[2]
}));

console.log('Total Tables in schema.sql:', tables.length);
console.log('Total Indexes in schema.sql:', indexes.length);
console.log('Total Policies in schema.sql:', policies.length);

// Group indexes by table
const tableIndexes = {};
indexes.forEach(idx => {
  if (!tableIndexes[idx.table]) tableIndexes[idx.table] = [];
  tableIndexes[idx.table].push(idx);
});

// Key tables to inspect
const keyTables = ['properties', 'leases', 'tenants', 'invoices', 'payments', 'expenses', 'transactions', 'activity_logs', 'tasks', 'maintenance_requests', 'documents', 'workspace_members', 'workspaces'];

console.log('\n--- INDEXES ON KEY TABLES ---');
keyTables.forEach(t => {
  const count = tableIndexes[t] ? tableIndexes[t].length : 0;
  console.log(`Table: ${t} (${count} indexes)`);
  if (tableIndexes[t]) {
    tableIndexes[t].forEach(i => console.log(`   - ${i.name} ON (${i.columns})`));
  }
});
