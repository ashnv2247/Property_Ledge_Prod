'use client';

import React from 'react';
import Image from 'next/image';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FormVisualHeaderProps {
  title: string;
  description?: string;
  badge?: string;
  illustration?: {
    lightSrc: string;
    darkSrc?: string;
    alt: string;
  };
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
}

export function FormVisualHeader({
  title,
  description,
  badge,
  illustration,
  icon: Icon,
  action,
  className,
}: FormVisualHeaderProps) {
  return (
    <div
      className={cn(
        'relative flex items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/40 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-slate-900/40 backdrop-blur-xs transition-colors',
        className
      )}
    >
      <div className="space-y-1.5 min-w-0 flex-1 pr-2">
        {badge && (
          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full bg-[#008F83]/10 text-[#008F83] border border-[#008F83]/20 uppercase tracking-wider">
            {badge}
          </span>
        )}
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="w-8 h-8 rounded-xl bg-[#008F83]/10 dark:bg-[#008F83]/20 flex items-center justify-center text-[#008F83] shrink-0">
              <Icon className="w-4 h-4" />
            </div>
          )}
          <h2 className="text-lg sm:text-xl font-bold font-heading tracking-tight text-slate-900 dark:text-white leading-snug">
            {title}
          </h2>
        </div>
        {description && (
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
            {description}
          </p>
        )}
        {action && <div className="pt-2">{action}</div>}
      </div>

      {illustration && (
        <div className="relative shrink-0 w-24 h-20 sm:w-32 sm:h-24 hidden xs:flex items-center justify-center select-none pointer-events-none">
          {/* Light Mode Illustration */}
          <div className="relative w-full h-full dark:hidden flex items-center justify-center">
            <Image
              src={illustration.lightSrc}
              alt={illustration.alt}
              fill
              className="object-contain"
              sizes="140px"
              priority={false}
            />
          </div>
          {/* Dark Mode Illustration */}
          <div className="relative w-full h-full hidden dark:flex items-center justify-center">
            <Image
              src={illustration.darkSrc || illustration.lightSrc}
              alt={illustration.alt}
              fill
              className="object-contain"
              sizes="140px"
              priority={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}
