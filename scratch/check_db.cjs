const fs = require('fs');
const envText = fs.readFileSync('.env', 'utf8');
const env = {};
envText.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const k = parts[0].trim();
    const v = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
    env[k] = v;
  }
});
const { Client } = require('pg');
const client = new Client({ connectionString: env.NEW_DB_URL });
async function check() {
  await client.connect();
  const res = await client.query(`
    SELECT conname, pg_get_constraintdef(oid) 
    FROM pg_constraint 
    WHERE conrelid = 'public.subscriptions'::regclass
  `);
  console.log('Constraints on subscriptions:', res.rows);
  const indexes = await client.query(`
    SELECT indexname, indexdef 
    FROM pg_indexes 
    WHERE tablename = 'subscriptions'
  `);
  console.log('Indexes on subscriptions:', indexes.rows);
  await client.end();
}
check().catch(console.error);

