'use server';

import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { assertWorkspaceSeatAvailable } from '@/lib/entitlements/workspace-seats';
import { authorizeOrThrow } from '@/lib/auth/authorize';
import { requireAuthenticatedUser } from '@/lib/auth/authorization';
import { ENTITLEMENT_KEYS } from '@/lib/entitlements/types';
import { setActiveWorkspaceCookie } from '@/lib/auth/authorization';
import { getAppBaseUrl } from '@/lib/routing/env';
import { serverCache } from '@/lib/cache/server-cache';

async function requireTeamManagement(workspaceId: string) {
  await authorizeOrThrow({
    workspaceId,
    permission: 'team.member.invite',
    entitlement: ENTITLEMENT_KEYS.TEAM_MANAGEMENT_ENABLED,
  });
}

async function requireTeamInviteAuth(workspaceId: string) {
  await authorizeOrThrow({
    workspaceId,
    permission: 'team.member.invite',
    entitlement: ENTITLEMENT_KEYS.TEAM_MANAGEMENT_ENABLED,
    checkTeamMemberLimit: true,
  });
}

async function requireTeamPermission(workspaceId: string, permission: Parameters<typeof authorizeOrThrow>[0]['permission']) {
  await authorizeOrThrow({ workspaceId, permission });
}

async function logWorkspaceMemberActivity(
  workspaceId: string,
  userId: string,
  action: string,
  entityId: string,
  metadata: Record<string, unknown> = {}
) {
  const admin = await createAdminClient();
  await admin.from('activity_logs').insert({
    workspace_id: workspaceId,
    property_id: null,
    user_id: userId,
    action,
    entity_type: 'workspace_member',
    entity_id: entityId,
    metadata,
  } as never);
}

function legacyWorkspaceRole(roleName: string): 'owner' | 'admin' | 'manager' | 'agent' | 'staff' | 'viewer' {
  switch (roleName.toLowerCase()) {
    case 'owner':
      return 'owner';
    case 'admin':
      return 'admin';
    case 'manager':
      return 'manager';
    case 'leasing agent':
      return 'agent';
    case 'staff':
      return 'staff';
    default:
      return 'viewer';
  }
}

export interface TeamRoleOption {
  roleId: string;
  name: string;
  description: string | null;
  isSystemRole: boolean;
  permissionCount: number;
}

export interface WorkspaceMemberRow {
  id: string;
  userId: string;
  fullName: string | null;
  avatarUrl: string | null;
  publicId: string | null;
  roleId: string | null;
  roleName: string | null;
  status: string;
  joinedAt: string | null;
  isSystemRole: boolean;
}

export interface PendingInvitationRow {
  id: string;
  roleName: string;
  inviteType: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  invitedByName: string | null;
}

export interface PermissionRow {
  key: string;
  name: string;
  resource: string;
  action: string;
}

export async function fetchAssignableRoles(workspaceId: string): Promise<TeamRoleOption[]> {
  await requireTeamManagement(workspaceId);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    'get_assignable_team_roles' as never,
    { p_workspace_id: workspaceId } as never
  );
  if (error) throw new Error(error.message);
  return (data as Array<{
    role_id: string;
    name: string;
    description: string | null;
    is_system_role: boolean;
    permission_count: number;
  }>).map((r) => ({
    roleId: r.role_id,
    name: r.name,
    description: r.description,
    isSystemRole: r.is_system_role,
    permissionCount: Number(r.permission_count),
  }));
}

export async function fetchRolePermissions(roleId: string): Promise<PermissionRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    'get_role_permissions' as never,
    { p_role_id: roleId } as never
  );
  if (error) throw new Error(error.message);
  return (data as PermissionRow[]) || [];
}

export async function createInviteLink(workspaceId: string, roleId: string) {
  await requireTeamInviteAuth(workspaceId);
  const user = await requireAuthenticatedUser();
  const supabase = await createClient();
  const admin = await createAdminClient();

  const { data, error } = await supabase.rpc(
    'create_workspace_invitation' as never,
    {
      p_workspace_id: workspaceId,
      p_role_id: roleId,
      p_invite_type: 'LINK',
    } as never
  );

  let rawToken: string;
  let invitationId: string;

  if (error || !data || !(data as any[])?.[0]) {
    // Fallback: Generate cryptographically secure token & insert directly
    const rawBytes = crypto.randomBytes(32);
    rawToken = rawBytes.toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { data: inv, error: insertError } = await (admin as any)
      .from('workspace_invitations')
      .insert({
        workspace_id: workspaceId,
        invited_by: user.id,
        role_id: roleId,
        token_hash: tokenHash,
        invite_type: 'LINK',
        status: 'pending',
        expires_at: expiresAt.toISOString(),
      })
      .select('id')
      .single();

    if (insertError) throw new Error(insertError.message);
    invitationId = inv.id;

    await logWorkspaceMemberActivity(workspaceId, user.id, 'member.invite_created', invitationId, {
      invitation_id: invitationId,
      role_id: roleId,
      invite_type: 'LINK',
    });
  } else {
    const row = (data as Array<{ invitation_id: string; raw_token: string }>)[0];
    invitationId = row.invitation_id;
    rawToken = row.raw_token;
  }

  const appUrl = getAppBaseUrl();
  revalidatePath('/dashboard/team');
  return {
    invitationId,
    inviteUrl: `${appUrl}/join/${rawToken}`,
    token: rawToken,
  };
}

export async function revokeInvitation(workspaceId: string, invitationId: string) {
  await requireTeamManagement(workspaceId);
  const supabase = await createClient();
  const { error } = await supabase.rpc(
    'revoke_workspace_invitation' as never,
    { p_invitation_id: invitationId } as never
  );
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/team');
}

export async function lookupProfile(publicId: string) {
  await requireAuthenticatedUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    'lookup_profile_by_public_id' as never,
    { p_public_id: publicId.trim() } as never
  );
  if (error) throw new Error(error.message);
  const row = (data as Array<{ id: string; public_id: string; full_name: string | null; avatar_url: string | null }>)?.[0];
  if (!row) return null;
  return {
    id: row.id,
    publicId: row.public_id,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
  };
}

export async function addMemberByProfileId(
  workspaceId: string,
  publicId: string,
  roleId: string,
  propertyAccess?: { mode: 'all' | 'custom'; propertyIds: string[] }
) {
  await requireTeamInviteAuth(workspaceId);
  const user = await requireAuthenticatedUser();
  const supabase = await createClient();
  const admin = await createAdminClient();

  const profile = await lookupProfile(publicId);
  if (!profile) throw new Error('PROFILE_NOT_FOUND');

  const { data: existing } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', profile.id)
    .eq('status', 'active')
    .maybeSingle();

  if (existing) throw new Error('ALREADY_MEMBER');

  const { data: role, error: roleError } = await supabase
    .from('team_roles')
    .select('id, name, workspace_id')
    .eq('id', roleId)
    .maybeSingle();

  if (roleError || !role) throw new Error('INVALID_ROLE');

  const roleRow = role as { id: string; name: string; workspace_id: string | null };
  if (roleRow.workspace_id && roleRow.workspace_id !== workspaceId) {
    throw new Error('INVALID_ROLE');
  }

  const assignable = await fetchAssignableRoles(workspaceId);
  if (!assignable.some((r) => r.roleId === roleId)) {
    throw new Error('FORBIDDEN: cannot assign role');
  }

  const { data: member, error: insertError } = await admin
    .from('workspace_members')
    .upsert(
      {
        workspace_id: workspaceId,
        user_id: profile.id,
        role_id: roleId,
        role: legacyWorkspaceRole(roleRow.name),
        status: 'active',
        invited_by: user.id,
        joined_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: 'workspace_id,user_id' }
    )
    .select('id')
    .single();

  if (insertError) throw new Error(insertError.message);

  const memberId = (member as { id: string }).id;

  if (propertyAccess && propertyAccess.mode === 'custom') {
    await updateMemberPropertyAccess(workspaceId, memberId, propertyAccess);
  } else {
    const { error: syncError } = await admin.rpc(
      'sync_workspace_member_property_access' as never,
      { p_workspace_id: workspaceId, p_user_id: profile.id } as never
    );
    if (syncError) throw new Error(syncError.message);
  }

  await logWorkspaceMemberActivity(workspaceId, user.id, 'member.added', memberId, {
    target_user_id: profile.id,
    role_id: roleId,
  });

  serverCache.invalidateWorkspace(workspaceId);
  serverCache.invalidateUser(profile.id);
  revalidatePath('/dashboard/team');
  return {
    member_id: memberId,
    user_id: profile.id,
    role_name: roleRow.name,
  };
}

export async function changeMemberRole(workspaceId: string, memberId: string, roleId: string) {
  await requireTeamPermission(workspaceId, 'team.member.update');
  const assignable = await fetchAssignableRoles(workspaceId);
  if (!assignable.some((r) => r.roleId === roleId)) {
    throw new Error('FORBIDDEN: You do not have permission to assign this role');
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc(
    'change_workspace_member_role' as never,
    { p_member_id: memberId, p_role_id: roleId } as never
  );
  if (error) throw new Error(error.message);
  serverCache.invalidateWorkspace(workspaceId);
  revalidatePath('/dashboard/team');
}

export async function removeMember(workspaceId: string, memberId: string) {
  await requireTeamPermission(workspaceId, 'team.member.remove');
  const user = await requireAuthenticatedUser();
  const supabase = await createClient();
  const admin = await createAdminClient();

  const { data: member, error: fetchError } = await supabase
    .from('workspace_members')
    .select('id, user_id, workspace_id')
    .eq('id', memberId)
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (fetchError || !member) throw new Error('NOT_FOUND');

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('owner_id')
    .eq('id', workspaceId)
    .single();

  if ((workspace as { owner_id?: string } | null)?.owner_id === (member as { user_id: string }).user_id) {
    throw new Error('CANNOT_REMOVE_OWNER');
  }

  const { error } = await (admin as any)
    .from('workspace_members')
    .update({ status: 'removed', updated_at: new Date().toISOString() })
    .eq('id', memberId)
    .eq('workspace_id', workspaceId);

  if (error) throw new Error(error.message);

  await admin.rpc(
    'revoke_workspace_member_property_access' as never,
    {
      p_workspace_id: workspaceId,
      p_user_id: (member as { user_id: string }).user_id,
      p_status: 'removed',
    } as never
  );

  await logWorkspaceMemberActivity(workspaceId, user.id, 'member.removed', memberId);
  serverCache.invalidateWorkspace(workspaceId);
  serverCache.invalidateUser((member as { user_id: string }).user_id);
  revalidatePath('/dashboard/team');
}

export async function suspendMember(workspaceId: string, memberId: string) {
  await requireTeamPermission(workspaceId, 'team.member.update');
  const user = await requireAuthenticatedUser();
  const supabase = await createClient();
  const admin = await createAdminClient();

  const { data: member, error: fetchError } = await supabase
    .from('workspace_members')
    .select('id, workspace_id, user_id')
    .eq('id', memberId)
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (fetchError || !member) throw new Error('NOT_FOUND');

  const { error } = await (admin as any)
    .from('workspace_members')
    .update({ status: 'suspended', updated_at: new Date().toISOString() })
    .eq('id', memberId)
    .eq('workspace_id', workspaceId);

  if (error) throw new Error(error.message);

  await admin.rpc(
    'revoke_workspace_member_property_access' as never,
    {
      p_workspace_id: workspaceId,
      p_user_id: (member as { user_id: string }).user_id,
      p_status: 'suspended',
    } as never
  );

  await logWorkspaceMemberActivity(workspaceId, user.id, 'member.suspended', memberId);
  serverCache.invalidateWorkspace(workspaceId);
  serverCache.invalidateUser((member as { user_id: string }).user_id);
  revalidatePath('/dashboard/team');
}

export async function reactivateMember(workspaceId: string, memberId: string) {
  await requireTeamPermission(workspaceId, 'team.member.update');
  await assertWorkspaceSeatAvailable(workspaceId);
  const user = await requireAuthenticatedUser();
  const supabase = await createClient();
  const admin = await createAdminClient();

  const { data: member, error: fetchError } = await supabase
    .from('workspace_members')
    .select('id, workspace_id, user_id')
    .eq('id', memberId)
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (fetchError || !member) throw new Error('NOT_FOUND');

  const { error } = await (admin as any)
    .from('workspace_members')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('id', memberId)
    .eq('workspace_id', workspaceId);

  if (error) throw new Error(error.message);

  // Restore property access
  await (admin as any)
    .from('property_members')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('user_id', (member as { user_id: string }).user_id)
    .eq('status', 'suspended');

  await logWorkspaceMemberActivity(workspaceId, user.id, 'member.reactivated', memberId);
  serverCache.invalidateWorkspace(workspaceId);
  serverCache.invalidateUser((member as { user_id: string }).user_id);
  revalidatePath('/dashboard/team');
}

export async function updateMemberStatus(workspaceId: string, memberId: string, status: 'active' | 'suspended') {
  if (status === 'active') {
    return reactivateMember(workspaceId, memberId);
  } else {
    return suspendMember(workspaceId, memberId);
  }
}

async function fetchWorkspaceTeamDirect(workspaceId: string) {
  const supabase = await createClient();
  const admin = await createAdminClient();

  const { data: members, error } = await supabase
    .from('workspace_members')
    .select('id, user_id, role_id, status, joined_at, team_roles ( name, is_system_role )')
    .eq('workspace_id', workspaceId)
    .neq('status', 'removed')
    .order('joined_at', { ascending: true });

  if (error) throw new Error(error.message);

  const userIds = (members || []).map((m) => (m as { user_id: string }).user_id);
  const { data: profiles } = userIds.length
    ? await admin.from('profiles').select('id, full_name, avatar_url, public_id').in('id', userIds)
    : { data: [] };

  const profileMap = new Map(
    (profiles || []).map((p) => {
      const row = p as { id: string; full_name: string | null; avatar_url: string | null; public_id: string | null };
      return [row.id, row];
    })
  );

  const memberRows: WorkspaceMemberRow[] = (members || []).map((m) => {
    const row = m as {
      id: string;
      user_id: string;
      role_id: string | null;
      status: string;
      joined_at: string | null;
      team_roles?: { name?: string; is_system_role?: boolean } | null;
    };
    const profile = profileMap.get(row.user_id);
    return {
      id: row.id,
      userId: row.user_id,
      fullName: profile?.full_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      publicId: profile?.public_id ?? null,
      roleId: row.role_id,
      roleName: row.team_roles?.name ?? null,
      status: row.status,
      joinedAt: row.joined_at,
      isSystemRole: row.team_roles?.is_system_role ?? false,
    };
  });

  return memberRows;
}

async function fetchPendingInvitationsDirect(workspaceId: string): Promise<PendingInvitationRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    'get_workspace_pending_invitations' as never,
    { p_workspace_id: workspaceId } as never
  );

  if (error) {
    // RPC may not exist yet in dev - return empty
    if (error.code === 'PGRST202') return [];
    throw new Error(error.message);
  }

  return (data as Array<{
    id: string;
    role_name: string;
    invite_type: string;
    status: string;
    expires_at: string;
    created_at: string;
    inviter_name: string | null;
  }>).map((r) => ({
    id: r.id,
    roleName: r.role_name,
    inviteType: r.invite_type,
    status: r.status,
    expiresAt: r.expires_at,
    createdAt: r.created_at,
    invitedByName: r.inviter_name,
  }));
}

export interface TeamPageData {
  members: WorkspaceMemberRow[];
  invitations: PendingInvitationRow[];
  seats: { current: number; limit: number; remaining: number; isOverLimit: boolean } | null;
}

export async function fetchTeamPageData(workspaceId: string): Promise<TeamPageData> {
  await requireTeamPermission(workspaceId, 'team.member.view');
  const [members, invitations, seats] = await Promise.all([
    fetchWorkspaceTeamDirect(workspaceId),
    fetchPendingInvitationsDirect(workspaceId),
    fetchSeatUsage(workspaceId),
  ]);

  return { members, invitations, seats };
}

export async function fetchWorkspaceTeam(workspaceId: string) {
  await requireTeamPermission(workspaceId, 'team.member.view');
  return fetchWorkspaceTeamDirect(workspaceId);
}

export async function fetchPendingInvitations(workspaceId: string): Promise<PendingInvitationRow[]> {
  await requireTeamPermission(workspaceId, 'team.member.view');
  return fetchPendingInvitationsDirect(workspaceId);
}

export async function resolveJoinInvitation(token: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    'resolve_invitation_by_token' as never,
    { p_token: token } as never
  );
  if (error || !data) return null;
  const row = (data as Array<{
    invitation_id: string;
    status: string;
    workspace_id: string;
    workspace_name: string;
    inviter_name: string;
    role_name: string;
    role_id: string;
    expires_at: string;
    is_expired: boolean;
  }>)?.[0];
  if (!row) return null;
  return {
    invitationId: row.invitation_id,
    status: row.status,
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    inviterName: row.inviter_name,
    roleName: row.role_name,
    roleId: row.role_id,
    expiresAt: row.expires_at,
    isExpired: row.is_expired,
  };
}

export async function acceptJoinInvitation(token: string) {
  const user = await requireAuthenticatedUser();
  const supabase = await createClient();
  const admin = await createAdminClient();

  const { data, error } = await supabase.rpc(
    'accept_workspace_invitation' as never,
    { p_token: token } as never
  );

  let resultRow: { workspace_id: string; member_id: string; role_name: string } | undefined;

  if (error || !data || !(data as any[])?.[0]) {
    // Fallback: validate token & activate member directly
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const { data: inv, error: invError } = await (admin as any)
      .from('workspace_invitations')
      .select('id, workspace_id, role_id, status, expires_at, invited_by, team_roles ( name )')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (invError || !inv) throw new Error('INVALID_INVITATION');
    if (inv.status === 'revoked') throw new Error('INVITATION_REVOKED');
    if (inv.status === 'accepted') throw new Error('INVITATION_ALREADY_ACCEPTED');
    if (new Date(inv.expires_at) < new Date() || inv.status === 'expired') {
      await (admin as any)
        .from('workspace_invitations')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', inv.id);
      throw new Error('INVITATION_EXPIRED');
    }

    const { data: existingMember } = await (admin as any)
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', inv.workspace_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (existingMember) throw new Error('ALREADY_MEMBER');

    const roleName = inv.team_roles?.name || 'Viewer';
    const legacyRole = legacyWorkspaceRole(roleName);

    const { data: member, error: memberError } = await (admin as any)
      .from('workspace_members')
      .upsert(
        {
          workspace_id: inv.workspace_id,
          user_id: user.id,
          role_id: inv.role_id,
          role: legacyRole,
          status: 'active',
          invited_by: inv.invited_by,
          joined_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'workspace_id,user_id' }
      )
      .select('id')
      .single();

    if (memberError) throw new Error(memberError.message);

    await (admin as any)
      .from('workspace_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', inv.id);

    await admin.rpc(
      'sync_workspace_member_property_access' as never,
      {
        p_workspace_id: inv.workspace_id,
        p_user_id: user.id,
      } as never
    );

    await logWorkspaceMemberActivity(inv.workspace_id, user.id, 'member.invite_accepted', member.id, {
      invitation_id: inv.id,
      role_id: inv.role_id,
    });

    resultRow = {
      workspace_id: inv.workspace_id,
      member_id: member.id,
      role_name: roleName,
    };
  } else {
    resultRow = (data as Array<{ workspace_id: string; member_id: string; role_name: string }>)[0];
  }

  if (resultRow?.workspace_id) {
    await setActiveWorkspaceCookie(resultRow.workspace_id);
    serverCache.invalidateWorkspace(resultRow.workspace_id);
  }

  serverCache.invalidateUser(user.id);
  revalidatePath('/dashboard');
  return resultRow;
}

export async function fetchSeatUsage(workspaceId: string) {
  const { getWorkspaceSeatUsage } = await import('@/lib/entitlements/workspace-seats');
  return getWorkspaceSeatUsage(workspaceId);
}

export async function switchWorkspace(workspaceId: string) {
  const user = await requireAuthenticatedUser();
  const supabase = await createClient();

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  const { data: ws } = await supabase
    .from('workspaces')
    .select('owner_id')
    .eq('id', workspaceId)
    .single();

  if (!membership && (ws as { owner_id?: string } | null)?.owner_id !== user.id) {
    throw new Error('Forbidden: not a workspace member');
  }

  await setActiveWorkspaceCookie(workspaceId);
  revalidatePath('/dashboard', 'layout');
  return { success: true };
}

export interface PropertyAccessItem {
  id: string;
  name: string;
  address: string;
  propertyType: string | null;
  status: string;
}

export interface MemberPropertyAccessData {
  properties: PropertyAccessItem[];
  assignedPropertyIds: string[];
  mode: 'all' | 'custom';
  isOwner: boolean;
}

export async function fetchWorkspacePropertiesList(workspaceId: string): Promise<PropertyAccessItem[]> {
  const admin = await createAdminClient();
  const { data: allProps } = await (admin as any)
    .from('properties')
    .select('id, name, address_line_1, property_type, status')
    .eq('workspace_id', workspaceId)
    .neq('status', 'archived')
    .order('name');

  return (allProps || []).map((p: any) => ({
    id: p.id,
    name: p.name || 'Untitled Property',
    address: p.address_line_1 || '',
    propertyType: p.property_type || null,
    status: p.status || 'active',
  }));
}

export async function fetchWorkspacePropertiesForMember(
  workspaceId: string,
  memberId: string
): Promise<MemberPropertyAccessData> {
  const admin = await createAdminClient();

  const { data: ws } = await (admin as any)
    .from('workspaces')
    .select('owner_id')
    .eq('id', workspaceId)
    .single();

  const { data: member } = await (admin as any)
    .from('workspace_members')
    .select('id, user_id')
    .eq('id', memberId)
    .eq('workspace_id', workspaceId)
    .single();

  if (!member) {
    throw new Error('Member not found');
  }

  const isOwner = ws?.owner_id === member.user_id;

  const { data: allProps } = await (admin as any)
    .from('properties')
    .select('id, name, address_line_1, property_type, status')
    .eq('workspace_id', workspaceId)
    .neq('status', 'archived')
    .order('name');

  const properties: PropertyAccessItem[] = (allProps || []).map((p: any) => ({
    id: p.id,
    name: p.name || 'Untitled Property',
    address: p.address_line_1 || '',
    propertyType: p.property_type || null,
    status: p.status || 'active',
  }));

  const { data: pmList } = await (admin as any)
    .from('property_members')
    .select('property_id, status')
    .eq('user_id', member.user_id)
    .eq('status', 'active');

  const activePmSet = new Set((pmList || []).map((pm: any) => pm.property_id));
  const assignedPropertyIds = properties
    .filter((p) => activePmSet.has(p.id) || isOwner)
    .map((p) => p.id);

  const isAll = isOwner || (properties.length > 0 && assignedPropertyIds.length === properties.length);

  return {
    properties,
    assignedPropertyIds,
    mode: isAll ? 'all' : 'custom',
    isOwner,
  };
}

export async function updateMemberPropertyAccess(
  workspaceId: string,
  memberId: string,
  payload: { mode: 'all' | 'custom'; propertyIds: string[] }
) {
  await requireTeamPermission(workspaceId, 'team.member.update');
  const user = await requireAuthenticatedUser();
  const admin = await createAdminClient();

  const { data: member } = await (admin as any)
    .from('workspace_members')
    .select('id, user_id, role_id, team_roles ( name )')
    .eq('id', memberId)
    .eq('workspace_id', workspaceId)
    .single();

  if (!member) throw new Error('Member not found');

  const roleName = member.team_roles?.name || 'Viewer';
  let propertyRole = 'viewer';
  switch (roleName.toLowerCase()) {
    case 'owner':
    case 'admin':
    case 'manager':
      propertyRole = 'manager';
      break;
    case 'leasing agent':
      propertyRole = 'agent';
      break;
    case 'staff':
      propertyRole = 'staff';
      break;
    default:
      propertyRole = 'viewer';
      break;
  }

  const { data: allProps } = await (admin as any)
    .from('properties')
    .select('id')
    .eq('workspace_id', workspaceId)
    .neq('status', 'archived');

  const allPropIds = (allProps || []).map((p: any) => p.id);
  const targetPropIds = payload.mode === 'all' ? allPropIds : (payload.propertyIds || []);

  for (const propId of allPropIds) {
    if (targetPropIds.includes(propId)) {
      await (admin as any)
        .from('property_members')
        .upsert(
          {
            property_id: propId,
            user_id: member.user_id,
            role: propertyRole,
            status: 'active',
            joined_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'property_id,user_id' }
        );
    } else {
      await (admin as any)
        .from('property_members')
        .update({ status: 'removed', updated_at: new Date().toISOString() })
        .eq('property_id', propId)
        .eq('user_id', member.user_id);
    }
  }

  await logWorkspaceMemberActivity(workspaceId, user.id, 'member.property_access_updated', memberId, {
    target_user_id: member.user_id,
    mode: payload.mode,
    assigned_count: targetPropIds.length,
    property_ids: targetPropIds,
  });

  serverCache.invalidateWorkspace(workspaceId);
  serverCache.invalidateUser(member.user_id);
  revalidatePath('/dashboard/team');
  return { success: true, count: targetPropIds.length };
}
