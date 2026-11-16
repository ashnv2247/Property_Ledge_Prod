'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Building2,
  Home,
  Building,
  Store,
  Warehouse,
  Briefcase,
  MapPin,
  Bed,
  Bath,
  Car,
  DollarSign,
  Maximize2,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import {
  GuidedWorkflow,
  type GuidedWorkflowStepConfig,
  VisualChoiceCard,
  VisualChoiceGrid,
  QuestionField,
  ContextualExplanation,
  ConditionalSection,
  WorkflowSummary,
  WorkflowSuccess,
} from '@/components/workflows/guided-workflow';
import { Input, Select, useToast } from '@/components/admin/ui';
import { handleCreateProperty, fetchUserWorkspaces } from '@/app/actions/dashboard';
import { usePropertyContext } from '@/components/property/PropertyContext';
import { useWorkspaceStore } from '@/lib/stores/useWorkspaceStore';
import { getDefaultPropertyPhoto } from '@/components/dashboard/properties/property-photos';
import { cn } from '@/lib/utils';

export interface CreatePropertyWorkflowProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (property?: any) => void;
}

export interface PropertyWorkflowContext {
  propertyCategory: 'Residential' | 'Commercial';
  propertyType: string;
  name: string;
  addressLine1: string;
  suburb: string;
  state: string;
  postalCode: string;
  bedrooms: string;
  bathrooms: string;
  carSpaces: string;
  floorArea: string;
  rentAmount: string;
  paymentFrequency: string;
  hasMultipleUnits: boolean;
  gstEnabled: boolean;
  description: string;
  imageUrl: string;
}

const INITIAL_CONTEXT: PropertyWorkflowContext = {
  propertyCategory: 'Residential',
  propertyType: 'House',
  name: '',
  addressLine1: '',
  suburb: '',
  state: 'VIC',
  postalCode: '',
  bedrooms: '3',
  bathrooms: '2',
  carSpaces: '1',
  floorArea: '',
  rentAmount: '',
  paymentFrequency: 'Weekly',
  hasMultipleUnits: false,
  gstEnabled: false,
  description: '',
  imageUrl: '',
};

export function CreatePropertyWorkflow({
  isOpen,
  onClose,
  onSuccess,
}: CreatePropertyWorkflowProps) {
  const { success: showToastSuccess, error: showError } = useToast();
  const { refreshProperties } = usePropertyContext();
  const storeWorkspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const [createdProperty, setCreatedProperty] = useState<any | null>(null);
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});

  const propertyTypeChoices = [
    {
      id: 'House',
      title: 'Freestanding House',
      description: 'Single-family detached home or suburban villa.',
      category: 'Residential' as const,
      icon: Home,
      image: '/images/properties/residential-house.jpg',
      benefits: ['Individual title', 'Private yard & garage', 'Single tenancy agreement'],
    },
    {
      id: 'Apartment',
      title: 'Apartment / Unit',
      description: 'Strata-titled apartment or multi-level residential unit.',
      category: 'Residential' as const,
      icon: Building,
      image: '/images/properties/residential-apartment.jpg',
      benefits: ['Strata body corporate', 'Shared amenities', 'Secure key access'],
    },
    {
      id: 'Townhouse',
      title: 'Townhouse / Duplex',
      description: 'Multi-story attached home with private street access.',
      category: 'Residential' as const,
      icon: Building2,
      image: '/images/properties/residential-townhouse.jpg',
      benefits: ['Compact living', 'Private courtyard', 'Individual or strata title'],
    },
    {
      id: 'Commercial',
      title: 'Commercial Office / Retail',
      description: 'Professional suites, street storefront, or business premises.',
      category: 'Commercial' as const,
      icon: Briefcase,
      image: '/images/properties/commercial-office.jpg',
      benefits: ['Commercial lease terms', 'Outgoings recovery', 'GST reporting support'],
    },
  ];

  const steps: GuidedWorkflowStepConfig<PropertyWorkflowContext>[] = [
    // Step 1: Type Selection
    {
      id: 'property-type',
      title: 'Property Type',
      description: 'Choose the classification that best describes this real estate asset.',
      validate: (ctx) => {
        if (!ctx.propertyType) {
          showError('Selection Required', 'Please select a property category to proceed.');
          return false;
        }
        return true;
      },
      component: ({ context, updateContext }) => {
        return (
          <div className="space-y-5">
            <div className="text-center max-w-lg mx-auto space-y-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#008F83]/10 text-[#008F83] text-[11px] font-bold border border-[#008F83]/20">
                <Sparkles className="w-3 h-3" /> Step 1 · Classification
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                What kind of property are you adding?
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Selecting the right structure personalizes your rental terms, room specifications, and tax reporting.
              </p>
            </div>

            <VisualChoiceGrid columns={2}>
              {propertyTypeChoices.map((choice) => (
                <VisualChoiceCard
                  key={choice.id}
                  id={choice.id}
                  title={choice.title}
                  description={choice.description}
                  benefits={choice.benefits}
                  icon={choice.icon}
                  isSelected={context.propertyType === choice.id}
                  onSelect={(id) => {
                    const selectedItem = propertyTypeChoices.find((c) => c.id === id);
                    updateContext({
                      propertyType: id,
                      propertyCategory: selectedItem?.category || 'Residential',
                      imageUrl: selectedItem?.image || '',
                    });
                  }}
                />
              ))}
            </VisualChoiceGrid>

            <ContextualExplanation
              title="Category Context"
              explanation="Commercial properties unlock floor area (sqm) calculations and GST tax invoices, while residential properties include bedroom/bathroom metrics."
              nextStepPreview="Street address and location verification"
              canChangeLater={true}
            />
          </div>
        );
      },
    },

    // Step 2: Location
    {
      id: 'location',
      title: 'Address & Name',
      description: 'Verify the physical location and portfolio display label.',
      validate: (ctx) => {
        const errors: Record<string, string> = {};
        if (!ctx.addressLine1.trim()) errors.addressLine1 = 'Street address is required.';
        if (!ctx.suburb.trim()) errors.suburb = 'Suburb or city is required.';
        if (!ctx.postalCode.trim()) errors.postalCode = 'Postcode is required.';
        if (!ctx.state) errors.state = 'State is required.';
        setStepErrors(errors);
        if (Object.keys(errors).length > 0) {
          showError('Missing Information', 'Please complete all required address fields.');
          return false;
        }
        return true;
      },
      component: ({ context, updateContext }) => {
        return (
          <div className="space-y-5 max-w-xl mx-auto">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Where is this property located?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                We use the Australian postal address for tenancy agreements, tax invoices, and condition reports.
              </p>
            </div>

            <QuestionField
              question="What would you like to call this property? (Optional)"
              description="A recognizable nickname or building identifier (e.g., 'Sunset Villa' or 'Level 3 Suite'). If left blank, we'll use the street address."
            >
              <Input
                placeholder="e.g. Richmond Loft or Riverside Manor"
                value={context.name}
                onChange={(e) => updateContext({ name: e.target.value })}
              />
            </QuestionField>

            <QuestionField
              question="Street Address"
              required
              error={stepErrors.addressLine1}
            >
              <Input
                placeholder="e.g. 42 Bridge Road"
                value={context.addressLine1}
                onChange={(e) => {
                  updateContext({ addressLine1: e.target.value });
                  if (stepErrors.addressLine1) setStepErrors((prev) => ({ ...prev, addressLine1: '' }));
                }}
              />
            </QuestionField>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <QuestionField
                question="Suburb / City"
                required
                error={stepErrors.suburb}
              >
                <Input
                  placeholder="e.g. Richmond"
                  value={context.suburb}
                  onChange={(e) => {
                    updateContext({ suburb: e.target.value });
                    if (stepErrors.suburb) setStepErrors((prev) => ({ ...prev, suburb: '' }));
                  }}
                />
              </QuestionField>

              <QuestionField
                question="State"
                required
                error={stepErrors.state}
              >
                <Select
                  value={context.state}
                  onChange={(e) => updateContext({ state: e.target.value })}
                  options={[
                    { value: 'VIC', label: 'VIC (Victoria)' },
                    { value: 'NSW', label: 'NSW (New South Wales)' },
                    { value: 'QLD', label: 'QLD (Queensland)' },
                    { value: 'WA', label: 'WA (Western Australia)' },
                    { value: 'SA', label: 'SA (South Australia)' },
                    { value: 'TAS', label: 'TAS (Tasmania)' },
                    { value: 'ACT', label: 'ACT' },
                    { value: 'NT', label: 'NT (Northern Territory)' },
                  ]}
                />
              </QuestionField>

              <QuestionField
                question="Postcode"
                required
                error={stepErrors.postalCode}
              >
                <Input
                  placeholder="e.g. 3121"
                  maxLength={4}
                  value={context.postalCode}
                  onChange={(e) => {
                    updateContext({ postalCode: e.target.value });
                    if (stepErrors.postalCode) setStepErrors((prev) => ({ ...prev, postalCode: '' }));
                  }}
                />
              </QuestionField>
            </div>
          </div>
        );
      },
    },

    // Step 3: Specifications & Rental Terms
    {
      id: 'specifications',
      title: 'Property Specs',
      description: 'Configure rooms, parking, and baseline rental terms.',
      component: ({ context, updateContext }) => {
        const isCommercial = context.propertyCategory === 'Commercial';

        return (
          <div className="space-y-6 max-w-xl mx-auto">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                What are the property details?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                These specifications help pre-populate lease agreements and expected payment schedules.
              </p>
            </div>

            {/* Residential Metrics vs Commercial Metrics */}
            {!isCommercial ? (
              <div className="grid grid-cols-3 gap-3">
                <QuestionField question="Bedrooms">
                  <Input
                    type="number"
                    min="0"
                    placeholder="3"
                    value={context.bedrooms}
                    onChange={(e) => updateContext({ bedrooms: e.target.value })}
                  />
                </QuestionField>

                <QuestionField question="Bathrooms">
                  <Input
                    type="number"
                    min="0"
                    placeholder="2"
                    value={context.bathrooms}
                    onChange={(e) => updateContext({ bathrooms: e.target.value })}
                  />
                </QuestionField>

                <QuestionField question="Car Spaces">
                  <Input
                    type="number"
                    min="0"
                    placeholder="1"
                    value={context.carSpaces}
                    onChange={(e) => updateContext({ carSpaces: e.target.value })}
                  />
                </QuestionField>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <QuestionField
                  question="Floor Area (sqm)"
                  description="Total rentable internal area"
                >
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 150"
                    value={context.floorArea}
                    onChange={(e) => updateContext({ floorArea: e.target.value })}
                  />
                </QuestionField>

                <QuestionField
                  question="Allocated Car Spaces"
                  description="Dedicated spots or bays"
                >
                  <Input
                    type="number"
                    min="0"
                    placeholder="2"
                    value={context.carSpaces}
                    onChange={(e) => updateContext({ carSpaces: e.target.value })}
                  />
                </QuestionField>
              </div>
            )}

            {/* Rental Baseline */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <QuestionField
                question="Agreed or Advertised Rent ($ AUD)"
                description="Target or regular rental rate"
              >
                <Input
                  type="number"
                  min="0"
                  placeholder="e.g. 650"
                  value={context.rentAmount}
                  onChange={(e) => updateContext({ rentAmount: e.target.value })}
                />
              </QuestionField>

              <QuestionField
                question="Payment Frequency"
                description="Billing recurrence interval"
              >
                <Select
                  value={context.paymentFrequency}
                  onChange={(e) => updateContext({ paymentFrequency: e.target.value })}
                  options={[
                    { value: 'Weekly', label: 'Weekly' },
                    { value: 'Fortnightly', label: 'Fortnightly' },
                    { value: 'Monthly', label: 'Monthly' },
                  ]}
                />
              </QuestionField>
            </div>

            {/* Commercial GST Toggle */}
            {isCommercial && (
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 flex items-center justify-between">
                <div>
                  <span className="block text-xs font-semibold text-slate-900 dark:text-white">
                    GST-Registered Property
                  </span>
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                    Automatically applies 10% statutory Australian GST to invoices and rental schedules
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={context.gstEnabled}
                  onChange={(e) => updateContext({ gstEnabled: e.target.checked })}
                  className="w-4 h-4 rounded text-[#008F83] focus:ring-[#008F83]"
                />
              </div>
            )}

            {/* Multi-unit building toggle */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 flex items-center justify-between">
              <div>
                <span className="block text-xs font-semibold text-slate-900 dark:text-white">
                  Multi-Unit Building Structure
                </span>
                <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                  Does this address contain individual rentable suites, flats, or office tenancies?
                </span>
              </div>
              <input
                type="checkbox"
                checked={context.hasMultipleUnits}
                onChange={(e) => updateContext({ hasMultipleUnits: e.target.checked })}
                className="w-4 h-4 rounded text-[#008F83] focus:ring-[#008F83]"
              />
            </div>

            <ConditionalSection show={context.hasMultipleUnits}>
              <ContextualExplanation
                title="Multi-Unit Management"
                type="guidance"
                explanation="You'll be able to create and assign independent units (Unit 1, Suite A, etc.) with individual tenants and rent schedules immediately after adding this property."
              />
            </ConditionalSection>
          </div>
        );
      },
    },

    // Step 4: Review & Confirmation
    {
      id: 'review',
      title: 'Review',
      description: 'Review details before adding to your portfolio.',
      component: ({ context }) => {
        const fullAddress = `${context.addressLine1}, ${context.suburb} ${context.state} ${context.postalCode}`;
        const displayName = context.name.trim() || context.addressLine1;

        return (
          <div className="space-y-5">
            <WorkflowSummary
              title="Review Property Details"
              description="Confirm all address and specification details below before saving."
              relationshipChain={[
                {
                  label: 'Classification',
                  value: context.propertyType,
                  subtext: context.propertyCategory,
                  icon: <Building2 className="w-4 h-4" />,
                },
                {
                  label: 'Location',
                  value: context.suburb || 'Suburb',
                  subtext: context.state,
                  icon: <MapPin className="w-4 h-4" />,
                },
                {
                  label: 'Billing',
                  value: context.rentAmount ? `$${context.rentAmount}/${context.paymentFrequency.toLowerCase()}` : 'Unset',
                  subtext: context.hasMultipleUnits ? 'Multi-Unit' : 'Single Tenancy',
                  icon: <DollarSign className="w-4 h-4" />,
                },
              ]}
              sections={[
                {
                  title: 'Identification & Address',
                  stepIndex: 1,
                  items: [
                    { label: 'Display Name', value: displayName },
                    { label: 'Classification', value: `${context.propertyType} (${context.propertyCategory})` },
                    { label: 'Full Address', value: fullAddress },
                    { label: 'Jurisdiction', value: `${context.state}, Australia` },
                  ],
                },
                {
                  title: 'Specifications & Tenancy',
                  stepIndex: 2,
                  items: [
                    ...(context.propertyCategory === 'Residential'
                      ? [
                          { label: 'Bedrooms', value: context.bedrooms || '—' },
                          { label: 'Bathrooms', value: context.bathrooms || '—' },
                          { label: 'Car Spaces', value: context.carSpaces || '—' },
                        ]
                      : [
                          { label: 'Floor Area', value: context.floorArea ? `${context.floorArea} sqm` : '—' },
                          { label: 'Car Spaces', value: context.carSpaces || '—' },
                          { label: 'GST Applied', value: context.gstEnabled ? 'Yes (10%)' : 'No' },
                        ]),
                    {
                      label: 'Target Rent',
                      value: context.rentAmount ? `$${context.rentAmount} ${context.paymentFrequency}` : 'Not set',
                    },
                    {
                      label: 'Building Mode',
                      value: context.hasMultipleUnits ? 'Multi-unit property' : 'Single tenancy unit',
                    },
                  ],
                },
              ]}
            />
          </div>
        );
      },
    },
  ];

  const handleFinalSubmit = async (finalContext: PropertyWorkflowContext) => {
    // 1. Resolve workspace
    let wsId = activeWorkspaceId;
    if (!wsId && storeWorkspaces && storeWorkspaces.length > 0) {
      wsId = storeWorkspaces[0].id;
    }
    if (!wsId) {
      const fetched = (await fetchUserWorkspaces()) as Array<{ id: string }>;
      wsId = fetched?.[0]?.id;
    }
    if (!wsId) {
      throw new Error('No active workspace available to associate with property.');
    }

    // 2. Prepare payload
    const payload = {
      workspace_id: wsId,
      name: finalContext.name.trim() || finalContext.addressLine1.trim() || 'Property',
      address_line_1: finalContext.addressLine1.trim(),
      city: finalContext.suburb.trim(),
      state: finalContext.state,
      postal_code: finalContext.postalCode.trim(),
      property_category: finalContext.propertyCategory,
      property_type: finalContext.propertyType,
      bedrooms: finalContext.bedrooms !== '' ? Number(finalContext.bedrooms) : 0,
      bathrooms: finalContext.bathrooms !== '' ? Number(finalContext.bathrooms) : 0,
      parking_spaces: finalContext.carSpaces !== '' ? Number(finalContext.carSpaces) : 0,
      square_feet: finalContext.floorArea !== '' ? Number(finalContext.floorArea) : null,
      rent_amount: finalContext.rentAmount !== '' ? Number(finalContext.rentAmount) : 0,
      payment_frequency: finalContext.paymentFrequency,
      status: 'active' as const,
      description: finalContext.description.trim() || null,
      gst_enabled: finalContext.gstEnabled,
      image_url: finalContext.imageUrl || getDefaultPropertyPhoto(finalContext.propertyCategory, finalContext.propertyType),
    };

    const res = await handleCreateProperty(payload as any);
    if (!res.success) {
      throw new Error('Could not create property.');
    }

    try {
      await refreshProperties();
    } catch (e) {
      console.error('Error refreshing properties context:', e);
    }

    showToastSuccess('Property Created', `${payload.name} has been added to your portfolio.`);
    setCreatedProperty(res.data || payload);
    return res.data || payload;
  };

  return (
    <>
      <GuidedWorkflow
        isOpen={isOpen && !createdProperty}
        onClose={onClose}
        title="Add Real Estate Asset"
        badge="Guided Workflow"
        description="Follow this visual guide to record an asset, set up rental expectations, and prepare for tenancy."
        initialContext={INITIAL_CONTEXT}
        steps={steps}
        onSubmit={handleFinalSubmit}
        onSuccess={(result) => {
          if (onSuccess) onSuccess(result);
        }}
      />

      {/* Success Modal */}
      {createdProperty && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
        >
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl">
            <WorkflowSuccess
              title="Property Added to Portfolio"
              subtitle={`${createdProperty.name} is now registered in your workspace. You can now invite tenants, configure leases, or add maintenance schedules.`}
              details={[
                { label: 'Address', value: createdProperty.address_line_1 },
                { label: 'Category', value: `${createdProperty.property_type || 'Property'} (${createdProperty.property_category || 'Residential'})` },
              ]}
              primaryAction={{
                label: 'View Properties',
                onClick: () => {
                  setCreatedProperty(null);
                  onClose();
                },
              }}
              secondaryAction={{
                label: 'Add Another Property',
                onClick: () => {
                  setCreatedProperty(null);
                },
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
