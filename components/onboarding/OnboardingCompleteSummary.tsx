'use client';

import React, { useState, useTransition } from 'react';
import { motion } from 'framer-motion';
import { Check, ArrowRight, Home, Building2, TrendingUp, ShieldCheck, Sparkles, Layers } from 'lucide-react';
import { finishOnboarding } from '@/app/actions/onboarding';

interface OnboardingCompleteSummaryProps {
  workspaceName: string;
  hasSubscription: boolean;
  propertyName?: string;
  subscriptionStatus?: string | null;
}

export function OnboardingCompleteSummary({
  workspaceName,
  hasSubscription,
  propertyName,
  subscriptionStatus
}: OnboardingCompleteSummaryProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isHovered, setIsHovered] = useState(false);

  const handleDashboardRedirect = () => {
    setError(null);
    startTransition(async () => {
      try {
        await finishOnboarding();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to open dashboard. Please try again.';
        if (!message.includes('NEXT_REDIRECT')) {
          setError(message);
        }
      }
    });
  };

  const checklistItems = [
    {
      label: 'Workspace created',
      value: workspaceName,
      done: true,
    },
    {
      label: 'Plan configuration',
      value: subscriptionStatus === 'trial' ? 'Standard (14d Trial)' : 'Active Plan',
      done: hasSubscription,
    },
    {
      label: 'Property portfolio',
      value: propertyName || 'Setup ready (Add anytime)',
      done: true,
    },
  ];

  return (
    <div className="space-y-5 mt-4">
      {/* Celebratory Checkmark Hero */}
      <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-[#008F83]/10 border border-[#008F83]/25 shadow-lg shadow-[#008F83]/10">
        <motion.div
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#008F83] text-[#FFFFFF] shadow-md shadow-[#008F83]/30"
        >
          <Check className="h-5 w-5" strokeWidth={3} />
        </motion.div>
        <div>
          <h3 className="text-sm font-bold text-[#FFFFFF] tracking-tight">Your workspace is 100% ready</h3>
          <p className="text-xs text-[#8FA3B8] leading-relaxed">
            All bank feed integrations, document vaults, and tenant tracking are configured.
          </p>
        </div>
      </div>

      {/* Summary Checklist */}
      <div className="space-y-2">
        <div className="space-y-2">
          {checklistItems.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08, duration: 0.25 }}
              className="flex items-center justify-between p-3 rounded-xl border border-white/[0.06] bg-[#0B1D30]/60"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#008F83]/20 text-[#00A99D]">
                  <Check className="h-2.5 w-2.5" strokeWidth={3} />
                </span>
                <span className="text-xs font-semibold text-[#FFFFFF]/90 tracking-tight">{item.label}</span>
              </div>
              <span className="text-xs text-[#8FA3B8] font-medium">{item.value}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Miniature Product Preview Widget */}
      <div className="p-3.5 rounded-2xl bg-[#08182A] border border-white/[0.08] space-y-2.5">
        <div className="flex items-center justify-between text-[11px] font-semibold text-[#8FA3B8]">
          <span>Dashboard Preview</span>
          <span className="text-[#00A99D] flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Live AUD Hub
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2.5 rounded-xl bg-[#0B1D30] border border-white/[0.04] text-center">
            <span className="text-[10px] text-[#8FA3B8] block">Properties</span>
            <span className="text-sm font-bold text-[#FFFFFF] mt-0.5 block">{propertyName ? '1' : '0'}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-[#0B1D30] border border-white/[0.04] text-center">
            <span className="text-[10px] text-[#8FA3B8] block">Compliance</span>
            <span className="text-xs font-bold text-emerald-400 mt-0.5 block">100% OK</span>
          </div>
          <div className="p-2.5 rounded-xl bg-[#0B1D30] border border-white/[0.04] text-center">
            <span className="text-[10px] text-[#8FA3B8] block">Reports</span>
            <span className="text-xs font-bold text-[#00A99D] mt-0.5 block">Automated</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between">
        <p className="text-xs text-[#8FA3B8]">
          Let’s take a look around.
        </p>

        <motion.button
          onClick={handleDashboardRedirect}
          disabled={isPending}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          whileTap={{ scale: isPending ? 1 : 0.98 }}
          className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl text-xs font-semibold text-[#FFFFFF] bg-[#008F83] hover:bg-[#00A99D] active:bg-[#00A99D]/90 transition-all cursor-pointer select-none shadow-md shadow-[#008F83]/20"
        >
          {isPending ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" aria-hidden="true" />
              <span>Opening PropertyLedge...</span>
            </>
          ) : (
            <>
              <span>Go to my dashboard</span>
              <motion.span
                animate={{ x: isHovered ? 3 : 0 }}
                transition={{ type: 'spring', stiffness: 350, damping: 20 }}
                className="shrink-0"
              >
                <ArrowRight className="h-3.5 w-3.5" />
              </motion.span>
            </>
          )}
        </motion.button>
      </div>
      {error && <p className="mt-2 text-xs font-medium text-rose-400" role="alert">{error}</p>}
    </div>
  );
}

