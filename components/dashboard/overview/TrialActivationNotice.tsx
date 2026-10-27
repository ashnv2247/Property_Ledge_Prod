'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Clock,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  X,
  CreditCard,
  Building,
} from 'lucide-react';
import { ActiveSubscriptionWithPlan } from '@/types/subscriptions';

interface TrialActivationNoticeProps {
  subscription?: ActiveSubscriptionWithPlan | any | null;
  latestPayment?: any | null;
}

export function TrialActivationNotice({
  subscription,
  latestPayment,
}: TrialActivationNoticeProps) {
  const [showModal, setShowModal] = useState(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);

  const isUnderReview =
    subscription?.status === 'under_review' ||
    latestPayment?.status === 'under_review';

  const planName =
    subscription?.subscription_plans?.name ||
    subscription?.plan?.name ||
    'Portfolio Pro';

  const reference = latestPayment?.reference;

  // Check whether modal should appear on mount
  useEffect(() => {
    if (!isUnderReview) return;

    try {
      const storageKey = `pl_trial_notice_seen_${subscription?.id || 'default'}`;
      const hasSeen = localStorage.getItem(storageKey);
      if (!hasSeen) {
        setShowModal(true);
      }
    } catch {
      // Ignore localStorage errors in private browsing
    }
  }, [isUnderReview, subscription?.id]);

  const handleDismissModal = () => {
    setShowModal(false);
    try {
      const storageKey = `pl_trial_notice_seen_${subscription?.id || 'default'}`;
      localStorage.setItem(storageKey, 'true');
    } catch {
      // Ignore
    }
  };

  if (!isUnderReview) {
    return null;
  }

  return (
    <>
      {/* 1. Top Dashboard Alert Card / Banner */}
      {!isBannerDismissed && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="relative mb-6 overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-[#008F83]/5 to-violet-500/10 p-5 shadow-sm dark:bg-[#071524] dark:border-emerald-500/20"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#008F83] text-white shadow-md shadow-[#008F83]/20">
                <Sparkles className="h-6 w-6" />
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Your 14-Day Full Access Trial is Active
                  </h3>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    14-Day Trial Live
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-0.5 text-[11px] font-bold text-violet-700 dark:text-violet-300">
                    <Clock className="h-3 w-3" />
                    Payment Verification Under Review
                  </span>
                </div>

                <p className="max-w-3xl text-xs text-slate-600 dark:text-[#8FA3B8] leading-relaxed">
                  We received your manual payment receipt for your{' '}
                  <strong className="text-slate-900 dark:text-white font-semibold">{planName}</strong> plan.
                  While our Australian team confirms your bank deposit (typically 1–4 business hours),{' '}
                  <strong className="text-emerald-700 dark:text-emerald-400 font-semibold">
                    your 14-day full trial is activated right now
                  </strong>
                  . You have immediate access to create properties, add leases, track rent, and run BAS reports.
                </p>

                {reference && (
                  <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-0.5">
                    Payment Reference: <strong className="text-[#008F83] dark:text-[#32D5C4]">{reference}</strong>
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start lg:self-center">
              <Link
                href="/dashboard/properties?new=true"
                className="inline-flex items-center gap-2 rounded-xl bg-[#008F83] px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#00A99D] transition-colors"
              >
                <Building className="h-3.5 w-3.5" />
                <span>+ Add Property</span>
              </Link>
              <Link
                href="/dashboard/settings/subscription"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 dark:border-slate-700 dark:bg-slate-800/80 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <CreditCard className="h-3.5 w-3.5" />
                <span>View Status</span>
              </Link>
              <button
                type="button"
                onClick={() => setIsBannerDismissed(true)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-lg"
                title="Dismiss banner"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* 2. Welcome Modal Pop-up on First Dashboard Visit */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleDismissModal}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            />

            {/* Modal Dialog Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white p-7 shadow-2xl dark:border-slate-800 dark:bg-[#08182A]"
            >
              {/* Close Button */}
              <button
                onClick={handleDismissModal}
                className="absolute top-5 right-5 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Header Icon & Badges */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#008F83] to-[#00A99D] text-white shadow-md shadow-[#008F83]/30">
                  <ShieldCheck className="h-6 w-6" strokeWidth={2.5} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      14-Day Trial Active
                    </span>
                    <span className="rounded-full bg-violet-500/10 border border-violet-500/25 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-400">
                      Payment Under Review
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                    Welcome to PropertyLedge!
                  </h3>
                </div>
              </div>

              {/* Explanatory Body */}
              <div className="space-y-3.5 mb-6">
                <p className="text-xs text-slate-600 dark:text-[#8FA3B8] leading-relaxed">
                  You selected the <strong className="text-slate-900 dark:text-white">{planName}</strong> plan.
                  While our Australian finance team verifies your direct deposit receipt (typically 1–4 business hours),{' '}
                  <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    your 14-day full access trial is active immediately
                  </strong>
                  .
                </p>

                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-[#0B1D30]/80 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Full plan capabilities unlocked right now</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Create properties, units, and tenant leases today</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Seamless continuation once payment verification completes</span>
                  </div>
                </div>

                {reference && (
                  <div className="flex items-center justify-between text-xs rounded-xl bg-violet-500/5 border border-violet-500/15 p-3 text-violet-900 dark:text-violet-300">
                    <span>Payment Reference</span>
                    <span className="font-mono font-bold">{reference}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleDismissModal}
                  className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-[#008F83] text-xs font-bold text-white shadow-md shadow-[#008F83]/20 hover:bg-[#00A99D] transition-colors"
                >
                  <span>Explore Dashboard & Start</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
                <Link
                  href="/dashboard/settings/subscription"
                  onClick={handleDismissModal}
                  className="w-full sm:w-auto inline-flex items-center justify-center h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <span>View Status</span>
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
