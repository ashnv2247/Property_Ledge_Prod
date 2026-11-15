'use client';

import React, { useEffect, useState } from 'react';
import { useOnboardingNav } from '@/components/onboarding/OnboardingNavContext';
import { OnboardingContent } from '@/components/onboarding/OnboardingContent';
import { OnboardingStep } from '@/components/onboarding/OnboardingStep';
import { OnboardingFooter } from '@/components/onboarding/OnboardingFooter';
import { inputClassName } from '@/components/onboarding/FormField';
import {
  getOnboardingProgress,
  createOnboardingProperty,
  skipOnboardingProperty,
} from '@/app/actions/onboarding';
import { getDefaultPropertyPhoto } from '@/components/dashboard/properties/property-photos';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Home,
  Building2,
  MapPin,
  Car,
  Maximize2,
  Check,
} from 'lucide-react';

const AUS_PRESET_SUGGESTIONS = [
  { full: '12 Anderson Street, Sydney NSW 2000', street: '12 Anderson Street', city: 'Sydney', state: 'NSW', post: '2000' },
  { full: '45 St Kilda Road, Melbourne VIC 3004', street: '45 St Kilda Road', city: 'Melbourne', state: 'VIC', post: '3004' },
  { full: '88 Queen Street, Brisbane QLD 4000', street: '88 Queen Street', city: 'Brisbane', state: 'QLD', post: '4000' },
  { full: '100 St Georges Terrace, Perth WA 6000', street: '100 St Georges Terrace', city: 'Perth', state: 'WA', post: '6000' },
  { full: '24 North Terrace, Adelaide SA 5000', street: '24 North Terrace', city: 'Adelaide', state: 'SA', post: '5000' },
];

const PROPERTY_TYPES = [
  { id: 'Residential', label: 'Residential', desc: 'House, apartment, unit', icon: <Home className="h-4 w-4" /> },
  { id: 'Commercial', label: 'Commercial', desc: 'Office, retail, warehouse', icon: <Building2 className="h-4 w-4" /> },
  { id: 'Other', label: 'Other', desc: 'Land, industrial, storage', icon: <Building2 className="h-4 w-4" /> },
];

export default function OnboardingPropertyPage() {
  const { navigate } = useOnboardingNav();
  const [workspaceId, setWorkspaceId] = useState('');
  const [addressInput, setAddressInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<{
    street: string;
    city: string;
    state: string;
    post: string;
  } | null>(null);

  const [propertyCategory, setPropertyCategory] = useState<'Residential' | 'Commercial' | 'Other'>('Residential');
  const [floorArea, setFloorArea] = useState<string>('85');
  const [hasCarSpace, setHasCarSpace] = useState<boolean>(true);
  const [carSpacesCount, setCarSpacesCount] = useState<number>(1);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getOnboardingProgress()
      .then((progress) => {
        const id = progress?.data?.workspaceId as string | undefined;
        if (id) setWorkspaceId(id);
      })
      .catch((err) => {
        console.warn('[OnboardingPropertyPage] Failed to fetch progress:', err);
      });
  }, []);

  const filteredSuggestions = addressInput.trim().length > 1
    ? AUS_PRESET_SUGGESTIONS.filter((s) => s.full.toLowerCase().includes(addressInput.toLowerCase()))
    : AUS_PRESET_SUGGESTIONS;

  const handleSelectAddress = (item: (typeof AUS_PRESET_SUGGESTIONS)[0]) => {
    setSelectedAddress({
      street: item.street,
      city: item.city,
      state: item.state,
      post: item.post,
    });
    setAddressInput(item.full);
    setShowSuggestions(false);
  };

  const handleManualAddressBlur = () => {
    if (!selectedAddress && addressInput.trim()) {
      const parts = addressInput.split(',').map((p) => p.trim());
      setSelectedAddress({
        street: parts[0] || addressInput.trim(),
        city: parts[1] || 'Sydney',
        state: 'NSW',
        post: '2000',
      });
    }
  };

  const handleSkip = async () => {
    setIsSaving(true);
    try {
      await skipOnboardingProperty();
      navigate('/onboarding/complete');
    } catch {
      navigate('/onboarding/complete');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressInput.trim()) {
      setError('Please enter a property address or click Skip');
      return;
    }

    setIsSaving(true);
    setError(null);

    const addr = selectedAddress || {
      street: addressInput.trim(),
      city: 'Sydney',
      state: 'NSW',
      post: '2000',
    };

    try {
      await createOnboardingProperty({
        workspaceId,
        name: addr.street,
        propertyCategory: propertyCategory === 'Commercial' ? 'Commercial' : 'Residential',
        propertyType: propertyCategory === 'Commercial' ? 'Commercial' : 'Apartment',
        addressLine1: addr.street,
        city: addr.city,
        state: addr.state,
        postalCode: addr.post,
        floorArea: floorArea ? parseFloat(floorArea) : undefined,
        carSpaces: hasCarSpace ? Math.max(1, carSpacesCount) : 0,
        rentAmount: 0,
        paymentFrequency: 'Weekly',
        image: getDefaultPropertyPhoto(propertyCategory === 'Commercial' ? 'Commercial' : 'Residential', propertyCategory === 'Commercial' ? 'Commercial' : 'Apartment'),
      });
      navigate('/onboarding/complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save property. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <OnboardingContent>
      <form onSubmit={handleSubmit} className="space-y-4">
        <OnboardingStep
          eyebrow="Step 3 of 3"
          title="Add your property."
          description="Enter the address and basic specs to finish setting up your portfolio."
        >
          <div className="space-y-3 pt-1">
            {/* 01: Address Search */}
            <div className="p-3.5 rounded-2xl bg-[#0B1D30]/70 border border-white/[0.08] space-y-2 relative shadow-xs">
              <label htmlFor="propertyAddress" className="block text-[11px] font-bold uppercase tracking-wider text-[#00A99D]">
                Property Address
              </label>

              <div className="relative">
                <div className="relative flex items-center">
                  <MapPin className="absolute left-3.5 h-4 w-4 text-[#008F83] pointer-events-none" />
                  <input
                    id="propertyAddress"
                    type="text"
                    value={addressInput}
                    onChange={(e) => {
                      setAddressInput(e.target.value);
                      setShowSuggestions(true);
                      if (selectedAddress && e.target.value !== selectedAddress.street) {
                        setSelectedAddress(null);
                      }
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => {
                      setTimeout(() => setShowSuggestions(false), 200);
                      handleManualAddressBlur();
                    }}
                    className={cn(inputClassName, 'pl-10 text-xs sm:text-sm h-11')}
                    placeholder="e.g. 12 Anderson Street, Sydney NSW"
                    autoComplete="off"
                  />
                </div>

                {/* Autocomplete Suggestion Dropdown */}
                <AnimatePresence>
                  {showSuggestions && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute left-0 right-0 top-full mt-1.5 z-30 rounded-xl bg-[#08182A] border border-white/[0.12] shadow-2xl shadow-black/80 overflow-hidden py-1 max-h-48 overflow-y-auto custom-scrollbar"
                    >
                      <div className="px-3 py-1.5 text-[10px] font-semibold text-[#8FA3B8] uppercase tracking-wider border-b border-white/[0.04]">
                        Suggested Australian Addresses
                      </div>
                      {filteredSuggestions.map((item) => (
                        <button
                          key={item.full}
                          type="button"
                          onMouseDown={() => handleSelectAddress(item)}
                          className="w-full px-3.5 py-2 text-left text-xs text-[#FFFFFF] hover:bg-[#008F83]/15 hover:text-[#00A99D] flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <MapPin className="h-3.5 w-3.5 text-[#008F83] shrink-0" />
                          <span className="truncate">{item.full}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* 02: Property Type - Simplified into 3 clear, highly obvious pills */}
            <div className="p-3.5 rounded-2xl bg-[#0B1D30]/70 border border-white/[0.08] space-y-2 shadow-xs">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#00A99D]">
                Property Type
              </label>

              <div className="grid grid-cols-3 gap-2.5">
                {PROPERTY_TYPES.map((t) => {
                  const isSelected = propertyCategory === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setPropertyCategory(t.id as any)}
                      className={cn(
                        'p-2.5 rounded-xl border text-left transition-all duration-150 cursor-pointer select-none flex flex-col justify-between gap-1 relative',
                        isSelected
                          ? 'border-[#008F83] bg-[#008F83]/20 text-[#FFFFFF] shadow-md shadow-[#008F83]/20 ring-2 ring-[#008F83]'
                          : 'border-white/[0.08] bg-white/[0.02] text-[#8FA3B8] hover:border-white/[0.16] hover:bg-white/[0.05]'
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={isSelected ? 'text-[#00A99D]' : 'text-[#8FA3B8]'}>
                          {t.icon}
                        </span>
                        {isSelected && (
                          <span className="w-4 h-4 rounded-full bg-[#008F83] text-white flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <div>
                        <span className={cn('text-xs font-bold block', isSelected ? 'text-white' : 'text-slate-300')}>
                          {t.label}
                        </span>
                        <span className="text-[10px] text-[#64788D] block leading-tight mt-0.5">
                          {t.desc}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 03: Specs — Floor Area & Car Space (Replacing bath and bedroom) */}
            <div className="p-3.5 rounded-2xl bg-[#0B1D30]/70 border border-white/[0.08] space-y-2 shadow-xs">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#00A99D]">
                Property Specs
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Floor Area */}
                <div className="space-y-1">
                  <label htmlFor="floorArea" className="block text-xs font-semibold text-slate-300">
                    Floor Area (sqm)
                  </label>
                  <div className="relative flex items-center">
                    <Maximize2 className="absolute left-3.5 h-4 w-4 text-[#8FA3B8] pointer-events-none" />
                    <input
                      id="floorArea"
                      type="number"
                      min={0}
                      step="any"
                      value={floorArea}
                      onChange={(e) => setFloorArea(e.target.value)}
                      className={cn(inputClassName, 'pl-10 pr-14 text-xs sm:text-sm h-11 font-semibold')}
                      placeholder={propertyCategory === 'Commercial' ? 'e.g. 47' : 'e.g. 85'}
                    />
                    <span className="absolute right-3 text-xs font-bold text-[#8FA3B8] pointer-events-none">
                      sqm
                    </span>
                  </div>
                </div>

                {/* Car Space Segmented Selector */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    Car Spaces
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#08182A] border border-white/[0.08] h-11 items-center">
                    <button
                      type="button"
                      onClick={() => {
                        setHasCarSpace(false);
                        setCarSpacesCount(0);
                      }}
                      className={cn(
                        'h-9 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none',
                        !hasCarSpace
                          ? 'bg-[#008F83] text-white shadow-sm ring-1 ring-[#008F83]'
                          : 'text-[#8FA3B8] hover:text-white'
                      )}
                    >
                      <span>No</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setHasCarSpace(true);
                        if (carSpacesCount === 0) setCarSpacesCount(1);
                      }}
                      className={cn(
                        'h-9 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none',
                        hasCarSpace
                          ? 'bg-[#008F83] text-white shadow-sm ring-1 ring-[#008F83]'
                          : 'text-[#8FA3B8] hover:text-white'
                      )}
                    >
                      <Car className="w-3.5 h-3.5" />
                      <span>Yes ({carSpacesCount})</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <OnboardingFooter
            onBack={() => navigate('/onboarding/subscription')}
            continueLabel={isSaving ? 'Saving property…' : 'Save & continue'}
            continueType="submit"
            continueLoading={isSaving}
            skipLabel="Skip for now"
            onSkip={handleSkip}
            error={error}
            className="mt-3.5 pt-3.5"
          />
        </OnboardingStep>
      </form>
    </OnboardingContent>
  );
}
