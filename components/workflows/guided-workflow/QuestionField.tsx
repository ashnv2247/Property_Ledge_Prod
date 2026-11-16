'use client';

import React from 'react';
import { AlertCircle, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface QuestionFieldProps {
  question: string;
  description?: string;
  required?: boolean;
  error?: string;
  tooltip?: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}

export function QuestionField({
  question,
  description,
  required = false,
  error,
  tooltip,
  htmlFor,
  children,
  className,
}: QuestionFieldProps) {
  return (
    <div className={cn('space-y-2 text-left w-full', className)}>
      <div className="flex items-start justify-between gap-2">
        <label
          htmlFor={htmlFor}
          className="block text-sm font-semibold text-slate-900 dark:text-white leading-snug"
        >
          {question}
          {required && <span className="text-rose-500 ml-1" aria-hidden="true">*</span>}
        </label>
        {tooltip && (
          <span title={tooltip} className="cursor-help text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <HelpCircle className="w-3.5 h-3.5" />
          </span>
        )}
      </div>

      {description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {description}
        </p>
      )}

      <div className="pt-0.5">{children}</div>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-rose-500 dark:text-rose-400 font-medium pt-1 animate-in fade-in">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
