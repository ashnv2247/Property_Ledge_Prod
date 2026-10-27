'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Sparkles, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PlanCardData {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  price_cents: number;
  billing_interval?: string | null;
  features?: string[];
  popular?: boolean;
  customPrice?: string;
  priceDisplay?: string;
  periodDisplay?: string;
}

interface PlanCardProps {
  plan: PlanCardData;
  selected?: boolean;
  recommended?: boolean;
  onSelect: () => void;
  loading?: boolean;
}

export function PlanCard({ plan, selected, recommended, onSelect, loading }: PlanCardProps) {
  const isCustom = plan.customPrice || plan.slug === 'agency' || (plan.price_cents === 0 && !plan.priceDisplay);
  const amount = plan.priceDisplay || (isCustom ? 'Custom' : `$${(plan.price_cents / 100).toFixed(0)}`);
  const period = plan.periodDisplay !== undefined 
    ? plan.periodDisplay 
    : isCustom 
    ? '' 
    : plan.billing_interval === 'yearly' 
    ? '/ mo (billed annually)' 
    : '/ mo';

  const isPopular = recommended || plan.popular;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onSelect();
    }
  };

  return (
    <motion.div
      whileHover={{ y: selected ? 0 : -3 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="w-full h-full flex flex-col"
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={handleKeyDown}
        className={cn(
          'relative flex flex-col justify-between h-full rounded-2xl p-5 sm:p-6 transition-all duration-300 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008F83] focus-visible:ring-offset-2',
          selected
            ? 'border-2 border-[#008F83] bg-[#008F83]/15 shadow-xl shadow-[#008F83]/20 ring-2 ring-[#008F83]/40'
            : isPopular
            ? 'border-2 border-[#008F83]/80 bg-[#0B1D30]/90 shadow-lg shadow-[#008F83]/10 hover:border-[#008F83]'
            : 'border border-white/[0.08] bg-[#0B1D30]/70 hover:border-[#008F83]/50 hover:bg-[#0B1D30]/90'
        )}
      >
        {isPopular && (
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-[#008F83] text-white shadow-sm ring-1 ring-white/20">
              <Sparkles className="w-3 h-3 text-[#00A99D]" />
              MOST POPULAR
            </span>
          </div>
        )}

        <div className="space-y-4 flex-1 flex flex-col">
          {/* Header & Radio Checkmark */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                {plan.name}
              </h3>
              {plan.description && (
                <p className="mt-1 text-xs text-[#8FA3B8] leading-relaxed">
                  {plan.description}
                </p>
              )}
            </div>

            <div
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all duration-200 mt-0.5',
                selected
                  ? 'border-[#008F83] bg-[#008F83] text-white'
                  : 'border-white/25 bg-[#071526]'
              )}
            >
              <AnimatePresence initial={false}>
                {selected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                  >
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Pricing */}
          <div className="flex items-baseline gap-1.5 pt-2 border-b border-white/[0.08] pb-4">
            <span className="text-3xl font-extrabold tracking-tight text-white">
              {amount}
            </span>
            {period && (
              <span className="text-xs font-semibold text-[#8FA3B8]">
                {period}
              </span>
            )}
          </div>

          {/* Features List */}
          {plan.features && plan.features.length > 0 && (
            <div className="pt-2 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8FA3B8]/70 block mb-3">
                INCLUDED WITH PLAN:
              </span>
              <ul className="space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-xs text-[#E2E8F0] cursor-default">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#00A99D]" />
                    <span className="leading-tight">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Selected Accent border indicator */}
        {selected && (
          <div className="absolute inset-x-0 bottom-0 h-1.5 rounded-b-2xl bg-[#008F83]" />
        )}
      </div>
    </motion.div>
  );
}
