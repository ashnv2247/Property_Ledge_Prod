'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Home, Building2, Briefcase, TrendingUp } from 'lucide-react';
import { OnboardingContent } from '@/components/onboarding/OnboardingContent';
import { OnboardingStep } from '@/components/onboarding/OnboardingStep';
import { SelectionCard } from '@/components/onboarding/SelectionCard';
import { completeWelcomeStage } from '@/app/actions/onboarding';
import type { BusinessType } from '@/lib/onboarding/state';

interface PersonaOption {
  id: BusinessType;
  title: string;
  description: string;
  feedback: string;
  icon: React.ReactNode;
}

const PERSONA_OPTIONS: PersonaOption[] = [
  {
    id: 'property_owner',
    title: 'Property Owner',
    description: 'I manage my own rental properties or private portfolio',
    feedback: 'Perfect. Let’s get your entire property portfolio organized.',
    icon: <Home className="h-4 w-4" />,
  },
  {
    id: 'property_management',
    title: 'Property Manager',
    description: 'I manage properties and tenancies on behalf of owners',
    feedback: 'Great. Let’s configure your multi-owner management hub.',
    icon: <Building2 className="h-4 w-4" />,
  },
  {
    id: 'accountant',
    title: 'Accountant / Advisor',
    description: 'I organize financials, tax reconciliation, and client properties',
    feedback: 'Excellent. Let’s set up your workspace for automated tax-ready reporting.',
    icon: <Briefcase className="h-4 w-4" />,
  },
  {
    id: 'investor',
    title: 'Property Investor',
    description: 'I track yields, capital growth, and expanding property assets',
    feedback: 'Superb. Let’s optimize your asset tracking and financial reporting.',
    icon: <TrendingUp className="h-4 w-4" />,
  },
];

export default function OnboardingWelcomePage() {
  const router = useRouter();
  const [selectedPersona, setSelectedPersona] = useState<BusinessType>('property_owner');
  const [isSaving, setIsSaving] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const activePersona = PERSONA_OPTIONS.find((p) => p.id === selectedPersona) || PERSONA_OPTIONS[0];

  async function handleContinue() {
    setIsSaving(true);
    try {
      await completeWelcomeStage();
      // Store preferred persona temporarily in sessionStorage for smooth handoff
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('pl_onboarding_persona', selectedPersona);
      }
      router.push('/onboarding/workspace');
    } catch (err) {
      console.error(err);
      setIsSaving(false);
    }
  }

  return (
    <OnboardingContent>
      <OnboardingStep
        eyebrow="Welcome to PropertyLedge"
        title="Let's organize your property portfolio."
        description="PropertyLedge brings all your Australian properties, leases, bank reconciliations, and tax packs into one calm, intelligent platform."
      >
        <div className="space-y-4 pt-1">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-[#FFFFFF]/90 tracking-tight">
              What best describes your role?
            </p>
            <p className="text-[11px] text-[#8FA3B8]">
              We’ll customize your workspace features based on how you manage properties.
            </p>
          </div>

          {/* Persona Selection Cards */}
          <div className="grid grid-cols-1 gap-2.5">
            {PERSONA_OPTIONS.map((persona) => (
              <SelectionCard
                key={persona.id}
                id={persona.id}
                name="userRole"
                title={persona.title}
                description={persona.description}
                icon={persona.icon}
                selected={selectedPersona === persona.id}
                onSelect={() => setSelectedPersona(persona.id)}
              />
            ))}
          </div>

          {/* Dynamic Intelligent Feedback Pill */}
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedPersona}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
              className="p-3 rounded-xl bg-[#008F83]/10 border border-[#008F83]/20 flex items-center gap-2.5"
            >
              <div className="h-2 w-2 rounded-full bg-[#00A99D] shrink-0 animate-pulse" />
              <span className="text-xs text-[#00A99D] font-medium leading-relaxed">
                {activePersona.feedback}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Action Button */}
        <div className="mt-6 pt-5 border-t border-white/[0.06] flex items-center justify-between">
          <p className="text-xs text-[#8FA3B8] cursor-default">
            Already have a setup?{' '}
            <Link
              href="/dashboard"
              className="font-semibold text-[#FFFFFF] hover:text-[#00A99D] transition-colors underline underline-offset-4"
            >
              Go to dashboard
            </Link>
          </p>

          <motion.button
            onClick={handleContinue}
            disabled={isSaving}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            whileTap={{ scale: isSaving ? 1 : 0.98 }}
            className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl text-xs font-semibold text-[#FFFFFF] bg-[#008F83] hover:bg-[#00A99D] active:bg-[#00A99D]/90 transition-all cursor-pointer select-none shadow-md shadow-[#008F83]/20"
          >
            {isSaving ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" aria-hidden="true" />
                <span>Setting up workspace...</span>
              </>
            ) : (
              <>
                <span>Get started</span>
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
      </OnboardingStep>
    </OnboardingContent>
  );
}