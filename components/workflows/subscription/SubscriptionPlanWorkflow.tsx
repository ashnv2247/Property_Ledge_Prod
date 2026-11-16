'use client';

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Building2,
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
  Clock,
  Sparkles,
  ArrowRight,
  Info,
} from 'lucide-react';
import {
  GuidedWorkflow,
  type GuidedWorkflowStepConfig,
  VisualChoiceCard,
  VisualChoiceGrid,
  QuestionField,
  ContextualExplanation,
  WorkflowSummary,
  WorkflowSuccess,
} from '@/components/workflows/guided-workflow';
import { Input, Select, Button, useToast } from '@/components/admin/ui';
import { handleCreateManualCheckoutSession, handleSubmitManualPayment } from '@/app/actions/billing';
import { BANK_DETAILS } from '@/lib/billing/types';
import { cn } from '@/lib/utils';

export interface SubscriptionPlanWorkflowProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  userName?: string;
  userPhone?: string;
  initialPlanSlug?: 'landlord' | 'manager';
  onSuccess?: () => void;
}

export interface SubscriptionWorkflowContext {
  planSlug: 'landlord' | 'manager';
  billingInterval: 'monthly' | 'yearly';
  accountType: 'individual' | 'business';
  fullName: string;
  email: string;
  phone: string;
  businessName: string;
  abn: string;
  reference: string;
  transactionId: string;
  paymentDate: string;
  notes: string;
}

export function SubscriptionPlanWorkflow({
  isOpen,
  onClose,
  userEmail = '',
  userName = '',
  userPhone = '',
  initialPlanSlug = 'landlord',
  onSuccess,
}: SubscriptionPlanWorkflowProps) {
  const { success: showToastSuccess, error: showError } = useToast();

  const [checkoutSession, setCheckoutSession] = useState<{
    subscriptionId: string;
    paymentId: string;
    reference: string;
    expectedAmount: number;
  } | null>(null);
  const [copiedBank, setCopiedBank] = useState<string | null>(null);
  const [submissionComplete, setSubmissionComplete] = useState<boolean>(false);

  const plans = {
    landlord: {
      id: 'landlord',
      name: 'Landlord Starter',
      monthlyPrice: 29,
      yearlyPrice: 290,
      description: 'Ideal for independent self-managing landlords and private investors.',
      benefits: [
        'Up to 5 properties in portfolio',
        'Automated PayID & Direct Debit matching',
        'Statutory ATO Tax & BAS reports',
        'Digital Lease agreements & rent schedules',
      ],
    },
    manager: {
      id: 'manager',
      name: 'Portfolio Pro',
      monthlyPrice: 79,
      yearlyPrice: 790,
      description: 'Designed for property managers, family offices, and growing portfolios.',
      benefits: [
        'Up to 25 properties in portfolio',
        'Priority live automated bank feeds',
        'Multi-user team RBAC & property scoping',
        'Autopilot scheduled invoice generation',
        'Priority accountant export support',
      ],
    },
  };

  const initialContext: SubscriptionWorkflowContext = {
    planSlug: initialPlanSlug,
    billingInterval: 'monthly',
    accountType: 'individual',
    fullName: userName,
    email: userEmail,
    phone: userPhone,
    businessName: '',
    abn: '',
    reference: '',
    transactionId: '',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: '',
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBank(key);
    setTimeout(() => setCopiedBank(null), 2500);
  };

  const steps: GuidedWorkflowStepConfig<SubscriptionWorkflowContext>[] = [
    // Step 1: Plan & Scale
    {
      id: 'plan-select',
      title: 'Plan & Billing',
      description: 'Select the tier matching your portfolio scale and billing frequency.',
      component: ({ context, updateContext }) => {
        return (
          <div className="space-y-5">
            <div className="text-center max-w-lg mx-auto space-y-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#008F83]/10 text-[#008F83] text-[11px] font-bold border border-[#008F83]/20">
                <Sparkles className="w-3 h-3" /> Step 1 · Subscription Scale
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                What do you need PropertyLedge to manage?
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Choose the plan that fits your portfolio. You can upgrade or add properties at any time.
              </p>
            </div>

            {/* Billing Interval Toggle */}
            <div className="flex justify-center">
              <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => updateContext({ billingInterval: 'monthly' })}
                  className={cn(
                    'px-4 py-1.5 text-xs font-semibold rounded-lg transition-all',
                    context.billingInterval === 'monthly'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                  )}
                >
                  Monthly Billing
                </button>
                <button
                  type="button"
                  onClick={() => updateContext({ billingInterval: 'yearly' })}
                  className={cn(
                    'px-4 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5',
                    context.billingInterval === 'yearly'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                  )}
                >
                  <span>Annual Billing</span>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-bold">
                    Save 17%
                  </span>
                </button>
              </div>
            </div>

            <VisualChoiceGrid columns={2}>
              {(['landlord', 'manager'] as const).map((slug) => {
                const plan = plans[slug];
                const price =
                  context.billingInterval === 'monthly'
                    ? `$${plan.monthlyPrice} / month`
                    : `$${plan.yearlyPrice} / year`;

                return (
                  <VisualChoiceCard
                    key={slug}
                    id={slug}
                    title={plan.name}
                    badge={price}
                    description={plan.description}
                    benefits={plan.benefits}
                    icon={Building2}
                    isSelected={context.planSlug === slug}
                    onSelect={() => updateContext({ planSlug: slug })}
                  />
                );
              })}
            </VisualChoiceGrid>
          </div>
        );
      },
    },

    // Step 2: Account & Invoicing Information
    {
      id: 'billing-details',
      title: 'Billing Details',
      description: 'Enter your legal entity name and tax invoice details.',
      validate: (ctx) => {
        if (!ctx.fullName.trim() || !ctx.email.trim()) {
          showError('Missing Information', 'Please provide your full name and billing email address.');
          return false;
        }
        return true;
      },
      component: ({ context, updateContext }) => {
        return (
          <div className="space-y-5 max-w-xl mx-auto">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Who should this subscription be invoiced to?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official Australian tax invoices will be generated and issued under these details.
              </p>
            </div>

            <div className="flex rounded-xl p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => updateContext({ accountType: 'individual' })}
                className={cn(
                  'flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all',
                  context.accountType === 'individual'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 dark:text-slate-400'
                )}
              >
                Individual Landlord
              </button>
              <button
                type="button"
                onClick={() => updateContext({ accountType: 'business' })}
                className={cn(
                  'flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all',
                  context.accountType === 'business'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 dark:text-slate-400'
                )}
              >
                Company / Trust Entity
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <QuestionField question="Contact Name" required>
                <Input
                  placeholder="e.g. Alex Morgan"
                  value={context.fullName}
                  onChange={(e) => updateContext({ fullName: e.target.value })}
                />
              </QuestionField>

              <QuestionField question="Billing Email" required>
                <Input
                  type="email"
                  placeholder="billing@example.com"
                  value={context.email}
                  onChange={(e) => updateContext({ email: e.target.value })}
                />
              </QuestionField>
            </div>

            {context.accountType === 'business' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <QuestionField question="Business / Entity Name">
                  <Input
                    placeholder="e.g. Morgan Holdings Pty Ltd"
                    value={context.businessName}
                    onChange={(e) => updateContext({ businessName: e.target.value })}
                  />
                </QuestionField>

                <QuestionField question="Australian Business Number (ABN)">
                  <Input
                    placeholder="e.g. 12 345 678 901"
                    value={context.abn}
                    onChange={(e) => updateContext({ abn: e.target.value })}
                  />
                </QuestionField>
              </div>
            )}
          </div>
        );
      },
    },

    // Step 3: Payment Instructions & Transfer Proof
    {
      id: 'payment-proof',
      title: 'Payment & Transfer',
      description: 'Transfer funds via PayID or BSB and record reference number.',
      component: ({ context, updateContext }) => {
        const selectedPlan = plans[context.planSlug];
        const amount = context.billingInterval === 'monthly' ? selectedPlan.monthlyPrice : selectedPlan.yearlyPrice;

        return (
          <div className="space-y-5 max-w-xl mx-auto">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Transfer Payment Details
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Please transfer exactly <span className="font-bold text-[#008F83]">${amount}.00 AUD</span> using the details below.
              </p>
            </div>

            {/* Bank Transfer Details Box */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
                <span className="font-bold text-slate-900 dark:text-white">PayID / Australian Bank Transfer</span>
                <span className="text-[11px] font-bold text-[#008F83]">${amount}.00 AUD</span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Account Name:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{BANK_DETAILS.accountName}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Bank Institution:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{BANK_DETAILS.bankName}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">BSB:</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(BANK_DETAILS.bsb, 'bsb')}
                    className="flex items-center gap-1 font-mono font-bold text-slate-900 dark:text-white hover:text-[#008F83]"
                  >
                    {BANK_DETAILS.bsb}
                    {copiedBank === 'bsb' ? <Check className="w-3 h-3 text-[#008F83]" /> : <Copy className="w-3 h-3 text-slate-400" />}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Account Number:</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(BANK_DETAILS.accountNumber, 'acc')}
                    className="flex items-center gap-1 font-mono font-bold text-slate-900 dark:text-white hover:text-[#008F83]"
                  >
                    {BANK_DETAILS.accountNumber}
                    {copiedBank === 'acc' ? <Check className="w-3 h-3 text-[#008F83]" /> : <Copy className="w-3 h-3 text-slate-400" />}
                  </button>
                </div>
              </div>
            </div>

            <QuestionField
              question="Your Bank Transfer Reference / Transaction ID"
              description="Enter the reference or receipt number provided by your banking app"
            >
              <Input
                placeholder="e.g. TXN-892147 or your surname"
                value={context.transactionId}
                onChange={(e) => updateContext({ transactionId: e.target.value })}
              />
            </QuestionField>

            <ContextualExplanation
              title="Manual Verification Process"
              explanation="Submitting payment details logs a pending verification request. Our financial reconciliation team verifies receipt against bank statements before activating enhanced entitlements."
              canChangeLater={false}
            />
          </div>
        );
      },
    },

    // Step 4: Summary & Submission
    {
      id: 'review',
      title: 'Review Order',
      description: 'Confirm plan and payment reference before submission.',
      component: ({ context }) => {
        const plan = plans[context.planSlug];
        const price =
          context.billingInterval === 'monthly'
            ? `$${plan.monthlyPrice} AUD / month`
            : `$${plan.yearlyPrice} AUD / year`;

        return (
          <div className="space-y-5">
            <WorkflowSummary
              title="Review Subscription Request"
              description="Confirm your subscription order details below."
              relationshipChain={[
                {
                  label: 'Selected Plan',
                  value: plan.name,
                  icon: <Building2 className="w-4 h-4" />,
                },
                {
                  label: 'Billing Cycle',
                  value: context.billingInterval.toUpperCase(),
                  icon: <Clock className="w-4 h-4" />,
                },
                {
                  label: 'Verification',
                  value: 'Pending Review',
                  icon: <ShieldCheck className="w-4 h-4" />,
                },
              ]}
              sections={[
                {
                  title: 'Plan & Pricing',
                  stepIndex: 0,
                  items: [
                    { label: 'Plan Tier', value: plan.name },
                    { label: 'Billing Schedule', value: context.billingInterval === 'monthly' ? 'Monthly' : 'Annual' },
                    { label: 'Amount Payable', value: price },
                  ],
                },
                {
                  title: 'Invoice Recipient',
                  stepIndex: 1,
                  items: [
                    { label: 'Billing Name', value: context.fullName },
                    { label: 'Email', value: context.email },
                    { label: 'Entity Type', value: context.accountType === 'business' ? `Company (${context.businessName || '—'})` : 'Individual' },
                  ],
                },
                {
                  title: 'Transfer Verification Reference',
                  stepIndex: 2,
                  items: [
                    { label: 'Payment Reference', value: context.transactionId || 'Unset (Bank Feed Match)' },
                    { label: 'Payment Method', value: 'Direct Bank Deposit (PayID / BSB)' },
                  ],
                },
              ]}
            />
          </div>
        );
      },
    },
  ];

  const handleFinalSubmit = async (finalContext: SubscriptionWorkflowContext) => {
    // 1. Create checkout session
    const sessionRes = await handleCreateManualCheckoutSession(
      finalContext.planSlug,
      finalContext.billingInterval
    );

    if (!sessionRes || !sessionRes.subscriptionId) {
      throw new Error('Failed to initialize subscription checkout session.');
    }

    // 2. Submit payment record
    if (sessionRes.paymentId) {
      await handleSubmitManualPayment(sessionRes.paymentId, {
        submittedAmount: sessionRes.expectedAmount,
        paymentDate: finalContext.paymentDate,
        transactionId: finalContext.transactionId || 'MANUAL-PROOF',
        fileName: 'online_transfer.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
      });
    }

    showToastSuccess('Payment Submitted', 'Your transfer proof has been submitted for verification.');
    setSubmissionComplete(true);
    if (onSuccess) onSuccess();
  };

  return (
    <>
      <GuidedWorkflow
        isOpen={isOpen && !submissionComplete}
        onClose={onClose}
        title="Upgrade Subscription"
        badge="Workspace Plan"
        description="Follow this visual workflow to select your portfolio tier, generate bank transfer instructions, and submit verification."
        initialContext={initialContext}
        steps={steps}
        onSubmit={handleFinalSubmit}
      />

      {/* Success Modal */}
      {submissionComplete && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
        >
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl">
            <WorkflowSuccess
              title="Verification Request Received"
              subtitle="Your subscription payment details have been logged in our accounting verification ledger. Entitlements will activate once the incoming transfer matches your bank reference."
              details={[
                { label: 'Plan', value: plans[initialPlanSlug].name },
                { label: 'Status', value: 'Pending Verification' },
              ]}
              primaryAction={{
                label: 'View Subscription Settings',
                onClick: () => {
                  setSubmissionComplete(false);
                  onClose();
                },
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
