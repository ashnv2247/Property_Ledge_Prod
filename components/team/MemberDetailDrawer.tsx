import React, { useEffect, useState, useMemo } from 'react';
import { Building2, Search, CheckSquare, Square, ShieldCheck, Check, Sparkles } from 'lucide-react';
import { Drawer, Button, Select, ConfirmDialog, useToast } from '@/components/admin/ui';
import { useCan } from '@/lib/auth/client-permissions';
import { toastAuthorizationError } from '@/lib/auth/toast-errors';
import { PermissionMatrix } from '@/components/rbac/PermissionMatrix';
import { fetchTeamPermissions } from '@/app/actions/workspace-roles';
import {
  fetchAssignableRoles,
  fetchRolePermissions,
  changeMemberRole,
  removeMember,
  suspendMember,
  reactivateMember,
  fetchWorkspacePropertiesForMember,
  updateMemberPropertyAccess,
  type WorkspaceMemberRow,
  type TeamRoleOption,
  type MemberPropertyAccessData,
  type PropertyAccessItem,
} from '@/app/actions/workspace-team';
import type { PermissionItem } from '@/components/rbac/PermissionMatrix';
import { Avatar } from '@/components/ui/avatar';

interface MemberDetailDrawerProps {
  workspaceId: string;
  member: WorkspaceMemberRow;
  onClose: () => void;
  onUpdated: () => void;
}

export function MemberDetailDrawer({ workspaceId, member, onClose, onUpdated }: MemberDetailDrawerProps) {
  const { error: toastError, success: toastSuccess } = useToast();
  const canUpdate = useCan('team.member.update');
  const canRemove = useCan('team.member.remove');
  const [roles, setRoles] = useState<TeamRoleOption[]>([]);
  const [catalog, setCatalog] = useState<PermissionItem[]>([]);
  const [grantedKeys, setGrantedKeys] = useState<Set<string>>(new Set());
  const [newRoleId, setNewRoleId] = useState(member.roleId || '');
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [loading, setLoading] = useState(false);

  // Property Access Scope state
  const [propertyData, setPropertyData] = useState<MemberPropertyAccessData | null>(null);
  const [propertyMode, setPropertyMode] = useState<'all' | 'custom'>('all');
  const [selectedPropIds, setSelectedPropIds] = useState<Set<string>>(new Set());
  const [propSearch, setPropSearch] = useState('');
  const [propertyLoading, setPropertyLoading] = useState(false);
  const [savingProperties, setSavingProperties] = useState(false);

  useEffect(() => {
    fetchTeamPermissions().then(setCatalog);

    if (member.roleId) {
      fetchRolePermissions(member.roleId).then((perms) => {
        setGrantedKeys(new Set(perms.map((p) => p.key)));
      });
    }

    if (canUpdate) {
      fetchAssignableRoles(workspaceId).then(setRoles);
    }
  }, [member.roleId, workspaceId, canUpdate]);

  useEffect(() => {
    setPropertyLoading(true);
    fetchWorkspacePropertiesForMember(workspaceId, member.id)
      .then((data) => {
        setPropertyData(data);
        setPropertyMode(data.mode);
        setSelectedPropIds(new Set(data.assignedPropertyIds));
      })
      .catch((err) => {
        console.error('Failed to load property access:', err);
      })
      .finally(() => setPropertyLoading(false));
  }, [workspaceId, member.id]);

  const filteredProperties = useMemo(() => {
    if (!propertyData?.properties) return [];
    if (!propSearch.trim()) return propertyData.properties;
    const q = propSearch.toLowerCase();
    return propertyData.properties.filter(
      (p) => p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q)
    );
  }, [propertyData?.properties, propSearch]);

  const toggleProperty = (id: string) => {
    setSelectedPropIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllProperties = () => {
    if (!propertyData?.properties) return;
    setSelectedPropIds(new Set(propertyData.properties.map((p) => p.id)));
  };

  const clearAllProperties = () => {
    setSelectedPropIds(new Set());
  };

  async function handleSavePropertyAccess() {
    setSavingProperties(true);
    try {
      await updateMemberPropertyAccess(workspaceId, member.id, {
        mode: propertyMode,
        propertyIds: Array.from(selectedPropIds),
      });
      toastSuccess('Property access updated', 'Property access assignments were saved successfully.');
      onUpdated();
    } catch (e) {
      toastAuthorizationError(e, toastError);
    } finally {
      setSavingProperties(false);
    }
  }

  async function handleRoleChange() {
    if (!newRoleId || newRoleId === member.roleId) return;
    setLoading(true);
    try {
      await changeMemberRole(workspaceId, member.id, newRoleId);
      toastSuccess('Role updated', 'Member role was updated successfully.');
      onUpdated();
    } catch (e) {
      toastAuthorizationError(e, toastError);
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove() {
    setLoading(true);
    try {
      await removeMember(workspaceId, member.id);
      toastSuccess('Member removed', 'The member was removed from this workspace.');
      onUpdated();
    } catch (e) {
      toastAuthorizationError(e, toastError);
    } finally {
      setLoading(false);
      setConfirmRemove(false);
    }
  }

  async function handleSuspend() {
    setLoading(true);
    try {
      await suspendMember(workspaceId, member.id);
      toastSuccess('Member suspended', 'The member has been suspended.');
      onUpdated();
    } catch (e) {
      toastAuthorizationError(e, toastError);
    } finally {
      setLoading(false);
    }
  }

  async function handleReactivate() {
    setLoading(true);
    try {
      await reactivateMember(workspaceId, member.id);
      toastSuccess('Member reactivated', 'The member has been set to active.');
      onUpdated();
    } catch (e) {
      toastAuthorizationError(e, toastError);
    } finally {
      setLoading(false);
    }
  }

  const isOwner = member.roleName?.toLowerCase() === 'owner';

  return (
    <>
      <Drawer
        isOpen
        onClose={onClose}
        title="Member details & access"
        description="View assigned role, access levels, and effective permissions."
        width="80"
      >
        <div className="space-y-6">
          {/* Member Profile Header */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-admin-surface-subtle/50 border border-admin-border">
            <div className="h-12 w-12 rounded-full bg-admin-primary/15 flex items-center justify-center text-lg font-bold text-admin-primary">
              {(member.fullName || member.publicId || '?')[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-admin-foreground truncate">
                  {member.fullName || member.publicId || 'Unknown'}
                </p>
                {member.isSystemRole && (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded bg-admin-border text-admin-muted">
                    System Role
                  </span>
                )}
              </div>
              {member.publicId && member.fullName && (
                <p className="text-xs text-admin-muted font-mono">{member.publicId}</p>
              )}
              <div className="flex items-center gap-3 mt-1 text-xs text-admin-muted">
                <span>
                  Role: <strong className="text-admin-foreground font-medium">{member.roleName || 'None'}</strong>
                </span>
                <span>•</span>
                <span className="capitalize">
                  Status:{' '}
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                      member.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : member.status === 'suspended'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : 'bg-slate-500/10 text-slate-500'
                    }`}
                  >
                    {member.status}
                  </span>
                </span>
                {member.joinedAt && (
                  <>
                    <span>•</span>
                    <span>Joined: {new Date(member.joinedAt).toLocaleDateString()}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Membership Status Control */}
          {canUpdate && !isOwner && (
            <div className="p-4 rounded-xl border border-admin-border space-y-3 bg-admin-surface">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-admin-foreground">
                    Membership Status
                  </h4>
                  <p className="text-[11px] text-admin-muted">
                    {member.status === 'active'
                      ? 'Member is active and can access assigned properties and tasks.'
                      : 'Member is suspended and temporarily cannot access workspace resources.'}
                  </p>
                </div>
                <div>
                  {member.status === 'suspended' ? (
                    <Button
                      size="sm"
                      onClick={handleReactivate}
                      disabled={loading}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {loading ? 'Reactivating...' : 'Reactivate member (Set Active)'}
                    </Button>
                  ) : member.status === 'active' ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleSuspend}
                      disabled={loading}
                      className="text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                    >
                      {loading ? 'Suspending...' : 'Suspend member'}
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {/* Role Assignment Control */}
          {canUpdate && roles.length > 0 && !isOwner && (
            <div className="p-4 rounded-xl border border-admin-border space-y-3 bg-admin-surface">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-admin-foreground">
                  Change Role Assignment
                </h4>
                <p className="text-[11px] text-admin-muted">
                  Assign a different role to change inherited permissions for this member.
                </p>
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Select
                    value={newRoleId}
                    onChange={(e) => setNewRoleId(e.target.value)}
                  >
                    {roles.map((r) => (
                      <option key={r.roleId} value={r.roleId}>
                        {r.name} {r.isSystemRole ? '(System)' : '(Custom)'} — {r.permissionCount} perms
                      </option>
                    ))}
                  </Select>
                </div>
                <Button
                  size="sm"
                  onClick={handleRoleChange}
                  disabled={loading || !newRoleId || newRoleId === member.roleId}
                >
                  {loading ? 'Updating...' : 'Save role'}
                </Button>
              </div>
            </div>
          )}

          {/* Property Access Scope Section */}
          <div className="p-4 rounded-xl border border-admin-border space-y-4 bg-admin-surface">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#008F83]" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-admin-foreground">
                    Property Access Scope
                  </h4>
                </div>
                <p className="text-[11px] text-admin-muted mt-0.5">
                  Control which properties this member can view, manage, and receive assigned tasks for.
                </p>
              </div>

              {canUpdate && !isOwner && propertyData && (
                <Button
                  size="sm"
                  onClick={handleSavePropertyAccess}
                  disabled={savingProperties || propertyLoading}
                  className="bg-[#008F83] hover:bg-[#007A70] text-white shrink-0"
                >
                  {savingProperties ? 'Saving access...' : 'Save Property Access'}
                </Button>
              )}
            </div>

            {isOwner ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Workspace Owners have full access to all current and future properties.</span>
              </div>
            ) : propertyLoading ? (
              <div className="py-4 text-center text-xs text-admin-muted">Loading properties...</div>
            ) : (
              <div className="space-y-3">
                {/* Segmented Mode Selector */}
                {canUpdate && (
                  <div className="inline-flex p-1 rounded-xl bg-admin-surface-subtle border border-admin-border text-xs">
                    <button
                      type="button"
                      onClick={() => setPropertyMode('all')}
                      className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                        propertyMode === 'all'
                          ? 'bg-admin-surface text-admin-foreground shadow-xs border border-admin-border font-semibold'
                          : 'text-admin-muted hover:text-admin-foreground'
                      }`}
                    >
                      All Properties ({propertyData?.properties.length || 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPropertyMode('custom')}
                      className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                        propertyMode === 'custom'
                          ? 'bg-admin-surface text-admin-foreground shadow-xs border border-admin-border font-semibold'
                          : 'text-admin-muted hover:text-admin-foreground'
                      }`}
                    >
                      Specific Properties ({selectedPropIds.size} of {propertyData?.properties.length || 0})
                    </button>
                  </div>
                )}

                {propertyMode === 'all' ? (
                  <div className="p-3 rounded-lg bg-admin-surface-subtle border border-admin-border text-xs text-admin-muted flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#008F83]" />
                    <span>Member can access all {propertyData?.properties.length || 0} active properties in this workspace.</span>
                  </div>
                ) : (
                  <div className="space-y-2.5 pt-1">
                    {/* Search & Quick selection controls */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-admin-muted" />
                        <input
                          type="text"
                          placeholder="Search properties by name or address..."
                          value={propSearch}
                          onChange={(e) => setPropSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 bg-admin-surface-subtle border border-admin-border rounded-lg text-xs text-admin-foreground placeholder:text-admin-muted focus:outline-none focus:border-[#008F83]"
                        />
                      </div>
                      {canUpdate && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={selectAllProperties}
                            className="text-[11px] font-medium text-[#008F83] hover:underline px-1.5 py-1 cursor-pointer"
                          >
                            Select All
                          </button>
                          <span className="text-admin-border">•</span>
                          <button
                            type="button"
                            onClick={clearAllProperties}
                            className="text-[11px] font-medium text-admin-muted hover:text-admin-foreground px-1.5 py-1 cursor-pointer"
                          >
                            Clear All
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Property Cards List */}
                    <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                      {filteredProperties.length === 0 ? (
                        <div className="text-center py-4 text-xs text-admin-muted">No properties found.</div>
                      ) : (
                        filteredProperties.map((prop) => {
                          const isSelected = selectedPropIds.has(prop.id);
                          return (
                            <div
                              key={prop.id}
                              onClick={() => canUpdate && toggleProperty(prop.id)}
                              className={`flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-[#008F83]/5 border-[#008F83]/40 text-admin-foreground'
                                  : 'bg-admin-surface border-admin-border text-admin-muted hover:border-admin-border/80'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-[#008F83] shrink-0" />
                                ) : (
                                  <Square className="w-4 h-4 text-admin-muted shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-admin-foreground truncate">
                                    {prop.name}
                                  </p>
                                  {prop.address && (
                                    <p className="text-[11px] text-admin-muted truncate">{prop.address}</p>
                                  )}
                                </div>
                              </div>
                              {prop.propertyType && (
                                <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-admin-surface-subtle border border-admin-border text-admin-muted uppercase shrink-0">
                                  {prop.propertyType}
                                </span>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Effective Permission Matrix */}
          <div>
            <div className="mb-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-admin-foreground">
                Effective Permissions
              </h4>
              <p className="text-[11px] text-admin-muted">
                Permissions inherited from the assigned role (<span className="text-admin-foreground font-medium">{member.roleName}</span>).
              </p>
            </div>

            <PermissionMatrix
              permissions={catalog}
              selectedKeys={grantedKeys}
              readOnly
            />
          </div>

          {/* Actions: Suspend / Reactivate / Remove */}
          {!isOwner && (
            <div className="flex items-center justify-between border-t border-admin-border pt-4">
              <span className="text-xs text-admin-muted">Administrative actions</span>
              <div className="flex items-center gap-2">
                {canUpdate && member.status === 'suspended' && (
                  <Button variant="secondary" size="sm" onClick={handleReactivate} disabled={loading}>
                    Reactivate
                  </Button>
                )}
                {canUpdate && member.status === 'active' && (
                  <Button variant="secondary" size="sm" onClick={handleSuspend} disabled={loading}>
                    Suspend member
                  </Button>
                )}
                {canRemove && (
                  <Button variant="destructive" size="sm" onClick={() => setConfirmRemove(true)} disabled={loading}>
                    Remove from team
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </Drawer>

      <ConfirmDialog
        isOpen={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        onConfirm={handleRemove}
        title="Remove member from team?"
        description={`${member.fullName || 'This member'} will lose access to this workspace immediately. Their user profile will not be deleted.`}
        confirmLabel="Remove member"
        variant="danger"
      />
    </>
  );
}
