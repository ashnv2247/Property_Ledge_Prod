'use client';

import React, { useState } from 'react';
import { useOnboardingNav } from '@/components/onboarding/OnboardingNavContext';
import { OnboardingContent } from '@/components/onboarding/OnboardingContent';
import { OnboardingStep } from '@/components/onboarding/OnboardingStep';
import { OnboardingFooter } from '@/components/onboarding/OnboardingFooter';
import { PlanCard } from '@/components/onboarding/PlanCard';
import { selectOnboardingPlan } from '@/app/actions/onboarding';
import { getCanonicalPlan, getPlanFeatures } from '@/lib/subscriptions/plan-definitions';
import { cn } from '@/lib/utils';
import type { SubscriptionPlan } from '@/types/subscriptions';

interface OnboardingPlansClientProps {
  plans: SubscriptionPlan[];
  recommendedPlanId?: string;
}

export function OnboardingPlansClient({ plans, recommendedPlanId }: OnboardingPlansClientProps) {
  const { navigate } = useOnboardingNav();
  const [isAnnual, setIsAnnual] = useState(true);

  // Default selection to recommended plan (Portfolio Pro / manager) if available
  const defaultSelected = recommendedPlanId || plans.find((p) => p.slug === 'manager')?.id || plans[0]?.id || null;
  const [selectedId, setSelectedId] = useState<string | null>(defaultSelected);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    const plan = plans.find((p) => p.id === selectedId);
    if (!plan) {
      setError('Please select a plan to continue.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const canonical = getCanonicalPlan(plan.slug);
      const chosenPrice = isAnnual 
        ? (canonical?.annualPrice ? canonical.annualPrice * 100 : plan.price_cents ?? 0)
        : (canonical?.monthlyPrice ? canonical.monthlyPrice * 100 : plan.price_cents ?? 0);

      const { nextRoute } = await selectOnboardingPlan(
        plan.id,
        plan.slug,
        chosenPrice,
        isAnnual ? 'yearly' : 'monthly'
      );
      navigate(nextRoute);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to select plan. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <OnboardingContent fullWidth>
      <OnboardingStep 
        eyebrow="Step 2 of 4" 
        title="Scale your portfolio with confidence." 
        description="Select the subscription plan tailored to your property ledger requirements."
      >
        {/* Billing Switcher (Pill matching Landing Page) */}
        <div className="flex flex-col items-center justify-center my-4 space-y-2">
          <div className="inline-flex items-center gap-2 p-1.5 rounded-full bg-[#071526] border border-white/[0.08] shadow-inner">
            <button
              type="button"
              onClick={() => setIsAnnual(false)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-semibold transition-all",
                !isAnnual
                  ? "bg-[#008F83] text-white shadow-xs"
                  : "text-[#8FA3B8] hover:text-white"
              )}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setIsAnnual(true)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5",
                isAnnual
                  ? "bg-[#008F83] text-white shadow-xs"
                  : "text-[#8FA3B8] hover:text-white"
              )}
            >
              <span>Annual Billing</span>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#00A99D] text-[#061222]">
                Save 20%
              </span>
            </button>
          </div>
          <p className="text-xs text-[#8FA3B8]">
            14-day free trial. No credit card required. Cancel anytime.
          </p>
        </div>

        {/* 3-Card Consistent Plan Grid */}
        <div className="grid gap-5 lg:gap-6 grid-cols-1 md:grid-cols-3 mt-4 items-stretch">
          {plans.map((plan) => {
            const canonical = getCanonicalPlan(plan.slug);
            const isManager = plan.slug === 'manager';
            const isAgency = plan.slug === 'agency';

            const priceDisplay = isAgency 
              ? 'Custom'
              : isAnnual
              ? `$${canonical?.annualPrice ?? (plan.price_cents ? plan.price_cents / 100 : 29)}`
              : `$${canonical?.monthlyPrice ?? (plan.price_cents ? plan.price_cents / 100 : 39)}`;

            const periodDisplay = isAgency
              ? ''
              : isAnnual
              ? '/ mo (billed annually)'
              : '/ mo';

            const features = getPlanFeatures(plan.slug);
            const isRecommended = plan.id === recommendedPlanId || isManager;

            return (
              <PlanCard
                key={plan.id}
                plan={{
                  id: plan.id,
                  name: canonical?.name || plan.name,
                  slug: plan.slug,
                  description: canonical?.description || plan.description,
                  price_cents: plan.price_cents ?? 0,
                  billing_interval: isAnnual ? 'yearly' : 'monthly',
                  features,
                  popular: isRecommended,
                  priceDisplay,
                  periodDisplay,
                  customPrice: isAgency ? 'Custom' : undefined,
                }}
                recommended={isRecommended}
                selected={selectedId === plan.id}
                onSelect={() => setSelectedId(plan.id)}
              />
            );
          })}
        </div>

        {plans.length === 0 && (
          <p className="text-sm text-[#8FA3B8] mt-6 text-center">
            No plans are available right now. You can continue to property setup.
          </p>
        )}

        <OnboardingFooter
          onBack={() => navigate('/onboarding/subscription')}
          onContinue={handleContinue}
          continueType="button"
          continueLoading={isSaving}
          continueLabel={isSaving ? 'Saving…' : 'Continue'}
          continueDisabled={plans.length > 0 && !selectedId}
          error={error}
        />
      </OnboardingStep>
    </OnboardingContent>
  );
}
