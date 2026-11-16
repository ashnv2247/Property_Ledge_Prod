'use client';

import React from 'react';
import { CheckCircle2, LucideIcon, ArrowRight } from 'lucide-react';
import { Button } from '@/components/admin/ui';
import { cn } from '@/lib/utils';

export interface FormSuccessVisualProps {
  title: string;
  description: string;
  referenceId?: string;
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

export function FormSuccessVisual({
  title,
  description,
  referenceId,
  primaryAction,
  secondaryAction,
  className,
}: FormSuccessVisualProps) {
  const PrimaryIcon = primaryAction.icon || ArrowRight;

  return (
    <div className={cn('py-8 px-4 text-center space-y-5 max-w-md mx-auto animate-in zoom-in-95', className)}>
      <div className="w-14 h-14 rounded-2xl bg-[#008F83]/10 dark:bg-[#008F83]/20 border-2 border-[#008F83]/30 flex items-center justify-center text-[#008F83] mx-auto shadow-xs">
        <CheckCircle2 className="w-8 h-8 stroke-[2.2]" />
      </div>

      <div className="space-y-1.5">
        <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          {description}
        </p>
        {referenceId && (
          <div className="inline-block px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md text-[11px] font-mono font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 mt-2">
            Ref: {referenceId}
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
        {secondaryAction && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={secondaryAction.onClick}
            className="w-full sm:w-auto text-xs"
          >
            {secondaryAction.label}
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          onClick={primaryAction.onClick}
          className="w-full sm:w-auto bg-[#008F83] hover:bg-[#007b70] text-white flex items-center gap-1.5 justify-center text-xs"
        >
          <span>{primaryAction.label}</span>
          <PrimaryIcon className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
