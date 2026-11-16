'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FormSectionIntroductionProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  badge?: string;
  stepNumber?: number;
  className?: string;
}

export function FormSectionIntroduction({
  title,
  description,
  icon: Icon,
  badge,
  stepNumber,
  className,
}: FormSectionIntroductionProps) {
  return (
    <div className={cn('space-y-1 pb-2', className)}>
      <div className="flex items-center gap-2 flex-wrap">
        {stepNumber !== undefined && (
          <span className="w-5 h-5 rounded-full bg-[#008F83] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
            {stepNumber}
          </span>
        )}
        {Icon && (
          <div className="w-5 h-5 text-[#008F83] flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
          {title}
        </h4>
        {badge && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            {badge}
          </span>
        )}
      </div>
      {description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pl-0 sm:pl-7">
          {description}
        </p>
      )}
    </div>
  );
}
