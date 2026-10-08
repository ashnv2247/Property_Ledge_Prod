'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ProgressIndicator } from './ProgressIndicator';
import { OnboardingLoadingOverlay } from './OnboardingLoadingOverlay';
import { OnboardingNavProvider, useOnboardingNav } from './OnboardingNavContext';
import { OnboardingStepVisual } from './OnboardingStepVisual';
import { HelpCircle, LogOut, X, Compass, ShieldCheck } from 'lucide-react';
import {
  getProgressStepFromPath,
  getStageByPath,
  type OnboardingStage,
} from '@/lib/onboarding/state';

interface OnboardingShellProps {
  children: React.ReactNode;
  userName?: string;
  userEmail?: string;
  workspaceName?: string;
}

function OnboardingShellInner({ children, userName = 'User', userEmail, workspaceName }: OnboardingShellProps) {
  const pathname = usePathname();
  const { isNavigating } = useOnboardingNav();
  const prefersReducedMotion = useReducedMotion();

  const currentStage: OnboardingStage = getStageByPath(pathname).id;
  const progress = getProgressStepFromPath(pathname);
  const showProgress = currentStage !== 'welcome';

  const xOffset = prefersReducedMotion ? 0 : 12;

  const handleSaveExit = () => {
    window.location.href = '/dashboard';
  };

  const handleExploreWebsite = () => {
    window.location.href = '/';
  };

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen bg-[#061222] text-[#FFFFFF] flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-hidden font-sans selection:bg-[#008F83]/30 selection:text-[#FFFFFF]">
      {/* Ambient Radial Gradient Glows */}
      <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-[#008F83]/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-[#0B1D30]/80 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#008F83]/5 rounded-full blur-[160px] pointer-events-none -z-10" />

      {/* Subtle Architectural Grid */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none -z-10" 
        style={{
          backgroundImage: `radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)`,
          backgroundSize: '32px 32px'
        }}
      />

      {/* Centered Floating Onboarding Card */}
      <AnimatePresence mode="wait">
        {currentStage === 'welcome' ? (
          /* Single-column Centered Card for Welcome & Persona Stage */
          <motion.div
            key="welcome-card"
            initial={{ opacity: 0, y: 12, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.99 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-[600px] h-[min(88vh,720px)] bg-[#08182A]/95 backdrop-blur-2xl border border-white/[0.08] rounded-3xl shadow-2xl shadow-black/80 p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden"
          >
            {/* Close / Explore button top-right */}
            <button
              onClick={handleExploreWebsite}
              aria-label="Close and explore website"
              title="Explore Website"
              className="absolute top-5 right-5 p-2 rounded-full text-[#8FA3B8] hover:text-[#FFFFFF] hover:bg-white/[0.06] transition-all cursor-pointer z-20 border border-white/[0.06]"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Internal Brand Badge */}
            <div className="flex flex-col items-center text-center space-y-2 pt-1 shrink-0">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.1] bg-[#0B1D30] overflow-hidden shadow-lg p-1.5">
                <img src="/logo_Dark.png" alt="PropertyLedge" className="h-full w-full object-contain" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-heading text-sm font-bold tracking-tight text-[#FFFFFF]">
                  PropertyLedge
                </span>
                <span className="text-[#008F83] text-xs font-semibold px-1.5 py-0.2 rounded bg-[#008F83]/10 border border-[#008F83]/20">
                  AU
                </span>
              </div>
            </div>

            {/* Scrollable Center Content */}
            <div className="relative flex-1 overflow-y-auto custom-scrollbar my-3 py-1 px-0.5 flex flex-col justify-center">
              {children}
            </div>

            {/* Card Footer info */}
            <div className="pt-3.5 border-t border-white/[0.06] text-[11px] text-[#8FA3B8] flex items-center justify-between shrink-0">
              <button
                onClick={handleExploreWebsite}
                className="flex items-center gap-1.5 hover:text-[#00A99D] font-medium transition-colors cursor-pointer"
              >
                <Compass className="h-3.5 w-3.5" />
                <span>Explore features first</span>
              </button>
              <button
                onClick={handleSaveExit}
                className="flex items-center gap-1 hover:text-[#FFFFFF] transition-colors cursor-pointer"
              >
                <LogOut className="h-3 w-3" />
                <span>Save & exit</span>
              </button>
            </div>
          </motion.div>
        ) : (
          /* Two-Column Elevated Card for Form & Config Stages */
          <motion.div
            key="step-card"
            initial={{ opacity: 0, y: 12, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.99 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-5xl h-[min(88vh,760px)] bg-[#08182A]/95 backdrop-blur-2xl border border-white/[0.08] rounded-3xl shadow-2xl shadow-black/80 overflow-hidden flex flex-col lg:flex-row relative"
          >
            {/* Top-Right Close Button with High Z-Index */}
            <button
              type="button"
              onClick={handleExploreWebsite}
              aria-label="Close and explore website"
              title="Explore Website"
              className="absolute top-4 right-4 p-2 rounded-full bg-[#0B1D30]/80 hover:bg-[#0B1D30] text-[#8FA3B8] hover:text-[#FFFFFF] backdrop-blur-md transition-all cursor-pointer z-50 border border-white/[0.08] shadow-lg hover:scale-105 active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Left Side: Onboarding Form & Steps */}
            <div className="flex-1 w-full lg:w-[58%] flex flex-col justify-between p-5 sm:p-7 lg:p-8 overflow-hidden h-full">
              {/* Header Actions inside card */}
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] bg-[#0B1D30] overflow-hidden p-1 shadow-sm shrink-0">
                    <img src="/logo_Dark.png" alt="PropertyLedge" className="h-full w-full object-contain" />
                  </div>
                  <span className="font-heading text-xs font-bold text-[#FFFFFF]">
                    PropertyLedge <span className="text-[#8FA3B8] font-normal">Onboarding</span>
                  </span>
                </div>

                <div className="flex items-center gap-3.5 text-xs text-[#8FA3B8] font-medium pr-2">
                  <a
                    href="https://propertyledge.com/support"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 hover:text-[#FFFFFF] transition-colors"
                  >
                    <HelpCircle className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Help</span>
                  </a>
                  <button
                    type="button"
                    onClick={handleSaveExit}
                    className="flex items-center gap-1 hover:text-[#FFFFFF] transition-colors cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Save & exit</span>
                  </button>
                </div>
              </div>

              {showProgress && (
                <div className="pt-3 pb-2 shrink-0">
                  <ProgressIndicator
                    current={progress.current}
                    total={progress.total}
                    label={progress.label}
                  />
                </div>
              )}

              {/* Animated Form step with dedicated custom-scrollbar scroll area */}
              <div className="flex-1 overflow-y-auto custom-scrollbar py-2 pr-1 my-1">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={pathname}
                    initial={{ opacity: 0, x: xOffset }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -xOffset }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    className="w-full"
                  >
                    {children}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Sub card SSL Notice & explore link */}
              <div className="pt-3 border-t border-white/[0.06] text-[10px] text-[#64788D] flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={handleExploreWebsite}
                  className="flex items-center gap-1 hover:text-[#00A99D] font-medium transition-colors cursor-pointer"
                >
                  <Compass className="h-3 w-3" />
                  <span>Explore website</span>
                </button>
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-[#008F83]" />
                  <span>256-bit Encrypted · Australian Data Isolation</span>
                </span>
              </div>
            </div>

            {/* Right Side: Contextual Live Preview & Visuals */}
            <div className="hidden lg:flex lg:w-[42%] bg-[#071526]/90 border-l border-white/[0.06] overflow-hidden h-full rounded-r-3xl relative">
              <OnboardingStepVisual stage={currentStage} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isNavigating && <OnboardingLoadingOverlay />}
    </div>
  );
}

export function OnboardingShell(props: OnboardingShellProps) {
  return (
    <OnboardingNavProvider>
      <OnboardingShellInner {...props} />
    </OnboardingNavProvider>
  );
}




