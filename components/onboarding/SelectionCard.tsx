'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectionCardProps {
  id: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
  selected: boolean;
  onSelect: () => void;
  name: string;
  className?: string;
  badge?: string;
}

export function SelectionCard({
  id,
  title,
  description,
  icon,
  selected,
  onSelect,
  name,
  className,
  badge,
}: SelectionCardProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onSelect();
    }
  };

  return (
    <motion.div
      whileHover={{ y: selected ? 0 : -2 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="w-full"
    >
      <label
        htmlFor={id}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className={cn(
          'relative flex cursor-pointer items-center gap-3.5 rounded-2xl border p-3.5 sm:p-4 transition-all duration-200 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008F83] focus-visible:ring-offset-2 focus-visible:ring-offset-[#061222]',
          selected
            ? 'border-[#008F83] bg-[#008F83]/10 shadow-lg shadow-[#008F83]/10 ring-1 ring-[#008F83]/40'
            : 'border-white/[0.07] bg-[#0B1D30]/80 hover:border-white/[0.15] hover:bg-[#0B1D30] hover:shadow-md',
          className
        )}
      >
        <input
          type="radio"
          id={id}
          name={name}
          checked={selected}
          onChange={onSelect}
          tabIndex={-1}
          className="sr-only"
        />

        {/* Optional Top-Right Badge */}
        {badge && (
          <span className="absolute top-2.5 right-10 sm:right-11 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#008F83]/20 text-[#00A99D] border border-[#008F83]/30">
            {badge}
          </span>
        )}

        {/* Custom Icon wrapper */}
        {icon && (
          <div
            className={cn(
              'shrink-0 p-2.5 rounded-xl transition-colors duration-200 border',
              selected
                ? 'bg-[#008F83]/20 border-[#008F83]/40 text-[#00A99D]'
                : 'bg-white/[0.04] border-white/[0.06] text-[#8FA3B8]'
            )}
          >
            {icon}
          </div>
        )}

        <div className="min-w-0 flex-1 pr-1">
          <p className={cn(
            'text-sm font-semibold leading-snug tracking-tight transition-colors',
            selected ? 'text-[#FFFFFF]' : 'text-[#FFFFFF]/90'
          )}>
            {title}
          </p>
          <p className="text-xs text-[#8FA3B8] leading-relaxed mt-0.5">{description}</p>
        </div>

        {/* Elegant check indicator */}
        <div
          className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all duration-200',
            selected 
              ? 'border-[#008F83] bg-[#008F83] text-[#FFFFFF] shadow-sm shadow-[#008F83]/40' 
              : 'border-white/[0.15] bg-[#08182A]/80'
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
      </label>
    </motion.div>
  );
}

