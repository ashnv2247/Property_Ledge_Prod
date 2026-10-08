'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Link2, UserSearch, Copy, Check, Building2, Search, CheckSquare, Square } from 'lucide-react';
import { Modal, Button, useToast } from '@/components/admin/ui';
import {
  fetchAssignableRoles,
  fetchRolePermissions,
  createInviteLink,
  lookupProfile,
  addMemberByProfileId,
  fetchWorkspacePropertiesList,
  type TeamRoleOption,
  type PermissionRow,
  type PropertyAccessItem,
} from '@/app/actions/workspace-team';

type Step = 'choose' | 'invite-link' | 'invite-created' | 'profile-id' | 'profile-preview' | 'profile-role';

interface AddMemberModalProps {
  workspaceId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function RolePreview({ role, permissions }: { role: TeamRoleOption | undefined; permissions: PermissionRow[] }) {
  if (!role) return null;

  const highlights = permissions.slice(0, 6).map((p) => p.name);
  const canManage = permissions.filter((p) => p.action !== 'view').slice(0, 4).map((p) => p.name);

  return (
    <div className="rounded-xl border border-admin-border p-4 space-y-2">
      <div>
        <p className="font-medium text-admin-foreground">{role.name}</p>
        {role.description && <p className="text-xs text-admin-muted">{role.description}</p>}
        <p className="text-xs text-admin-muted mt-1">{role.permissionCount} permissions</p>
      </div>
      {canManage.length > 0 && (
        <div>
          <p className="text-[10px] font-medium uppercase text-admin-muted mb-1">Can</p>
          <ul className="text-xs text-admin-foreground space-y-0.5">
            {canManage.map((h) => <li key={h}>✓ {h}</li>)}
          </ul>
        </div>
      )}
      {highlights.length > canManage.length && (
        <div>
          <p className="text-[10px] font-medium uppercase text-admin-muted mb-1">Includes</p>
          <ul className="text-xs text-admin-muted space-y-0.5">
            {highlights.filter((h) => !canManage.includes(h)).slice(0, 3).map((h) => <li key={h}>• {h}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function RoleSelect({
  roles,
  selectedRoleId,
  onChange,
}: {
  roles: TeamRoleOption[];
  selectedRoleId: string;
  onChange: (id: string) => void;
}) {
  const systemRoles = roles.filter((r) => r.isSystemRole);
  const customRoles = roles.filter((r) => !r.isSystemRole);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-admin-foreground">Role</label>
      <select
        value={selectedRoleId}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-admin-border bg-admin-surface px-3 py-2 text-sm"
      >
        <option value="">Select role...</option>
        {systemRoles.length > 0 && (
          <optgroup label="System Roles">
            {systemRoles.map((r) => (
              <option key={r.roleId} value={r.roleId}>{r.name}</option>
            ))}
          </optgroup>
        )}
        {customRoles.length > 0 && (
          <optgroup label="Custom Roles">
            {customRoles.map((r) => (
              <option key={r.roleId} value={r.roleId}>{r.name}</option>
            ))}
          </optgroup>
        )}
      </select>
    </div>
  );
}

export function AddMemberModal({ workspaceId, onClose, onSuccess }: AddMemberModalProps) {
  const { error: toastError, success: toastSuccess } = useToast();
  const [step, setStep] = useState<Step>('choose');
  const [roles, setRoles] = useState<TeamRoleOption[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [inviteUrl, setInviteUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [publicId, setPublicId] = useState('');
  const [profilePreview, setProfilePreview] = useState<{
    id: string;
    publicId: string;
    fullName: string | null;
    avatarUrl: string | null;
  } | null>(null);

  // Property access state
  const [properties, setProperties] = useState<PropertyAccessItem[]>([]);
  const [propertyMode, setPropertyMode] = useState<'all' | 'custom'>('all');
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
  const [propertySearch, setPropertySearch] = useState('');

  useEffect(() => {
    fetchAssignableRoles(workspaceId).then(setRoles).catch(() => {});
    fetchWorkspacePropertiesList(workspaceId).then((props) => {
      setProperties(props);
      setSelectedPropertyIds(props.map((p) => p.id));
    }).catch(() => {});
  }, [workspaceId]);

  useEffect(() => {
    if (!selectedRoleId) { setPermissions([]); return; }
    fetchRolePermissions(selectedRoleId).then(setPermissions).catch(() => {});
  }, [selectedRoleId]);

  const selectedRole = useMemo(() => roles.find((r) => r.roleId === selectedRoleId), [roles, selectedRoleId]);

  const filteredProperties = useMemo(() => {
    if (!propertySearch.trim()) return properties;
    const q = propertySearch.toLowerCase();
    return properties.filter((p) => p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q));
  }, [properties, propertySearch]);

  const toggleProperty = (propId: string) => {
    setSelectedPropertyIds((prev) =>
      prev.includes(propId) ? prev.filter((id) => id !== propId) : [...prev, propId]
    );
  };

  const selectAllProperties = () => {
    setSelectedPropertyIds(properties.map((p) => p.id));
  };

  const clearAllProperties = () => {
    setSelectedPropertyIds([]);
  };

  async function handleCreateInvite() {
    if (!selectedRoleId) return;
    setLoading(true);
    try {
      const result = await createInviteLink(workspaceId, selectedRoleId);
      setInviteUrl(result.inviteUrl);
      setStep('invite-created');
    } catch (e) {
      toastError('Error', (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearchProfile() {
    if (!publicId.trim()) return;
    setLoading(true);
    try {
      const profile = await lookupProfile(publicId);
      if (!profile) {
        toastError('Not found', "We couldn't find a PropertyLedge profile with that ID.");
        return;
      }
      setProfilePreview(profile);
      setStep('profile-preview');
    } catch (e) {
      toastError('Error', (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddProfile() {
    if (!selectedRoleId || !profilePreview) return;
    setLoading(true);
    try {
      await addMemberByProfileId(
        workspaceId,
        profilePreview.publicId,
        selectedRoleId,
        { mode: propertyMode, propertyIds: selectedPropertyIds }
      );
      toastSuccess('Success', 'Team member added with assigned permissions and property access.');
      onSuccess();
    } catch (e) {
      toastError('Error', (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Modal isOpen onClose={onClose} title="Add team member" size={step === 'profile-role' ? 'lg' : 'md'}>
      {step === 'choose' && (
        <div className="space-y-4 p-1">
          <p className="text-sm text-admin-muted">Choose how you&apos;d like to add them.</p>
          <button type="button" onClick={() => setStep('invite-link')} className="w-full flex items-start gap-4 rounded-xl border border-admin-border p-4 text-left hover:border-admin-primary/50 transition-colors">
            <Link2 className="h-6 w-6 text-admin-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Invite link</p>
              <p className="text-sm text-admin-muted">Generate a secure invitation link.</p>
            </div>
          </button>
          <button type="button" onClick={() => setStep('profile-id')} className="w-full flex items-start gap-4 rounded-xl border border-admin-border p-4 text-left hover:border-admin-primary/50 transition-colors">
            <UserSearch className="h-6 w-6 text-admin-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Profile ID</p>
              <p className="text-sm text-admin-muted">Add an existing PropertyLedge user directly.</p>
            </div>
          </button>
        </div>
      )}

      {step === 'invite-link' && (
        <div className="space-y-4">
          <RoleSelect roles={roles} selectedRoleId={selectedRoleId} onChange={setSelectedRoleId} />
          <RolePreview role={selectedRole} permissions={permissions} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setStep('choose')}>Back</Button>
            <Button onClick={handleCreateInvite} disabled={!selectedRoleId || loading}>
              {loading ? 'Processing...' : 'Generate link'}
            </Button>
          </div>
        </div>
      )}

      {step === 'profile-role' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <RoleSelect roles={roles} selectedRoleId={selectedRoleId} onChange={setSelectedRoleId} />
              <RolePreview role={selectedRole} permissions={permissions} />
            </div>

            {/* Property Access Scope Selection */}
            <div className="space-y-3 rounded-xl border border-admin-border/80 bg-admin-surface/40 p-3.5">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-admin-primary" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-admin-foreground">Property Access Scope</h4>
              </div>

              {/* Mode switch */}
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-admin-surface border border-admin-border">
                <button
                  type="button"
                  onClick={() => setPropertyMode('all')}
                  className={`py-1.5 text-xs font-medium rounded-md transition-all ${
                    propertyMode === 'all'
                      ? 'bg-admin-primary text-white shadow-sm'
                      : 'text-admin-muted hover:text-admin-foreground'
                  }`}
                >
                  All Properties
                </button>
                <button
                  type="button"
                  onClick={() => setPropertyMode('custom')}
                  className={`py-1.5 text-xs font-medium rounded-md transition-all ${
                    propertyMode === 'custom'
                      ? 'bg-admin-primary text-white shadow-sm'
                      : 'text-admin-muted hover:text-admin-foreground'
                  }`}
                >
                  Specific Properties
                </button>
              </div>

              {propertyMode === 'all' ? (
                <div className="p-3 text-center rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                  <p className="text-xs font-medium text-emerald-400">Full Workspace Access</p>
                  <p className="text-[11px] text-admin-muted mt-0.5">
                    Member will automatically have access to all {properties.length} active property/properties.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-admin-muted">
                      {selectedPropertyIds.length} of {properties.length} selected
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={selectAllProperties}
                        className="text-admin-primary hover:underline"
                      >
                        Select all
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={clearAllProperties}
                        className="text-admin-muted hover:text-admin-foreground"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {properties.length > 4 && (
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-admin-muted" />
                      <input
                        type="text"
                        placeholder="Search properties..."
                        value={propertySearch}
                        onChange={(e) => setPropertySearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-admin-border bg-admin-surface text-xs text-admin-foreground"
                      />
                    </div>
                  )}

                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {filteredProperties.length === 0 ? (
                      <p className="text-xs text-admin-muted py-2 text-center">No properties found</p>
                    ) : (
                      filteredProperties.map((p) => {
                        const isChecked = selectedPropertyIds.includes(p.id);
                        return (
                          <label
                            key={p.id}
                            className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-all ${
                              isChecked
                                ? 'border-admin-primary/40 bg-admin-primary/5'
                                : 'border-admin-border/60 hover:bg-admin-surface/80'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleProperty(p.id)}
                              className="mt-0.5 rounded border-admin-border text-admin-primary focus:ring-0 cursor-pointer"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-admin-foreground truncate">{p.name}</p>
                              {p.address && <p className="text-[10px] text-admin-muted truncate">{p.address}</p>}
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-admin-border">
            <Button variant="secondary" onClick={() => setStep('profile-preview')}>Back</Button>
            <Button
              onClick={handleAddProfile}
              disabled={!selectedRoleId || (propertyMode === 'custom' && selectedPropertyIds.length === 0) || loading}
            >
              {loading ? 'Adding member...' : 'Add member'}
            </Button>
          </div>
        </div>
      )}

      {step === 'invite-created' && (
        <div className="space-y-4">
          <p className="text-sm text-admin-muted">Invitation created. Share this link with your teammate.</p>
          <div className="flex gap-2">
            <input readOnly value={inviteUrl} className="flex-1 rounded-lg border border-admin-border bg-admin-muted/30 px-3 py-2 text-sm" />
            <Button variant="secondary" onClick={copyLink}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</Button>
          </div>
          <Button className="w-full" onClick={onSuccess}>Done</Button>
        </div>
      )}

      {step === 'profile-id' && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Profile ID</label>
            <input value={publicId} onChange={(e) => setPublicId(e.target.value)} placeholder="PL-ABC123" className="mt-1 w-full rounded-lg border border-admin-border px-3 py-2 text-sm" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setStep('choose')}>Back</Button>
            <Button onClick={handleSearchProfile} disabled={!publicId.trim() || loading}>{loading ? 'Searching...' : 'Search'}</Button>
          </div>
        </div>
      )}

      {step === 'profile-preview' && profilePreview && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 rounded-xl border border-admin-border p-4">
            <div className="h-12 w-12 rounded-full bg-admin-primary/10 flex items-center justify-center text-admin-primary font-semibold">
              {(profilePreview.fullName || '?')[0]}
            </div>
            <div>
              <p className="font-medium">{profilePreview.fullName || 'Unknown'}</p>
              <p className="text-sm text-admin-muted">{profilePreview.publicId}</p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setStep('profile-id')}>Back</Button>
            <Button onClick={() => setStep('profile-role')}>Continue</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
