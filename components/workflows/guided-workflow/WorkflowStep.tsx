'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface WorkflowStepProps {
  children: React.ReactNode;
  isActive: boolean;
  stepId: string;
  className?: string;
}

export function WorkflowStep({
  children,
  isActive,
  stepId,
  className,
}: WorkflowStepProps) {
  const shouldReduceMotion = useReducedMotion();

  if (!isActive) return null;

  const variants = shouldReduceMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0, transition: { duration: 0.24, ease: 'easeOut' as const } },
        exit: { opacity: 0, y: -8, transition: { duration: 0.16, ease: 'easeIn' as const } },
      };

  return (
    <motion.div
      key={stepId}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      className={cn('w-full', className)}
    >
      {children}
    </motion.div>
  );
}
