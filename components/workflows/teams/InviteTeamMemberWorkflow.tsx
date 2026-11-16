'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  Link2,
  UserCheck,
  Building,
  Copy,
  Check,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Search,
} from 'lucide-react';
import {
  GuidedWorkflow,
  type GuidedWorkflowStepConfig,
  VisualChoiceCard,
  VisualChoiceGrid,
  QuestionField,
  ContextualExplanation,
  ConditionalSection,
  WorkflowSummary,
  WorkflowSuccess,
} from '@/components/workflows/guided-workflow';
import { Input, Select, Button, useToast } from '@/components/admin/ui';
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
import { cn } from '@/lib/utils';

export interface InviteTeamMemberWorkflowProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  onSuccess?: () => void;
}

export interface TeamInviteContext {
  inviteMethod: 'link' | 'profile';
  roleId: string;
  roleName: string;
  propertyMode: 'all' | 'custom';
  selectedPropertyIds: string[];
  publicProfileId: string;
  matchedProfile: { id: string; fullName: string | null; avatarUrl: string | null } | null;
}

const INITIAL_CONTEXT: TeamInviteContext = {
  inviteMethod: 'link',
  roleId: '',
  roleName: '',
  propertyMode: 'all',
  selectedPropertyIds: [],
  publicProfileId: '',
  matchedProfile: null,
};

export function InviteTeamMemberWorkflow({
  isOpen,
  onClose,
  workspaceId,
  onSuccess,
}: InviteTeamMemberWorkflowProps) {
  const { success: showToastSuccess, error: showError } = useToast();

  const [roles, setRoles] = useState<TeamRoleOption[]>([]);
  const [properties, setProperties] = useState<PropertyAccessItem[]>([]);
  const [rolePermissions, setRolePermissions] = useState<PermissionRow[]>([]);
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSearchingProfile, setIsSearchingProfile] = useState(false);
  const [propertyFilter, setPropertyFilter] = useState('');

  useEffect(() => {
    if (isOpen && workspaceId) {
      fetchAssignableRoles(workspaceId)
        .then((r) => setRoles(r || []))
        .catch((err) => console.error('Error fetching roles:', err));

      fetchWorkspacePropertiesList(workspaceId)
        .then((p) => setProperties(p || []))
        .catch((err) => console.error('Error fetching properties list:', err));
    }
  }, [isOpen, workspaceId]);

  const handleRoleChange = async (roleId: string) => {
    if (!roleId) {
      setRolePermissions([]);
      return;
    }
    try {
      const perms = await fetchRolePermissions(roleId);
      setRolePermissions(perms || []);
    } catch (e) {
      console.error('Error fetching role permissions:', e);
    }
  };

  const steps: GuidedWorkflowStepConfig<TeamInviteContext>[] = [
    // Step 1: Invitation Method
    {
      id: 'method',
      title: 'Invitation Method',
      description: 'Choose how you want to invite this collaborator.',
      validate: (ctx) => {
        if (ctx.inviteMethod === 'profile' && !ctx.matchedProfile) {
          showError('Profile Required', 'Please search and confirm a valid PropertyLedge profile ID.');
          return false;
        }
        return true;
      },
      component: ({ context, updateContext }) => {
        return (
          <div className="space-y-5">
            <div className="text-center max-w-lg mx-auto space-y-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#008F83]/10 text-[#008F83] text-[11px] font-bold border border-[#008F83]/20">
                <Sparkles className="w-3 h-3" /> Step 1 · Collaboration
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                Who would you like to collaborate with?
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                You can generate a secure single-use invitation link or directly add an existing PropertyLedge user.
              </p>
            </div>

            <VisualChoiceGrid columns={2}>
              <VisualChoiceCard
                id="link"
                title="Shareable Invite Link"
                description="Generate a secure link you can email, Slack, or send directly to your property manager or accountant."
                benefits={['Secure single-use token', 'Acceptable on any device', 'Auto-expires after 7 days']}
                icon={Link2}
                isSelected={context.inviteMethod === 'link'}
                onSelect={() => updateContext({ inviteMethod: 'link' })}
              />

              <VisualChoiceCard
                id="profile"
                title="Direct Profile ID Lookup"
                description="Immediately assign workspace membership to an existing user via their unique 8-character PropertyLedge Public ID."
                benefits={['Instant workspace addition', 'Verified account credentials', 'No invite email required']}
                icon={UserCheck}
                isSelected={context.inviteMethod === 'profile'}
                onSelect={() => updateContext({ inviteMethod: 'profile' })}
              />
            </VisualChoiceGrid>

            {context.inviteMethod === 'profile' && (
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-3">
                <QuestionField
                  question="Enter 8-Character Public User ID"
                  description="Ask the user for their Public Profile ID located in their Profile Settings"
                >
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. USR-49A1"
                      value={context.publicProfileId}
                      onChange={(e) => updateContext({ publicProfileId: e.target.value.toUpperCase() })}
                    />
                    <Button
                      type="button"
                      disabled={!context.publicProfileId.trim() || isSearchingProfile}
                      onClick={async () => {
                        setIsSearchingProfile(true);
                        try {
                          const prof = await lookupProfile(context.publicProfileId.trim());
                          if (prof) {
                            updateContext({
                              matchedProfile: {
                                id: prof.id,
                                fullName: prof.fullName,
                                avatarUrl: prof.avatarUrl,
                              },
                            });
                            showToastSuccess('User Found', `Located profile: ${prof.fullName || 'User'}`);
                          } else {
                            showError('Not Found', 'No user found with that Public ID.');
                          }
                        } catch (err: any) {
                          showError('Lookup Failed', err.message || 'Error looking up profile.');
                        } finally {
                          setIsSearchingProfile(false);
                        }
                      }}
                    >
                      {isSearchingProfile ? 'Searching...' : 'Find User'}
                    </Button>
                  </div>
                </QuestionField>

                {context.matchedProfile && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-xs text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold">Verified User: </span>
                      <span>{context.matchedProfile.fullName || 'PropertyLedge User'}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      },
    },

    // Step 2: Role & Authority
    {
      id: 'role',
      title: 'Role & Authority',
      description: 'Assign role permissions determining what this user can view or manage.',
      validate: (ctx) => {
        if (!ctx.roleId) {
          showError('Role Required', 'Please select a role to assign.');
          return false;
        }
        return true;
      },
      component: ({ context, updateContext }) => {
        const selectedRoleObj = roles.find((r) => r.roleId === context.roleId);

        return (
          <div className="space-y-5 max-w-xl mx-auto">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                What authority should this person have?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Roles define granular access to financial ledgers, tenant contact details, and lease configurations.
              </p>
            </div>

            <QuestionField
              question="Select Role"
              required
              description="System standard or custom defined workspace role"
            >
              <Select
                value={context.roleId}
                onChange={(e) => {
                  const rId = e.target.value;
                  const found = roles.find((r) => r.roleId === rId);
                  updateContext({
                    roleId: rId,
                    roleName: found ? found.name : '',
                  });
                  handleRoleChange(rId);
                }}
                options={[
                  { value: '', label: '-- Select a role --' },
                  ...roles.map((r) => ({
                    value: r.roleId,
                    label: `${r.name} (${r.permissionCount} permissions)${r.isSystemRole ? ' [System]' : ''}`,
                  })),
                ]}
              />
            </QuestionField>

            {selectedRoleObj && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/70 dark:bg-slate-900/40 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">{selectedRoleObj.name}</span>
                  <span className="text-[11px] font-semibold text-[#008F83] bg-[#008F83]/10 px-2 py-0.5 rounded-full">
                    {selectedRoleObj.permissionCount} Permissions
                  </span>
                </div>
                {selectedRoleObj.description && (
                  <p className="text-slate-500 dark:text-slate-400">{selectedRoleObj.description}</p>
                )}

                {rolePermissions.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                      Included Capabilities
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] text-slate-700 dark:text-slate-300">
                      {rolePermissions.slice(0, 6).map((p) => (
                        <div key={p.key} className="flex items-center gap-1.5">
                          <Check className="w-3 h-3 text-[#008F83] shrink-0" />
                          <span className="truncate">{p.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <ContextualExplanation
              title="Security & Non-Escalation"
              explanation="PropertyLedge strictly enforces server-side non-escalation. Collaborators can never grant themselves or others higher permissions than they possess."
            />
          </div>
        );
      },
    },

    // Step 3: Scoped Property Access
    {
      id: 'property-scope',
      title: 'Property Scope',
      description: 'Determine which specific properties this collaborator can access.',
      validate: (ctx) => {
        if (ctx.propertyMode === 'custom' && ctx.selectedPropertyIds.length === 0) {
          showError('Selection Required', 'Please select at least one property or choose All Properties.');
          return false;
        }
        return true;
      },
      component: ({ context, updateContext }) => {
        const filteredProps = properties.filter((p) =>
          p.name.toLowerCase().includes(propertyFilter.toLowerCase()) ||
          (p.address || '').toLowerCase().includes(propertyFilter.toLowerCase())
        );

        return (
          <div className="space-y-5 max-w-xl mx-auto">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Which properties should this person access?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                You can grant visibility over your entire portfolio or limit access to specific designated assets.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => updateContext({ propertyMode: 'all', selectedPropertyIds: [] })}
                className={cn(
                  'p-4 rounded-xl border-2 cursor-pointer transition-all',
                  context.propertyMode === 'all'
                    ? 'border-[#008F83] bg-[#008F83]/5 dark:bg-[#008F83]/10 text-slate-900 dark:text-white'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                )}
              >
                <div className="font-bold text-xs">All Current & Future Properties</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Full portfolio access. Ideal for head property managers and lead accountants.
                </div>
              </div>

              <div
                onClick={() => updateContext({ propertyMode: 'custom' })}
                className={cn(
                  'p-4 rounded-xl border-2 cursor-pointer transition-all',
                  context.propertyMode === 'custom'
                    ? 'border-[#008F83] bg-[#008F83]/5 dark:bg-[#008F83]/10 text-slate-900 dark:text-white'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                )}
              >
                <div className="font-bold text-xs">Restricted Property Scope</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Designate individual properties. User cannot see or interact with unassigned assets.
                </div>
              </div>
            </div>

            {context.propertyMode === 'custom' && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-white dark:bg-slate-900/50">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900 dark:text-white">
                    Select Assigned Properties ({context.selectedPropertyIds.length} of {properties.length})
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => updateContext({ selectedPropertyIds: properties.map((p) => p.id) })}
                      className="text-[11px] text-[#008F83] font-semibold hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => updateContext({ selectedPropertyIds: [] })}
                      className="text-[11px] text-slate-400 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 pr-1">
                  {properties.map((p) => {
                    const isChecked = context.selectedPropertyIds.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className="py-2 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/30 px-1 rounded-lg"
                      >
                        <div className="text-xs">
                          <span className="font-semibold block text-slate-900 dark:text-white">{p.name}</span>
                          <span className="text-[11px] text-slate-400">{p.address}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              updateContext({ selectedPropertyIds: [...context.selectedPropertyIds, p.id] });
                            } else {
                              updateContext({ selectedPropertyIds: context.selectedPropertyIds.filter((id) => id !== p.id) });
                            }
                          }}
                          className="w-4 h-4 rounded text-[#008F83] focus:ring-[#008F83]"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      },
    },

    // Step 4: Review & Generate
    {
      id: 'review',
      title: 'Review & Send',
      description: 'Review role authority and generate the access link.',
      component: ({ context }) => {
        const assignedScopeText =
          context.propertyMode === 'all'
            ? 'All Portfolio Properties'
            : `${context.selectedPropertyIds.length} Assigned Properties`;

        return (
          <div className="space-y-5">
            <WorkflowSummary
              title="Review Team Invitation"
              description="Confirm role and property restrictions before dispatching the invitation."
              relationshipChain={[
                {
                  label: 'Workspace Owner',
                  value: 'Current User',
                  icon: <Users className="w-4 h-4" />,
                },
                {
                  label: 'Assigned Role',
                  value: context.roleName || 'Team Member',
                  icon: <Shield className="w-4 h-4" />,
                },
                {
                  label: 'Access Scope',
                  value: assignedScopeText,
                  icon: <Building className="w-4 h-4" />,
                },
              ]}
              sections={[
                {
                  title: 'Invitation Details',
                  stepIndex: 0,
                  items: [
                    { label: 'Dispatch Method', value: context.inviteMethod === 'link' ? 'Shareable Link' : 'Direct Profile Addition' },
                    { label: 'Target Collaborator', value: context.matchedProfile?.fullName || 'Invited User' },
                  ],
                },
                {
                  title: 'Authorization & Scope',
                  stepIndex: 1,
                  items: [
                    { label: 'Assigned Role', value: context.roleName },
                    { label: 'Property Scope', value: assignedScopeText },
                    { label: 'Token Expiry', value: '7 days from generation' },
                  ],
                },
              ]}
            />
          </div>
        );
      },
    },
  ];

  const handleFinalSubmit = async (finalContext: TeamInviteContext) => {
    if (finalContext.inviteMethod === 'profile' && finalContext.matchedProfile) {
      await addMemberByProfileId(
        workspaceId,
        finalContext.matchedProfile.id,
        finalContext.roleId,
        {
          mode: finalContext.propertyMode,
          propertyIds: finalContext.selectedPropertyIds,
        }
      );
      showToastSuccess('Member Added', `${finalContext.matchedProfile.fullName || 'User'} has been added to your workspace.`);
      if (onSuccess) onSuccess();
      onClose();
      return;
    }

    // Otherwise generate invite link
    const res = await createInviteLink(workspaceId, finalContext.roleId);

    if (!res || !res.inviteUrl) {
      throw new Error('Could not generate invite link.');
    }

    setGeneratedInviteUrl(res.inviteUrl);
    showToastSuccess('Invitation Created', 'Shareable link is ready to copy.');
    return res;
  };

  return (
    <>
      <GuidedWorkflow
        isOpen={isOpen && !generatedInviteUrl}
        onClose={onClose}
        title="Invite Team Member"
        badge="Workspace Access"
        description="Safely invite collaborators, assign RBAC roles, and control scoped property access."
        illustration={{
          lightSrc: '/images/workflows/team_workflow_light.webp',
          darkSrc: '/images/workflows/team_workflow_dark.webp',
          alt: 'Team Collaboration',
        }}
        initialContext={INITIAL_CONTEXT}
        steps={steps}
        onSubmit={handleFinalSubmit}
        onSuccess={() => {
          if (onSuccess) onSuccess();
        }}
      />

      {/* Success Modal with Copyable Link */}
      {generatedInviteUrl && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
        >
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <WorkflowSuccess
              title="Invitation Ready to Share"
              subtitle="Copy the secure invitation link below and share it with your collaborator. The link automatically binds the preconfigured role and property access upon acceptance."
              primaryAction={{
                label: copied ? 'Copied to Clipboard!' : 'Copy Invitation Link',
                icon: copied ? Check : Copy,
                onClick: () => {
                  navigator.clipboard.writeText(generatedInviteUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 3000);
                },
              }}
              secondaryAction={{
                label: 'Close',
                onClick: () => {
                  setGeneratedInviteUrl(null);
                  onClose();
                },
              }}
            />

            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl font-mono text-[11px] text-slate-700 dark:text-slate-300 break-all select-all border border-slate-200 dark:border-slate-700">
              {generatedInviteUrl}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
