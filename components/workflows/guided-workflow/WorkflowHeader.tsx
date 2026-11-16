'use client';

import React from 'react';
import { X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WorkflowHeaderProps {
  title: string;
  description?: string;
  badge?: string;
  stepIndicator?: string;
  onClose?: () => void;
  className?: string;
}

export function WorkflowHeader({
  title,
  description,
  badge,
  stepIndicator,
  onClose,
  className,
}: WorkflowHeaderProps) {
  return (
    <div
      className={cn(
        'relative px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 backdrop-blur-md rounded-t-2xl sm:rounded-t-3xl transition-colors',
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5 min-w-0 pr-6">
          <div className="flex items-center gap-2 flex-wrap">
            {badge && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#008F83]/10 text-[#008F83] border border-[#008F83]/20 shadow-2xs tracking-wide uppercase">
                <Sparkles className="w-3 h-3" />
                {badge}
              </span>
            )}
            {stepIndicator && (
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {stepIndicator}
              </span>
            )}
          </div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-snug truncate">
            {title}
          </h2>
          {description && (
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
              {description}
            </p>
          )}
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close workflow"
            className="shrink-0 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-[#008F83]/40"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
