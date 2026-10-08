'use client';

import React, { useState } from 'react';
import { useOnboardingNav } from '@/components/onboarding/OnboardingNavContext';
import { Sparkles, CreditCard, Compass, ShieldCheck, Check } from 'lucide-react';
import { OnboardingContent } from '@/components/onboarding/OnboardingContent';
import { OnboardingStep } from '@/components/onboarding/OnboardingStep';
import { OnboardingFooter } from '@/components/onboarding/OnboardingFooter';
import { SelectionCard } from '@/components/onboarding/SelectionCard';
import { selectOnboardingStartOption } from '@/app/actions/onboarding';
import type { SubscriptionPlan } from '@/types/subscriptions';

type StartChoice = 'trial' | 'explore' | 'paid';

interface OnboardingSubscriptionClientProps {
  plans: SubscriptionPlan[];
  recommendedPlanId?: string;
}

export function OnboardingSubscriptionClient({ plans, recommendedPlanId }: OnboardingSubscriptionClientProps) {
  const { navigate } = useOnboardingNav();
  const [choice, setChoice] = useState<StartChoice>('trial');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trialPlan = plans.find((p) => p.slug === 'manager') || plans[plans.length - 1] || plans[0];

  const handleContinue = async () => {
    setIsSaving(true);
    setError(null);
    try {
      if (choice === 'trial' && trialPlan) {
        const { nextRoute } = await selectOnboardingStartOption('trial', trialPlan.id, trialPlan.slug);
        navigate(nextRoute);
        return;
      }
      if (choice === 'explore') {
        const { nextRoute } = await selectOnboardingStartOption('explore');
        navigate(nextRoute);
        return;
      }
      if (choice === 'paid') {
        const { nextRoute } = await selectOnboardingStartOption('paid');
        navigate(nextRoute);
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save your selection. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <OnboardingContent>
      <OnboardingStep
        eyebrow="Step 2 of 4"
        title="Choose how you'd like to start."
        description="Every PropertyLedge account starts with full access. You can adjust your plan anytime."
      >
        <div className="space-y-3 mt-4">
          {trialPlan && (
            <SelectionCard
              id="trial"
              name="startChoice"
              title="14-Day Free Trial"
              description={`Full access to all portfolio management features with the ${trialPlan.name} tier. No charge today.`}
              icon={<Sparkles className="h-4 w-4" />}
              selected={choice === 'trial'}
              badge="Recommended"
              onSelect={() => setChoice('trial')}
            />
          )}

          <SelectionCard
            id="explore"
            name="startChoice"
            title="Explore Workspace First"
            description="Jump straight into your setup and test the interface before choosing a subscription."
            icon={<Compass className="h-4 w-4" />}
            selected={choice === 'explore'}
            onSelect={() => setChoice('explore')}
          />

          <SelectionCard
            id="paid"
            name="startChoice"
            title="Select a Specific Plan"
            description="Review all Landlord, Commercial, and Enterprise subscription tiers."
            icon={<CreditCard className="h-4 w-4" />}
            selected={choice === 'paid'}
            onSelect={() => setChoice('paid')}
          />
        </div>

        {/* Security & Guarantee highlight */}
        <div className="mt-4 p-3 rounded-xl bg-[#0B1D30]/60 border border-white/[0.06] flex items-center justify-between text-xs text-[#8FA3B8]">
          <span className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-[#008F83]" />
            <span>Cancel anytime with 1 click</span>
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-[#008F83]" />
            <span>No lock-in contracts</span>
          </span>
        </div>

        <OnboardingFooter
          onBack={() => navigate('/onboarding/workspace')}
          onContinue={handleContinue}
          continueType="button"
          continueLoading={isSaving}
          continueLabel={isSaving ? 'Configuring…' : 'Continue'}
          error={error}
        />
      </OnboardingStep>
    </OnboardingContent>
  );
}

