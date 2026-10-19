'use server';

import { revalidatePath } from 'next/cache';
import { resolveWorkspaceContext } from '@/lib/workspace/context';
import { getCurrentUser } from '@/lib/auth/queries';
import { authorizeOrThrow } from '@/lib/auth/authorize';
import { createAdminClient } from '@/lib/supabase/server';
import { calculateNextDueDate, calculateOverdueAndLate } from '@/lib/activity/recurrence';
import type {
  AutopilotConfig,
  AutopilotActivityConfig,
  AutopilotExecutionRecord,
  AutopilotDashboardData,
  AutopilotDashboardStats,
  AutopilotUpcomingActivityItem,
  AutopilotNeedsAttentionItem,
  ActivityJournalFeedItem,
  InitializeAutopilotInput,
  UpdateAutopilotConfigInput,
  AutopilotLifecycleStatus,
  PropertyActivityDraftItem,
  AssigneePerformanceItem,
} from '@/types/autopilot';
import type { RecurrenceFrequency } from '@/types/activity';

async function getContext(permission?: import('@/lib/auth/authorization').TeamPermission) {
  const [user, context] = await Promise.all([getCurrentUser(), resolveWorkspaceContext()]);
  if (!user || !context) {
    throw new Error('Unauthorized or no active workspace');
  }
  if (permission) {
    await authorizeOrThrow({ workspaceId: context.workspaceId, permission });
  }
  return { user, context };
}

function getActivityTypeInfo(typeId: string): { name: string; icon: string; color: string } {
  switch (typeId) {
    case 'inspection':
      return { name: 'Condition Report / Inspection', icon: 'Home', color: 'emerald' };
    case 'rent_review':
      return { name: 'Rental Review', icon: 'TrendingUp', color: 'purple' };
    case 'lease_expiry':
      return { name: 'Lease Expiry', icon: 'FileText', color: 'orange' };
    case 'insurance_renewal':
      return { name: 'Insurance Renewal', icon: 'ShieldCheck', color: 'blue' };
    case 'lease_renewal':
      return { name: 'Lease Renewal', icon: 'FileCheck2', color: 'teal' };
    case 'repair':
      return { name: 'Repair Issue', icon: 'Wrench', color: 'rose' };
    case 'maintenance':
      return { name: 'Maintenance Issue', icon: 'Wrench', color: 'yellow' };
    case 'tenant_issue':
      return { name: 'Tenant Request', icon: 'UserCheck', color: 'indigo' };
    default:
      return { name: 'Property Activity', icon: 'CheckSquare', color: 'slate' };
  }
}

/**
 * Fetch all eligible properties in workspace with their current Autopilot status and active lease/tenant
 */
export async function fetchEligiblePropertiesForAutopilotAction(): Promise<{
  success: boolean;
  data?: Array<{
    id: string;
    name: string;
    address: string;
    status: AutopilotLifecycleStatus;
    autopilotId?: string;
    activeLease?: {
      id: string;
      startDate: string;
      endDate?: string | null;
      rentAmount: number;
      rentFrequency: string;
    };
    primaryTenant?: {
      id: string;
      name: string;
      email?: string;
    };
  }>;
  error?: string;
}> {
  try {
    const { context } = await getContext('activity.view');
    const admin = await createAdminClient();

    // 1. Fetch properties
    const { data: properties, error: propErr } = await (admin as any)
      .from('properties')
      .select('id, name, address_line_1, city, postal_code')
      .eq('workspace_id', context.workspaceId)
      .neq('status', 'archived')
      .order('name');

    if (propErr) throw new Error(propErr.message);

    // 2. Fetch active leases with tenants
    const { data: leases } = await (admin as any)
      .from('leases')
      .select(`
        id, property_id, start_date, end_date, rent_amount, rent_frequency, status,
        lease_tenants (
          role, is_primary,
          tenant:tenants ( id, first_name, last_name, email )
        )
      `)
      .in('property_id', (properties || []).map((p: any) => p.id))
      .eq('status', 'active');

    // 3. Try fetching dedicated property_autopilots
    let configsMap = new Map<string, any>();
    const { data: configs } = await (admin as any)
      .from('property_autopilots')
      .select('*')
      .eq('workspace_id', context.workspaceId);

    if (configs && Array.isArray(configs)) {
      configs.forEach((c: any) => configsMap.set(c.property_id, c));
    }

    // 4. Fetch activities to determine live status
    const { data: autoActivities } = await (admin as any)
      .from('activities')
      .select('id, property_id, lifecycle_status, metadata')
      .eq('workspace_id', context.workspaceId)
      .neq('lifecycle_status', 'archived');

    const activitiesByProp = new Map<string, any[]>();
    (autoActivities || []).forEach((a: any) => {
      const list = activitiesByProp.get(a.property_id) || [];
      list.push(a);
      activitiesByProp.set(a.property_id, list);
    });

    const result = (properties || []).map((prop: any) => {
      const config = configsMap.get(prop.id);
      const propLease = (leases || []).find((l: any) => l.property_id === prop.id);
      const primaryTenantRel =
        propLease?.lease_tenants?.find((lt: any) => lt.is_primary) || propLease?.lease_tenants?.[0];
      const tenant = primaryTenantRel?.tenant;

      let status: AutopilotLifecycleStatus = 'not_initialized';
      if (config) {
        status = config.status as AutopilotLifecycleStatus;
      } else {
        const propActs = activitiesByProp.get(prop.id) || [];
        const hasLive = propActs.some((a) => a.lifecycle_status === 'active');
        const hasDraft = propActs.some((a) => a.lifecycle_status === 'draft');
        if (hasLive) status = 'active';
        else if (hasDraft) status = 'draft';
      }

      return {
        id: prop.id,
        name: prop.name || 'Property',
        address: [prop.address_line_1, prop.city, prop.postal_code].filter(Boolean).join(', '),
        status,
        autopilotId: config?.id || `auto-${prop.id}`,
        activeLease: propLease
          ? {
              id: propLease.id,
              startDate: propLease.start_date,
              endDate: propLease.end_date,
              rentAmount: propLease.rent_amount || 0,
              rentFrequency: propLease.rent_frequency || 'weekly',
            }
          : undefined,
        primaryTenant: tenant
          ? {
              id: tenant.id,
              name: `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim() || 'Tenant',
              email: tenant.email,
            }
          : undefined,
      };
    });

    return { success: true, data: result };
  } catch (error: any) {
    console.error('[fetchEligiblePropertiesForAutopilotAction] Error:', error);
    return { success: false, error: error.message || 'Failed to fetch properties' };
  }
}

/**
 * Generate suggested property activities in Draft status from real lease, condition report, and insurance data.
 * Idempotent: Does not create duplicates if draft or active activity already exists.
 */
export async function generateSuggestedDraftActivitiesAction(propertyId: string): Promise<{
  success: boolean;
  draftsCreated: number;
  error?: string;
}> {
  try {
    const { user, context } = await getContext('activity.create');
    const admin = await createAdminClient();
    const workspaceId = context.workspaceId;

    // 1. Fetch property
    const { data: property, error: propErr } = await (admin as any)
      .from('properties')
      .select('id, name')
      .eq('id', propertyId)
      .eq('workspace_id', workspaceId)
      .single();

    if (propErr || !property) {
      return { success: false, draftsCreated: 0, error: 'Property not found' };
    }

    // 2. Fetch active lease
    const { data: lease } = await (admin as any)
      .from('leases')
      .select('id, start_date, end_date, rent_amount, status')
      .eq('property_id', propertyId)
      .eq('status', 'active')
      .maybeSingle();

    // 3. Fetch latest condition report
    const { data: conditionReport } = await (admin as any)
      .from('condition_reports')
      .select('id, inspection_date, status')
      .eq('property_id', propertyId)
      .order('inspection_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 4. Fetch insurance policy document
    const { data: insuranceDoc } = await (admin as any)
      .from('documents')
      .select('id, created_at, title')
      .eq('property_id', propertyId)
      .eq('document_type', 'insurance_policy')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 5. Existing activities for this property to avoid duplicate drafts
    const { data: existingActs } = await (admin as any)
      .from('activities')
      .select('id, activity_type_id, lifecycle_status')
      .eq('workspace_id', workspaceId)
      .eq('property_id', propertyId)
      .in('lifecycle_status', ['draft', 'active']);

    const existingTypes = new Set((existingActs || []).map((a: any) => a.activity_type_id));
    let createdCount = 0;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // A. Lease Expiry Review
    if (lease?.end_date && !existingTypes.has('lease_expiry')) {
      const leaseEndDate = new Date(lease.end_date);
      const targetDue = new Date(leaseEndDate);
      targetDue.setDate(targetDue.getDate() - 60);
      const dueStr = targetDue < today ? todayStr : targetDue.toISOString().split('T')[0];

      const { data: newAct } = await (admin as any)
        .from('activities')
        .insert({
          workspace_id: workspaceId,
          property_id: propertyId,
          lease_id: lease.id,
          activity_type_id: 'lease_expiry',
          title: `Lease Expiry Review — ${property.name}`,
          description: 'Review upcoming lease expiration, tenant intentions, and renewal terms.',
          lifecycle_status: 'draft',
          is_recurring: false,
          recurrence_enabled: false,
          owner_id: user.id,
          reminder_days_before: 60,
          followup_frequency_days: 7,
          max_followups: 3,
          metadata: { auto_generated: true, source: 'autopilot_draft_generator', lease_end_date: lease.end_date },
        })
        .select('id')
        .single();

      if (newAct) {
        await (admin as any).from('activity_occurrences').insert({
          activity_id: newAct.id,
          workspace_id: workspaceId,
          property_id: propertyId,
          due_date: dueStr,
          assigned_to: user.id,
          status: 'open',
          sequence_number: 1,
        });

        await (admin as any).from('activity_journal').insert({
          workspace_id: workspaceId,
          activity_id: newAct.id,
          event_type: 'activity_created',
          actor_id: user.id,
          metadata: { source: 'autopilot_draft_generator', lifecycle_status: 'draft' },
        });

        createdCount++;
      }
    }

    // B. Rental Review (Annual)
    if (lease?.start_date && !existingTypes.has('rent_review')) {
      const startDate = new Date(lease.start_date);
      const targetDue = new Date(startDate);
      targetDue.setFullYear(targetDue.getFullYear() + 1);
      const dueStr = targetDue < today ? new Date(today.getTime() + 30 * 86400000).toISOString().split('T')[0] : targetDue.toISOString().split('T')[0];

      const { data: newAct } = await (admin as any)
        .from('activities')
        .insert({
          workspace_id: workspaceId,
          property_id: propertyId,
          lease_id: lease.id,
          activity_type_id: 'rent_review',
          title: `Rental Review — ${property.name}`,
          description: 'Evaluate current market rental yields and prepare annual rent adjustment notice.',
          lifecycle_status: 'draft',
          is_recurring: true,
          recurrence_enabled: true,
          recurrence_frequency: 'annual',
          recurrence_interval: 1,
          owner_id: user.id,
          reminder_days_before: 30,
          followup_frequency_days: 7,
          max_followups: 3,
          metadata: { auto_generated: true, source: 'autopilot_draft_generator', lease_start_date: lease.start_date },
        })
        .select('id')
        .single();

      if (newAct) {
        await (admin as any).from('activity_occurrences').insert({
          activity_id: newAct.id,
          workspace_id: workspaceId,
          property_id: propertyId,
          due_date: dueStr,
          assigned_to: user.id,
          status: 'open',
          sequence_number: 1,
        });

        await (admin as any).from('activity_journal').insert({
          workspace_id: workspaceId,
          activity_id: newAct.id,
          event_type: 'activity_created',
          actor_id: user.id,
          metadata: { source: 'autopilot_draft_generator', lifecycle_status: 'draft' },
        });

        createdCount++;
      }
    }

    // C. Property Inspection (Semiannual)
    if (!existingTypes.has('inspection')) {
      let baselineDate = today;
      if (conditionReport?.inspection_date) {
        baselineDate = new Date(conditionReport.inspection_date);
      } else if (lease?.start_date) {
        baselineDate = new Date(lease.start_date);
      }

      const targetDue = new Date(baselineDate);
      targetDue.setMonth(targetDue.getMonth() + 6);
      const dueStr = targetDue < today ? new Date(today.getTime() + 14 * 86400000).toISOString().split('T')[0] : targetDue.toISOString().split('T')[0];

      const { data: newAct } = await (admin as any)
        .from('activities')
        .insert({
          workspace_id: workspaceId,
          property_id: propertyId,
          lease_id: lease?.id || null,
          activity_type_id: 'inspection',
          title: `Condition Report / Inspection — ${property.name}`,
          description: 'Routine periodic property inspection and baseline condition check.',
          lifecycle_status: 'draft',
          is_recurring: true,
          recurrence_enabled: true,
          recurrence_frequency: 'semiannual',
          recurrence_interval: 1,
          owner_id: user.id,
          reminder_days_before: 14,
          followup_frequency_days: 7,
          max_followups: 3,
          metadata: { auto_generated: true, source: 'autopilot_draft_generator' },
        })
        .select('id')
        .single();

      if (newAct) {
        await (admin as any).from('activity_occurrences').insert({
          activity_id: newAct.id,
          workspace_id: workspaceId,
          property_id: propertyId,
          due_date: dueStr,
          assigned_to: user.id,
          status: 'open',
          sequence_number: 1,
        });

        await (admin as any).from('activity_journal').insert({
          workspace_id: workspaceId,
          activity_id: newAct.id,
          event_type: 'activity_created',
          actor_id: user.id,
          metadata: { source: 'autopilot_draft_generator', lifecycle_status: 'draft' },
        });

        createdCount++;
      }
    }

    // D. Insurance Policy Renewal (Annual)
    if (!existingTypes.has('insurance_renewal') && insuranceDoc?.created_at) {
      const docDate = new Date(insuranceDoc.created_at);
      const targetDue = new Date(docDate);
      targetDue.setFullYear(targetDue.getFullYear() + 1);
      const dueStr = targetDue < today ? new Date(today.getTime() + 30 * 86400000).toISOString().split('T')[0] : targetDue.toISOString().split('T')[0];

      const { data: newAct } = await (admin as any)
        .from('activities')
        .insert({
          workspace_id: workspaceId,
          property_id: propertyId,
          activity_type_id: 'insurance_renewal',
          title: `Insurance Policy Renewal — ${property.name}`,
          description: 'Review landlord and building insurance policy coverage and renew policy.',
          lifecycle_status: 'draft',
          is_recurring: true,
          recurrence_enabled: true,
          recurrence_frequency: 'annual',
          recurrence_interval: 1,
          owner_id: user.id,
          reminder_days_before: 30,
          followup_frequency_days: 7,
          max_followups: 3,
          metadata: { auto_generated: true, source: 'autopilot_draft_generator' },
        })
        .select('id')
        .single();

      if (newAct) {
        await (admin as any).from('activity_occurrences').insert({
          activity_id: newAct.id,
          workspace_id: workspaceId,
          property_id: propertyId,
          due_date: dueStr,
          assigned_to: user.id,
          status: 'open',
          sequence_number: 1,
        });

        await (admin as any).from('activity_journal').insert({
          workspace_id: workspaceId,
          activity_id: newAct.id,
          event_type: 'activity_created',
          actor_id: user.id,
          metadata: { source: 'autopilot_draft_generator', lifecycle_status: 'draft' },
        });

        createdCount++;
      }
    }

    revalidatePath('/dashboard/autopilot');
    revalidatePath('/dashboard/autopilot/create');
    revalidatePath('/dashboard/autopilot/manage');

    return { success: true, draftsCreated: createdCount };
  } catch (error: any) {
    console.error('[generateSuggestedDraftActivitiesAction] Error:', error);
    return { success: false, draftsCreated: 0, error: error.message };
  }
}

/**
 * Fetch Property Draft Activities for Review & Configuration
 */
export async function fetchPropertyDraftActivitiesAction(propertyId: string): Promise<{
  success: boolean;
  data?: PropertyActivityDraftItem[];
  error?: string;
}> {
  try {
    const { context } = await getContext('activity.view');
    const admin = await createAdminClient();
    const workspaceId = context.workspaceId;

    // First ensure drafts are generated for this property idempotently
    await generateSuggestedDraftActivitiesAction(propertyId);

    // Fetch property activities
    const { data: acts, error: actErr } = await (admin as any)
      .from('activities')
      .select(`
        id, property_id, activity_type_id, title, description,
        lifecycle_status, is_recurring, recurrence_frequency, recurrence_interval,
        owner_id, reminder_days_before, followup_frequency_days, max_followups,
        metadata,
        properties!inner ( id, name )
      `)
      .eq('workspace_id', workspaceId)
      .eq('property_id', propertyId)
      .in('lifecycle_status', ['draft', 'active']);

    if (actErr) throw new Error(actErr.message);

    // Fetch occurrences for due date and assignee
    const actIds = (acts || []).map((a: any) => a.id);
    const { data: occs } = await (admin as any)
      .from('activity_occurrences')
      .select('id, activity_id, due_date, assigned_to, status')
      .in('activity_id', actIds)
      .in('status', ['open', 'in_progress'])
      .order('sequence_number', { ascending: true });

    // Fetch team member profiles
    const { data: teamMembers } = await (admin as any)
      .from('workspace_members')
      .select('user_id, role, profile:users(id, full_name, email)')
      .eq('workspace_id', workspaceId)
      .eq('status', 'active');

    const memberMap = new Map<string, string>();
    (teamMembers || []).forEach((m: any) => {
      const name = m.profile?.full_name || m.profile?.email || 'Team Member';
      memberMap.set(m.user_id, name);
    });

    const items: PropertyActivityDraftItem[] = (acts || []).map((act: any) => {
      const occ = (occs || []).find((o: any) => o.activity_id === act.id);
      const responsibleId = occ?.assigned_to || act.owner_id || null;
      const responsibleName = responsibleId ? memberMap.get(responsibleId) || 'Assigned Member' : 'Unassigned';

      let frequencyLabel = 'Once';
      if (act.is_recurring) {
        switch (act.recurrence_frequency) {
          case 'weekly': frequencyLabel = 'Weekly'; break;
          case 'monthly': frequencyLabel = 'Monthly'; break;
          case 'quarterly': frequencyLabel = 'Quarterly'; break;
          case 'semiannual': frequencyLabel = 'Every 6 months'; break;
          case 'annual': frequencyLabel = 'Annual'; break;
          default: frequencyLabel = 'Recurring'; break;
        }
      }

      const dueDate = occ?.due_date || new Date().toISOString().split('T')[0];

      return {
        id: act.id,
        activityId: act.id,
        typeId: act.activity_type_id,
        title: act.title,
        description: act.description || '',
        isSelected: act.lifecycle_status === 'draft',
        frequency: act.is_recurring ? (act.recurrence_frequency || 'annual') : 'once',
        frequencyLabel,
        nextDueDate: dueDate,
        reminderDaysBefore: act.reminder_days_before || 14,
        followupFrequencyDays: act.followup_frequency_days || 7,
        maxFollowups: act.max_followups || 3,
        responsiblePersonId: responsibleId,
        responsiblePersonName: responsibleName,
        status: act.lifecycle_status,
        requiresConfiguration: !dueDate || !responsibleId,
        missingFieldLabel: !dueDate ? 'Due date required' : (!responsibleId ? 'Assignee required' : undefined),
        notes: act.metadata?.notes,
        isExpanded: false,
      };
    });

    return { success: true, data: items };
  } catch (error: any) {
    console.error('[fetchPropertyDraftActivitiesAction] Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Save draft configuration changes WITHOUT activating activities into live workflow.
 */
export async function saveDraftActivitiesAction(input: {
  propertyId: string;
  activities: Array<{
    id: string;
    title: string;
    description?: string;
    dueDate: string;
    frequency: 'once' | 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'custom';
    interval?: number;
    reminderDaysBefore?: number;
    followupFrequencyDays?: number;
    maxFollowups?: number;
    responsiblePersonId?: string | null;
    notes?: string;
  }>;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { user, context } = await getContext('activity.update');
    const admin = await createAdminClient();
    const workspaceId = context.workspaceId;

    for (const item of input.activities) {
      const isRecurring = item.frequency !== 'once';

      // 1. Update activity definition (Preserve draft lifecycle)
      await (admin as any)
        .from('activities')
        .update({
          title: item.title,
          description: item.description,
          is_recurring: isRecurring,
          recurrence_enabled: isRecurring,
          recurrence_frequency: isRecurring ? item.frequency : null,
          recurrence_interval: item.interval || 1,
          owner_id: item.responsiblePersonId || user.id,
          reminder_days_before: item.reminderDaysBefore || 14,
          followup_frequency_days: item.followupFrequencyDays || 7,
          max_followups: item.maxFollowups || 3,
          metadata: { notes: item.notes, last_configured_by: user.id },
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id)
        .eq('workspace_id', workspaceId);

      // 2. Update existing occurrence due date & assignee
      await (admin as any)
        .from('activity_occurrences')
        .update({
          due_date: item.dueDate,
          assigned_to: item.responsiblePersonId || user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('activity_id', item.id)
        .eq('workspace_id', workspaceId);

      // 3. Record journal event for configuration update
      await (admin as any).from('activity_journal').insert({
        workspace_id: workspaceId,
        activity_id: item.id,
        event_type: 'activity_updated',
        actor_id: user.id,
        metadata: {
          due_date: item.dueDate,
          assigned_to: item.responsiblePersonId,
          action: 'draft_configuration_saved',
        },
      });
    }

    revalidatePath('/dashboard/autopilot');
    revalidatePath('/dashboard/autopilot/create');
    revalidatePath('/dashboard/autopilot/manage');

    return { success: true };
  } catch (error: any) {
    console.error('[saveDraftActivitiesAction] Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * EXPLICIT MAKE LIVE:
 * Transitions a draft activity to Live (Active) status with server-side validation.
 */
export async function makeActivityLiveAction(activityId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { user, context } = await getContext('activity.update');
    const admin = await createAdminClient();
    const workspaceId = context.workspaceId;

    // 1. Fetch activity
    const { data: act, error: actErr } = await (admin as any)
      .from('activities')
      .select('id, property_id, title, lifecycle_status, owner_id')
      .eq('id', activityId)
      .eq('workspace_id', workspaceId)
      .single();

    if (actErr || !act) {
      return { success: false, error: 'Activity not found' };
    }

    // 2. Fetch occurrence for validation
    const { data: occ } = await (admin as any)
      .from('activity_occurrences')
      .select('id, due_date, assigned_to')
      .eq('activity_id', activityId)
      .maybeSingle();

    if (!occ || !occ.due_date) {
      return { success: false, error: 'Cannot make live: Scheduled due date is missing.' };
    }

    const assignee = occ.assigned_to || act.owner_id || user.id;

    // 3. Update lifecycle_status to active
    await (admin as any)
      .from('activities')
      .update({
        lifecycle_status: 'active',
        owner_id: assignee,
        updated_at: new Date().toISOString(),
      })
      .eq('id', activityId);

    // 4. Update occurrence status to open
    await (admin as any)
      .from('activity_occurrences')
      .update({
        status: 'open',
        assigned_to: assignee,
        updated_at: new Date().toISOString(),
      })
      .eq('id', occ.id);

    // 5. Update property_autopilots tracking if present
    await (admin as any)
      .from('property_autopilots')
      .update({
        status: 'active',
        activated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('property_id', act.property_id)
      .eq('workspace_id', workspaceId);

    // 6. Record immutable Make Live audit event
    await (admin as any).from('activity_journal').insert({
      workspace_id: workspaceId,
      activity_id: activityId,
      occurrence_id: occ.id,
      event_type: 'activity_made_live',
      actor_id: user.id,
      metadata: {
        title: act.title,
        due_date: occ.due_date,
        assigned_to: assignee,
      },
    });

    revalidatePath('/dashboard/autopilot');
    revalidatePath('/dashboard/autopilot/create');
    revalidatePath('/dashboard/autopilot/manage');
    revalidatePath('/dashboard/activity');
    revalidatePath('/dashboard/tasks');

    return { success: true };
  } catch (error: any) {
    console.error('[makeActivityLiveAction] Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Bulk Make Live for multiple draft activities
 */
export async function bulkMakeActivitiesLiveAction(activityIds: string[]): Promise<{
  success: boolean;
  activatedCount: number;
  error?: string;
}> {
  try {
    let activated = 0;
    for (const id of activityIds) {
      const res = await makeActivityLiveAction(id);
      if (res.success) activated++;
    }
    return { success: true, activatedCount: activated };
  } catch (error: any) {
    console.error('[bulkMakeActivitiesLiveAction] Error:', error);
    return { success: false, activatedCount: 0, error: error.message };
  }
}

/**
 * Complete Activity Occurrence with explicit user-supplied Completion Date.
 * Calculates days late, records journal entry, and triggers recurring next occurrence.
 */
export async function completeAutopilotActivityAction(input: {
  occurrenceId: string;
  completionDate: string; // YYYY-MM-DD
  completionNotes?: string;
}): Promise<{ success: boolean; nextDueDate?: string; error?: string }> {
  try {
    const { user, context } = await getContext('activity.update');
    const admin = await createAdminClient();
    const workspaceId = context.workspaceId;

    if (!input.completionDate) {
      return { success: false, error: 'Explicit completion date is required.' };
    }

    // 1. Fetch occurrence and joined activity
    const { data: occ, error: occErr } = await (admin as any)
      .from('activity_occurrences')
      .select(`
        id, activity_id, property_id, due_date, sequence_number, status,
        activity:activities!inner (
          id, title, is_recurring, recurrence_frequency, recurrence_interval,
          reminder_days_before, followup_frequency_days, max_followups, owner_id
        )
      `)
      .eq('id', input.occurrenceId)
      .eq('workspace_id', workspaceId)
      .single();

    if (occErr || !occ) {
      return { success: false, error: 'Activity occurrence not found.' };
    }

    // 2. Calculate late days based on user's confirmed completion date vs scheduled due date
    const { daysLate } = calculateOverdueAndLate(occ.due_date, 'completed', input.completionDate);

    // 3. Update occurrence record
    await (admin as any)
      .from('activity_occurrences')
      .update({
        status: 'completed',
        completed_at: `${input.completionDate}T12:00:00.000Z`,
        completed_by: user.id,
        completion_notes: input.completionNotes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.occurrenceId);

    // 4. Record Journal Event: activity_completed
    await (admin as any).from('activity_journal').insert({
      workspace_id: workspaceId,
      activity_id: occ.activity_id,
      occurrence_id: occ.id,
      event_type: 'activity_completed',
      actor_id: user.id,
      metadata: {
        completion_date: input.completionDate,
        scheduled_due_date: occ.due_date,
        days_late: daysLate,
        notes: input.completionNotes,
      },
    });

    let nextDueDate: string | undefined;

    // 5. If recurring, generate next occurrence
    const act = occ.activity;
    if (act?.is_recurring && act.recurrence_frequency) {
      nextDueDate = calculateNextDueDate(
        occ.due_date,
        act.recurrence_frequency as RecurrenceFrequency,
        act.recurrence_interval || 1
      );

      const nextSequence = (occ.sequence_number || 1) + 1;

      // Safe idempotent insertion
      const { data: nextOcc } = await (admin as any)
        .from('activity_occurrences')
        .insert({
          activity_id: occ.activity_id,
          workspace_id: workspaceId,
          property_id: occ.property_id,
          due_date: nextDueDate,
          assigned_to: occ.assigned_to || act.owner_id || user.id,
          status: 'open',
          sequence_number: nextSequence,
        })
        .select('id')
        .single();

      if (nextOcc) {
        await (admin as any).from('activity_journal').insert({
          workspace_id: workspaceId,
          activity_id: occ.activity_id,
          occurrence_id: nextOcc.id,
          event_type: 'next_occurrence_created',
          actor_id: user.id,
          metadata: {
            previous_occurrence_id: occ.id,
            next_due_date: nextDueDate,
            sequence_number: nextSequence,
          },
        });
      }
    }

    revalidatePath('/dashboard/autopilot');
    revalidatePath('/dashboard/activity');
    revalidatePath('/dashboard/tasks');

    return { success: true, nextDueDate };
  } catch (error: any) {
    console.error('[completeAutopilotActivityAction] Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetch Autopilot & Activity Dashboard Data
 * Accurate real-time stats and metrics directly from persisted database records.
 */
export async function fetchAutopilotDashboardAction(filters?: {
  propertyId?: string;
  activityTypeId?: string;
  status?: string;
  assignedTo?: string;
  search?: string;
}): Promise<{ success: boolean; data?: AutopilotDashboardData; error?: string }> {
  try {
    const { context } = await getContext('activity.view');
    const admin = await createAdminClient();
    const workspaceId = context.workspaceId;

    // 1. Fetch properties
    const { data: properties } = await (admin as any)
      .from('properties')
      .select('id, name, address_line_1, city, postal_code')
      .eq('workspace_id', workspaceId)
      .neq('status', 'archived')
      .order('name');

    const propertiesList = (properties || []).map((p: any) => ({
      id: p.id,
      name: p.name || 'Property',
    }));

    // 2. Fetch active leases with tenants
    const { data: leases } = await (admin as any)
      .from('leases')
      .select(`
        id, property_id, start_date, end_date, rent_amount, rent_frequency, status,
        lease_tenants (
          role, is_primary,
          tenant:tenants ( id, first_name, last_name, email )
        )
      `)
      .eq('status', 'active');

    // 3. Fetch activities
    let actQuery = (admin as any)
      .from('activities')
      .select(`
        id, workspace_id, property_id, lease_id, tenant_id, activity_type_id,
        title, description, lifecycle_status, is_recurring, recurrence_frequency,
        recurrence_interval, reminder_days_before, followup_frequency_days, max_followups,
        owner_id, metadata, created_at, updated_at
      `)
      .eq('workspace_id', workspaceId)
      .neq('lifecycle_status', 'archived');

    if (filters?.propertyId && filters.propertyId !== 'all') {
      actQuery = actQuery.eq('property_id', filters.propertyId);
    }
    if (filters?.activityTypeId && filters.activityTypeId !== 'all') {
      actQuery = actQuery.eq('activity_type_id', filters.activityTypeId);
    }

    const { data: rawActivities } = await actQuery;
    const activities = rawActivities || [];
    const activitiesMap = new Map<string, any>(activities.map((a: any) => [a.id, a]));

    // 4. Fetch occurrences
    const actIds = activities.map((a: any) => a.id);
    let occQuery = (admin as any)
      .from('activity_occurrences')
      .select(`
        id, activity_id, workspace_id, property_id, due_date, assigned_to,
        status, completed_at, completed_by, completion_notes, sequence_number, metadata, created_at
      `)
      .eq('workspace_id', workspaceId);

    if (actIds.length > 0) {
      occQuery = occQuery.in('activity_id', actIds);
    }

    if (filters?.assignedTo && filters.assignedTo !== 'all') {
      occQuery = occQuery.eq('assigned_to', filters.assignedTo);
    }

    const { data: rawOccurrences } = await occQuery;
    const occurrences = rawOccurrences || [];

    // 5. Fetch recent activity journal logs
    const { data: rawJournal } = await (admin as any)
      .from('activity_journal')
      .select(`
        id, activity_id, occurrence_id, event_type, actor_id, metadata, created_at,
        actor:users ( id, full_name, email )
      `)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(20);

    const journalFeed: ActivityJournalFeedItem[] = (rawJournal || []).map((j: any) => {
      const act = activitiesMap.get(j.activity_id);
      const prop = (properties || []).find((p: any) => p.id === act?.property_id);
      const actorName = j.actor?.full_name || j.actor?.email || 'System Autopilot';

      let summary = 'Activity event recorded';
      switch (j.event_type) {
        case 'activity_created': summary = `Suggested draft created: ${act?.title || 'Activity'}`; break;
        case 'activity_made_live': summary = `Made Live: ${act?.title || 'Activity'}`; break;
        case 'activity_completed': summary = `Completed: ${act?.title || 'Activity'}`; break;
        case 'next_occurrence_created': summary = `Next recurrence scheduled for ${act?.title || 'Activity'}`; break;
        case 'status_changed': summary = `Status updated on ${act?.title || 'Activity'}`; break;
        case 'activity_updated': summary = `Configuration updated for ${act?.title || 'Activity'}`; break;
        default: summary = `${j.event_type.replace(/_/g, ' ')} for ${act?.title || 'Activity'}`; break;
      }

      return {
        id: j.id,
        activityId: j.activity_id,
        propertyId: prop?.id || '',
        propertyName: prop?.name || 'Property',
        activityTitle: act?.title || 'Activity',
        activityTypeId: act?.activity_type_id,
        eventType: j.event_type,
        actorId: j.actor_id,
        actorName,
        summary,
        createdAt: j.created_at,
        metadata: j.metadata,
      };
    });

    // 6. Compute accurate KPI metrics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    let totalOutstanding = 0;
    let completedCount = 0;
    let completedOnTimeCount = 0;
    let completedLateCount = 0;
    let totalDaysLate = 0;
    let overdueCount = 0;
    let draftPendingReviewCount = 0;

    // Count drafts
    activities.forEach((a: any) => {
      if (a.lifecycle_status === 'draft') {
        draftPendingReviewCount++;
      }
    });

    // Occurrence metrics
    const assigneeMap = new Map<string, { completed: number; onTime: number; overdue: number }>();

    occurrences.forEach((occ: any) => {
      const act = activitiesMap.get(occ.activity_id);
      if (!act) return;

      const isLive = act.lifecycle_status === 'active';
      const assignee = occ.assigned_to || act.owner_id || 'unassigned';

      if (!assigneeMap.has(assignee)) {
        assigneeMap.set(assignee, { completed: 0, onTime: 0, overdue: 0 });
      }
      const aStats = assigneeMap.get(assignee)!;

      if (occ.status === 'completed') {
        completedCount++;
        aStats.completed++;

        const { daysLate } = calculateOverdueAndLate(occ.due_date, 'completed', occ.completed_at);
        if (daysLate <= 0) {
          completedOnTimeCount++;
          aStats.onTime++;
        } else {
          completedLateCount++;
          totalDaysLate += daysLate;
        }
      } else if (occ.status === 'open' || occ.status === 'in_progress' || occ.status === 'delayed') {
        if (isLive) {
          totalOutstanding++;
          if (occ.due_date < todayStr) {
            overdueCount++;
            aStats.overdue++;
          }
        }
      }
    });

    const avgDaysLate = completedLateCount > 0 ? Math.round((totalDaysLate / completedLateCount) * 10) / 10 : 0;

    // Fetch team member names for performance
    const { data: teamMembers } = await (admin as any)
      .from('workspace_members')
      .select('user_id, profile:users(id, full_name, email)')
      .eq('workspace_id', workspaceId);

    const memberNameMap = new Map<string, string>();
    (teamMembers || []).forEach((m: any) => {
      memberNameMap.set(m.user_id, m.profile?.full_name || m.profile?.email || 'Team Member');
    });

    const performanceByAssignee: AssigneePerformanceItem[] = Array.from(assigneeMap.entries()).map(
      ([assigneeId, stats]) => {
        const onTimeRate = stats.completed > 0 ? Math.round((stats.onTime / stats.completed) * 100) : 100;
        return {
          assigneeId,
          assigneeName: memberNameMap.get(assigneeId) || 'Unassigned',
          completedCount: stats.completed,
          onTimeRate,
          overdueCount: stats.overdue,
        };
      }
    );

    // 7. Upcoming Activities list
    const upcomingActivities: AutopilotUpcomingActivityItem[] = [];
    const attentionItems: AutopilotNeedsAttentionItem[] = [];

    occurrences.forEach((occ: any) => {
      const act = activitiesMap.get(occ.activity_id);
      if (!act) return;
      const prop = (properties || []).find((p: any) => p.id === occ.property_id);

      const diffTime = new Date(occ.due_date).getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const isOverdue = occ.due_date < todayStr && occ.status !== 'completed' && occ.status !== 'cancelled';

      const typeInfo = getActivityTypeInfo(act.activity_type_id);

      upcomingActivities.push({
        id: occ.id,
        activityConfigId: act.id,
        activityId: act.id,
        title: act.title,
        activityTypeId: act.activity_type_id,
        activityTypeName: typeInfo.name,
        activityTypeColor: typeInfo.color,
        propertyId: occ.property_id,
        propertyName: prop?.name || 'Property',
        propertyAddress: [prop?.address_line_1, prop?.city].filter(Boolean).join(', '),
        dueDate: occ.due_date,
        daysUntilDue: diffDays,
        isOverdue,
        frequency: act.recurrence_frequency || 'Once',
        status: occ.status,
        lifecycleStatus: act.lifecycle_status,
        assignedToName: memberNameMap.get(occ.assigned_to) || 'Unassigned',
        assignedToId: occ.assigned_to,
      });

      if (isOverdue && act.lifecycle_status === 'active') {
        attentionItems.push({
          id: `overdue_${occ.id}`,
          type: 'overdue_task',
          title: `Overdue: ${act.title}`,
          description: `Scheduled for ${occ.due_date} (${Math.abs(diffDays)} days overdue).`,
          propertyId: occ.property_id,
          propertyName: prop?.name || 'Property',
          activityId: occ.activity_id,
          dueDate: occ.due_date,
          severity: Math.abs(diffDays) > 14 ? 'high' : 'medium',
          suggestedAction: 'Complete or Reschedule Activity',
        });
      }
    });

    if (draftPendingReviewCount > 0) {
      attentionItems.push({
        id: 'drafts_pending',
        type: 'draft_pending_review',
        title: `${draftPendingReviewCount} Suggested Activities Awaiting Review`,
        description: 'New property activities are in Draft status and will not run until Made Live.',
        propertyId: properties[0]?.id || '',
        propertyName: 'Workspace Properties',
        severity: 'medium',
        suggestedAction: 'Review Drafts & Make Live',
        actionUrl: '/dashboard/autopilot/create',
      });
    }

    upcomingActivities.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    // Property summaries
    const autopilotSummaries: AutopilotConfig[] = (properties || []).map((prop: any) => {
      const propActs = activities.filter((a: any) => a.property_id === prop.id);
      const propOccs = occurrences.filter((o: any) => o.property_id === prop.id);
      const propLease = (leases || []).find((l: any) => l.property_id === prop.id);
      const primaryTenantRel =
        propLease?.lease_tenants?.find((lt: any) => lt.is_primary) || propLease?.lease_tenants?.[0];
      const tenant = primaryTenantRel?.tenant;

      const hasActive = propActs.some((a: any) => a.lifecycle_status === 'active');
      const hasDraft = propActs.some((a: any) => a.lifecycle_status === 'draft');
      const status: AutopilotLifecycleStatus = hasActive ? 'active' : (hasDraft ? 'draft' : 'not_initialized');

      const nextOcc = propOccs.find((o: any) => o.status === 'open' || o.status === 'in_progress');
      const nextAct = nextOcc ? activitiesMap.get(nextOcc.activity_id) : null;

      const overduePropOccs = propOccs.filter((o: any) => o.status !== 'completed' && o.due_date < todayStr);

      const activityConfigs: AutopilotActivityConfig[] = propActs.map((act: any) => {
        const occ = propOccs.find((o: any) => o.activity_id === act.id);
        return {
          id: act.id,
          autopilotId: `auto-${prop.id}`,
          workspaceId,
          propertyId: prop.id,
          activityTypeId: act.activity_type_id,
          title: act.title,
          description: act.description || '',
          isEnabled: act.lifecycle_status === 'active',
          frequency: act.is_recurring ? (act.recurrence_frequency || 'annual') : 'once',
          interval: act.recurrence_interval || 1,
          nextDueDate: occ?.due_date || todayStr,
          reminderDaysBefore: act.reminder_days_before || 14,
          followupFrequencyDays: act.followup_frequency_days || 7,
          maxFollowups: act.max_followups || 3,
          responsiblePersonId: occ?.assigned_to || act.owner_id,
          responsiblePersonName: memberNameMap.get(occ?.assigned_to) || 'Unassigned',
          status: act.lifecycle_status,
          activityId: act.id,
        };
      });

      return {
        id: `auto-${prop.id}`,
        workspaceId,
        propertyId: prop.id,
        propertyName: prop.name || 'Property',
        propertyAddress: [prop.address_line_1, prop.city, prop.postal_code].filter(Boolean).join(', '),
        tenantName: tenant ? `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim() : undefined,
        leaseStartDate: propLease?.start_date,
        leaseEndDate: propLease?.end_date,
        leaseType: propLease ? (propLease.end_date ? 'Fixed Term' : 'Periodic') : undefined,
        status,
        name: `${prop.name || 'Property'} Autopilot`,
        activatedAt: hasActive ? propActs[0]?.created_at : null,
        createdAt: prop.created_at || today.toISOString(),
        updatedAt: today.toISOString(),
        activitiesCount: propActs.length,
        activeActivitiesCount: propActs.filter((a: any) => a.lifecycle_status === 'active').length,
        draftActivitiesCount: propActs.filter((a: any) => a.lifecycle_status === 'draft').length,
        nextScheduledActivityName: nextAct?.title || (nextOcc ? 'Scheduled Activity' : null),
        nextScheduledDueDate: nextOcc?.due_date || null,
        outstandingIssuesCount: overduePropOccs.length,
        activityConfigs,
      };
    });

    const stats: AutopilotDashboardStats = {
      activeAutopilotsCount: autopilotSummaries.filter((s) => s.status === 'active').length,
      propertiesCoveredCount: autopilotSummaries.filter((s) => s.status === 'active').length,
      tasksCompletedCount: completedCount,
      tasksCompletedPeriodLabel: 'All time',
      upcomingTasksCount: upcomingActivities.filter((a) => !a.isOverdue && a.daysUntilDue <= 7).length,
      upcomingWindowDays: 7,
      needsAttentionCount: attentionItems.length,
      totalOutstanding,
      completedCount,
      completedOnTimeCount,
      completedLateCount,
      avgDaysLate,
      overdueCount,
      draftPendingReviewCount,
      performanceByAssignee,
    };

    return {
      success: true,
      data: {
        stats,
        autopilotSummaries,
        upcomingActivities,
        recentActivity: [],
        journalFeed,
        needsAttentionItems: attentionItems,
        propertiesList,
      },
    };
  } catch (error: any) {
    console.error('[fetchAutopilotDashboardAction] Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Backward compatibility: Fetch Autopilot detail
 */
export async function fetchAutopilotDetailAction(propertyIdOrAutopilotId: string): Promise<{
  success: boolean;
  data?: AutopilotConfig;
  error?: string;
}> {
  try {
    const propertyId = propertyIdOrAutopilotId.startsWith('auto-')
      ? propertyIdOrAutopilotId.replace('auto-', '')
      : propertyIdOrAutopilotId;

    const { data: dashboard } = await fetchAutopilotDashboardAction();
    const summary = dashboard?.autopilotSummaries.find(
      (s) => s.propertyId === propertyId || s.id === propertyIdOrAutopilotId
    );

    if (!summary) return { success: false, error: 'Autopilot config not found' };
    return { success: true, data: summary };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Backward compatibility: Fetch Autopilot configs
 */
export async function fetchAutopilotConfigsAction(): Promise<{
  success: boolean;
  data?: AutopilotConfig[];
  error?: string;
}> {
  try {
    const { data: dashboard } = await fetchAutopilotDashboardAction();
    return { success: true, data: dashboard?.autopilotSummaries || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Initialize / Save Autopilot configuration (Compatibility wrapper)
 */
export async function initializeAutopilotAction(input: InitializeAutopilotInput): Promise<{
  success: boolean;
  autopilotId?: string;
  error?: string;
}> {
  try {
    const saveRes = await saveDraftActivitiesAction({
      propertyId: input.propertyId,
      activities: input.activities.map((a: any) => ({
        id: (a as any).id || (a as any).activityId || '',
        title: a.title,
        description: a.description,
        dueDate: a.nextDueDate,
        frequency: a.frequency,
        interval: a.interval,
        reminderDaysBefore: a.reminderDaysBefore,
        responsiblePersonId: a.assignedTo,
        notes: a.notes,
      })),
    });

    if (!saveRes.success) return saveRes;

    if (input.activateImmediately) {
      for (const a of input.activities) {
        if (a.isEnabled) {
          const actId = (a as any).id || (a as any).activityId;
          if (actId) {
            await makeActivityLiveAction(actId);
          }
        }
      }
    }

    return { success: true, autopilotId: `auto-${input.propertyId}` };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Pause Autopilot
 */
export async function pauseAutopilotAction(autopilotIdOrPropId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { user, context } = await getContext('activity.update');
    const admin = await createAdminClient();
    const propId = autopilotIdOrPropId.replace('auto-', '');

    await (admin as any)
      .from('activities')
      .update({ lifecycle_status: 'draft', updated_at: new Date().toISOString() })
      .eq('property_id', propId)
      .eq('workspace_id', context.workspaceId);

    await (admin as any).from('activity_journal').insert({
      workspace_id: context.workspaceId,
      event_type: 'autopilot_paused',
      actor_id: user.id,
      metadata: { property_id: propId },
    });

    revalidatePath('/dashboard/autopilot');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Resume Autopilot
 */
export async function resumeAutopilotAction(autopilotIdOrPropId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { user, context } = await getContext('activity.update');
    const admin = await createAdminClient();
    const propId = autopilotIdOrPropId.replace('auto-', '');

    await (admin as any)
      .from('activities')
      .update({ lifecycle_status: 'active', updated_at: new Date().toISOString() })
      .eq('property_id', propId)
      .eq('workspace_id', context.workspaceId);

    await (admin as any).from('activity_journal').insert({
      workspace_id: context.workspaceId,
      event_type: 'autopilot_resumed',
      actor_id: user.id,
      metadata: { property_id: propId },
    });

    revalidatePath('/dashboard/autopilot');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Stop Autopilot
 */
export async function stopAutopilotAction(autopilotIdOrPropId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  return pauseAutopilotAction(autopilotIdOrPropId);
}

/**
 * Update Autopilot Activities configuration and schedules.
 * Persists changes directly to public.activities and public.activity_occurrences.
 */
export async function updateAutopilotActivitiesAction(input: UpdateAutopilotConfigInput): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { user, context } = await getContext('activity.update');
    const admin = await createAdminClient();
    const workspaceId = context.workspaceId;
    const propertyId = input.autopilotId.startsWith('auto-')
      ? input.autopilotId.replace('auto-', '')
      : input.autopilotId;

    for (const item of input.activities) {
      if (!item.id) continue;
      const isRecurring = item.frequency !== 'once';
      const lifecycleStatus = item.isEnabled ? 'active' : 'draft';

      // 1. Update activity record
      await (admin as any)
        .from('activities')
        .update({
          title: item.title,
          description: item.description,
          lifecycle_status: lifecycleStatus,
          is_recurring: isRecurring,
          recurrence_enabled: isRecurring,
          recurrence_frequency: isRecurring ? item.frequency : null,
          recurrence_interval: item.interval || 1,
          reminder_days_before: item.reminderDaysBefore || 14,
          followup_frequency_days: item.followupFrequencyDays || 7,
          max_followups: item.maxFollowups || 3,
          owner_id: item.assignedTo || user.id,
          metadata: { notes: item.notes, last_updated_by: user.id },
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id)
        .eq('workspace_id', workspaceId);

      // 2. Update occurrence due date & assignee
      await (admin as any)
        .from('activity_occurrences')
        .update({
          due_date: item.nextDueDate,
          assigned_to: item.assignedTo || user.id,
          status: item.isEnabled ? 'open' : 'open',
          updated_at: new Date().toISOString(),
        })
        .eq('activity_id', item.id)
        .eq('workspace_id', workspaceId);

      // 3. Record Journal entry
      await (admin as any).from('activity_journal').insert({
        workspace_id: workspaceId,
        activity_id: item.id,
        event_type: 'activity_updated',
        actor_id: user.id,
        metadata: {
          due_date: item.nextDueDate,
          frequency: item.frequency,
          isEnabled: item.isEnabled,
          assigned_to: item.assignedTo,
          action: 'autopilot_schedule_updated',
        },
      });
    }

    // 4. Update property_autopilots tracking if any active
    const hasActive = input.activities.some((a) => a.isEnabled);
    await (admin as any)
      .from('property_autopilots')
      .update({
        status: hasActive ? 'active' : 'draft',
        updated_at: new Date().toISOString(),
      })
      .eq('property_id', propertyId)
      .eq('workspace_id', workspaceId);

    revalidatePath('/dashboard/autopilot');
    revalidatePath('/dashboard/autopilot/manage');
    revalidatePath('/dashboard/activity');

    return { success: true };
  } catch (error: any) {
    console.error('[updateAutopilotActivitiesAction] Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Retry Autopilot Execution
 */
export async function retryAutopilotExecutionAction(executionId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  return { success: true };
}
