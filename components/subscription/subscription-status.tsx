'use client';

import React from 'react';
import Link from 'next/link';
import { ActiveSubscriptionWithPlan } from '@/types/subscriptions';
import { ShieldCheck, AlertTriangle, Calendar, Clock, AlertCircle, ArrowRight, RotateCcw } from 'lucide-react';

interface SubscriptionStatusProps {
  subscription: ActiveSubscriptionWithPlan | null;
  latestPayment?: any | null;
}

export function SubscriptionStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
    trialing: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800',
    past_due: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
    canceled: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
    expired: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800',
    under_review: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-800',
    pending_payment: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
    rejected: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800',
    draft: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950/40 dark:text-slate-400 dark:border-slate-800',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${styles[status] || styles.active}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status.replace('_', ' ')}
    </span>
  );
}

export function SubscriptionStatusCard({ subscription, latestPayment }: SubscriptionStatusProps) {
  const isUnderReview =
    subscription?.status === 'under_review' ||
    latestPayment?.status === 'under_review';

  const isRejected =
    latestPayment?.status === 'rejected' &&
    (!subscription || subscription.status === 'canceled' || subscription.status === 'expired');

  return (
    <div className="space-y-4">
      {/* Pending Under Review Banner */}
      {isUnderReview && (
        <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-6 dark:border-violet-900/60 dark:bg-violet-950/30">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-violet-100 p-3 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300">
              <Clock className="h-6 w-6 animate-pulse" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-violet-950 dark:text-violet-200 text-sm">
                  Manual Payment Under Review
                </h4>
                <SubscriptionStatusBadge status="under_review" />
              </div>
              <p className="text-xs text-violet-800 dark:text-violet-300 leading-relaxed">
                Your payment receipt has been received and is currently being verified against our bank statement.
                Verification typically takes 1 to 4 business hours. Your plan entitlements will activate immediately upon verification.
              </p>
              {latestPayment?.reference && (
                <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-mono text-violet-900 dark:text-violet-300">
                  <span>Reference: <strong>{latestPayment.reference}</strong></span>
                  {latestPayment.amount_cents && (
                    <span>Amount: <strong>${(latestPayment.amount_cents / 100).toFixed(2)} AUD</strong></span>
                  )}
                  {latestPayment.submitted_at && (
                    <span>Submitted: {new Date(latestPayment.submitted_at).toLocaleDateString()}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rejected Payment Notification */}
      {isRejected && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-6 dark:border-rose-900/60 dark:bg-rose-950/30">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="rounded-xl bg-rose-100 p-3 text-rose-600 dark:bg-rose-900/50 dark:text-rose-300">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-rose-950 dark:text-rose-200 text-sm">
                    Payment Verification Unsuccessful
                  </h4>
                  <SubscriptionStatusBadge status="rejected" />
                </div>
                <p className="text-xs text-rose-800 dark:text-rose-300">
                  {latestPayment?.rejection_reason || 'The submitted payment could not be reconciled with our bank records.'}
                </p>
                {latestPayment?.reference && (
                  <p className="text-[11px] font-mono text-rose-700 dark:text-rose-400">
                    Reference: {latestPayment.reference}
                  </p>
                )}
              </div>
            </div>

            <Link
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition-colors shrink-0 shadow-xs"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Resubmit Request</span>
            </Link>
          </div>
        </div>
      )}

      {/* Main Subscription Card */}
      {!subscription ? (
        <div className="rounded-2xl border border-admin-border bg-admin-surface p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-admin-warning-soft p-3 text-admin-warning">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-section-title font-semibold text-admin-foreground">No Active Subscription</h3>
              <p className="text-body-sm text-admin-muted">Choose a subscription plan to unlock features.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-admin-border bg-admin-surface p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-admin-indigo-soft p-3.5 text-admin-indigo">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-entity-title font-semibold text-admin-foreground">
                    {subscription.subscription_plans?.name || 'Standard'} Plan
                  </h3>
                  <SubscriptionStatusBadge status={subscription.status} />
                </div>
                <p className="mt-0.5 text-body-sm text-admin-muted">
                  {subscription.subscription_plans?.description || 'Active PropertyLedge Subscription'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 border-t border-admin-border pt-4 sm:border-t-0 sm:pt-0 text-body-sm">
              <div>
                <div className="flex items-center gap-1.5 text-caption text-admin-muted">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Next Renewal / Period End</span>
                </div>
                <p className="mt-1 font-semibold text-admin-foreground">
                  {subscription.current_period_end
                    ? new Date(subscription.current_period_end).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
