'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Building,
  User,
  Calendar,
  DollarSign,
  ShieldCheck,
  Sparkles,
  Key,
  Clock,
  ArrowRight,
} from 'lucide-react';
import {
  GuidedWorkflow,
  type GuidedWorkflowStepConfig,
  QuestionField,
  ContextualExplanation,
  ConditionalSection,
  WorkflowSummary,
  WorkflowSuccess,
} from '@/components/workflows/guided-workflow';
import { Input, Select, Textarea, useToast } from '@/components/admin/ui';
import {
  handleCreateLease,
  handleCreateTenant,
  fetchDashboardProperties,
  fetchAllWorkspaceTenants,
} from '@/app/actions/dashboard';
import { usePropertyContext } from '@/components/property/PropertyContext';
import { getAuTodayString } from '@/lib/format/australian-time';
import { cn } from '@/lib/utils';

export interface CreateLeaseWorkflowProps {
  isOpen: boolean;
  onClose: () => void;
  initialPropertyId?: string;
  initialTenantId?: string;
  onSuccess?: () => void;
}

export interface LeaseWorkflowContext {
  propertyId: string;
  propertyName: string;
  propertyAddress: string;
  tenantMode: 'existing' | 'new';
  tenantId: string;
  tenantName: string;
  tenantEmail: string;
  newTenantFirstName: string;
  newTenantLastName: string;
  newTenantEmail: string;
  newTenantPhone: string;
  startDate: string;
  endDate: string;
  isPeriodic: boolean;
  rentAmount: string;
  rentFrequency: 'Weekly' | 'Fortnightly' | 'Monthly' | 'Yearly';
  securityDeposit: string;
  paymentDueDay: string;
  notes: string;
}

const INITIAL_CONTEXT: LeaseWorkflowContext = {
  propertyId: '',
  propertyName: '',
  propertyAddress: '',
  tenantMode: 'existing',
  tenantId: '',
  tenantName: '',
  tenantEmail: '',
  newTenantFirstName: '',
  newTenantLastName: '',
  newTenantEmail: '',
  newTenantPhone: '',
  startDate: getAuTodayString(),
  endDate: '',
  isPeriodic: false,
  rentAmount: '',
  rentFrequency: 'Weekly',
  securityDeposit: '',
  paymentDueDay: '1',
  notes: '',
};

export function CreateLeaseWorkflow({
  isOpen,
  onClose,
  initialPropertyId,
  initialTenantId,
  onSuccess,
}: CreateLeaseWorkflowProps) {
  const { success: showToastSuccess, error: showError } = useToast();
  const { availableProperties, selectedProperty } = usePropertyContext();

  const [properties, setProperties] = useState<Array<{ id: string; name: string; address_line_1: string; rent_amount?: number }>>([]);
  const [tenants, setTenants] = useState<Array<{ id: string; first_name: string; last_name: string; email: string; property_id?: string }>>([]);
  const [createdLease, setCreatedLease] = useState<any | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      fetchDashboardProperties().then((props: any) => {
        if (props && Array.isArray(props)) {
          setProperties(props);
        }
      });
      fetchAllWorkspaceTenants().then((tens: any) => {
        if (tens && Array.isArray(tens)) {
          setTenants(tens);
        }
      });
    }
  }, [isOpen]);

  const defaultPropId = initialPropertyId || selectedProperty?.propertyId || '';

  const steps: GuidedWorkflowStepConfig<LeaseWorkflowContext>[] = [
    // Step 1: Property Selection
    {
      id: 'property-select',
      title: 'Property Selection',
      description: 'Select the real estate asset this tenancy agreement binds.',
      validate: (ctx) => {
        if (!ctx.propertyId) {
          showError('Property Required', 'Please select a property for this lease.');
          return false;
        }
        return true;
      },
      component: ({ context, updateContext }) => {
        return (
          <div className="space-y-5 max-w-xl mx-auto">
            <div className="text-center max-w-lg mx-auto space-y-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#008F83]/10 text-[#008F83] text-[11px] font-bold border border-[#008F83]/20">
                <Sparkles className="w-3 h-3" /> Step 1 · Property Asset
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                Which property is this lease for?
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Choose the property being rented. The agreed rent amount will be automatically prefilled if on file.
              </p>
            </div>

            <QuestionField
              question="Select Property"
              required
              description="Active properties in your workspace"
            >
              <Select
                value={context.propertyId || defaultPropId}
                onChange={(e) => {
                  const targetId = e.target.value;
                  const prop = properties.find((p) => p.id === targetId);
                  updateContext({
                    propertyId: targetId,
                    propertyName: prop?.name || '',
                    propertyAddress: prop?.address_line_1 || '',
                    rentAmount: prop?.rent_amount ? String(prop.rent_amount) : context.rentAmount,
                  });
                }}
                options={[
                  { value: '', label: '-- Choose a property --' },
                  ...properties.map((p) => ({
                    value: p.id,
                    label: `${p.name || p.address_line_1} (${p.address_line_1})`,
                  })),
                ]}
              />
            </QuestionField>

            <ContextualExplanation
              title="Tenancy Covenant"
              explanation="Linking a property binds the legal address into the statutory lease terms and enables recurring automated expected rent schedule generation."
              nextStepPreview="Assign resident tenant"
            />
          </div>
        );
      },
    },

    // Step 2: Tenant Assignment
    {
      id: 'tenant-assignment',
      title: 'Tenant Assignment',
      description: 'Identify the primary resident or create a new tenant profile.',
      validate: (ctx) => {
        if (ctx.tenantMode === 'existing') {
          if (!ctx.tenantId) {
            showError('Tenant Required', 'Please select a tenant from your directory.');
            return false;
          }
        } else {
          if (!ctx.newTenantFirstName.trim() || !ctx.newTenantEmail.trim()) {
            showError('Tenant Details Required', 'Please enter the tenant’s first name and email.');
            return false;
          }
        }
        return true;
      },
      component: ({ context, updateContext }) => {
        // Filter tenants optionally matching the selected property
        const relevantTenants = context.propertyId
          ? tenants.filter((t) => !t.property_id || t.property_id === context.propertyId)
          : tenants;

        return (
          <div className="space-y-5 max-w-xl mx-auto">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Who will be living under this lease?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                You can select an existing registered tenant or add a new tenant record right now.
              </p>
            </div>

            {/* Mode Toggle */}
            <div className="flex rounded-xl p-1 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => updateContext({ tenantMode: 'existing' })}
                className={cn(
                  'flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all',
                  context.tenantMode === 'existing'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                )}
              >
                Choose Existing Tenant
              </button>
              <button
                type="button"
                onClick={() => updateContext({ tenantMode: 'new' })}
                className={cn(
                  'flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all',
                  context.tenantMode === 'new'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                )}
              >
                + Register New Tenant
              </button>
            </div>

            {context.tenantMode === 'existing' ? (
              <QuestionField
                question="Select Registered Tenant"
                required
                description="Directory records for your workspace"
              >
                <Select
                  value={context.tenantId}
                  onChange={(e) => {
                    const id = e.target.value;
                    const found = tenants.find((t) => t.id === id);
                    updateContext({
                      tenantId: id,
                      tenantName: found ? `${found.first_name} ${found.last_name}` : '',
                      tenantEmail: found ? found.email : '',
                    });
                  }}
                  options={[
                    { value: '', label: '-- Select Tenant --' },
                    ...relevantTenants.map((t) => ({
                      value: t.id,
                      label: `${t.first_name} ${t.last_name} (${t.email})`,
                    })),
                  ]}
                />
              </QuestionField>
            ) : (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-2 gap-3">
                  <QuestionField question="First Name" required>
                    <Input
                      placeholder="e.g. Jane"
                      value={context.newTenantFirstName}
                      onChange={(e) => updateContext({ newTenantFirstName: e.target.value })}
                    />
                  </QuestionField>
                  <QuestionField question="Last Name">
                    <Input
                      placeholder="e.g. Doe"
                      value={context.newTenantLastName}
                      onChange={(e) => updateContext({ newTenantLastName: e.target.value })}
                    />
                  </QuestionField>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <QuestionField question="Email Address" required>
                    <Input
                      type="email"
                      placeholder="jane.doe@example.com"
                      value={context.newTenantEmail}
                      onChange={(e) => updateContext({ newTenantEmail: e.target.value })}
                    />
                  </QuestionField>
                  <QuestionField question="Phone">
                    <Input
                      placeholder="0400 123 456"
                      value={context.newTenantPhone}
                      onChange={(e) => updateContext({ newTenantPhone: e.target.value })}
                    />
                  </QuestionField>
                </div>
              </div>
            )}
          </div>
        );
      },
    },

    // Step 3: Rent Terms & Schedule
    {
      id: 'terms',
      title: 'Rent Terms & Dates',
      description: 'Define rent amounts, billing intervals, and lease duration.',
      validate: (ctx) => {
        if (!ctx.rentAmount || Number(ctx.rentAmount) <= 0) {
          showError('Invalid Rent', 'Please enter a valid rent amount greater than $0.');
          return false;
        }
        if (!ctx.startDate) {
          showError('Start Date Required', 'Please select a lease commencement date.');
          return false;
        }
        if (!ctx.isPeriodic && !ctx.endDate) {
          showError('End Date Required', 'Please select a lease end date, or enable periodic month-to-month tenancy.');
          return false;
        }
        return true;
      },
      component: ({ context, updateContext }) => {
        return (
          <div className="space-y-5 max-w-xl mx-auto">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                How much rent has been agreed?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Specify payment frequency, commencement date, and optional security deposit bond.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <QuestionField
                question="Agreed Rent ($ AUD)"
                required
                description="Recurring payment amount"
              >
                <Input
                  type="number"
                  min="1"
                  placeholder="e.g. 700"
                  value={context.rentAmount}
                  onChange={(e) => updateContext({ rentAmount: e.target.value })}
                />
              </QuestionField>

              <QuestionField
                question="Payment Frequency"
                required
                description="Billing frequency"
              >
                <Select
                  value={context.rentFrequency}
                  onChange={(e) => updateContext({ rentFrequency: e.target.value as any })}
                  options={[
                    { value: 'Weekly', label: 'Weekly' },
                    { value: 'Fortnightly', label: 'Fortnightly' },
                    { value: 'Monthly', label: 'Monthly' },
                    { value: 'Yearly', label: 'Yearly' },
                  ]}
                />
              </QuestionField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <QuestionField
                question="Commencement Date"
                required
                description="When does the lease begin?"
              >
                <Input
                  type="date"
                  value={context.startDate}
                  onChange={(e) => updateContext({ startDate: e.target.value })}
                />
              </QuestionField>

              <QuestionField
                question="Lease End Date"
                description={context.isPeriodic ? 'Disabled for periodic lease' : 'Expiration date'}
              >
                <Input
                  type="date"
                  disabled={context.isPeriodic}
                  value={context.endDate}
                  onChange={(e) => updateContext({ endDate: e.target.value })}
                />
              </QuestionField>
            </div>

            {/* Periodic lease checkbox */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 flex items-center justify-between">
              <div>
                <span className="block text-xs font-semibold text-slate-900 dark:text-white">
                  Periodic / Month-to-Month Tenancy
                </span>
                <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                  Continuous lease without a predetermined termination date
                </span>
              </div>
              <input
                type="checkbox"
                checked={context.isPeriodic}
                onChange={(e) => updateContext({ isPeriodic: e.target.checked })}
                className="w-4 h-4 rounded text-[#008F83] focus:ring-[#008F83]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <QuestionField
                question="Security Deposit / Bond ($ AUD)"
                description="Held with RTBA or state authority"
              >
                <Input
                  type="number"
                  placeholder="e.g. 2800"
                  value={context.securityDeposit}
                  onChange={(e) => updateContext({ securityDeposit: e.target.value })}
                />
              </QuestionField>

              <QuestionField
                question="Payment Due Day"
                description="Day of month or cycle when rent is due"
              >
                <Input
                  type="number"
                  min="1"
                  max="31"
                  placeholder="1"
                  value={context.paymentDueDay}
                  onChange={(e) => updateContext({ paymentDueDay: e.target.value })}
                />
              </QuestionField>
            </div>
          </div>
        );
      },
    },

    // Step 4: Review
    {
      id: 'review',
      title: 'Review Agreement',
      description: 'Confirm parties, financial covenants, and dates before activation.',
      component: ({ context }) => {
        const prop = properties.find((p) => p.id === context.propertyId);
        const propName = prop?.name || prop?.address_line_1 || 'Selected Property';
        const tenantDisplay =
          context.tenantMode === 'new'
            ? `${context.newTenantFirstName} ${context.newTenantLastName}`.trim()
            : context.tenantName || 'Assigned Tenant';

        return (
          <div className="space-y-5">
            <WorkflowSummary
              title="Review Tenancy Agreement"
              description="Verify all legal parties and payment schedules below before recording this lease."
              relationshipChain={[
                {
                  label: 'Property',
                  value: propName,
                  subtext: prop?.address_line_1,
                  icon: <Building className="w-4 h-4" />,
                },
                {
                  label: 'Tenant',
                  value: tenantDisplay,
                  icon: <User className="w-4 h-4" />,
                },
                {
                  label: 'Terms',
                  value: `$${context.rentAmount} / ${context.rentFrequency.toLowerCase()}`,
                  subtext: context.isPeriodic ? 'Periodic' : `To ${context.endDate || 'TBD'}`,
                  icon: <Key className="w-4 h-4" />,
                },
              ]}
              sections={[
                {
                  title: 'Lease Parties',
                  stepIndex: 0,
                  items: [
                    { label: 'Property Asset', value: propName },
                    { label: 'Tenant Resident', value: tenantDisplay },
                    {
                      label: 'Contact Email',
                      value: context.tenantMode === 'new' ? context.newTenantEmail : context.tenantEmail,
                    },
                  ],
                },
                {
                  title: 'Financial Covenants',
                  stepIndex: 2,
                  items: [
                    { label: 'Agreed Rent', value: `$${context.rentAmount} AUD (${context.rentFrequency})` },
                    { label: 'Security Deposit (Bond)', value: context.securityDeposit ? `$${context.securityDeposit} AUD` : 'No bond recorded' },
                    { label: 'Payment Due Day', value: `Day ${context.paymentDueDay}` },
                  ],
                },
                {
                  title: 'Duration & Tenancy Structure',
                  stepIndex: 2,
                  items: [
                    { label: 'Commencement', value: context.startDate },
                    { label: 'Termination', value: context.isPeriodic ? 'Periodic (Open-ended)' : context.endDate || 'Unset' },
                    { label: 'Agreement Type', value: context.isPeriodic ? 'Periodic Tenancy' : 'Fixed Term Lease' },
                  ],
                },
              ]}
            />
          </div>
        );
      },
    },
  ];

  const handleFinalSubmit = async (finalContext: LeaseWorkflowContext) => {
    let linkedTenantId = finalContext.tenantId;

    // 1. If new tenant mode, create tenant first
    if (finalContext.tenantMode === 'new') {
      const tenantRes: any = await handleCreateTenant(finalContext.propertyId, {
        first_name: finalContext.newTenantFirstName.trim(),
        last_name: finalContext.newTenantLastName.trim(),
        email: finalContext.newTenantEmail.trim().toLowerCase(),
        phone: finalContext.newTenantPhone.trim() || null,
        status: 'active',
      });
      if (!tenantRes.success || !tenantRes.data?.id) {
        throw new Error('Could not create tenant record for lease.');
      }
      linkedTenantId = tenantRes.data.id;
    }

    // 2. Prepare lease payload
    const leasePayload = {
      property_id: finalContext.propertyId,
      start_date: finalContext.startDate,
      end_date: finalContext.isPeriodic ? null : finalContext.endDate || null,
      rent_amount: Number(finalContext.rentAmount) || 0,
      rent_frequency: finalContext.rentFrequency.toLowerCase() as 'weekly' | 'fortnightly' | 'monthly' | 'yearly',
      security_deposit: finalContext.securityDeposit ? Number(finalContext.securityDeposit) : undefined,
      payment_due_day: finalContext.paymentDueDay ? Number(finalContext.paymentDueDay) : 1,
      lease_type: finalContext.isPeriodic ? 'Periodic' : 'Fixed Term',
      status: 'active' as const,
      terms_and_conditions: finalContext.notes.trim() || null,
    };

    const res: any = await handleCreateLease(
      finalContext.propertyId,
      leasePayload,
      linkedTenantId ? [linkedTenantId] : []
    );

    if (!res.success) {
      throw new Error(res.error || 'Failed to create lease.');
    }

    showToastSuccess('Lease Recorded', 'The tenancy agreement has been created successfully.');
    setCreatedLease({ ...leasePayload, id: res.data?.id || 'new-lease' });
    return res.data || leasePayload;
  };

  return (
    <>
      <GuidedWorkflow
        isOpen={isOpen && !createdLease}
        onClose={onClose}
        title="Create Tenancy Lease"
        badge="Lease Agreement"
        description="Follow this visual workflow to bind a property, assign tenants, and establish recurring payment covenants."
        illustration={{
          lightSrc: '/images/workflows/lease_workflow_light.webp',
          darkSrc: '/images/workflows/lease_workflow_dark.webp',
          alt: 'Lease Agreement',
        }}
        initialContext={{
          ...INITIAL_CONTEXT,
          propertyId: defaultPropId,
          tenantId: initialTenantId || '',
        }}
        steps={steps}
        onSubmit={handleFinalSubmit}
        onSuccess={() => {
          if (onSuccess) onSuccess();
        }}
      />

      {/* Success Modal */}
      {createdLease && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
        >
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl">
            <WorkflowSuccess
              title="Lease Agreement Recorded"
              subtitle="The lease covenants and rent schedule have been registered. Financial ledgers and expected payment schedules will reflect this agreement."
              details={[
                { label: 'Rent Rate', value: `$${createdLease.rent_amount} AUD / ${createdLease.rent_frequency}` },
                { label: 'Commencement', value: createdLease.start_date },
                { label: 'Status', value: 'Active Tenancy' },
              ]}
              primaryAction={{
                label: 'View Leases',
                onClick: () => {
                  setCreatedLease(null);
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
