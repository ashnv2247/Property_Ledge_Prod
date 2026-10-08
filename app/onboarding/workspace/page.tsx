'use client';

import React, { useState, useEffect } from 'react';
import { useOnboardingNav } from '@/components/onboarding/OnboardingNavContext';
import { OnboardingContent } from '@/components/onboarding/OnboardingContent';
import { OnboardingStep } from '@/components/onboarding/OnboardingStep';
import { OnboardingFooter } from '@/components/onboarding/OnboardingFooter';
import { FormField, inputClassName } from '@/components/onboarding/FormField';
import { saveOnboardingWorkspaceSetup } from '@/app/actions/onboarding';
import type { BusinessType } from '@/lib/onboarding/state';
import { cn } from '@/lib/utils';
import { Building2, Sparkles, Globe } from 'lucide-react';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function OnboardingWorkspacePage() {
  const { navigate } = useOnboardingNav();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [slug, setSlug] = useState('');
  const [isSlugCustom, setIsSlugCustom] = useState(false);
  const [businessType, setBusinessType] = useState<BusinessType>('property_owner');
  const [portfolioSize, setPortfolioSize] = useState<'1-2' | '3-10' | '10+'>('1-2');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPersona = sessionStorage.getItem('pl_onboarding_persona') as BusinessType | null;
      if (savedPersona) {
        setBusinessType(savedPersona);
      }
    }
  }, []);

  const handleNameChange = (value: string) => {
    setWorkspaceName(value);
    if (!isSlugCustom) {
      setSlug(slugify(value));
    }
  };

  const handleSlugChange = (value: string) => {
    setIsSlugCustom(true);
    setSlug(slugify(value));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!fullName.trim()) next.fullName = 'Please enter your full name';
    if (!workspaceName.trim()) next.workspaceName = 'Please give your workspace a name';
    if (!slug.trim()) next.slug = 'Workspace URL slug is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSaving(true);
    setError(null);
    try {
      await saveOnboardingWorkspaceSetup({
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        workspaceName: workspaceName.trim(),
        workspaceSlug: slug.trim(),
        businessType,
      });
      navigate('/onboarding/subscription');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create your workspace. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <OnboardingContent>
      <form onSubmit={handleSubmit}>
        <OnboardingStep
          eyebrow="Step 1 of 4"
          title="Set up your workspace."
          description="Your workspace is the private, secure hub where your properties, financial records, and documents live."
        >
          <div className="space-y-5 mt-4">
            {/* User Profile Section */}
            <div className="p-4 rounded-2xl bg-[#0B1D30]/60 border border-white/[0.06] space-y-3.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#00A99D]">
                  01 · Profile Information
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField id="fullName" label="Your full name" error={errors.fullName}>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={inputClassName}
                    placeholder="e.g. Sarah Jenkins"
                    autoComplete="name"
                  />
                </FormField>

                <FormField id="phone" label="Mobile number (optional)" hint="For verification & SMS alerts">
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={inputClassName}
                    placeholder="0400 000 000"
                    autoComplete="tel"
                  />
                </FormField>
              </div>
            </div>

            {/* Workspace Configuration Section */}
            <div className="p-4 rounded-2xl bg-[#0B1D30]/60 border border-white/[0.06] space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#00A99D]">
                  02 · Workspace Details
                </span>
                <span className="text-[10px] text-[#8FA3B8] flex items-center gap-1">
                  <Globe className="h-3 w-3 text-[#008F83]" />
                  <span>Australian Region</span>
                </span>
              </div>

              <FormField id="workspaceName" label="Workspace name" error={errors.workspaceName}>
                <input
                  id="workspaceName"
                  type="text"
                  value={workspaceName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className={inputClassName}
                  placeholder="e.g. Jenkins Property Group or My Portfolio"
                />
              </FormField>

              <FormField
                id="slug"
                label="Workspace URL"
                hint={slug ? `Your private link: propertyledge.com/${slug}` : 'Used for team and portal links'}
                error={errors.slug}
              >
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-xs text-[#64788D] select-none font-mono">
                    propertyledge.com/
                  </span>
                  <input
                    id="slug"
                    type="text"
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    className={cn(inputClassName, "pl-[124px] font-mono text-xs sm:text-sm")}
                    placeholder="jenkins-property"
                  />
                </div>
              </FormField>

              {/* Portfolio Scale / Size quick-select */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-semibold text-[#FFFFFF]/90 tracking-tight">
                  How many properties are you starting with?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: '1-2', label: '1 – 2 Properties', sub: 'Single / Dual asset' },
                    { id: '3-10', label: '3 – 10 Properties', sub: 'Growing portfolio' },
                    { id: '10+', label: '10+ Properties', sub: 'Commercial / Scale' },
                  ].map((size) => (
                    <button
                      key={size.id}
                      type="button"
                      onClick={() => setPortfolioSize(size.id as any)}
                      className={cn(
                        'p-2.5 rounded-xl border text-left transition-all cursor-pointer select-none',
                        portfolioSize === size.id
                          ? 'border-[#008F83] bg-[#008F83]/15 text-[#FFFFFF] shadow-sm shadow-[#008F83]/20 ring-1 ring-[#008F83]/40'
                          : 'border-white/[0.06] bg-white/[0.02] text-[#8FA3B8] hover:border-white/[0.12] hover:bg-white/[0.04]'
                      )}
                    >
                      <span className="text-xs font-semibold block leading-tight">{size.label}</span>
                      <span className="text-[10px] text-[#64788D] block mt-0.5">{size.sub}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <OnboardingFooter
            onBack={() => navigate('/onboarding')}
            continueLabel={isSaving ? 'Creating workspace…' : 'Continue'}
            continueType="submit"
            continueLoading={isSaving}
            error={error}
          />
        </OnboardingStep>
      </form>
    </OnboardingContent>
  );
}

