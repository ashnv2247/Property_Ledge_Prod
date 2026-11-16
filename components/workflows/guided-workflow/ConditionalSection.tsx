'use client';

import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface ConditionalSectionProps {
  show: boolean;
  children: React.ReactNode;
  className?: string;
}

export function ConditionalSection({
  show,
  children,
  className,
}: ConditionalSectionProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0, y: -6 }}
          animate={
            shouldReduceMotion
              ? { opacity: 1 }
              : { opacity: 1, height: 'auto', y: 0, transition: { duration: 0.22, ease: 'easeOut' as const } }
          }
          exit={
            shouldReduceMotion
              ? { opacity: 0 }
              : { opacity: 0, height: 0, y: -4, transition: { duration: 0.16, ease: 'easeIn' as const } }
          }
          className={cn('overflow-hidden w-full', className)}
        >
          <div className="pt-2">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
