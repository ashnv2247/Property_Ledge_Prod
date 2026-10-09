const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const schemaSql = fs.readFileSync(path.join(rootDir, 'schema.sql'), 'utf8');

// Match policies
const policyRegex = /CREATE\s+POLICY\s+"?([^"\n]+)"?\s+ON\s+(?:public\.)?([a-zA-Z0-9_]+)\s+FOR\s+([A-Z]+)\s+TO\s+([a-zA-Z0-9_, ]+)\s+USING\s*\(([\s\S]*?)\)(?:\s+WITH\s+CHECK\s*\(([\s\S]*?)\))?;/gi;

let match;
const policies = [];
while ((match = policyRegex.exec(schemaSql)) !== null) {
  policies.push({
    name: match[1],
    table: match[2],
    operation: match[3],
    roles: match[4],
    using: match[5].replace(/\s+/g, ' ').trim(),
  });
}

console.log('Parsed policies:', policies.length);
policies.slice(0, 15).forEach(p => {
  console.log(`\nTable: ${p.table} | Name: ${p.name} | Op: ${p.operation}`);
  console.log(`USING: ${p.using.slice(0, 120)}...`);
});
