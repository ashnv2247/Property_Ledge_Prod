'use client';

import React from 'react';
import { LucideIcon, Check, CheckCircle2 } from 'lucide-react';
import { WorkflowIllustration } from './WorkflowIllustration';
import { cn } from '@/lib/utils';

export interface VisualChoiceCardProps {
  id: string;
  title: string;
  description: string;
  benefits?: string[];
  illustration?: {
    lightSrc?: string;
    darkSrc?: string;
    alt: string;
    badge?: string;
    badgeTone?: 'teal' | 'amber' | 'slate';
  };
  icon?: LucideIcon;
  badge?: string;
  isSelected: boolean;
  onSelect: (id: string) => void;
  disabled?: boolean;
  className?: string;
}

export function VisualChoiceCard({
  id,
  title,
  description,
  benefits,
  illustration,
  icon: Icon,
  badge,
  isSelected,
  onSelect,
  disabled = false,
  className,
}: VisualChoiceCardProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onSelect(id);
    }
  };

  return (
    <div
      role="radio"
      aria-checked={isSelected}
      tabIndex={disabled ? -1 : 0}
      onClick={() => !disabled && onSelect(id)}
      onKeyDown={handleKeyDown}
      className={cn(
        'group relative cursor-pointer rounded-2xl p-5 border-2 transition-all duration-200 text-left flex flex-col justify-between gap-4 outline-none select-none',
        'hover:-translate-y-0.5 hover:shadow-md',
        isSelected
          ? 'border-[#008F83] bg-[#008F83]/5 dark:bg-[#008F83]/10 ring-2 ring-[#008F83]/20 shadow-sm'
          : 'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs',
        disabled && 'opacity-50 cursor-not-allowed hover:translate-y-0 hover:shadow-none',
        'focus-visible:ring-2 focus-visible:ring-[#008F83] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900',
        className
      )}
    >
      <div className="space-y-3.5">
        {/* Top visual illustration banner if provided */}
        {illustration && (
          <WorkflowIllustration
            lightSrc={illustration.lightSrc}
            darkSrc={illustration.darkSrc}
            alt={illustration.alt}
            badge={illustration.badge}
            badgeTone={illustration.badgeTone}
            fallbackIcon={Icon}
            heightClassName="h-32 sm:h-36"
          />
        )}

        {/* Title & Icon Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {Icon && (
              <div
                className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center transition-colors shrink-0',
                  isSelected
                    ? 'bg-[#008F83] text-white shadow-xs'
                    : 'bg-[#008F83]/10 dark:bg-[#008F83]/20 text-[#008F83]'
                )}
              >
                <Icon className="w-4 h-4" />
              </div>
            )}
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                {title}
              </h3>
              {badge && (
                <span className="inline-block mt-0.5 text-[10px] font-semibold text-[#008F83] uppercase tracking-wide">
                  {badge}
                </span>
              )}
            </div>
          </div>

          {/* Radio / Selection Pill */}
          <div
            className={cn(
              'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 mt-0.5',
              isSelected
                ? 'border-[#008F83] bg-[#008F83] text-white shadow-xs'
                : 'border-slate-300 dark:border-slate-700 bg-transparent group-hover:border-slate-400'
            )}
          >
            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
          </div>
        </div>

        {/* Description */}
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          {description}
        </p>

        {/* Optional Benefits list */}
        {benefits && benefits.length > 0 && (
          <div className="pt-2 space-y-1.5 border-t border-slate-100 dark:border-slate-800/80">
            {benefits.map((benefit, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-medium"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-[#008F83] shrink-0" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Card Footer status indicator */}
      <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-100 dark:border-slate-800/60">
        <span
          className={cn(
            'text-[11px] font-bold transition-colors',
            isSelected
              ? 'text-[#008F83]'
              : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
          )}
        >
          {isSelected ? '✓ Selected' : 'Click to select'}
        </span>
      </div>
    </div>
  );
}
