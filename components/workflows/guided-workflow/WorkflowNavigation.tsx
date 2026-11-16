'use client';

import React from 'react';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/admin/ui';
import { cn } from '@/lib/utils';

export interface WorkflowNavigationProps {
  currentStepIndex: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  onCancel?: () => void;
  isNextDisabled?: boolean;
  isLoading?: boolean;
  nextLabel?: string;
  backLabel?: string;
  cancelLabel?: string;
  showKeyboardHint?: boolean;
  className?: string;
}

export function WorkflowNavigation({
  currentStepIndex,
  totalSteps,
  onBack,
  onNext,
  onCancel,
  isNextDisabled = false,
  isLoading = false,
  nextLabel,
  backLabel = 'Back',
  cancelLabel = 'Cancel',
  showKeyboardHint = true,
  className,
}: WorkflowNavigationProps) {
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;

  const defaultNextLabel = isLastStep ? 'Complete & Submit' : 'Continue';
  const effectiveNextLabel = nextLabel || defaultNextLabel;

  return (
    <div
      className={cn(
        'px-6 py-4 border-t border-slate-100 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md rounded-b-2xl sm:rounded-b-3xl flex items-center justify-between gap-4 transition-colors',
        className
      )}
    >
      <div>
        {isFirstStep ? (
          onCancel ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={isLoading}
              className="text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {cancelLabel}
            </Button>
          ) : null
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onBack}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200"
          >
            <ArrowLeft className="w-4 h-4" />
            {backLabel}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3">
        {showKeyboardHint && !isLoading && !isNextDisabled && (
          <span className="hidden sm:inline-flex items-center text-[11px] text-slate-400 dark:text-slate-500 font-medium">
            Press <kbd className="mx-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-mono text-[10px]">Enter ↵</kbd>
          </span>
        )}

        <Button
          type="button"
          onClick={onNext}
          disabled={isNextDisabled || isLoading}
          className={cn(
            'flex items-center gap-2 bg-[#008F83] hover:bg-[#007b70] text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm transition-all focus:ring-2 focus:ring-[#008F83]/40',
            (isNextDisabled || isLoading) && 'opacity-50 cursor-not-allowed'
          )}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Processing...</span>
            </>
          ) : isLastStep ? (
            <>
              <Check className="w-4 h-4" />
              <span>{effectiveNextLabel}</span>
            </>
          ) : (
            <>
              <span>{effectiveNextLabel}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
