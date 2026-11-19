/* eslint-disable @typescript-eslint/no-require-imports -- Node CLI without a transpiler. */
// Read-only GET requests. Persist aggregate measurements only, never record contents.
const { loadEnvConfig } = require('@next/env');
const fs = require('node:fs');
loadEnvConfig(process.cwd());
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!key) throw new Error('Server read credential unavailable');
async function read(table, params) {
  const url = new URL(`/rest/v1/${table}`, process.env.NEXT_PUBLIC_SUPABASE_URL);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  const start = performance.now();
  const response = await fetch(url, {
    method: 'GET', headers: { apikey: key, Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(15000),
  });
  const body = await response.text();
  if (!response.ok) throw Object.assign(new Error('REST probe failed'), { status: response.status });
  return { rows: JSON.parse(body), bytes: Buffer.byteLength(body), ms: performance.now() - start };
}
async function main() {
  const leaseScope = await read('leases', { select: 'property:properties!inner(workspace_id,owner_id)', limit: '1', order: 'created_at.desc' });
  const scope = leaseScope.rows[0]?.property || (await read('properties', {
    select: 'workspace_id,owner_id', limit: '1', order: 'created_at.desc',
  })).rows[0];
  if (!scope) throw new Error('No representative property available');
  const { workspace_id, owner_id } = scope;
  const fullSelect = '*,property:properties!inner(id,name,address_line_1,city,suburb,postal_code,state,workspace_id),lease_tenants!lease_tenants_lease_id_fkey(tenant_id,role,is_primary,tenant:tenants!lease_tenants_tenant_id_fkey(id,first_name,last_name,email,phone,status,emergency_contact_name,emergency_contact_phone))';
  const cases = {
    leasesBefore: ['leases', { select: fullSelect, 'property.workspace_id': `eq.${workspace_id}`, order: 'created_at.desc' }],
    leasesAfter: ['leases', { select: 'id,property_id,end_date,status,rent_amount,properties!inner(workspace_id)', 'properties.workspace_id': `eq.${workspace_id}`, status: 'eq.active', and: `(end_date.gt.${new Date().toISOString().slice(0, 10)},end_date.lte.${new Date(Date.now()+60*86400000).toISOString().slice(0, 10)})`, order: 'created_at.desc,id.desc', limit: '6' }],
    setupPropertiesBefore: ['properties', { select: 'id,workspace_id', owner_id: `eq.${owner_id}`, status: 'eq.active' }],
    setupPropertiesAfter: ['properties', { select: 'id', owner_id: `eq.${owner_id}`, status: 'eq.active', limit: '1' }],
  };
  const samples = {};
  // Alternate before/after to reduce systematic warmup bias. Still only 3 samples.
  for (let run = 0; run < 3; run++) {
    for (const [name, [table, params]] of Object.entries(cases)) {
      const result = await read(table, params);
      (samples[name] ||= []).push({ rows: result.rows.length, bytes: result.bytes, ms: Math.round(result.ms) });
    }
  }
  const report = {
    capturedAt: new Date().toISOString(),
    caveats: 'Server credential bypasses RLS. One existing owner/workspace; not a scale test. Before leases uses corrected scope alias to compare payload fairly. Timing includes network/service overhead. Response bytes are decoded JSON, not compressed wire bytes. No records persisted.',
    samples,
  };
  fs.writeFileSync('docs/performance/payload-benchmark.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
main().catch(error => { console.error('Read-only payload probe failed:', error.status || error.cause?.code || error.name); process.exitCode = 1; });
