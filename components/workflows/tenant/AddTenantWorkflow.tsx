'use client';

import React, { useState, useEffect } from 'react';
import {
  User,
  Building,
  Mail,
  Phone,
  Shield,
  FileText,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import {
  GuidedWorkflow,
  type GuidedWorkflowStepConfig,
  QuestionField,
  ContextualExplanation,
  WorkflowSummary,
  WorkflowSuccess,
} from '@/components/workflows/guided-workflow';
import { Input, Select, Textarea, useToast } from '@/components/admin/ui';
import { handleCreateTenant, fetchDashboardProperties } from '@/app/actions/dashboard';
import { usePropertyContext } from '@/components/property/PropertyContext';
import { cn } from '@/lib/utils';

export interface AddTenantWorkflowProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedPropertyId?: string;
  onSuccess?: (tenant?: any) => void;
  onContinueToLease?: (tenantId: string, propertyId: string) => void;
}

export interface TenantWorkflowContext {
  propertyId: string;
  propertyName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  emergencyName: string;
  emergencyPhone: string;
  notes: string;
}

const INITIAL_CONTEXT: TenantWorkflowContext = {
  propertyId: '',
  propertyName: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  emergencyName: '',
  emergencyPhone: '',
  notes: '',
};

export function AddTenantWorkflow({
  isOpen,
  onClose,
  preselectedPropertyId,
  onSuccess,
  onContinueToLease,
}: AddTenantWorkflowProps) {
  const { success: showToastSuccess, error: showError } = useToast();
  const { availableProperties, selectedProperty } = usePropertyContext();
  const [propertyOptions, setPropertyOptions] = useState<Array<{ id: string; name: string; address: string }>>([]);
  const [createdTenant, setCreatedTenant] = useState<any | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (availableProperties && availableProperties.length > 0) {
      setPropertyOptions(
        availableProperties.map((p) => ({
          id: p.propertyId,
          name: p.propertyName,
          address: p.propertyName,
        }))
      );
    } else {
      fetchDashboardProperties().then((props: any) => {
        if (props && Array.isArray(props)) {
          setPropertyOptions(
            props.map((p: any) => ({
              id: p.id,
              name: p.name || p.address_line_1,
              address: p.address_line_1 || p.name,
            }))
          );
        }
      });
    }
  }, [availableProperties]);

  const defaultPropId = preselectedPropertyId || selectedProperty?.propertyId || '';

  const steps: GuidedWorkflowStepConfig<TenantWorkflowContext>[] = [
    // Step 1: Property Association
    {
      id: 'property',
      title: 'Property Assignment',
      description: 'Choose which property this tenant occupies or is moving into.',
      validate: (ctx) => {
        if (!ctx.propertyId) {
          showError('Property Required', 'Please select a property to associate this tenant with.');
          return false;
        }
        return true;
      },
      component: ({ context, updateContext }) => {
        return (
          <div className="space-y-5 max-w-xl mx-auto">
            <div className="text-center max-w-lg mx-auto space-y-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#008F83]/10 text-[#008F83] text-[11px] font-bold border border-[#008F83]/20">
                <Sparkles className="w-3 h-3" /> Step 1 · Tenancy Link
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                Which property is this tenant associated with?
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Tenant profiles are safely organized under the appropriate property in your portfolio.
              </p>
            </div>

            <QuestionField
              question="Select Property"
              required
              description="Choose an active property from your workspace."
            >
              <Select
                value={context.propertyId || defaultPropId}
                onChange={(e) => {
                  const targetId = e.target.value;
                  const found = propertyOptions.find((p) => p.id === targetId);
                  updateContext({
                    propertyId: targetId,
                    propertyName: found ? found.name : '',
                  });
                }}
                options={[
                  { value: '', label: '-- Choose a property --' },
                  ...propertyOptions.map((p) => ({
                    value: p.id,
                    label: p.name,
                  })),
                ]}
              />
            </QuestionField>

            <ContextualExplanation
              title="Application Access Distinction"
              explanation="Adding a tenant creates a local tenancy record for billing, rental notices, and lease agreements. It does not automatically grant application login or access to your financial records."
              canChangeLater={true}
            />
          </div>
        );
      },
    },

    // Step 2: Tenant Identity & Contact
    {
      id: 'contact',
      title: 'Tenant Details',
      description: 'Enter the tenant’s legal name, email, and mobile number.',
      validate: (ctx) => {
        const errs: Record<string, string> = {};
        if (!ctx.firstName.trim()) errs.firstName = 'First name is required.';
        if (!ctx.email.trim()) errs.email = 'Email address is required.';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ctx.email)) errs.email = 'Enter a valid email address.';
        setErrors(errs);
        if (Object.keys(errs).length > 0) {
          showError('Validation Error', 'Please complete the required name and email fields.');
          return false;
        }
        return true;
      },
      component: ({ context, updateContext }) => {
        return (
          <div className="space-y-5 max-w-xl mx-auto">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                What is the tenant’s name and contact info?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official notices, rent reminders, and invoices will be dispatched to this email address.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <QuestionField
                question="First Name"
                required
                error={errors.firstName}
              >
                <Input
                  placeholder="e.g. John"
                  value={context.firstName}
                  onChange={(e) => {
                    updateContext({ firstName: e.target.value });
                    if (errors.firstName) setErrors((prev) => ({ ...prev, firstName: '' }));
                  }}
                />
              </QuestionField>

              <QuestionField question="Last Name">
                <Input
                  placeholder="e.g. Smith"
                  value={context.lastName}
                  onChange={(e) => updateContext({ lastName: e.target.value })}
                />
              </QuestionField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <QuestionField
                question="Email Address"
                required
                description="Primary channel for digital notices and tax invoices"
                error={errors.email}
              >
                <Input
                  type="email"
                  placeholder="john.smith@example.com"
                  value={context.email}
                  onChange={(e) => {
                    updateContext({ email: e.target.value });
                    if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                  }}
                />
              </QuestionField>

              <QuestionField
                question="Phone Number (Optional)"
                description="Mobile contact for SMS alerts"
              >
                <Input
                  placeholder="e.g. 0412 345 678"
                  value={context.phone}
                  onChange={(e) => updateContext({ phone: e.target.value })}
                />
              </QuestionField>
            </div>
          </div>
        );
      },
    },

    // Step 3: Emergency Contact & Notes (Optional)
    {
      id: 'emergency-notes',
      title: 'Emergency Contact & Notes',
      isOptional: true,
      description: 'Record secondary contacts and internal notes.',
      component: ({ context, updateContext }) => {
        return (
          <div className="space-y-5 max-w-xl mx-auto">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Emergency Contact & Tenancy Notes
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Optional information to have on file in case of building emergencies or special tenancy conditions.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <QuestionField question="Emergency Contact Name">
                <Input
                  placeholder="e.g. Sarah Smith (Sister)"
                  value={context.emergencyName}
                  onChange={(e) => updateContext({ emergencyName: e.target.value })}
                />
              </QuestionField>

              <QuestionField question="Emergency Contact Phone">
                <Input
                  placeholder="e.g. 0498 765 432"
                  value={context.emergencyPhone}
                  onChange={(e) => updateContext({ emergencyPhone: e.target.value })}
                />
              </QuestionField>
            </div>

            <QuestionField
              question="Internal Landlord / Manager Notes"
              description="Private notes visible only to property managers and workspace owners."
            >
              <Textarea
                placeholder="e.g. Prefers email correspondence. Has one cat permitted under pet clause."
                rows={3}
                value={context.notes}
                onChange={(e) => updateContext({ notes: e.target.value })}
              />
            </QuestionField>
          </div>
        );
      },
    },

    // Step 4: Review
    {
      id: 'review',
      title: 'Review',
      description: 'Confirm tenant profile details before adding.',
      component: ({ context }) => {
        const propName =
          context.propertyName ||
          propertyOptions.find((p) => p.id === context.propertyId)?.name ||
          'Selected Property';

        return (
          <div className="space-y-5">
            <WorkflowSummary
              title="Review Tenant Profile"
              description="Verify the tenant details and associated property below."
              relationshipChain={[
                {
                  label: 'Property',
                  value: propName,
                  icon: <Building className="w-4 h-4" />,
                },
                {
                  label: 'Tenant',
                  value: `${context.firstName} ${context.lastName}`.trim(),
                  subtext: context.email,
                  icon: <User className="w-4 h-4" />,
                },
              ]}
              sections={[
                {
                  title: 'Assigned Property',
                  stepIndex: 0,
                  items: [
                    { label: 'Property Asset', value: propName },
                    { label: 'Occupancy Status', value: 'Active Tenant' },
                  ],
                },
                {
                  title: 'Personal Information',
                  stepIndex: 1,
                  items: [
                    { label: 'Full Name', value: `${context.firstName} ${context.lastName}`.trim() },
                    { label: 'Email', value: context.email },
                    { label: 'Phone', value: context.phone || '—' },
                  ],
                },
                {
                  title: 'Emergency Contact & Notes',
                  stepIndex: 2,
                  items: [
                    { label: 'Emergency Contact', value: context.emergencyName || '—' },
                    { label: 'Emergency Phone', value: context.emergencyPhone || '—' },
                    { label: 'Internal Notes', value: context.notes || '—' },
                  ],
                },
              ]}
            />
          </div>
        );
      },
    },
  ];

  const handleFinalSubmit = async (finalContext: TenantWorkflowContext) => {
    const propId = finalContext.propertyId || defaultPropId;
    if (!propId) throw new Error('A property must be selected.');

    const payload = {
      first_name: finalContext.firstName.trim(),
      last_name: finalContext.lastName.trim(),
      email: finalContext.email.trim().toLowerCase(),
      phone: finalContext.phone.trim() || null,
      status: 'active' as const,
      notes: finalContext.notes.trim() || null,
      emergency_contact_name: finalContext.emergencyName.trim() || null,
      emergency_contact_phone: finalContext.emergencyPhone.trim() || null,
    };

    const res = await handleCreateTenant(propId, payload);
    if (!res.success) throw new Error('Could not create tenant.');

    showToastSuccess('Tenant Profile Created', `${payload.first_name} ${payload.last_name} has been added.`);
    const resultObj = res.data || { ...payload, id: 'new-tenant', property_id: propId };
    setCreatedTenant(resultObj);
    return resultObj;
  };

  return (
    <>
      <GuidedWorkflow
        isOpen={isOpen && !createdTenant}
        onClose={onClose}
        title="Add Tenant"
        badge="Tenancy Onboarding"
        description="Record a new resident, set up emergency contact information, and link them to an active property."
        initialContext={{
          ...INITIAL_CONTEXT,
          propertyId: defaultPropId,
          propertyName: propertyOptions.find((p) => p.id === defaultPropId)?.name || '',
        }}
        steps={steps}
        onSubmit={handleFinalSubmit}
        onSuccess={(result) => {
          if (onSuccess) onSuccess(result);
        }}
      />

      {/* Success Modal with Next Action Options */}
      {createdTenant && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
        >
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl">
            <WorkflowSuccess
              title="Tenant Added Successfully"
              subtitle={`${createdTenant.first_name} ${createdTenant.last_name} is now registered in your tenant directory.`}
              details={[
                { label: 'Name', value: `${createdTenant.first_name} ${createdTenant.last_name}` },
                { label: 'Email', value: createdTenant.email },
              ]}
              primaryAction={{
                label: 'Create Lease for this Tenant',
                onClick: () => {
                  const tId = createdTenant.id;
                  const pId = createdTenant.property_id || defaultPropId;
                  setCreatedTenant(null);
                  onClose();
                  if (onContinueToLease) {
                    onContinueToLease(tId, pId);
                  }
                },
              }}
              secondaryAction={{
                label: 'Done',
                onClick: () => {
                  setCreatedTenant(null);
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
