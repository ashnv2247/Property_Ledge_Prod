'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/queries';
import { resolveWorkspaceContext } from '@/lib/workspace/context';
import { getEffectiveWorkspacePermissions } from '@/lib/auth/authorization';
import { calculateNextDueDate, calculateOverdueAndLate } from '@/lib/activity/recurrence';
import type {
  ActivityBoardItem,
  ActivityDetailData,
  ActivityStats,
  ActivityFilters,
  CreateActivityInput,
  UpdateActivityInput,
  CompleteOccurrenceInput,
  ActivityType,
  ActivityJournalEntry,
  ActivityComment,
} from '@/types/activity';

export async function checkActivityPermissions(workspaceId: string, userId: string) {
  const permissions = await getEffectiveWorkspacePermissions(workspaceId, userId);
  const admin = await createAdminClient();
  const { data: ws } = await (admin as any)
    .from('workspaces')
    .select('owner_id')
    .eq('id', workspaceId)
    .single();
  const isOwner = ws?.owner_id === userId;

  const canViewAll = isOwner || permissions.includes('activity.view') || permissions.includes('task.manage');
  const canCreate = isOwner || permissions.includes('activity.create') || permissions.includes('task.create');
  const canUpdate = isOwner || permissions.includes('activity.update') || permissions.includes('task.update');
  const canDelete = isOwner || permissions.includes('activity.delete') || permissions.includes('task.delete');
  const canAssign = isOwner || permissions.includes('activity.assign') || permissions.includes('task.assign');

  return { isOwner, permissions, canViewAll, canCreate, canUpdate, canDelete, canAssign };
}

const DEFAULT_ACTIVITY_TYPES: ActivityType[] = [
  { id: 'inspection', name: 'Property Inspection', slug: 'property-inspection', icon: 'Home', color: 'indigo', isSystem: true },
  { id: 'rent_review', name: 'Rent Review', slug: 'rent-review', icon: 'TrendingUp', color: 'emerald', isSystem: true },
  { id: 'lease_expiry', name: 'Lease Expiry', slug: 'lease-expiry', icon: 'FileText', color: 'amber', isSystem: true },
  { id: 'insurance_renewal', name: 'Insurance Renewal', slug: 'insurance-renewal', icon: 'ShieldCheck', color: 'blue', isSystem: true },
  { id: 'lease_renewal', name: 'Lease Renewal', slug: 'lease-renewal', icon: 'FileCheck2', color: 'teal', isSystem: true },
  { id: 'repair', name: 'Repair', slug: 'repair', icon: 'Wrench', color: 'orange', isSystem: true },
  { id: 'maintenance', name: 'Maintenance Issue', slug: 'maintenance-issue', icon: 'Wrench', color: 'yellow', isSystem: true },
  { id: 'tenant_issue', name: 'Tenant Issue', slug: 'tenant-issue', icon: 'UserCheck', color: 'rose', isSystem: true },
  { id: 'other', name: 'Other', slug: 'other', icon: 'CheckSquare', color: 'slate', isSystem: true },
];

/**
 * Fetch high-performance Activity Canvas items and summary KPI stats.
 */
export async function fetchActivitiesAction(filters?: ActivityFilters): Promise<{
  success: boolean;
  data?: ActivityBoardItem[];
  stats?: ActivityStats;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const context = await resolveWorkspaceContext();
    if (!context?.workspaceId) return { success: false, error: 'No active workspace' };

    const workspaceId = context.workspaceId;
    const admin = await createAdminClient();

    // Check workspace permissions
    const { canViewAll } = await checkActivityPermissions(workspaceId, user.id);

    // 1. Fetch occurrences with joined activity, property, and type data
    let query = admin
      .from('activity_occurrences')
      .select(`
        id,
        activity_id,
        workspace_id,
        property_id,
        due_date,
        assigned_to,
        status,
        completed_at,
        completed_by,
        completion_notes,
        sequence_number,
        metadata,
        created_at,
        activities!inner (
          id,
          title,
          description,
          activity_type_id,
          lifecycle_status,
          is_recurring,
          recurrence_frequency,
          recurrence_interval,
          lease_id,
          tenant_id,
          metadata
        ),
        properties!inner (
          id,
          name,
          address_line_1
        )
      `)
      .eq('workspace_id', workspaceId);

    // Enforce permission scoping: If user does not have activity.view / manage, they can ONLY see their assigned tasks
    if (!canViewAll) {
      query = query.eq('assigned_to', user.id);
    } else if (filters?.assignedTo && filters.assignedTo !== 'all') {
      if (filters.assignedTo === 'me') {
        query = query.eq('assigned_to', user.id);
      } else {
        query = query.eq('assigned_to', filters.assignedTo);
      }
    }

    // Apply property filter
    if (filters?.propertyId && filters.propertyId !== 'all') {
      query = query.eq('property_id', filters.propertyId);
    }

    // Apply status filter
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    // Sort order
    query = query.order('due_date', { ascending: true });

    const { data: rawOccurrences, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching activity occurrences:', fetchError);
      // Fallback empty list gracefully if table is initializing
      return {
        success: true,
        data: [],
        stats: {
          total: 0,
          dueTodayCount: 0,
          dueSoonCount: 0,
          overdueCount: 0,
          inProgressCount: 0,
          upcomingCount: 0,
          completedCount: 0,
          draftCount: 0,
        },
      };
    }

    // 2. Fetch profiles for assignees to enrich names and avatars
    const userIds = new Set<string>();
    (rawOccurrences || []).forEach((row: any) => {
      if (row.assigned_to) userIds.add(row.assigned_to);
      if (row.completed_by) userIds.add(row.completed_by);
    });

    let profilesMap = new Map<string, { full_name: string | null; avatar_url: string | null }>();
    if (userIds.size > 0) {
      const { data: profiles } = await admin
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', Array.from(userIds));

      (profiles || []).forEach((p: any) => {
        profilesMap.set(p.id, { full_name: p.full_name, avatar_url: p.avatar_url });
      });
    }

    // 3. Fetch comment counts per occurrence
    const occurrenceIds = (rawOccurrences || []).map((o: any) => o.id);
    let commentCountsMap = new Map<string, number>();
    if (occurrenceIds.length > 0) {
      const { data: commentCounts } = await admin
        .from('activity_comments')
        .select('occurrence_id, activity_id')
        .eq('workspace_id', workspaceId);

      (commentCounts || []).forEach((c: any) => {
        if (c.occurrence_id) {
          commentCountsMap.set(c.occurrence_id, (commentCountsMap.get(c.occurrence_id) || 0) + 1);
        }
      });
    }

    // 4. Transform into unified ActivityBoardItem
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let stats: ActivityStats = {
      total: 0,
      dueTodayCount: 0,
      dueSoonCount: 0,
      overdueCount: 0,
      inProgressCount: 0,
      upcomingCount: 0,
      completedCount: 0,
      draftCount: 0,
    };

    const boardItems: ActivityBoardItem[] = (rawOccurrences || [])
      .filter((row: any) => {
        // In active views, exclude archived activities
        const lifecycle = row.activities?.lifecycle_status || 'active';
        if (filters?.viewMode === 'review') {
          return lifecycle === 'draft';
        }
        return lifecycle !== 'archived';
      })
      .map((row: any) => {
        const act = row.activities || {};
        const prop = row.properties || {};
        const typeInfo = DEFAULT_ACTIVITY_TYPES.find((t) => t.id === act.activity_type_id) || {
          id: act.activity_type_id || 'other',
          name: 'General Activity',
          icon: 'CheckSquare',
          color: 'slate',
        };

        const { isOverdue, daysOverdue, daysLate } = calculateOverdueAndLate(
          row.due_date,
          row.status,
          row.completed_at
        );

        const assignedProfile = row.assigned_to ? profilesMap.get(row.assigned_to) : null;
        const completedProfile = row.completed_by ? profilesMap.get(row.completed_by) : null;

        // Calculate Stats
        stats.total++;
        if (row.status === 'completed') {
          stats.completedCount++;
        } else {
          if (isOverdue) stats.overdueCount++;
          if (row.status === 'in_progress') stats.inProgressCount++;

          const dueDateObj = new Date(row.due_date);
          dueDateObj.setHours(0, 0, 0, 0);
          const diffDays = Math.floor((dueDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          if (diffDays === 0) stats.dueTodayCount++;
          else if (diffDays > 0 && diffDays <= 3) stats.dueSoonCount++;
          else if (diffDays > 3) stats.upcomingCount++;
        }

        if (act.lifecycle_status === 'draft') {
          stats.draftCount++;
        }

        const actMeta = (act.metadata as Record<string, any>) || {};
        const occMeta = (row.metadata as Record<string, any>) || {};
        const isAutoCreated = Boolean(
          actMeta.auto_created ||
          actMeta.is_system_generated ||
          actMeta.source === 'autopilot' ||
          occMeta.auto_created ||
          occMeta.is_system_generated ||
          occMeta.source === 'autopilot' ||
          act.lease_id ||
          row.sequence_number > 1 ||
          act.title?.toLowerCase().includes('lease') ||
          act.title?.toLowerCase().includes('inspection') ||
          act.title?.toLowerCase().includes('defect') ||
          act.title?.toLowerCase().includes('safety audit') ||
          act.title?.toLowerCase().includes('rent review')
        );

        let autoSource: string | null = null;
        if (isAutoCreated) {
          if (actMeta.source) autoSource = String(actMeta.source);
          else if (act.title?.toLowerCase().includes('lease')) autoSource = 'Lease Trigger';
          else if (act.title?.toLowerCase().includes('defect')) autoSource = 'Inspection Defect';
          else if (act.title?.toLowerCase().includes('inspection') || act.title?.toLowerCase().includes('condition')) autoSource = 'Condition Report';
          else if (act.title?.toLowerCase().includes('safety') || act.title?.toLowerCase().includes('smoke')) autoSource = 'Statutory Compliance';
          else autoSource = 'Autopilot';
        }

        return {
          id: row.id,
          activityId: act.id,
          title: act.title || 'Untitled Activity',
          description: act.description,
          activityTypeId: typeInfo.id,
          activityTypeName: typeInfo.name,
          activityTypeIcon: typeInfo.icon,
          activityTypeColor: typeInfo.color,
          propertyId: prop.id,
          propertyName: prop.name || 'Property',
          propertyAddress: prop.address_line_1,
          leaseId: act.lease_id,
          tenantId: act.tenant_id,
          dueDate: row.due_date,
          status: row.status,
          isOverdue,
          daysOverdue,
          completedAt: row.completed_at,
          completedBy: row.completed_by,
          completedByName: completedProfile?.full_name,
          completionNotes: row.completion_notes,
          daysLate,
          assignedTo: row.assigned_to,
          assignedToName: assignedProfile?.full_name || 'Unassigned',
          assignedToAvatarUrl: assignedProfile?.avatar_url,
          isRecurring: Boolean(act.is_recurring),
          recurrenceFrequency: act.recurrence_frequency,
          recurrenceInterval: act.recurrence_interval,
          isAutoCreated,
          autoSource,
          sequenceNumber: row.sequence_number || 1,
          commentCount: commentCountsMap.get(row.id) || 0,
          lifecycleStatus: act.lifecycle_status || 'active',
          createdAt: row.created_at,
        };
      });

    // 5. Client-requested post-filters (e.g. search query, activity type, My Activities)
    let filtered = boardItems;

    if (filters?.viewMode === 'my') {
      filtered = filtered.filter((item) => item.assignedTo === user.id);
    }

    if (filters?.activityTypeId && filters.activityTypeId !== 'all') {
      filtered = filtered.filter((item) => item.activityTypeId === filters.activityTypeId);
    }

    if (filters?.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.propertyName.toLowerCase().includes(q) ||
          (item.assignedToName && item.assignedToName.toLowerCase().includes(q))
      );
    }

    return {
      success: true,
      data: filtered,
      stats,
    };
  } catch (error: any) {
    console.error('fetchActivitiesAction error:', error);
    return { success: false, error: error.message || 'Failed to fetch activities' };
  }
}

/**
 * Fetch full Activity Detail, Occurrence History, Comments, and Journal.
 */
export async function fetchActivityDetailAction(
  activityId: string,
  occurrenceId?: string
): Promise<{
  success: boolean;
  data?: ActivityDetailData;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const context = await resolveWorkspaceContext();
    if (!context?.workspaceId) return { success: false, error: 'No active workspace' };

    const workspaceId = context.workspaceId;
    const admin = await createAdminClient();

    // Check workspace permissions
    const { canViewAll } = await checkActivityPermissions(workspaceId, user.id);

    // 1. Fetch Activity
    const { data: rawActivity, error: actError } = await (admin as any)
      .from('activities')
      .select('*')
      .eq('id', activityId)
      .eq('workspace_id', workspaceId)
      .single();

    if (actError || !rawActivity) {
      return { success: false, error: 'Activity not found' };
    }
    const activity = rawActivity as any;

    // 2. Fetch Occurrences for this activity
    const { data: occurrences } = await (admin as any)
      .from('activity_occurrences')
      .select('*')
      .eq('activity_id', activityId)
      .order('sequence_number', { ascending: false });

    // If user does not have permission to view all workspace activities, verify assignment/creation
    if (!canViewAll) {
      const isAssigned = (occurrences || []).some((o: any) => o.assigned_to === user.id);
      const isCreator = activity.created_by === user.id;
      if (!isAssigned && !isCreator) {
        return { success: false, error: 'You only have permission to view your assigned tasks.' };
      }
    }

    const allOccurrences = (occurrences || []).map((o: any) => ({
      id: o.id,
      activityId: o.activity_id,
      workspaceId: o.workspace_id,
      propertyId: o.property_id,
      dueDate: o.due_date,
      assignedTo: o.assigned_to,
      status: o.status,
      completedAt: o.completed_at,
      completedBy: o.completed_by,
      completionNotes: o.completion_notes,
      sequenceNumber: o.sequence_number,
      metadata: o.metadata,
      createdAt: o.created_at,
      updatedAt: o.updated_at,
    }));

    // Identify current target occurrence
    const currentOccurrence = occurrenceId
      ? allOccurrences.find((o: any) => o.id === occurrenceId) || allOccurrences[0]
      : allOccurrences[0];

    if (!currentOccurrence) {
      return { success: false, error: 'No occurrences found for this activity' };
    }

    // 3. Fetch Property
    const { data: property } = await (admin as any)
      .from('properties')
      .select('id, name, address_line_1, city, state, postal_code')
      .eq('id', activity.property_id)
      .single();

    // 4. Fetch Profiles for assignees / actors
    const userIds = new Set<string>();
    if (currentOccurrence.assignedTo) userIds.add(currentOccurrence.assignedTo);
    if (currentOccurrence.completedBy) userIds.add(currentOccurrence.completedBy);

    // 5. Fetch Comments
    const { data: rawComments } = await (admin as any)
      .from('activity_comments')
      .select('*')
      .eq('activity_id', activityId)
      .order('created_at', { ascending: true });

    (rawComments || []).forEach((c: any) => userIds.add(c.user_id));

    // 6. Fetch Journal Events
    const { data: rawJournal } = await (admin as any)
      .from('activity_journal')
      .select('*')
      .eq('activity_id', activityId)
      .order('created_at', { ascending: false });

    (rawJournal || []).forEach((j: any) => {
      if (j.actor_id) userIds.add(j.actor_id);
    });

    let profilesMap = new Map<string, { full_name: string | null; avatar_url: string | null }>();
    if (userIds.size > 0) {
      const { data: profiles } = await (admin as any)
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', Array.from(userIds));

      (profiles || []).forEach((p: any) => {
        profilesMap.set(p.id, { full_name: p.full_name, avatar_url: p.avatar_url });
      });
    }

    const comments: ActivityComment[] = (rawComments || []).map((c: any) => ({
      id: c.id,
      workspaceId: c.workspace_id,
      activityId: c.activity_id,
      occurrenceId: c.occurrence_id,
      userId: c.user_id,
      userName: profilesMap.get(c.user_id)?.full_name || 'Team Member',
      userAvatarUrl: profilesMap.get(c.user_id)?.avatar_url,
      comment: c.comment,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }));

    const journal: ActivityJournalEntry[] = (rawJournal || []).map((j: any) => ({
      id: j.id,
      workspaceId: j.workspace_id,
      activityId: j.activity_id,
      occurrenceId: j.occurrence_id,
      eventType: j.event_type,
      actorId: j.actor_id,
      actorName: j.actor_id ? profilesMap.get(j.actor_id)?.full_name || 'System' : 'System',
      actorAvatarUrl: j.actor_id ? profilesMap.get(j.actor_id)?.avatar_url : null,
      metadata: j.metadata || {},
      createdAt: j.created_at,
    }));

    const typeInfo = DEFAULT_ACTIVITY_TYPES.find((t) => t.id === activity.activity_type_id) || {
      id: activity.activity_type_id || 'other',
      name: 'General Activity',
      slug: 'other',
      icon: 'CheckSquare',
      color: 'slate',
      isSystem: true,
    };

    const { daysOverdue, daysLate } = calculateOverdueAndLate(
      currentOccurrence.dueDate,
      currentOccurrence.status,
      currentOccurrence.completedAt
    );

    const assignedUser = currentOccurrence.assignedTo
      ? {
          id: currentOccurrence.assignedTo,
          name: profilesMap.get(currentOccurrence.assignedTo)?.full_name || 'Assigned User',
          avatarUrl: profilesMap.get(currentOccurrence.assignedTo)?.avatar_url,
        }
      : null;

    const completedByUser = currentOccurrence.completedBy
      ? {
          id: currentOccurrence.completedBy,
          name: profilesMap.get(currentOccurrence.completedBy)?.full_name || 'User',
        }
      : null;

    const prop = property as any;

    return {
      success: true,
      data: {
        activity: {
          id: activity.id,
          workspaceId: activity.workspace_id,
          propertyId: activity.property_id,
          leaseId: activity.lease_id,
          tenantId: activity.tenant_id,
          activityTypeId: activity.activity_type_id,
          title: activity.title,
          description: activity.description,
          lifecycleStatus: activity.lifecycle_status,
          createdBy: activity.created_by,
          ownerId: activity.owner_id,
          isRecurring: activity.is_recurring,
          recurrenceEnabled: activity.recurrence_enabled,
          recurrenceFrequency: activity.recurrence_frequency,
          recurrenceInterval: activity.recurrence_interval,
          recurrenceStartDate: activity.recurrence_start_date,
          recurrenceEndDate: activity.recurrence_end_date,
          metadata: activity.metadata,
          createdAt: activity.created_at,
          updatedAt: activity.updated_at,
        },
        currentOccurrence,
        activityType: typeInfo,
        property: {
          id: prop?.id || activity.property_id,
          name: prop?.name || 'Property',
          addressLine1: prop?.address_line_1 || '',
          city: prop?.city,
          state: prop?.state,
          postcode: prop?.postal_code,
        },
        assignedUser,
        completedByUser,
        occurrences: allOccurrences,
        comments,
        journal,
        daysOverdue,
        daysLate,
      },
    };
  } catch (error: any) {
    console.error('fetchActivityDetailAction error:', error);
    return { success: false, error: error.message || 'Failed to fetch activity details' };
  }
}

/**
 * Create a new Activity and its initial occurrence with journal log.
 */
export async function createActivityAction(input: CreateActivityInput): Promise<{
  success: boolean;
  activityId?: string;
  occurrenceId?: string;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const context = await resolveWorkspaceContext();
    if (!context?.workspaceId) return { success: false, error: 'No active workspace' };

    const workspaceId = context.workspaceId;
    const admin = await createAdminClient();

    const isRecurring = Boolean(input.isRecurring);
    const lifecycleStatus = input.lifecycleStatus || 'active';

    const { canCreate, canAssign } = await checkActivityPermissions(workspaceId, user.id);
    if (!canCreate) {
      return { success: false, error: 'You do not have permission to create activities or tasks.' };
    }

    const assignedTarget = canAssign ? (input.assignedTo || null) : user.id;

    // 1. Insert Activity Definition
    const { data: newActivity, error: actError } = await (admin as any)
      .from('activities')
      .insert({
        workspace_id: workspaceId,
        property_id: input.propertyId,
        lease_id: input.leaseId || null,
        tenant_id: input.tenantId || null,
        activity_type_id: input.activityTypeId || 'other',
        title: input.title.trim(),
        description: input.description?.trim() || null,
        lifecycle_status: lifecycleStatus,
        created_by: user.id,
        owner_id: assignedTarget || user.id,
        is_recurring: isRecurring,
        recurrence_enabled: isRecurring,
        recurrence_frequency: isRecurring ? input.recurrenceFrequency || 'monthly' : null,
        recurrence_interval: input.recurrenceInterval || 1,
        recurrence_start_date: input.dueDate,
      } as any)
      .select('id')
      .single();

    if (actError || !newActivity) {
      console.error('Error inserting activity:', actError);
      return { success: false, error: actError?.message || 'Failed to create activity' };
    }

    const activityId = (newActivity as any).id;

    // 2. Insert First Occurrence (sequence_number = 1)
    const { data: newOccurrence, error: occError } = await (admin as any)
      .from('activity_occurrences')
      .insert({
        activity_id: activityId,
        workspace_id: workspaceId,
        property_id: input.propertyId,
        due_date: input.dueDate,
        assigned_to: assignedTarget || null,
        status: 'open',
        sequence_number: 1,
      } as any)
      .select('id')
      .single();

    if (occError || !newOccurrence) {
      console.error('Error inserting occurrence:', occError);
      return { success: false, error: occError?.message || 'Failed to create occurrence' };
    }

    const occurrenceId = (newOccurrence as any).id;

    // 3. Append to Activity Journal
    await (admin as any).from('activity_journal').insert([
      {
        workspace_id: workspaceId,
        activity_id: activityId,
        occurrence_id: occurrenceId,
        event_type: 'activity_created',
        actor_id: user.id,
        metadata: {
          title: input.title,
          property_id: input.propertyId,
          activity_type_id: input.activityTypeId,
          lifecycle_status: lifecycleStatus,
        },
      },
      {
        workspace_id: workspaceId,
        activity_id: activityId,
        occurrence_id: occurrenceId,
        event_type: 'occurrence_created',
        actor_id: user.id,
        metadata: {
          due_date: input.dueDate,
          assigned_to: assignedTarget || null,
          sequence_number: 1,
        },
      },
    ] as any);

    revalidatePath('/dashboard/activity');
    revalidatePath('/dashboard/tasks');
    return { success: true, activityId, occurrenceId };
  } catch (error: any) {
    console.error('createActivityAction error:', error);
    return { success: false, error: error.message || 'Failed to create activity' };
  }
}

/**
 * Update Activity definition details.
 */
export async function updateActivityAction(
  activityId: string,
  input: UpdateActivityInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const context = await resolveWorkspaceContext();
    if (!context?.workspaceId) return { success: false, error: 'No active workspace' };

    const workspaceId = context.workspaceId;
    const admin = await createAdminClient();

    const { canUpdate } = await checkActivityPermissions(workspaceId, user.id);
    if (!canUpdate) {
      return { success: false, error: 'You do not have permission to update activities or tasks.' };
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (input.title !== undefined) updatePayload.title = input.title.trim();
    if (input.description !== undefined) updatePayload.description = input.description?.trim() || null;
    if (input.activityTypeId !== undefined) updatePayload.activity_type_id = input.activityTypeId;
    if (input.propertyId !== undefined) updatePayload.property_id = input.propertyId;
    if (input.leaseId !== undefined) updatePayload.lease_id = input.leaseId;
    if (input.tenantId !== undefined) updatePayload.tenant_id = input.tenantId;
    if (input.isRecurring !== undefined) {
      updatePayload.is_recurring = input.isRecurring;
      updatePayload.recurrence_enabled = input.isRecurring;
    }
    if (input.recurrenceFrequency !== undefined) updatePayload.recurrence_frequency = input.recurrenceFrequency;
    if (input.recurrenceInterval !== undefined) updatePayload.recurrence_interval = input.recurrenceInterval;
    if (input.lifecycleStatus !== undefined) updatePayload.lifecycle_status = input.lifecycleStatus;

    const { error: updateError } = await (admin as any)
      .from('activities')
      .update(updatePayload)
      .eq('id', activityId)
      .eq('workspace_id', workspaceId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Write Journal entry
    await (admin as any).from('activity_journal').insert({
      workspace_id: workspaceId,
      activity_id: activityId,
      event_type: 'activity_updated',
      actor_id: user.id,
      metadata: updatePayload,
    } as any);

    revalidatePath('/dashboard/activity');
    revalidatePath('/dashboard/tasks');
    return { success: true };
  } catch (error: any) {
    console.error('updateActivityAction error:', error);
    return { success: false, error: error.message || 'Failed to update activity' };
  }
}

/**
 * Update Occurrence status (e.g. Open -> In Progress -> Completed).
 */
export async function updateOccurrenceStatusAction(
  occurrenceId: string,
  newStatus: 'open' | 'in_progress' | 'delayed' | 'completed' | 'cancelled'
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const context = await resolveWorkspaceContext();
    if (!context?.workspaceId) return { success: false, error: 'No active workspace' };

    const workspaceId = context.workspaceId;
    const admin = await createAdminClient();

    // Fetch occurrence and activity info
    const { data: occ, error: occError } = await (admin as any)
      .from('activity_occurrences')
      .select('id, activity_id, status, assigned_to')
      .eq('id', occurrenceId)
      .eq('workspace_id', workspaceId)
      .single();

    if (occError || !occ) return { success: false, error: 'Occurrence not found' };

    const { canUpdate } = await checkActivityPermissions(workspaceId, user.id);
    const isAssigned = (occ as any).assigned_to === user.id;

    if (!canUpdate && !isAssigned) {
      return { success: false, error: 'You only have permission to update your assigned tasks.' };
    }

    const previousStatus = (occ as any).status;

    // If changing to completed, delegate to completeOccurrenceAction
    if (newStatus === 'completed') {
      return completeOccurrenceAction({ occurrenceId });
    }

    const { error: updateError } = await (admin as any)
      .from('activity_occurrences')
      .update({
        status: newStatus,
        completed_at: null,
        completed_by: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', occurrenceId)
      .eq('workspace_id', workspaceId);

    if (updateError) return { success: false, error: updateError.message };

    await (admin as any).from('activity_journal').insert({
      workspace_id: workspaceId,
      activity_id: (occ as any).activity_id,
      occurrence_id: occurrenceId,
      event_type: 'status_changed',
      actor_id: user.id,
      metadata: {
        previous_status: previousStatus,
        new_status: newStatus,
      },
    } as any);

    revalidatePath('/dashboard/activity');
    revalidatePath('/dashboard/tasks');
    return { success: true };
  } catch (error: any) {
    console.error('updateOccurrenceStatusAction error:', error);
    return { success: false, error: error.message || 'Failed to update status' };
  }
}

/**
 * Update Occurrence responsible assignee.
 */
export async function updateOccurrenceAssignmentAction(
  occurrenceId: string,
  assignedTo: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const context = await resolveWorkspaceContext();
    if (!context?.workspaceId) return { success: false, error: 'No active workspace' };

    const workspaceId = context.workspaceId;
    const admin = await createAdminClient();

    const { canAssign } = await checkActivityPermissions(workspaceId, user.id);
    if (!canAssign) {
      return { success: false, error: 'You do not have permission to assign activities or tasks.' };
    }

    const { data: occ, error: occError } = await (admin as any)
      .from('activity_occurrences')
      .select('id, activity_id, assigned_to')
      .eq('id', occurrenceId)
      .eq('workspace_id', workspaceId)
      .single();

    if (occError || !occ) return { success: false, error: 'Occurrence not found' };

    const previousAssignee = (occ as any).assigned_to;

    const { error: updateError } = await (admin as any)
      .from('activity_occurrences')
      .update({
        assigned_to: assignedTo || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', occurrenceId)
      .eq('workspace_id', workspaceId);

    if (updateError) return { success: false, error: updateError.message };

    await (admin as any).from('activity_journal').insert({
      workspace_id: workspaceId,
      activity_id: (occ as any).activity_id,
      occurrence_id: occurrenceId,
      event_type: 'assignee_changed',
      actor_id: user.id,
      metadata: {
        previous_assignee: previousAssignee,
        new_assignee: assignedTo,
      },
    } as any);

    revalidatePath('/dashboard/activity');
    revalidatePath('/dashboard/tasks');
    return { success: true };
  } catch (error: any) {
    console.error('updateOccurrenceAssignmentAction error:', error);
    return { success: false, error: error.message || 'Failed to update assignment' };
  }
}

/**
 * Update Occurrence due date.
 */
export async function updateOccurrenceDueDateAction(
  occurrenceId: string,
  newDueDate: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const context = await resolveWorkspaceContext();
    if (!context?.workspaceId) return { success: false, error: 'No active workspace' };

    const workspaceId = context.workspaceId;
    const admin = await createAdminClient();

    const { canUpdate } = await checkActivityPermissions(workspaceId, user.id);
    const { data: occ, error: occError } = await (admin as any)
      .from('activity_occurrences')
      .select('id, activity_id, due_date, assigned_to')
      .eq('id', occurrenceId)
      .eq('workspace_id', workspaceId)
      .single();

    if (occError || !occ) return { success: false, error: 'Occurrence not found' };

    const isAssigned = (occ as any).assigned_to === user.id;
    if (!canUpdate && !isAssigned) {
      return { success: false, error: 'You only have permission to update your assigned tasks.' };
    }

    const previousDueDate = (occ as any).due_date;

    const { error: updateError } = await (admin as any)
      .from('activity_occurrences')
      .update({
        due_date: newDueDate,
        updated_at: new Date().toISOString(),
      })
      .eq('id', occurrenceId)
      .eq('workspace_id', workspaceId);

    if (updateError) return { success: false, error: updateError.message };

    await (admin as any).from('activity_journal').insert({
      workspace_id: workspaceId,
      activity_id: (occ as any).activity_id,
      occurrence_id: occurrenceId,
      event_type: 'due_date_changed',
      actor_id: user.id,
      metadata: {
        previous_due_date: previousDueDate,
        new_due_date: newDueDate,
      },
    } as any);

    revalidatePath('/dashboard/activity');
    revalidatePath('/dashboard/tasks');
    return { success: true };
  } catch (error: any) {
    console.error('updateOccurrenceDueDateAction error:', error);
    return { success: false, error: error.message || 'Failed to update due date' };
  }
}

/**
 * Complete Occurrence with atomic recurrence creation (Autopilot core).
 */
export async function completeOccurrenceAction(
  input: CompleteOccurrenceInput
): Promise<{ success: boolean; nextOccurrenceId?: string; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const context = await resolveWorkspaceContext();
    if (!context?.workspaceId) return { success: false, error: 'No active workspace' };

    const workspaceId = context.workspaceId;
    const admin = await createAdminClient();

    // 1. Fetch current occurrence + parent activity definition
    const { data: rawOcc, error: occError } = await (admin as any)
      .from('activity_occurrences')
      .select(`
        id,
        activity_id,
        property_id,
        due_date,
        assigned_to,
        status,
        sequence_number,
        activities!inner (
          id,
          title,
          is_recurring,
          recurrence_enabled,
          recurrence_frequency,
          recurrence_interval,
          owner_id
        )
      `)
      .eq('id', input.occurrenceId)
      .eq('workspace_id', workspaceId)
      .single();

    if (occError || !rawOcc) return { success: false, error: 'Occurrence not found' };
    const occ = rawOcc as any;

    const { canUpdate } = await checkActivityPermissions(workspaceId, user.id);
    const isAssigned = occ.assigned_to === user.id;
    if (!canUpdate && !isAssigned) {
      return { success: false, error: 'You only have permission to complete your assigned tasks.' };
    }

    const completedAt = input.completionDate
      ? new Date(input.completionDate).toISOString()
      : new Date().toISOString();

    const { daysLate } = calculateOverdueAndLate(occ.due_date, 'completed', completedAt);

    // 2. Mark current occurrence completed
    const { error: updateError } = await (admin as any)
      .from('activity_occurrences')
      .update({
        status: 'completed',
        completed_at: completedAt,
        completed_by: user.id,
        completion_notes: input.completionNotes?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.occurrenceId)
      .eq('workspace_id', workspaceId);

    if (updateError) return { success: false, error: updateError.message };

    // 3. Write completion Journal entry
    await (admin as any).from('activity_journal').insert({
      workspace_id: workspaceId,
      activity_id: occ.activity_id,
      occurrence_id: occ.id,
      event_type: 'activity_completed',
      actor_id: user.id,
      metadata: {
        completed_at: completedAt,
        due_date: occ.due_date,
        days_late: daysLate,
        completion_notes: input.completionNotes || null,
      },
    } as any);

    // 4. Handle Recurring Generation
    const act = occ.activities;
    let nextOccurrenceId: string | undefined;

    if (act && act.is_recurring && act.recurrence_enabled && act.recurrence_frequency) {
      const nextSequence = (occ.sequence_number || 1) + 1;

      // Check if next occurrence already exists (Idempotency)
      const { data: existingNext } = await (admin as any)
        .from('activity_occurrences')
        .select('id')
        .eq('activity_id', act.id)
        .eq('sequence_number', nextSequence)
        .maybeSingle();

      if (!existingNext) {
        const nextDueDate = calculateNextDueDate(
          occ.due_date,
          act.recurrence_frequency,
          act.recurrence_interval || 1
        );

        const nextAssignee = occ.assigned_to || act.owner_id || user.id;

        const { data: newNextOcc, error: nextOccError } = await (admin as any)
          .from('activity_occurrences')
          .insert({
            activity_id: act.id,
            workspace_id: workspaceId,
            property_id: occ.property_id,
            due_date: nextDueDate,
            assigned_to: nextAssignee,
            status: 'open',
            sequence_number: nextSequence,
          } as any)
          .select('id')
          .single();

        if (newNextOcc) {
          nextOccurrenceId = (newNextOcc as any).id;

          // Record Journal Event for next occurrence
          await (admin as any).from('activity_journal').insert({
            workspace_id: workspaceId,
            activity_id: act.id,
            occurrence_id: (newNextOcc as any).id,
            event_type: 'next_occurrence_created',
            actor_id: user.id,
            metadata: {
              due_date: nextDueDate,
              sequence_number: nextSequence,
              assigned_to: nextAssignee,
              frequency: act.recurrence_frequency,
            },
          } as any);
        } else if (nextOccError) {
          console.error('Error generating next recurrence occurrence:', nextOccError);
        }
      }
    }

    revalidatePath('/dashboard/activity');
    revalidatePath('/dashboard/tasks');
    return { success: true, nextOccurrenceId };
  } catch (error: any) {
    console.error('completeOccurrenceAction error:', error);
    return { success: false, error: error.message || 'Failed to complete occurrence' };
  }
}

/**
 * Add Comment to Activity or Occurrence.
 */
export async function addActivityCommentAction(
  activityId: string,
  commentText: string,
  occurrenceId?: string | null
): Promise<{ success: boolean; comment?: ActivityComment; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const context = await resolveWorkspaceContext();
    if (!context?.workspaceId) return { success: false, error: 'No active workspace' };

    const workspaceId = context.workspaceId;
    const admin = await createAdminClient();

    const { data: newComment, error: commentError } = await (admin as any)
      .from('activity_comments')
      .insert({
        workspace_id: workspaceId,
        activity_id: activityId,
        occurrence_id: occurrenceId || null,
        user_id: user.id,
        comment: commentText.trim(),
      } as any)
      .select('*')
      .single();

    if (commentError || !newComment) {
      return { success: false, error: commentError?.message || 'Failed to add comment' };
    }

    const commentRecord = newComment as any;

    // Write Journal entry
    await (admin as any).from('activity_journal').insert({
      workspace_id: workspaceId,
      activity_id: activityId,
      occurrence_id: occurrenceId || null,
      event_type: 'comment_added',
      actor_id: user.id,
      metadata: {
        comment_id: commentRecord.id,
        occurrence_scoped: Boolean(occurrenceId),
      },
    } as any);

    const { data: profile } = await (admin as any)
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .single();

    const prof = profile as any;

    const formattedComment: ActivityComment = {
      id: commentRecord.id,
      workspaceId: commentRecord.workspace_id,
      activityId: commentRecord.activity_id,
      occurrenceId: commentRecord.occurrence_id,
      userId: commentRecord.user_id,
      userName: prof?.full_name || 'Team Member',
      userAvatarUrl: prof?.avatar_url,
      comment: commentRecord.comment,
      createdAt: commentRecord.created_at,
      updatedAt: commentRecord.updated_at,
    };

    revalidatePath('/dashboard/activity');
    revalidatePath('/dashboard/tasks');
    return { success: true, comment: formattedComment };
  } catch (error: any) {
    console.error('addActivityCommentAction error:', error);
    return { success: false, error: error.message || 'Failed to add comment' };
  }
}

/**
 * Delete Comment.
 */
export async function deleteActivityCommentAction(
  commentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const context = await resolveWorkspaceContext();
    if (!context?.workspaceId) return { success: false, error: 'No active workspace' };

    const admin = await createAdminClient();

    const { error: delError } = await (admin as any)
      .from('activity_comments')
      .delete()
      .eq('id', commentId)
      .eq('workspace_id', context.workspaceId);

    if (delError) return { success: false, error: delError.message };

    revalidatePath('/dashboard/activity');
    revalidatePath('/dashboard/tasks');
    return { success: true };
  } catch (error: any) {
    console.error('deleteActivityCommentAction error:', error);
    return { success: false, error: error.message || 'Failed to delete comment' };
  }
}

/**
 * Archive Activity.
 */
export async function archiveActivityAction(
  activityId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const context = await resolveWorkspaceContext();
    if (!context?.workspaceId) return { success: false, error: 'No active workspace' };

    const workspaceId = context.workspaceId;
    const admin = await createAdminClient();

    const { canDelete } = await checkActivityPermissions(workspaceId, user.id);
    if (!canDelete) {
      return { success: false, error: 'You do not have permission to delete or archive tasks.' };
    }

    const { error } = await (admin as any)
      .from('activities')
      .update({
        lifecycle_status: 'archived',
        updated_at: new Date().toISOString(),
      })
      .eq('id', activityId)
      .eq('workspace_id', context.workspaceId);

    if (error) return { success: false, error: error.message };

    await (admin as any).from('activity_journal').insert({
      workspace_id: context.workspaceId,
      activity_id: activityId,
      event_type: 'activity_archived',
      actor_id: user.id,
      metadata: {},
    } as any);

    revalidatePath('/dashboard/activity');
    revalidatePath('/dashboard/tasks');
    return { success: true };
  } catch (error: any) {
    console.error('archiveActivityAction error:', error);
    return { success: false, error: error.message || 'Failed to archive activity' };
  }
}

/**
 * Activate a Suggested Draft Activity.
 */
export async function activateSuggestedActivityAction(
  activityId: string,
  dueDate: string,
  assignedTo?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const context = await resolveWorkspaceContext();
    if (!context?.workspaceId) return { success: false, error: 'No active workspace' };

    const workspaceId = context.workspaceId;
    const admin = await createAdminClient();

    const { canCreate } = await checkActivityPermissions(workspaceId, user.id);
    if (!canCreate) {
      return { success: false, error: 'You do not have permission to activate activities.' };
    }

    // 1. Move to 'active'
    const { data: act, error: actError } = await (admin as any)
      .from('activities')
      .update({
        lifecycle_status: 'active',
        owner_id: assignedTo || user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', activityId)
      .eq('workspace_id', workspaceId)
      .select('id, property_id')
      .single();

    if (actError || !act) return { success: false, error: actError?.message || 'Activity not found' };

    const activity = act as any;

    // 2. Ensure live occurrence exists
    const { data: existingOcc } = await (admin as any)
      .from('activity_occurrences')
      .select('id')
      .eq('activity_id', activityId)
      .maybeSingle();

    let occId = (existingOcc as any)?.id;

    if (!occId) {
      const { data: newOcc } = await (admin as any)
        .from('activity_occurrences')
        .insert({
          activity_id: activityId,
          workspace_id: workspaceId,
          property_id: activity.property_id,
          due_date: dueDate,
          assigned_to: assignedTo || user.id,
          status: 'open',
          sequence_number: 1,
        } as any)
        .select('id')
        .single();
      occId = (newOcc as any)?.id;
    } else {
      await (admin as any)
        .from('activity_occurrences')
        .update({
          due_date: dueDate,
          assigned_to: assignedTo || user.id,
          status: 'open',
          updated_at: new Date().toISOString(),
        })
        .eq('id', occId);
    }

    // 3. Journal event
    await (admin as any).from('activity_journal').insert({
      workspace_id: workspaceId,
      activity_id: activityId,
      occurrence_id: occId,
      event_type: 'activity_made_live',
      actor_id: user.id,
      metadata: {
        due_date: dueDate,
        assigned_to: assignedTo || user.id,
      },
    } as any);

    revalidatePath('/dashboard/activity');
    revalidatePath('/dashboard/tasks');
    return { success: true };
  } catch (error: any) {
    console.error('activateSuggestedActivityAction error:', error);
    return { success: false, error: error.message || 'Failed to activate activity' };
  }
}

/**
 * Dismiss/Remove a suggested draft activity.
 */
export async function dismissSuggestedActivityAction(
  activityId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const context = await resolveWorkspaceContext();
    if (!context?.workspaceId) return { success: false, error: 'No active workspace' };

    const workspaceId = context.workspaceId;
    const admin = await createAdminClient();

    const { canDelete } = await checkActivityPermissions(workspaceId, user.id);
    if (!canDelete) {
      return { success: false, error: 'You do not have permission to dismiss activities.' };
    }

    const { error } = await (admin as any)
      .from('activities')
      .delete()
      .eq('id', activityId)
      .eq('workspace_id', context.workspaceId)
      .eq('lifecycle_status', 'draft');

    if (error) return { success: false, error: error.message };

    revalidatePath('/dashboard/activity');
    revalidatePath('/dashboard/tasks');
    return { success: true };
  } catch (error: any) {
    console.error('dismissSuggestedActivityAction error:', error);
    return { success: false, error: error.message || 'Failed to dismiss activity' };
  }
}

/**
 * Fetch workspace assignable members.
 */
export async function fetchWorkspaceTeamMembersAction(): Promise<{
  success: boolean;
  data?: Array<{ id: string; name: string; avatarUrl?: string | null; role: string }>;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const context = await resolveWorkspaceContext();
    if (!context?.workspaceId) return { success: false, error: 'No active workspace' };

    const admin = await createAdminClient();

    // 1. Fetch workspace details to get owner
    const { data: workspace } = await (admin as any)
      .from('workspaces')
      .select('id, owner_id')
      .eq('id', context.workspaceId)
      .maybeSingle();

    // 2. Fetch active workspace members
    const { data: members, error: membersError } = await (admin as any)
      .from('workspace_members')
      .select('user_id, role, role_id, status, team_roles ( name )')
      .eq('workspace_id', context.workspaceId)
      .eq('status', 'active');

    if (membersError) {
      console.error('Error fetching workspace team members:', membersError);
    }

    // 3. Collect all unique user IDs
    const userIdsSet = new Set<string>();
    if (workspace?.owner_id) userIdsSet.add(workspace.owner_id);
    userIdsSet.add(user.id);
    (members || []).forEach((m: any) => {
      if (m.user_id) userIdsSet.add(m.user_id);
    });

    const userIds = Array.from(userIdsSet);
    const { data: profiles } = userIds.length
      ? await admin.from('profiles').select('id, full_name, avatar_url').in('id', userIds)
      : { data: [] };

    const profileMap = new Map(
      (profiles || []).map((p: any) => [p.id, p])
    );

    const memberMap = new Map<string, { role: string }>();
    (members || []).forEach((m: any) => {
      memberMap.set(m.user_id, {
        role: m.team_roles?.name || m.role || 'Member',
      });
    });

    const team = userIds.map((uid) => {
      const p = profileMap.get(uid);
      const isOwner = workspace?.owner_id === uid;
      const mem = memberMap.get(uid);
      const roleName = isOwner ? 'owner' : (mem?.role || (uid === user.id ? 'owner' : 'Member'));
      
      const displayName = p?.full_name || (uid === user.id ? 'You' : 'Team Member');

      return {
        id: uid,
        name: displayName,
        avatarUrl: p?.avatar_url || null,
        role: roleName,
      };
    });

    return { success: true, data: team };
  } catch (error: any) {
    console.error('fetchWorkspaceTeamMembersAction error:', error);
    return { success: false, error: error.message || 'Failed to fetch team members' };
  }
}

/**
 * Fetch available Activity Types.
 */
export async function fetchActivityTypesAction(): Promise<ActivityType[]> {
  try {
    const admin = await createAdminClient();
    const { data: types } = await admin
      .from('activity_types')
      .select('*')
      .order('name', { ascending: true });

    if (types && types.length > 0) {
      return types.map((t: any) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        icon: t.icon || 'CheckSquare',
        color: t.color || 'slate',
        description: t.description,
        isSystem: t.is_system,
        workspaceId: t.workspace_id,
      }));
    }
  } catch {
    // Fallback to default types
  }
  return DEFAULT_ACTIVITY_TYPES;
}
