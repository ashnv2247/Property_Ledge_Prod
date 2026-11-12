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

async function testSub() {
  const testUserId = 'e67e3c72-f607-4e4f-bfb8-65eba0ff7222'; // user with pending_payment
  const { data, error } = await supabase.from('subscriptions').insert({
    account_id: testUserId,
    plan_id: '00000000-0000-0000-0000-000000000005',
    status: 'trialing',
    provider: 'manual'
  });
  console.log('Insert duplicate result:', { data, error });
}
testSub();

