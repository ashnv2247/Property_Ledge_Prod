'use client';

import React, { useEffect, useState } from 'react';
import { useOnboardingNav } from '@/components/onboarding/OnboardingNavContext';
import { OnboardingContent } from '@/components/onboarding/OnboardingContent';
import { OnboardingStep } from '@/components/onboarding/OnboardingStep';
import { OnboardingFooter } from '@/components/onboarding/OnboardingFooter';
import { FormField, inputClassName } from '@/components/onboarding/FormField';
import {
  getOnboardingProgress,
  createOnboardingProperty,
  skipOnboardingProperty,
} from '@/app/actions/onboarding';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Home,
  Building2,
  MapPin,
  Sparkles,
  Bed,
  Bath,
  Car,
  DollarSign,
  CheckCircle2,
  Search,
} from 'lucide-react';

const AUS_PRESET_SUGGESTIONS = [
  { full: '12 Anderson Street, Sydney NSW 2000', street: '12 Anderson Street', city: 'Sydney', state: 'NSW', post: '2000' },
  { full: '45 St Kilda Road, Melbourne VIC 3004', street: '45 St Kilda Road', city: 'Melbourne', state: 'VIC', post: '3004' },
  { full: '88 Queen Street, Brisbane QLD 4000', street: '88 Queen Street', city: 'Brisbane', state: 'QLD', post: '4000' },
  { full: '100 St Georges Terrace, Perth WA 6000', street: '100 St Georges Terrace', city: 'Perth', state: 'WA', post: '6000' },
  { full: '24 North Terrace, Adelaide SA 5000', street: '24 North Terrace', city: 'Adelaide', state: 'SA', post: '5000' },
];

const PROPERTY_TYPES = [
  { id: 'House', label: 'House', icon: <Home className="h-3.5 w-3.5" /> },
  { id: 'Apartment', label: 'Apartment', icon: <Building2 className="h-3.5 w-3.5" /> },
  { id: 'Townhouse', label: 'Townhouse', icon: <Home className="h-3.5 w-3.5" /> },
  { id: 'Unit', label: 'Unit', icon: <Building2 className="h-3.5 w-3.5" /> },
  { id: 'Commercial', label: 'Commercial', icon: <Building2 className="h-3.5 w-3.5" /> },
  { id: 'Other', label: 'Other', icon: <Home className="h-3.5 w-3.5" /> },
];

const OCCUPANCY_STATUSES = [
  { id: 'Tenanted', label: 'Tenanted / Rented', desc: 'Currently generating rental income' },
  { id: 'Vacant', label: 'Vacant / Available', desc: 'Seeking tenant or between leases' },
  { id: 'Owner occupied', label: 'Owner Occupied', desc: 'Primary residence or holiday home' },
  { id: 'Under maintenance', label: 'Under Renovation', desc: 'Currently undergoing works' },
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

  const [propertyType, setPropertyType] = useState<string>('Apartment');
  const [occupancy, setOccupancy] = useState<string>('Tenanted');
  const [rentAmount, setRentAmount] = useState<string>('650');
  const [rentFrequency, setRentFrequency] = useState<'Weekly' | 'Monthly'>('Weekly');
  const [bedrooms, setBedrooms] = useState<number>(2);
  const [bathrooms, setBathrooms] = useState<number>(1);
  const [carSpaces, setCarSpaces] = useState<number>(1);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getOnboardingProgress().then((progress) => {
      const id = progress.data.workspaceId as string | undefined;
      if (id) setWorkspaceId(id);
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
      // Parse manual address string
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
      navigate('/onboarding/team');
    } catch {
      navigate('/onboarding/team');
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
        propertyCategory: propertyType === 'Commercial' ? 'Commercial' : 'Residential',
        propertyType,
        addressLine1: addr.street,
        city: addr.city,
        state: addr.state,
        postalCode: addr.post,
        bedrooms,
        bathrooms,
        carSpaces,
        rentAmount: rentAmount ? parseFloat(rentAmount) : 0,
        paymentFrequency: rentFrequency,
      });
      navigate('/onboarding/team');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save property. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <OnboardingContent>
      <form onSubmit={handleSubmit}>
        <OnboardingStep
          eyebrow="Step 3 of 4"
          title="Let's add your first property."
          description="Start with a single property to configure your dashboard. You can add more anytime."
        >
          <div className="space-y-4 mt-4">
            {/* Stage A: Address search with Australian suggestions */}
            <div className="p-4 rounded-2xl bg-[#0B1D30]/60 border border-white/[0.06] space-y-2.5 relative">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#00A99D]">
                01 · Property Address
              </span>

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
                    className={cn(inputClassName, 'pl-10 text-xs sm:text-sm')}
                    placeholder="Type address, e.g. 12 Anderson Street, Sydney NSW"
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
                      className="absolute left-0 right-0 top-full mt-1.5 z-30 rounded-xl bg-[#08182A] border border-white/[0.1] shadow-2xl shadow-black/80 overflow-hidden py-1 max-h-52 overflow-y-auto custom-scrollbar"
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

            {/* Stage B: Property Type Chips */}
            <div className="p-4 rounded-2xl bg-[#0B1D30]/60 border border-white/[0.06] space-y-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#00A99D]">
                02 · Property Type
              </span>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {PROPERTY_TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setPropertyType(t.id)}
                    className={cn(
                      'p-2 rounded-xl border text-center flex flex-col items-center justify-center gap-1 transition-all cursor-pointer select-none',
                      propertyType === t.id
                        ? 'border-[#008F83] bg-[#008F83]/15 text-[#FFFFFF] shadow-sm shadow-[#008F83]/20 ring-1 ring-[#008F83]/40'
                        : 'border-white/[0.06] bg-white/[0.02] text-[#8FA3B8] hover:border-white/[0.12] hover:bg-white/[0.04]'
                    )}
                  >
                    <span className={propertyType === t.id ? 'text-[#00A99D]' : 'text-[#8FA3B8]'}>
                      {t.icon}
                    </span>
                    <span className="text-[11px] font-semibold block">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Stage C: Occupancy & Management Status */}
            <div className="p-4 rounded-2xl bg-[#0B1D30]/60 border border-white/[0.06] space-y-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#00A99D]">
                03 · Current Occupancy
              </span>

              <div className="grid grid-cols-2 gap-2">
                {OCCUPANCY_STATUSES.map((occ) => (
                  <button
                    key={occ.id}
                    type="button"
                    onClick={() => setOccupancy(occ.id)}
                    className={cn(
                      'p-2.5 rounded-xl border text-left transition-all cursor-pointer select-none',
                      occupancy === occ.id
                        ? 'border-[#008F83] bg-[#008F83]/15 text-[#FFFFFF] shadow-sm shadow-[#008F83]/20 ring-1 ring-[#008F83]/40'
                        : 'border-white/[0.06] bg-white/[0.02] text-[#8FA3B8] hover:border-white/[0.12] hover:bg-white/[0.04]'
                    )}
                  >
                    <span className="text-xs font-semibold block leading-tight">{occ.label}</span>
                    <span className="text-[10px] text-[#64788D] block mt-0.5">{occ.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Stage D: Rent & Optional Details (Progressively shown if tenanted) */}
            {occupancy === 'Tenanted' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 rounded-2xl bg-[#0B1D30]/60 border border-white/[0.06] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#00A99D]">
                    04 · Rental Income & Specs
                  </span>
                  <span className="text-[10px] text-[#8FA3B8]">Optional estimates</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField id="rent" label="Rent amount ($AUD)">
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 text-xs text-[#64788D] font-bold">$</span>
                      <input
                        id="rent"
                        type="number"
                        value={rentAmount}
                        onChange={(e) => setRentAmount(e.target.value)}
                        className={cn(inputClassName, 'pl-7 text-xs sm:text-sm')}
                        placeholder="650"
                      />
                    </div>
                  </FormField>

                  <FormField id="freq" label="Frequency">
                    <div className="grid grid-cols-2 gap-1.5 h-11 sm:h-12 p-1 rounded-xl bg-[#08182A] border border-white/[0.08]">
                      {(['Weekly', 'Monthly'] as const).map((freq) => (
                        <button
                          key={freq}
                          type="button"
                          onClick={() => setRentFrequency(freq)}
                          className={cn(
                            'rounded-lg text-xs font-semibold transition-all cursor-pointer select-none flex items-center justify-center',
                            rentFrequency === freq
                              ? 'bg-[#008F83] text-[#FFFFFF] shadow-sm'
                              : 'text-[#8FA3B8] hover:text-[#FFFFFF]'
                          )}
                        >
                          {freq}
                        </button>
                      ))}
                    </div>
                  </FormField>
                </div>

                {/* Mini Specs chips (Bed / Bath / Car) */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="p-2 rounded-xl bg-[#08182A] border border-white/[0.06] flex items-center justify-between">
                    <span className="text-xs text-[#8FA3B8] flex items-center gap-1">
                      <Bed className="h-3.5 w-3.5" /> Beds
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      value={bedrooms}
                      onChange={(e) => setBedrooms(parseInt(e.target.value) || 0)}
                      className="w-10 text-right bg-transparent text-xs font-bold text-[#FFFFFF] focus:outline-none"
                    />
                  </div>

                  <div className="p-2 rounded-xl bg-[#08182A] border border-white/[0.06] flex items-center justify-between">
                    <span className="text-xs text-[#8FA3B8] flex items-center gap-1">
                      <Bath className="h-3.5 w-3.5" /> Baths
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      value={bathrooms}
                      onChange={(e) => setBathrooms(parseInt(e.target.value) || 0)}
                      className="w-10 text-right bg-transparent text-xs font-bold text-[#FFFFFF] focus:outline-none"
                    />
                  </div>

                  <div className="p-2 rounded-xl bg-[#08182A] border border-white/[0.06] flex items-center justify-between">
                    <span className="text-xs text-[#8FA3B8] flex items-center gap-1">
                      <Car className="h-3.5 w-3.5" /> Cars
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      value={carSpaces}
                      onChange={(e) => setCarSpaces(parseInt(e.target.value) || 0)}
                      className="w-10 text-right bg-transparent text-xs font-bold text-[#FFFFFF] focus:outline-none"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          <OnboardingFooter
            onBack={() => navigate('/onboarding/subscription')}
            continueLabel={isSaving ? 'Saving property…' : 'Save & continue'}
            continueType="submit"
            continueLoading={isSaving}
            skipLabel="Skip for now"
            onSkip={handleSkip}
            error={error}
          />
        </OnboardingStep>
      </form>
    </OnboardingContent>
  );
}

