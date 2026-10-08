'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface ProgressIndicatorProps {
  current: number;
  total: number;
  label?: string;
  className?: string;
}

const STEP_LABELS = ['Workspace', 'Plan', 'Property', 'Team'];

export function ProgressIndicator({ current, total, label, className }: ProgressIndicatorProps) {
  const stepsCount = total > 0 ? total : 4;
  const labels = STEP_LABELS.slice(0, stepsCount);

  return (
    <div className={cn('space-y-2 select-none', className)} aria-label={`Step ${current} of ${total}: ${label || ''}`}>
      {/* Top row with step numbers and connecting lines */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-2">
        {labels.map((stepName, idx) => {
          const stepNum = idx + 1;
          const isDone = stepNum < current;
          const isCurrent = stepNum === current;

          return (
            <React.Fragment key={stepName}>
              <div className="flex items-center gap-1.5 shrink-0">
                <div
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold transition-all duration-300',
                    isDone
                      ? 'bg-[#008F83] text-[#FFFFFF]'
                      : isCurrent
                      ? 'border border-[#008F83] bg-[#008F83]/20 text-[#00A99D] shadow-sm shadow-[#008F83]/30'
                      : 'border border-white/[0.1] bg-white/[0.03] text-[#64788D]'
                  )}
                >
                  {isDone ? (
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  ) : (
                    <span>0{stepNum}</span>
                  )}
                </div>
                <span
                  className={cn(
                    'text-[11px] font-medium hidden sm:inline transition-colors',
                    isCurrent
                      ? 'text-[#FFFFFF] font-semibold'
                      : isDone
                      ? 'text-[#8FA3B8]'
                      : 'text-[#64788D]'
                  )}
                >
                  {stepName}
                </span>
              </div>

              {idx < labels.length - 1 && (
                <div className="flex-1 h-[1.5px] bg-white/[0.08] rounded-full overflow-hidden mx-1">
                  <motion.div
                    className="h-full bg-[#008F83]"
                    initial={{ width: '0%' }}
                    animate={{ width: isDone ? '100%' : '0%' }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

