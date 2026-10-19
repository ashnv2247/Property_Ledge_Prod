'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Pause, Play, StopCircle, Rocket, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/admin/ui';

export type AutopilotConfirmationType = 'initialize' | 'pause' | 'resume' | 'stop';

interface AutopilotConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  type: AutopilotConfirmationType;
  propertyName: string;
  activitiesCount?: number;
  activityTitles?: string[];
  isLoading?: boolean;
}

export function AutopilotConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  type,
  propertyName,
  activitiesCount = 0,
  activityTitles = [],
  isLoading = false,
}: AutopilotConfirmationModalProps) {
  if (!isOpen) return null;

  const config = {
    initialize: {
      title: 'Initialize Autopilot?',
      description: `You are about to activate automated management for ${propertyName}.`,
      details: `This will activate ${activitiesCount} selected ${activitiesCount === 1 ? 'activity' : 'activities'} (${activityTitles.slice(0, 3).join(', ')}${activityTitles.length > 3 ? ` +${activityTitles.length - 3} more` : ''}) and schedule their eligible upcoming runs. You can pause or adjust them at any time.`,
      confirmButtonText: 'Initialize Autopilot',
      cancelButtonText: 'Review Configuration',
      icon: Rocket,
      iconBg: 'bg-blue-100 text-[#008F83] dark:bg-[#008F83]/20 dark:text-[#32D5C4]',
      confirmButtonClass: 'bg-[#008F83] hover:bg-[#007A70] text-white',
    },
    pause: {
      title: 'Pause Autopilot?',
      description: `Suspend scheduled automation for ${propertyName}.`,
      details: 'Future eligible scheduled executions will be suspended. All existing tasks, condition reports, schedules, and complete history remain safely preserved. You can resume at any time.',
      confirmButtonText: 'Pause Autopilot',
      cancelButtonText: 'Keep Active',
      icon: Pause,
      iconBg: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400',
      confirmButtonClass: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
    resume: {
      title: 'Resume Autopilot?',
      description: `Re-enable automated scheduling for ${propertyName}.`,
      details: 'Eligible scheduled activities will be enabled again according to their recurrence rules. Overdue tasks are scheduled safely to prevent burst executions.',
      confirmButtonText: 'Resume Autopilot',
      cancelButtonText: 'Cancel',
      icon: Play,
      iconBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400',
      confirmButtonClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    },
    stop: {
      title: 'Stop Autopilot?',
      description: `Permanently stop Autopilot automations for ${propertyName}.`,
      details: 'Future automation will stop. Previously completed tasks, condition reports, and execution logs will remain in your history. Reactivation will require manual configuration.',
      confirmButtonText: 'Stop Autopilot',
      cancelButtonText: 'Keep Autopilot',
      icon: StopCircle,
      iconBg: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400',
      confirmButtonClass: 'bg-rose-600 hover:bg-rose-700 text-white',
    },
  }[type];

  const Icon = config.icon;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={isLoading ? undefined : onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
          aria-hidden="true"
        />

        {/* Modal dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirmation-modal-title"
          className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-7 z-10 text-slate-900 dark:text-slate-100 overflow-hidden"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="absolute top-5 right-5 p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-[#008F83]/30 disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl shrink-0 ${config.iconBg}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div className="flex-1 pr-6">
              <h3 id="confirmation-modal-title" className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {config.title}
              </h3>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-1">
                {config.description}
              </p>
              <div className="mt-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {config.details}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-50 cursor-pointer"
            >
              {config.cancelButtonText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 cursor-pointer ${config.confirmButtonClass}`}
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {config.confirmButtonText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
