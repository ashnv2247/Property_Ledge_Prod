'use client';

import React from 'react';
import { AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/admin/ui';
import { cn } from '@/lib/utils';

export interface UnsavedChangesDialogProps {
  isOpen: boolean;
  onConfirmDiscard: () => void;
  onCancelKeepEditing: () => void;
  title?: string;
  description?: string;
}

export function UnsavedChangesDialog({
  isOpen,
  onConfirmDiscard,
  onCancelKeepEditing,
  title = 'Unsaved changes',
  description = 'You have entered information in this workflow. If you close now, your unsaved progress will be lost. Are you sure you want to discard your changes?',
}: UnsavedChangesDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="unsaved-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 animate-in zoom-in-95 duration-150">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-500 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3
              id="unsaved-dialog-title"
              className="font-bold text-base text-slate-900 dark:text-white"
            >
              {title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancelKeepEditing}
          >
            Keep editing
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onConfirmDiscard}
            className="bg-rose-600 hover:bg-rose-700 text-white"
          >
            Discard changes
          </Button>
        </div>
      </div>
    </div>
  );
}
