'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnboardingFooterProps {
  onBack?: () => void;
  backLabel?: string;
  continueLabel?: string;
  onContinue?: () => void;
  continueType?: 'button' | 'submit';
  continueLoading?: boolean;
  continueDisabled?: boolean;
  skipLabel?: string;
  onSkip?: () => void;
  error?: string | null;
  className?: string;
}

export function OnboardingFooter({
  onBack,
  backLabel = 'Back',
  continueLabel = 'Continue',
  onContinue,
  continueType = 'submit',
  continueLoading = false,
  continueDisabled = false,
  skipLabel,
  onSkip,
  error,
  className,
}: OnboardingFooterProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className={cn('space-y-3 pt-5 border-t border-white/[0.06] mt-6', className)}>
      {error && (
        <p className="text-xs font-medium text-rose-400 leading-relaxed bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-xl" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Back / Skip Actions */}
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center justify-center gap-1.5 h-10 px-3 rounded-xl text-xs font-semibold text-[#8FA3B8] hover:text-[#FFFFFF] hover:bg-white/[0.06] transition-all cursor-pointer select-none"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{backLabel}</span>
            </button>
          )}
          {onSkip && skipLabel && (
            <button
              type="button"
              onClick={onSkip}
              className="inline-flex items-center justify-center h-10 px-3 rounded-xl text-xs font-semibold text-[#8FA3B8] hover:text-[#FFFFFF] hover:bg-white/[0.06] transition-all cursor-pointer select-none"
            >
              {skipLabel}
            </button>
          )}
        </div>

        {/* Continue Button */}
        <motion.button
          type={continueType}
          onClick={onContinue}
          disabled={continueDisabled || continueLoading}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          whileTap={{ scale: continueDisabled || continueLoading ? 1 : 0.98 }}
          className={cn(
            "inline-flex items-center justify-center gap-2 h-11 px-5 sm:px-6 rounded-xl text-xs font-semibold text-[#FFFFFF] transition-all cursor-pointer select-none shadow-md shadow-[#008F83]/15",
            continueDisabled || continueLoading
              ? "bg-[#008F83]/50 pointer-events-none opacity-80"
              : "bg-[#008F83] hover:bg-[#00A99D] active:bg-[#00A99D]/90 hover:shadow-lg hover:shadow-[#008F83]/25"
          )}
        >
          {continueLoading ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" aria-hidden="true" />
              <span>{continueLabel}</span>
            </>
          ) : (
            <>
              <span>{continueLabel}</span>
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
    </div>
  );
}

