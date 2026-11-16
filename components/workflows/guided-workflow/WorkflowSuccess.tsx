'use client';

import React from 'react';
import { CheckCircle2, ArrowRight, LucideIcon } from 'lucide-react';
import { Button } from '@/components/admin/ui';
import { cn } from '@/lib/utils';

export interface WorkflowSuccessProps {
  title: string;
  subtitle: string;
  referenceId?: string;
  details?: Array<{ label: string; value: string }>;
  primaryAction: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function WorkflowSuccess({
  title,
  subtitle,
  referenceId,
  details,
  primaryAction,
  secondaryAction,
  className,
}: WorkflowSuccessProps) {
  const PrimaryIcon = primaryAction.icon || ArrowRight;

  return (
    <div
      className={cn(
        'py-8 px-6 text-center space-y-6 max-w-lg mx-auto animate-in zoom-in-95 duration-200',
        className
      )}
    >
      {/* Animated Success Badge */}
      <div className="w-16 h-16 rounded-full bg-[#008F83]/10 dark:bg-[#008F83]/20 border-2 border-[#008F83]/30 flex items-center justify-center text-[#008F83] mx-auto shadow-sm">
        <CheckCircle2 className="w-9 h-9 stroke-[2.2]" />
      </div>

      <div className="space-y-2">
        <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {title}
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          {subtitle}
        </p>
        {referenceId && (
          <div className="inline-block px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-mono font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 mt-2">
            ID: {referenceId}
          </div>
        )}
      </div>

      {details && details.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-4 text-left divide-y divide-slate-200/60 dark:divide-slate-800">
          {details.map((d, i) => (
            <div key={i} className="py-2 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">{d.label}</span>
              <span className="font-semibold text-slate-900 dark:text-white">{d.value}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        {secondaryAction && (
          <Button
            type="button"
            variant="outline"
            onClick={secondaryAction.onClick}
            className="w-full sm:w-auto"
          >
            {secondaryAction.label}
          </Button>
        )}
        <Button
          type="button"
          onClick={primaryAction.onClick}
          className="w-full sm:w-auto bg-[#008F83] hover:bg-[#007b70] text-white flex items-center gap-2 justify-center"
        >
          <span>{primaryAction.label}</span>
          <PrimaryIcon className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
