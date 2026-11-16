'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface WorkflowProgressStep {
  id: string;
  label: string;
  description?: string;
  isOptional?: boolean;
}

export interface WorkflowProgressProps {
  steps: WorkflowProgressStep[];
  activeStepIndex: number;
  onStepClick?: (stepIndex: number) => void;
  className?: string;
}

export function WorkflowProgress({
  steps,
  activeStepIndex,
  onStepClick,
  className,
}: WorkflowProgressProps) {
  const totalSteps = steps.length;
  const currentStep = steps[activeStepIndex] || steps[0];
  const currentStepNum = activeStepIndex + 1;

  return (
    <div className={cn('px-6 pt-4 pb-2 bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/60', className)}>
      {/* Top summary row: e.g. "Step 2 of 4 — Property details" */}
      <div className="flex items-center justify-between text-xs mb-2">
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          Step {currentStepNum} of {totalSteps}{' '}
          <span className="text-slate-400 dark:text-slate-500 font-normal mx-1">·</span>{' '}
          <span className="text-[#008F83] font-bold">{currentStep?.label}</span>
        </span>
        {currentStep?.isOptional && (
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 bg-slate-200/60 dark:bg-slate-800 px-2 py-0.5 rounded-full">
            Optional
          </span>
        )}
      </div>

      {/* Segmented Progress Bar */}
      <div className="flex items-center gap-1.5 w-full" role="progressbar" aria-valuenow={currentStepNum} aria-valuemin={1} aria-valuemax={totalSteps}>
        {steps.map((step, idx) => {
          const isCompleted = idx < activeStepIndex;
          const isCurrent = idx === activeStepIndex;
          const isClickable = onStepClick && isCompleted;

          return (
            <button
              key={step.id || idx}
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onStepClick(idx)}
              title={`${step.label}${isCompleted ? ' (Completed)' : isCurrent ? ' (Current)' : ''}`}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-all duration-300 relative focus:outline-none',
                isCompleted
                  ? 'bg-[#008F83] hover:opacity-85 cursor-pointer'
                  : isCurrent
                  ? 'bg-[#008F83] shadow-xs ring-2 ring-[#008F83]/30'
                  : 'bg-slate-200 dark:bg-slate-800',
                !isClickable && 'cursor-default'
              )}
            >
              <span className="sr-only">
                {step.label} {isCompleted ? 'completed' : isCurrent ? 'active' : 'pending'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
