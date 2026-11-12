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
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: plans, error: pErr } = await supabase.from('subscription_plans').select('*');
  console.log('Plans:', plans?.map(p => ({ id: p.id, name: p.name, slug: p.slug, status: p.status, display_order: p.display_order })));
  
  const { data: subs, error: sErr } = await supabase.from('subscriptions').select('*').limit(3);
  console.log('Subscriptions:', subs, 'Error:', sErr);

  const { data: acc, error: aErr } = await supabase.from('account_context').select('*').limit(3);
  console.log('Account context:', acc, 'Error:', aErr);
}
run();
