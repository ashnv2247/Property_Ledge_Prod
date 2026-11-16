'use client';

import React from 'react';
import { HelpCircle, Info, ShieldCheck, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ContextualHelpProps {
  title: string;
  children: React.ReactNode;
  icon?: 'info' | 'help' | 'shield' | 'warning';
  tone?: 'neutral' | 'teal' | 'amber';
  className?: string;
}

export function ContextualHelp({
  title,
  children,
  icon = 'help',
  tone = 'neutral',
  className,
}: ContextualHelpProps) {
  const toneClasses = {
    neutral: 'bg-slate-50/80 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400',
    teal: 'bg-[#008F83]/5 dark:bg-[#008F83]/10 border-[#008F83]/20 text-slate-700 dark:text-slate-300',
    amber: 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-900/40 text-amber-900 dark:text-amber-300',
  };

  const iconComponents = {
    info: <Info className="w-3.5 h-3.5 text-[#008F83] shrink-0 mt-0.5" />,
    help: <HelpCircle className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />,
    shield: <ShieldCheck className="w-3.5 h-3.5 text-[#008F83] shrink-0 mt-0.5" />,
    warning: <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />,
  };

  return (
    <div
      className={cn(
        'rounded-xl border p-3 sm:p-3.5 text-xs transition-colors space-y-1',
        toneClasses[tone],
        className
      )}
    >
      <div className="flex items-start gap-2">
        {iconComponents[icon]}
        <div className="space-y-0.5 flex-1">
          <span className="font-semibold text-slate-800 dark:text-slate-200 block text-xs leading-tight">
            {title}
          </span>
          <div className="text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-400">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
