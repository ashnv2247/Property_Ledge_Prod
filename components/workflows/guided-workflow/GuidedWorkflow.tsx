'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { WorkflowHeader } from './WorkflowHeader';
import { WorkflowProgress, type WorkflowProgressStep } from './WorkflowProgress';
import { WorkflowNavigation } from './WorkflowNavigation';
import { UnsavedChangesDialog } from './UnsavedChangesDialog';
import { cn } from '@/lib/utils';

export interface GuidedWorkflowStepConfig<T = any> {
  id: string;
  title: string;
  description?: string;
  isOptional?: boolean;
  isApplicable?: (context: T) => boolean;
  validate?: (context: T) => boolean | Promise<boolean>;
  component: (props: {
    context: T;
    updateContext: (updates: Partial<T>) => void;
    onNext: () => void;
    onBack: () => void;
  }) => React.ReactNode;
}

export interface GuidedWorkflowProps<T = any> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  badge?: string;
  description?: string;
  illustration?: {
    lightSrc: string;
    darkSrc?: string;
    alt: string;
  };
  initialContext: T;
  steps: GuidedWorkflowStepConfig<T>[];
  onSubmit: (finalContext: T) => Promise<any> | any;
  onSuccess?: (result: any) => void;
  maxWidthClassName?: string;
  className?: string;
}

export function GuidedWorkflow<T extends Record<string, any>>({
  isOpen,
  onClose,
  title,
  badge,
  description,
  illustration,
  initialContext,
  steps,
  onSubmit,
  onSuccess,
  maxWidthClassName = 'max-w-3xl',
  className,
}: GuidedWorkflowProps<T>) {
  const [context, setContext] = useState<T>(initialContext);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);

  // Reset or initialize context when opening
  useEffect(() => {
    if (isOpen) {
      setContext(initialContext);
      setActiveStepIndex(0);
      setIsSubmitting(false);
      setIsDirty(false);
      setShowUnsavedDialog(false);
    }
  }, [isOpen]);

  // Compute active steps dynamically based on conditional applicability
  const activeSteps = useMemo(() => {
    return steps.filter((s) => (s.isApplicable ? s.isApplicable(context) : true));
  }, [steps, context]);

  // Clamp step index if active steps shrink
  useEffect(() => {
    if (activeStepIndex >= activeSteps.length && activeSteps.length > 0) {
      setActiveStepIndex(activeSteps.length - 1);
    }
  }, [activeSteps.length, activeStepIndex]);

  const currentStepConfig = activeSteps[activeStepIndex] || activeSteps[0];

  const updateContext = useCallback((updates: Partial<T>) => {
    setContext((prev) => ({ ...prev, ...updates }));
    setIsDirty(true);
  }, []);

  const handleNext = async () => {
    if (!currentStepConfig || isSubmitting) return;

    if (currentStepConfig.validate) {
      const isValid = await currentStepConfig.validate(context);
      if (!isValid) return;
    }

    if (activeStepIndex < activeSteps.length - 1) {
      setActiveStepIndex((prev) => prev + 1);
    } else {
      // Final submission
      try {
        setIsSubmitting(true);
        const result = await onSubmit(context);
        setIsDirty(false);
        if (onSuccess) onSuccess(result);
      } catch (err) {
        console.error('Workflow submission error:', err);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleBack = () => {
    if (activeStepIndex > 0 && !isSubmitting) {
      setActiveStepIndex((prev) => prev - 1);
    }
  };

  const handleRequestClose = () => {
    if (isDirty) {
      setShowUnsavedDialog(true);
    } else {
      onClose();
    }
  };

  // Keyboard navigation: Enter to continue, Esc to request close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleRequestClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDirty, onClose]);

  if (!isOpen) return null;

  const progressSteps: WorkflowProgressStep[] = activeSteps.map((s) => ({
    id: s.id,
    label: s.title,
    description: s.description,
    isOptional: s.isOptional,
  }));

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        className={cn(
          'relative w-full my-auto bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden transition-all',
          maxWidthClassName,
          className
        )}
      >
        {/* Header */}
        <WorkflowHeader
          title={title}
          badge={badge}
          description={description}
          illustration={illustration}
          onClose={handleRequestClose}
        />

        {/* Progress Bar */}
        <WorkflowProgress
          steps={progressSteps}
          activeStepIndex={activeStepIndex}
          onStepClick={(stepIdx) => setActiveStepIndex(stepIdx)}
        />

        {/* Step Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 sm:py-7">
          <AnimatePresence mode="wait">
            {currentStepConfig && (
              <div key={currentStepConfig.id} className="w-full">
                {currentStepConfig.component({
                  context,
                  updateContext,
                  onNext: handleNext,
                  onBack: handleBack,
                })}
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation Footer */}
        <WorkflowNavigation
          currentStepIndex={activeStepIndex}
          totalSteps={activeSteps.length}
          onBack={handleBack}
          onNext={handleNext}
          onCancel={handleRequestClose}
          isLoading={isSubmitting}
        />
      </div>

      {/* Unsaved changes dialog */}
      <UnsavedChangesDialog
        isOpen={showUnsavedDialog}
        onConfirmDiscard={() => {
          setShowUnsavedDialog(false);
          setIsDirty(false);
          onClose();
        }}
        onCancelKeepEditing={() => setShowUnsavedDialog(false)}
      />
    </div>
  );
}
