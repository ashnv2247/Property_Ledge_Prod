'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';

export default function OnboardingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Onboarding Journey Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#061222] text-[#FFFFFF] p-4 font-sans">
      <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-[#08182A] border border-white/[0.08] shadow-2xl text-center space-y-5">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl font-bold tracking-tight text-[#FFFFFF] font-heading">
            Something went wrong
          </h2>
          <p className="text-xs text-[#8FA3B8] leading-relaxed">
            Your progress hasn’t been lost. Please retry or restart this step.
          </p>
        </div>

        {error.message && (
          <div className="p-3 rounded-xl bg-[#0B1D30] border border-white/[0.06] text-left text-xs font-mono text-[#00A99D] overflow-x-auto max-h-24">
            {error.message}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="flex-1 py-2.5 px-4 rounded-xl bg-[#008F83] hover:bg-[#00A99D] text-[#FFFFFF] font-semibold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md shadow-[#008F83]/20"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry step</span>
          </button>
          <Link
            href="/onboarding"
            className="flex-1 py-2.5 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[#FFFFFF] font-semibold text-xs flex items-center justify-center gap-2 transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Start Over</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

