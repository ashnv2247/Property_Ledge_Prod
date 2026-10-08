'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormField({ id, label, hint, error, children, className }: FormFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label 
        htmlFor={id} 
        className="block text-xs sm:text-sm font-semibold text-[#FFFFFF]/90 tracking-tight cursor-default"
      >
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-[#8FA3B8] font-medium cursor-default leading-relaxed">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="text-xs font-medium text-rose-400 leading-relaxed" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export const inputClassName =
  'w-full h-11 sm:h-12 px-4 rounded-xl border border-white/[0.08] bg-[#0B1D30] text-sm sm:text-base text-[#FFFFFF] placeholder:text-[#64788D] focus:outline-none focus:ring-2 focus:ring-[#008F83]/30 focus:border-[#008F83] transition-all duration-150';

