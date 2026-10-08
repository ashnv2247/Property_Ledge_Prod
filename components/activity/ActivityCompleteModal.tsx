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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-surface dark:bg-[#0B1320] border border-border dark:border-[#1E293B] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/80 dark:border-[#1E293B]/80 bg-surface-subtle dark:bg-[#0E1726]/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground dark:text-white">
                Complete Activity
              </h3>
              <p className="text-xs text-muted dark:text-slate-400 truncate max-w-xs">
                {activityTitle || (item as any).title || 'Property Activity'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-muted hover:text-foreground dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Due vs Actual Date Comparison */}
          <div className="grid grid-cols-2 gap-4 p-3.5 rounded-xl bg-slate-50 dark:bg-[#080D1A] border border-slate-200/80 dark:border-[#1E2D4A]/80">
            <div>
              <span className="text-[11px] font-medium text-muted dark:text-slate-400 block mb-0.5">
                Scheduled Due Date
              </span>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground dark:text-slate-200">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{dueDate ? format(parseISO(dueDate), 'dd MMM yyyy') : '—'}</span>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-medium text-muted dark:text-slate-400 block mb-0.5">
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
            <label className="text-xs font-semibold text-foreground dark:text-slate-300">
              Actual Completion Date
            </label>
            <div className="relative">
              <input
                type="date"
                required
                value={completionDate}
                onChange={(e) => setCompletionDate(e.target.value)}
                className="w-full bg-surface dark:bg-[#080D1A] border border-border dark:border-[#1E2D4A] rounded-xl px-3.5 py-2.5 text-xs text-foreground dark:text-slate-100 focus:outline-none focus:border-[#008F83] focus:ring-2 focus:ring-[#008F83]/15 transition-all"
              />
            </div>
            <p className="text-[11px] text-muted dark:text-slate-500">
              Defaults to today. Adjust if you are recording a historical completion.
            </p>
          </div>

          {/* Completion Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground dark:text-slate-300">
              Completion Notes <span className="text-muted dark:text-slate-500 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Routine inspection completed with tenant present. Smoke alarms tested OK."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-surface dark:bg-[#080D1A] border border-border dark:border-[#1E2D4A] rounded-xl px-3.5 py-2 text-xs text-foreground dark:text-slate-100 placeholder:text-muted dark:placeholder:text-slate-500 focus:outline-none focus:border-[#008F83] focus:ring-2 focus:ring-[#008F83]/15 resize-none transition-all"
            />
          </div>

          {/* Recurrence Autopilot Preview */}
          {isRecurring && nextDueDatePreview && (
            <div className="p-3 rounded-xl bg-teal-500/5 dark:bg-[#008F83]/10 border border-teal-500/20 dark:border-[#008F83]/30 flex items-start gap-3">
              <RotateCw className="w-4 h-4 text-[#008F83] dark:text-[#32D5C4] shrink-0 mt-0.5" />
              <div className="space-y-0.5 text-xs">
                <span className="font-semibold text-foreground dark:text-slate-200">
                  Automatic Next Occurrence (Autopilot)
                </span>
                <p className="text-[11px] text-muted dark:text-slate-400">
                  {formatRecurrenceLabel(recurrenceFrequency, recurrenceInterval)}. The next occurrence will automatically be scheduled for{' '}
                  <strong className="text-foreground dark:text-white">
                    {format(parseISO(nextDueDatePreview), 'dd MMMM yyyy')}
                  </strong>
                  .
                </p>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/60 dark:border-[#1E293B]/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              loading={isSubmitting}
              className="bg-[#008F83] hover:bg-[#007A70] text-white font-semibold"
            >
              Mark Complete
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
