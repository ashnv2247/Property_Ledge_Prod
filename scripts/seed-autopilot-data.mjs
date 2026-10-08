import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

async function runSeed() {
  console.log('--- Starting PropertyLedge Activity & Tasks Seed ---');

  const workspaceId = '11111111-1111-1111-1111-111111111111';
  const ownerId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const agentUserId = 'de9c298f-13c3-4a33-bbcc-19c048a15e1d'; // Logged-in user in screenshot
  const propertyAId = '44444444-4444-4444-4444-444444444444'; // Property A - Downtown Apartment
  const propertyBId = '55555555-5555-5555-5555-555555555555'; // Property B - Suburban House

  // 1. Ensure Lease on Property A exists
  const leaseAId = 'a1000001-0001-0001-0001-000000000001';
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const dueIn2Days = new Date(today);
  dueIn2Days.setDate(today.getDate() + 2);
  const dueIn2DaysStr = dueIn2Days.toISOString().split('T')[0];

  const dueIn15Days = new Date(today);
  dueIn15Days.setDate(today.getDate() + 15);
  const dueIn15DaysStr = dueIn15Days.toISOString().split('T')[0];

  const dueIn45Days = new Date(today);
  dueIn45Days.setDate(today.getDate() + 45);
  const dueIn45DaysStr = dueIn45Days.toISOString().split('T')[0];

  const { data: leaseA, error: leaseErr } = await supabase.from('leases').upsert({
    id: leaseAId,
    property_id: propertyAId,
    status: 'active',
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    rent_amount: 720,
    security_deposit: 2880,
    payment_due_day: 1,
    rent_frequency: 'monthly',
    notes: 'Residential Tenancy Agreement — 12 Months Fixed Term',
    created_by: ownerId,
  }, { onConflict: 'id' }).select().single();

  console.log('Lease A synced:', leaseA?.id, leaseErr);

  // 2. Ensure Condition Report exists for Property A
  const reportId = 'c1000001-0001-0001-0001-000000000001';
  const { data: report, error: repErr } = await supabase.from('condition_reports').upsert({
    id: reportId,
    workspace_id: workspaceId,
    property_id: propertyAId,
    lease_id: leaseAId,
    type: 'Routine',
    inspection_date: todayStr,
    inspector_name: 'Test Property Manager',
    inspector_id: agentUserId,
    status: 'Completed',
    notes: '6-Month Routine Inspection completed. Overall property is in good condition with 1 minor plumbing issue.',
    completed_at: new Date().toISOString(),
  }, { onConflict: 'id' }).select().single();

  console.log('Condition report synced:', report?.id, repErr);

  // 3. Inspection Room & Defect
  const roomId = 'r1000001-0001-0001-0001-000000000001';
  await supabase.from('inspection_rooms').upsert({
    id: roomId,
    report_id: reportId,
    name: 'Kitchen & Scullery',
    status: 'Completed',
    room_order: 1,
  }, { onConflict: 'id' });

  const defectId = 'd1000001-0001-0001-0001-000000000001';
  await supabase.from('inspection_defects').upsert({
    id: defectId,
    room_id: roomId,
    item_name: 'Under-sink Water Pipe Joint',
    notes: 'Minor water leak detected beneath the kitchen sink trap. Requires plumber inspection.',
    severity: 'Urgent',
  }, { onConflict: 'id' });

  console.log('Inspection room and defects seeded.');

  // 4. Seed 5 Distinct Activities & Occurrences for Test Property Manager
  const sampleActivities = [
    {
      id: 'e1000001-0001-0001-0001-000000000001',
      title: 'Urgent Defect Repair: Kitchen Sink Pipe Leak',
      desc: 'Plumbing contractor dispatched to fix water leak under kitchen sink.',
      type: 'repair',
      status: 'open',
      dueDate: todayStr, // Due today -> DUE & OVERDUE column
      recurring: false,
    },
    {
      id: 'e1000001-0001-0001-0001-000000000002',
      title: 'Routine Property Inspection Review',
      desc: 'Finalise routine condition report photos and send inspection summary to landlord.',
      type: 'inspection',
      status: 'open',
      dueDate: dueIn2DaysStr, // Due in 2 days -> DUE & OVERDUE column
      recurring: true,
      freq: 'semiannual',
    },
    {
      id: 'e1000001-0001-0001-0001-000000000003',
      title: 'Smoke Alarm & Electrical Safety Audit',
      desc: 'Annual compliance certificate verification with certified electrician.',
      type: 'maintenance',
      status: 'in_progress', // IN PROGRESS column
      dueDate: dueIn15DaysStr,
      recurring: true,
      freq: 'annual',
    },
    {
      id: 'e1000001-0001-0001-0001-000000000004',
      title: 'Lease Expiry & Renewal Notice (Lease #PL-2026-01)',
      desc: 'Initiate 90-day tenant intention check and discuss lease renewal options.',
      type: 'lease_expiry',
      status: 'open',
      dueDate: dueIn45DaysStr, // Due in 45 days -> UPCOMING column
      recurring: false,
    },
    {
      id: 'e1000001-0001-0001-0001-000000000005',
      title: 'Initial Move-In Condition Report Finalisation',
      desc: 'Entry photographic condition report signed off by both landlord and tenant.',
      type: 'inspection',
      status: 'completed', // COMPLETED column
      dueDate: todayStr,
      recurring: false,
      completedAt: new Date().toISOString(),
    },
  ];

  for (const act of sampleActivities) {
    const { error: aErr } = await supabase.from('activities').upsert({
      id: act.id,
      workspace_id: workspaceId,
      property_id: propertyAId,
      lease_id: leaseAId,
      activity_type_id: act.type,
      title: act.title,
      description: act.desc,
      lifecycle_status: 'active',
      is_recurring: act.recurring,
      recurrence_frequency: act.freq || null,
      metadata: { auto_created: true, source: 'autopilot' },
      owner_id: ownerId,
    }, { onConflict: 'id' });

    if (aErr) console.error('Error upserting activity:', act.title, aErr);

    const { error: oErr } = await supabase.from('activity_occurrences').upsert({
      activity_id: act.id,
      workspace_id: workspaceId,
      property_id: propertyAId,
      due_date: act.dueDate,
      assigned_to: agentUserId,
      status: act.status,
      sequence_number: 1,
      completed_at: act.completedAt || null,
      completed_by: act.completedAt ? agentUserId : null,
      completion_notes: act.completedAt ? 'All condition items verified and signed digitally.' : null,
    }, { onConflict: 'activity_id,sequence_number' });

    if (oErr) console.error('Error upserting occurrence:', act.title, oErr);
  }

  console.log('✅ Successfully seeded sample activities and occurrences across all board columns for test account!');
}

runSeed();
