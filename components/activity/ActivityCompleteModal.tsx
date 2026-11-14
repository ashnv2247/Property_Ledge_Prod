'use client';

import React, { useState } from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { CheckCircle2, Calendar, AlertTriangle, Clock, X, ArrowRight, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { calculateOverdueAndLate, calculateNextDueDate, formatRecurrenceLabel } from '@/lib/activity/recurrence';
import type { ActivityBoardItem, ActivityDetailData } from '@/types/activity';

interface ActivityCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ActivityBoardItem | ActivityDetailData['currentOccurrence'] | null;
  activityTitle?: string;
  isRecurring?: boolean;
  recurrenceFrequency?: any;
  recurrenceInterval?: number;
  onConfirm: (completionDate: string, completionNotes: string) => Promise<void>;
}

export function ActivityCompleteModal({
  isOpen,
  onClose,
  item,
  activityTitle,
  isRecurring,
  recurrenceFrequency,
  recurrenceInterval = 1,
  onConfirm,
}: ActivityCompleteModalProps) {
  const [completionDate, setCompletionDate] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen || !item) return null;

  const dueDate = item.dueDate || (item as any).due_date || format(new Date(), 'yyyy-MM-dd');
  const { daysLate } = calculateOverdueAndLate(dueDate, 'completed', completionDate);

  const nextDueDatePreview = isRecurring && recurrenceFrequency
    ? calculateNextDueDate(dueDate, recurrenceFrequency, recurrenceInterval)
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await onConfirm(completionDate, notes);
      onClose();
    } catch (error) {
      console.error('Failed to complete activity:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto font-sans animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-y-auto max-h-[92vh] z-10 p-6 sm:p-8 my-auto">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          aria-label="Close dialog"
          className="absolute top-5 right-5 p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-[#008F83]/30"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Centered Header (Standardized Reference UI) */}
        <div className="text-center mb-6">
          <h2 className="text-xl sm:text-2xl font-bold font-heading tracking-tight text-slate-900 dark:text-white">
            Complete Activity
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 truncate">
            {activityTitle || (item as any).title || 'Property Activity'}
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Due vs Actual Date Comparison */}
          <div className="grid grid-cols-2 gap-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-0.5">
                Scheduled Due Date
              </span>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-200">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{dueDate ? format(parseISO(dueDate), 'dd MMM yyyy') : '—'}</span>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-0.5">
                Completion Status
              </span>
              <div>
                {daysLate > 0 ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    <AlertTriangle className="w-3 h-3" />
                    {daysLate} {daysLate === 1 ? 'day' : 'days'} late
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" />
                    On time
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actual Completion Date Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Actual Completion Date
            </label>
            <input
              type="date"
              required
              value={completionDate}
              onChange={(e) => setCompletionDate(e.target.value)}
              className="w-full h-11 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#008F83] focus:ring-2 focus:ring-[#008F83]/15 transition-all"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Defaults to today. Adjust if recording a historical completion.
            </p>
          </div>

          {/* Completion Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Completion Notes <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Routine inspection completed with tenant present. Smoke alarms tested OK."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#008F83] focus:ring-2 focus:ring-[#008F83]/15 resize-none transition-all"
            />
          </div>

          {/* Recurrence Autopilot Preview */}
          {isRecurring && nextDueDatePreview && (
            <div className="p-3 rounded-xl bg-teal-500/5 dark:bg-[#008F83]/10 border border-teal-500/20 dark:border-[#008F83]/30 flex items-start gap-3">
              <RotateCw className="w-4 h-4 text-[#008F83] shrink-0 mt-0.5" />
              <div className="space-y-0.5 text-xs">
                <span className="font-semibold text-slate-900 dark:text-slate-200">
                  Automatic Next Occurrence (Autopilot)
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {formatRecurrenceLabel(recurrenceFrequency, recurrenceInterval)}. Next occurrence will be scheduled for{' '}
                  <strong className="text-slate-900 dark:text-white">
                    {format(parseISO(nextDueDatePreview), 'dd MMMM yyyy')}
                  </strong>
                  .
                </p>
              </div>
            </div>
          )}

          {/* Modal Footer Actions (Standardized Reference UI) */}
          <div className="pt-6 mt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-11 px-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#008F83]/30 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-11 px-6 rounded-xl bg-[#008F83] text-white font-semibold text-sm hover:bg-[#008F83]/90 shadow-xs transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#008F83]/30 disabled:opacity-50 min-w-[140px]"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </span>
              ) : (
                'Mark Complete'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
