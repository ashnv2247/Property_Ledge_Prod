'use client';

import React, { useState } from 'react';
import { useOnboardingNav } from '@/components/onboarding/OnboardingNavContext';
import { OnboardingContent } from '@/components/onboarding/OnboardingContent';
import { OnboardingStep } from '@/components/onboarding/OnboardingStep';
import { OnboardingFooter } from '@/components/onboarding/OnboardingFooter';
import { FormField, inputClassName } from '@/components/onboarding/FormField';
import { inviteOnboardingCollaborators, skipOnboardingTeam } from '@/app/actions/onboarding';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Users,
  Briefcase,
  Building2,
  UserPlus,
  Plus,
  Trash2,
  ShieldCheck,
  Mail,
} from 'lucide-react';

interface InviteItem {
  id: string;
  role: string;
  email: string;
}

const PRESET_ROLES = [
  { id: 'accountant', label: '+ Invite Accountant', defaultRole: 'Accountant', icon: <Briefcase className="h-3.5 w-3.5" /> },
  { id: 'pm', label: '+ Invite Property Manager', defaultRole: 'Property Manager', icon: <Building2 className="h-3.5 w-3.5" /> },
  { id: 'partner', label: '+ Invite Co-owner / Partner', defaultRole: 'Partner', icon: <UserPlus className="h-3.5 w-3.5" /> },
];

export default function OnboardingTeamPage() {
  const { navigate } = useOnboardingNav();
  const [invites, setInvites] = useState<InviteItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addInvite = (roleName: string) => {
    setInvites((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        role: roleName,
        email: '',
      },
    ]);
  };

  const removeInvite = (id: string) => {
    setInvites((prev) => prev.filter((item) => item.id !== id));
  };

  const updateEmail = (id: string, email: string) => {
    setInvites((prev) =>
      prev.map((item) => (item.id === id ? { ...item, email } : item))
    );
  };

  const handleSkip = async () => {
    setIsSaving(true);
    try {
      await skipOnboardingTeam();
      navigate('/onboarding/complete');
    } catch {
      navigate('/onboarding/complete');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validInvites = invites.filter((inv) => inv.email.trim().includes('@'));

    setIsSaving(true);
    setError(null);

    try {
      if (validInvites.length > 0) {
        await inviteOnboardingCollaborators(
          validInvites.map((inv) => ({ email: inv.email.trim(), role: inv.role }))
        );
      } else {
        await skipOnboardingTeam();
      }
      navigate('/onboarding/complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send invitations. You can continue anyway.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <OnboardingContent>
      <form onSubmit={handleSubmit}>
        <OnboardingStep
          eyebrow="Step 4 of 4"
          title="Who else helps manage your properties?"
          description="Collaborate securely with your accountant, property manager, or business partners. Team members only see what you give them access to."
        >
          <div className="space-y-4 mt-4">
            {/* Role Quick-Add Tags */}
            <div className="p-4 rounded-2xl bg-[#0B1D30]/60 border border-white/[0.06] space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#00A99D]">
                Quick Invite Options
              </span>

              <div className="flex flex-wrap gap-2">
                {PRESET_ROLES.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => addInvite(preset.defaultRole)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#0B1D30] border border-white/[0.08] text-[#FFFFFF] hover:border-[#008F83] hover:bg-[#008F83]/10 hover:text-[#00A99D] transition-all cursor-pointer select-none"
                  >
                    <span className="text-[#008F83]">{preset.icon}</span>
                    <span>{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Progressive Email Inputs */}
            <div className="space-y-2.5">
              <AnimatePresence>
                {invites.map((invite, index) => (
                  <motion.div
                    key={invite.id}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="p-3.5 rounded-2xl bg-[#0B1D30]/80 border border-white/[0.08] flex items-center gap-2.5 shadow-md"
                  >
                    <div className="px-2.5 py-1 rounded-lg bg-[#008F83]/15 text-[#00A99D] border border-[#008F83]/20 text-xs font-semibold shrink-0">
                      {invite.role}
                    </div>

                    <div className="flex-1 relative flex items-center">
                      <Mail className="absolute left-3.5 h-3.5 w-3.5 text-[#64788D]" />
                      <input
                        type="email"
                        value={invite.email}
                        onChange={(e) => updateEmail(invite.id, e.target.value)}
                        placeholder={`colleague@domain.com.au`}
                        className={cn(inputClassName, 'h-10 text-xs pl-9')}
                        autoFocus={index === invites.length - 1}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => removeInvite(invite.id)}
                      className="p-2 rounded-xl text-[#8FA3B8] hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                      title="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>

              {invites.length === 0 && (
                <div className="p-4 rounded-2xl border border-dashed border-white/[0.08] text-center space-y-1">
                  <p className="text-xs text-[#8FA3B8]">
                    No collaborators added yet. You can invite team members at any time later.
                  </p>
                </div>
              )}
            </div>

            {/* Granular Permissions Note */}
            <div className="p-3 rounded-xl bg-[#0B1D30]/40 border border-white/[0.04] flex items-center gap-2 text-xs text-[#8FA3B8]">
              <ShieldCheck className="h-4 w-4 text-[#008F83] shrink-0" />
              <span>Role-based access ensures accountants only access financial statements and reports.</span>
            </div>
          </div>

          <OnboardingFooter
            onBack={() => navigate('/onboarding/property')}
            continueLabel={isSaving ? 'Finishing setup…' : invites.length > 0 ? 'Send invites & continue' : 'Continue'}
            continueType="submit"
            continueLoading={isSaving}
            skipLabel="Skip — I'll do this later"
            onSkip={handleSkip}
            error={error}
          />
        </OnboardingStep>
      </form>
    </OnboardingContent>
  );
}

