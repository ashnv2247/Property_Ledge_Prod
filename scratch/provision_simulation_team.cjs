const https = require('https');

const SUPABASE_URL = 'https://crztkcvytumurhcvzepo.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyenRrY3Z5dHVtdXJoY3Z6ZXBvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MzQ3NzQ3NCwiZXhwIjoyMTA5MDUzNDc0fQ.ZaqBLU9cPNCN6yEK0VYkaAK1VsKKEGniYY__C-6tEGk';
const WORKSPACE_ID = '660f3313-6cc9-4d8b-94a5-ed87189b9fa7'; // QA Portfolio
const OWNER_ID = '7e3f845c-ea68-4060-b896-860c0c2333c9';

const ROLES = {
  PROPERTY_MANAGER: 'a0000000-0000-0000-0000-000000000002',
  ACCOUNTANT: 'a0000000-0000-0000-0000-000000000003',
};

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, SUPABASE_URL);
    const postData = body ? JSON.stringify(body) : '';
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method,
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        ...(body ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(postData);
    req.end();
  });
}

async function findOrCreateUser(email, fullName, password = 'TestPassword123!') {
  // Check if user exists via admin users list
  const listRes = await request('GET', '/auth/v1/admin/users?per_page=50');
  const existing = (listRes.data?.users || []).find((u) => u.email === email);
  if (existing) {
    console.log(`User ${email} already exists:`, existing.id);
    return existing;
  }

  // Create user
  console.log(`Creating user ${email}...`);
  const createRes = await request('POST', '/auth/v1/admin/users', {
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createRes.status !== 200 && createRes.status !== 201) {
    throw new Error(`Failed to create ${email}: ${JSON.stringify(createRes.data)}`);
  }
  console.log(`User ${email} created with ID:`, createRes.data.id);
  return createRes.data;
}

async function main() {
  console.log('=== STARTING TEAM & DATASET PROVISIONING ===');

  // 1. Create Team Personas
  const sarah = await findOrCreateUser('sarah.chen@eliterealty.com.au', 'Sarah Chen');
  const david = await findOrCreateUser('david.thorne@thorneadvisory.com.au', 'David Thorne, CPA');
  const chloe = await findOrCreateUser('chloe.bennett@designstudio.sydney', 'Chloe Bennett');

  // 2. Add Sarah Chen (Property Manager) to QA Portfolio
  console.log('Adding Sarah Chen to QA Portfolio as Property Manager...');
  await request('POST', '/rest/v1/workspace_members', {
    workspace_id: WORKSPACE_ID,
    user_id: sarah.id,
    role: 'manager',
    role_id: ROLES.PROPERTY_MANAGER,
    status: 'active',
  });

  // 3. Add David Thorne (Accountant) to QA Portfolio
  console.log('Adding David Thorne to QA Portfolio as Accountant...');
  await request('POST', '/rest/v1/workspace_members', {
    workspace_id: WORKSPACE_ID,
    user_id: david.id,
    role: 'admin',
    role_id: ROLES.ACCOUNTANT,
    status: 'active',
  });

  // 4. Ensure Property 3 (42 St Kilda Road, Melbourne) exists
  const existingPropsRes = await request('GET', `/rest/v1/properties?workspace_id=eq.${WORKSPACE_ID}&select=id,name,address_line_1`);
  const props = existingPropsRes.data || [];
  let melbourneProp = props.find((p) => (p.name || '').includes('St Kilda'));

  if (!melbourneProp) {
    console.log('Creating 42 St Kilda Road, Melbourne property...');
    const createPropRes = await request('POST', '/rest/v1/properties', {
      workspace_id: WORKSPACE_ID,
      owner_id: OWNER_ID,
      name: '42 St Kilda Road',
      address_line_1: '42 St Kilda Road',
      city: 'Melbourne',
      suburb: 'Melbourne',
      state: 'VIC',
      postal_code: '3004',
      postcode: '3004',
      country: 'Australia',
      property_category: 'Residential',
      property_type: 'Apartment',
      bedrooms: 1,
      bathrooms: 1,
      parking_spaces: 1,
      rent_amount: 580.00,
      payment_frequency: 'Weekly',
      status: 'active',
      gst_enabled: false,
    });
    melbourneProp = createPropRes.data?.[0];
    console.log('Melbourne property created.');
  }

  // 5. Link Chloe Bennett to Bondi Property (77 Ocean Blvd)
  const bondiProp = props.find((p) => (p.name || '').includes('Ocean'));
  if (bondiProp) {
    console.log('Registering/Updating Chloe Bennett tenant for Bondi Property...');
    const existingTenantRes = await request('GET', `/rest/v1/tenants?property_id=eq.${bondiProp.id}&email=eq.chloe.bennett@designstudio.sydney`);
    let chloeTenant = existingTenantRes.data?.[0];

    if (!chloeTenant) {
      const createTenantRes = await request('POST', '/rest/v1/tenants', {
        property_id: bondiProp.id,
        user_id: chloe.id,
        first_name: 'Chloe',
        last_name: 'Bennett',
        email: 'chloe.bennett@designstudio.sydney',
        phone: '0421888999',
        status: 'active',
        emergency_contact_name: 'Mark Bennett (Father)',
        emergency_contact_phone: '0411222333',
        notes: 'Senior Creative Director. Flawless rental history. RBO Bond #NSW-992182.',
      });
      console.log('Chloe Bennett tenant profile created.');
    } else {
      await request('PATCH', `/rest/v1/tenants?id=eq.${chloeTenant.id}`, { user_id: chloe.id });
      console.log('Chloe Bennett user_id linked.');
    }
  }

  // 6. Insert ATO-Classified Operating (G11) & Capital (G10) Expenses
  console.log('Populating authentic Australian expenses for tax & BAS reporting...');
  const bondiPropId = bondiProp ? bondiProp.id : props[0]?.id;

  const expenses = [
    {
      workspace_id: WORKSPACE_ID,
      property_id: bondiPropId,
      expense_date: '2026-10-15',
      amount: 642.50,
      gst_amount: 0.00,
      description: 'Q2 Council Rates Notice 2026/27 (Waverley Council)',
      status: 'paid',
      vendor: 'Waverley Council',
      tax_deductible: true,
      category_name: 'Council Rates',
      bas_code: 'G11',
    },
    {
      workspace_id: WORKSPACE_ID,
      property_id: bondiPropId,
      expense_date: '2026-10-28',
      amount: 215.30,
      gst_amount: 0.00,
      description: 'Water Service & Usage Charges (Sydney Water)',
      status: 'paid',
      vendor: 'Sydney Water',
      tax_deductible: true,
      category_name: 'Water Rates',
      bas_code: 'G11',
    },
    {
      workspace_id: WORKSPACE_ID,
      property_id: bondiPropId,
      expense_date: '2026-11-02',
      amount: 330.00,
      gst_amount: 30.00,
      description: 'Pre-lease thorough sanitization and carpet steam clean',
      status: 'paid',
      vendor: 'CleanPro Services',
      tax_deductible: true,
      category_name: 'Cleaning & Gardening',
      bas_code: 'G11',
    },
    {
      workspace_id: WORKSPACE_ID,
      property_id: bondiPropId,
      expense_date: '2026-11-05',
      amount: 418.00,
      gst_amount: 38.00,
      description: 'Emergency hot water tempering valve replacement',
      status: 'paid',
      vendor: 'Rapid Plumbing NSW',
      tax_deductible: true,
      category_name: 'Repairs & Maintenance',
      bas_code: 'G11',
    },
    {
      workspace_id: WORKSPACE_ID,
      property_id: bondiPropId,
      expense_date: '2026-11-08',
      amount: 4950.00,
      gst_amount: 450.00,
      description: 'Replacement Daikin Multi-Split Reverse-Cycle Air Conditioning System',
      status: 'paid',
      vendor: 'Apex Airconditioning',
      tax_deductible: true,
      category_name: 'Capital Works',
      bas_code: 'G10',
    },
  ];

  for (const exp of expenses) {
    const res = await request('POST', '/rest/v1/expenses', exp);
    if (res.status === 201) {
      console.log(`Inserted expense: ${exp.description} ($${exp.amount}) - ${exp.bas_code}`);
    } else {
      console.log(`Expense notice: ${res.status}`, res.data);
    }
  }

  console.log('=== DATASET & TEAM PROVISIONING COMPLETE ===');
}

main().catch(console.error);

