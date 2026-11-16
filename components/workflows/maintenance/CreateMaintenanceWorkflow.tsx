'use client';

import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Droplets,
  Zap,
  Hammer,
  Refrigerator,
  Sparkles,
  AlertTriangle,
  Building,
  CheckCircle2,
  Clock,
  ShieldAlert,
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
import { Input, Select, Textarea, useToast } from '@/components/admin/ui';
import { handleCreateMaintenance, fetchDashboardProperties, fetchAllWorkspaceTenants } from '@/app/actions/dashboard';
import { usePropertyContext } from '@/components/property/PropertyContext';
import { cn } from '@/lib/utils';

export interface CreateMaintenanceWorkflowProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedPropertyId?: string;
  onSuccess?: () => void;
}

export interface MaintenanceWorkflowContext {
  category: 'plumbing' | 'electrical' | 'structural' | 'appliances' | 'general';
  propertyId: string;
  propertyName: string;
  tenantId: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

const INITIAL_CONTEXT: MaintenanceWorkflowContext = {
  category: 'plumbing',
  propertyId: '',
  propertyName: '',
  tenantId: '',
  title: '',
  description: '',
  priority: 'medium',
};

export function CreateMaintenanceWorkflow({
  isOpen,
  onClose,
  preselectedPropertyId,
  onSuccess,
}: CreateMaintenanceWorkflowProps) {
  const { success: showToastSuccess, error: showError } = useToast();
  const { availableProperties, selectedProperty } = usePropertyContext();

  const [properties, setProperties] = useState<Array<{ id: string; name: string; address_line_1: string }>>([]);
  const [tenants, setTenants] = useState<Array<{ id: string; first_name: string; last_name: string; property_id?: string }>>([]);
  const [createdRequest, setCreatedRequest] = useState<any | null>(null);
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

  const defaultPropId = preselectedPropertyId || selectedProperty?.propertyId || '';

  const categoryChoices = [
    {
      id: 'plumbing',
      title: 'Plumbing & Drainage',
      description: 'Water leaks, taps, hot water system, toilet or drain blockages.',
      icon: Droplets,
      benefits: ['Fast contractor dispatch', 'Water damage prevention'],
    },
    {
      id: 'electrical',
      title: 'Electrical & Power',
      description: 'Faulty switches, power outages, lighting, smoke alarms, or safety switches.',
      icon: Zap,
      benefits: ['Licensed electrician certified', 'Safety compliance priority'],
    },
    {
      id: 'appliances',
      title: 'Built-in Appliances',
      description: 'Oven, stove, dishwasher, air conditioner, or rangehood repairs.',
      icon: Refrigerator,
      benefits: ['Manufacturer warranty check', 'Model & serial tracking'],
    },
    {
      id: 'structural',
      title: 'Doors, Windows & Locks',
      description: 'Security locks, broken windows, roofing, fencing, or wall repairs.',
      icon: Hammer,
      benefits: ['Premises security protection', 'Structural integrity check'],
    },
    {
      id: 'general',
      title: 'General Maintenance',
      description: 'Gardening, gutter cleaning, pest treatment, or cosmetic touch-ups.',
      icon: Wrench,
      benefits: ['Scheduled maintenance cycle', 'Routine property upkeep'],
    },
  ];

  const priorityOptions = [
    {
      value: 'low',
      label: 'Low — Cosmetic or non-urgent routine maintenance',
      badge: 'Low Priority',
    },
    {
      value: 'medium',
      label: 'Medium — Standard repair needed within reasonable timeframe',
      badge: 'Medium Priority',
    },
    {
      value: 'high',
      label: 'High — Significant inconvenience (e.g. broken lock, partial power loss)',
      badge: 'High Priority',
    },
    {
      value: 'urgent',
      label: 'Urgent — Emergency / hazardous (e.g. burst pipe, major electrical safety risk)',
      badge: 'Urgent Action',
    },
  ];

  const steps: GuidedWorkflowStepConfig<MaintenanceWorkflowContext>[] = [
    // Step 1: Category Selection
    {
      id: 'category-select',
      title: 'Category',
      description: 'Identify the system or area requiring repair.',
      validate: (ctx) => {
        if (!ctx.category) {
          showError('Category Required', 'Please choose a maintenance category.');
          return false;
        }
        return true;
      },
      component: ({ context, updateContext }) => {
        return (
          <div className="space-y-5">
            <div className="text-center max-w-lg mx-auto space-y-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#008F83]/10 text-[#008F83] text-[11px] font-bold border border-[#008F83]/20">
                <Sparkles className="w-3 h-3" /> Step 1 · Triage
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                What needs attention?
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Categorizing the issue helps route the request to qualified trade contractors quickly.
              </p>
            </div>

            <VisualChoiceGrid columns={2}>
              {categoryChoices.map((choice) => (
                <VisualChoiceCard
                  key={choice.id}
                  id={choice.id}
                  title={choice.title}
                  description={choice.description}
                  benefits={choice.benefits}
                  icon={choice.icon}
                  isSelected={context.category === choice.id}
                  onSelect={(id) => updateContext({ category: id as any })}
                />
              ))}
            </VisualChoiceGrid>
          </div>
        );
      },
    },

    // Step 2: Location & Reporting Tenant
    {
      id: 'location-select',
      title: 'Property Location',
      description: 'Select the property and occupant associated with this maintenance issue.',
      validate: (ctx) => {
        if (!ctx.propertyId) {
          showError('Property Required', 'Please select a property for this request.');
          return false;
        }
        return true;
      },
      component: ({ context, updateContext }) => {
        const relevantTenants = context.propertyId
          ? tenants.filter((t) => !t.property_id || t.property_id === context.propertyId)
          : tenants;

        return (
          <div className="space-y-5 max-w-xl mx-auto">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Where is the issue?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Identify the property and optionally select the reporting resident tenant.
              </p>
            </div>

            <QuestionField
              question="Target Property"
              required
              description="Choose the asset where the repair is needed"
            >
              <Select
                value={context.propertyId || defaultPropId}
                onChange={(e) => {
                  const targetId = e.target.value;
                  const prop = properties.find((p) => p.id === targetId);
                  updateContext({
                    propertyId: targetId,
                    propertyName: prop?.name || '',
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

            <QuestionField
              question="Reporting Resident / Tenant (Optional)"
              description="Resident who reported the maintenance issue or needs contractor contact"
            >
              <Select
                value={context.tenantId}
                onChange={(e) => updateContext({ tenantId: e.target.value })}
                options={[
                  { value: '', label: '-- None (Owner / Manager Lodged) --' },
                  ...relevantTenants.map((t) => ({
                    value: t.id,
                    label: `${t.first_name} ${t.last_name}`,
                  })),
                ]}
              />
            </QuestionField>

            <ContextualExplanation
              title="Trade Contractor Coordination"
              explanation="The reporting resident’s contact details will be shared with assigned contractors once a work order is dispatched."
            />
          </div>
        );
      },
    },

    // Step 3: Issue Details & Urgency
    {
      id: 'issue-details',
      title: 'Issue & Urgency',
      description: 'Describe the symptoms, exact location, and urgency priority.',
      validate: (ctx) => {
        const errs: Record<string, string> = {};
        if (!ctx.title.trim()) errs.title = 'Please provide a brief summary title.';
        if (!ctx.description.trim()) errs.description = 'Please describe the issue in detail.';
        setErrors(errs);
        if (Object.keys(errs).length > 0) {
          showError('Missing Information', 'Please provide a title and description.');
          return false;
        }
        return true;
      },
      component: ({ context, updateContext }) => {
        return (
          <div className="space-y-5 max-w-xl mx-auto">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                What’s happening and how urgent is it?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Clear descriptions help contractors bring the right equipment and parts on the first visit.
              </p>
            </div>

            <QuestionField
              question="Brief Title"
              required
              description="e.g. Leaking kitchen sink tap or Gas cooktop won't ignite"
              error={errors.title}
            >
              <Input
                placeholder="e.g. Master bedroom ensuite tap continuously dripping"
                value={context.title}
                onChange={(e) => {
                  updateContext({ title: e.target.value });
                  if (errors.title) setErrors((prev) => ({ ...prev, title: '' }));
                }}
              />
            </QuestionField>

            <QuestionField
              question="Detailed Description"
              required
              description="Describe what happened, where in the property it is located, and any attempts to resolve it"
              error={errors.description}
            >
              <Textarea
                rows={4}
                placeholder="e.g. Water is leaking under the kitchen vanity cupboard whenever the cold water tap is turned on. Bucket placed underneath to catch drips."
                value={context.description}
                onChange={(e) => {
                  updateContext({ description: e.target.value });
                  if (errors.description) setErrors((prev) => ({ ...prev, description: '' }));
                }}
              />
            </QuestionField>

            <QuestionField
              question="Urgency Level"
              required
              description="Priority classification for scheduling trade dispatch"
            >
              <Select
                value={context.priority}
                onChange={(e) => updateContext({ priority: e.target.value as any })}
                options={priorityOptions.map((p) => ({
                  value: p.value,
                  label: p.label,
                }))}
              />
            </QuestionField>

            {context.priority === 'urgent' && (
              <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/20 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Urgent / Emergency Protocol</span>
                  <span>If there is an immediate health or fire safety hazard, advise occupants to shut off the main water valve or mains power switch immediately.</span>
                </div>
              </div>
            )}
          </div>
        );
      },
    },

    // Step 4: Review
    {
      id: 'review',
      title: 'Review & Lodge',
      description: 'Confirm maintenance request details before logging in tracking ledger.',
      component: ({ context }) => {
        const prop = properties.find((p) => p.id === context.propertyId);
        const propName = prop?.name || prop?.address_line_1 || 'Selected Property';
        const cat = categoryChoices.find((c) => c.id === context.category);
        const CatIcon = cat?.icon || Wrench;

        return (
          <div className="space-y-5">
            <WorkflowSummary
              title="Review Maintenance Request"
              description="Please review the details below before creating this maintenance record."
              relationshipChain={[
                {
                  label: 'Category',
                  value: cat?.title || 'General',
                  icon: <CatIcon className="w-4 h-4" />,
                },
                {
                  label: 'Property',
                  value: propName,
                  icon: <Building className="w-4 h-4" />,
                },
                {
                  label: 'Priority',
                  value: context.priority.toUpperCase(),
                  icon: <AlertTriangle className="w-4 h-4" />,
                },
              ]}
              sections={[
                {
                  title: 'Request Classification',
                  stepIndex: 0,
                  items: [
                    { label: 'Category', value: cat?.title || 'Maintenance' },
                    { label: 'Priority Level', value: context.priority.toUpperCase() },
                    { label: 'Initial Status', value: 'Open / Pending Review' },
                  ],
                },
                {
                  title: 'Location & Resident',
                  stepIndex: 1,
                  items: [
                    { label: 'Property Asset', value: propName },
                    {
                      label: 'Resident Contact',
                      value: context.tenantId
                        ? tenants.find((t) => t.id === context.tenantId)?.first_name || 'Assigned Tenant'
                        : 'Owner / Self Lodged',
                    },
                  ],
                },
                {
                  title: 'Issue Description',
                  stepIndex: 2,
                  items: [
                    { label: 'Title', value: context.title },
                    { label: 'Description', value: context.description },
                  ],
                },
              ]}
            />
          </div>
        );
      },
    },
  ];

  const handleFinalSubmit = async (finalContext: MaintenanceWorkflowContext) => {
    const propId = finalContext.propertyId || defaultPropId;
    if (!propId) throw new Error('A property must be selected.');

    const payload = {
      tenant_id: finalContext.tenantId || null,
      title: finalContext.title.trim(),
      description: `[${finalContext.category.toUpperCase()}] ${finalContext.description.trim()}`,
      priority: finalContext.priority,
      status: 'open' as const,
    };

    const res = await handleCreateMaintenance(propId, payload as any);
    if (!res.success) throw new Error('Could not lodge maintenance request.');

    showToastSuccess('Maintenance Request Lodged', `Request for "${finalContext.title}" has been recorded.`);
    const resultObj = res.data || { ...payload, id: 'new-maintenance', property_id: propId };
    setCreatedRequest(resultObj);
    return resultObj;
  };

  return (
    <>
      <GuidedWorkflow
        isOpen={isOpen && !createdRequest}
        onClose={onClose}
        title="Lodge Maintenance Request"
        badge="Property Maintenance"
        description="Follow this visual guide to triage repair issues, set urgency, and notify trade contractors."
        initialContext={{
          ...INITIAL_CONTEXT,
          propertyId: defaultPropId,
        }}
        steps={steps}
        onSubmit={handleFinalSubmit}
        onSuccess={() => {
          if (onSuccess) onSuccess();
        }}
      />

      {/* Success Modal */}
      {createdRequest && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
        >
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl">
            <WorkflowSuccess
              title="Maintenance Request Lodged"
              subtitle="Your maintenance ticket has been recorded with status 'Open'. You can track progress, record quotes, and log invoices in the Maintenance hub."
              details={[
                { label: 'Issue', value: createdRequest.title },
                { label: 'Priority', value: (createdRequest.priority || 'medium').toUpperCase() },
                { label: 'Status', value: 'Open Ticket' },
              ]}
              primaryAction={{
                label: 'Done',
                onClick: () => {
                  setCreatedRequest(null);
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
