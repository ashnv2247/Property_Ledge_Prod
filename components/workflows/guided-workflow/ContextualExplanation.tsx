'use client';

import React from 'react';
import { Info, HelpCircle, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ContextualExplanationProps {
  title?: string;
  explanation: string;
  nextStepPreview?: string;
  canChangeLater?: boolean;
  type?: 'info' | 'guidance' | 'warning';
  className?: string;
}

export function ContextualExplanation({
  title = 'Why this matters',
  explanation,
  nextStepPreview,
  canChangeLater = true,
  type = 'info',
  className,
}: ContextualExplanationProps) {
  const styles = {
    info: {
      border: 'border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60',
      icon: <Info className="w-4 h-4 text-[#008F83] shrink-0 mt-0.5" />,
      accent: 'text-[#008F83]',
    },
    guidance: {
      border: 'border-[#008F83]/30 bg-[#008F83]/5 dark:bg-[#008F83]/10',
      icon: <ShieldCheck className="w-4 h-4 text-[#008F83] shrink-0 mt-0.5" />,
      accent: 'text-[#008F83]',
    },
    warning: {
      border: 'border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/20',
      icon: <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />,
      accent: 'text-amber-600 dark:text-amber-500',
    },
  };

  const currentStyle = styles[type];

  return (
    <div
      className={cn(
        'rounded-xl border p-4 text-xs transition-all space-y-2',
        currentStyle.border,
        className
      )}
    >
      <div className="flex items-start gap-2.5">
        {currentStyle.icon}
        <div className="space-y-1 flex-1">
          <p className="font-semibold text-slate-800 dark:text-slate-200 leading-snug">
            {title}
          </p>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            {explanation}
          </p>
        </div>
      </div>

      {(nextStepPreview || canChangeLater !== undefined) && (
        <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          {nextStepPreview && (
            <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
              <ArrowRight className="w-3 h-3 text-[#008F83]" />
              <span>Next: {nextStepPreview}</span>
            </span>
          )}
          {canChangeLater !== undefined && (
            <span className="italic">
              {canChangeLater
                ? '✓ You can change this decision anytime later.'
                : 'Notice: This configuration cannot be altered after creation.'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
