'use client';

import React from 'react';
import { format, parseISO } from 'date-fns';
import { Sparkles, Check, X, Calendar, Home, RotateCw, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { ActivityBoardItem } from '@/types/activity';

interface ActivityReviewQueueProps {
  draftItems: ActivityBoardItem[];
  onActivate: (item: ActivityBoardItem) => Promise<void>;
  onDismiss: (item: ActivityBoardItem) => Promise<void>;
  onReviewClick: (item: ActivityBoardItem) => void;
}

export function ActivityReviewQueue({
  draftItems,
  onActivate,
  onDismiss,
  onReviewClick,
}: ActivityReviewQueueProps) {
  if (draftItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 bg-surface dark:bg-[#0B1320] border border-border dark:border-[#1E293B] rounded-2xl text-center">
        <Sparkles className="w-8 h-8 text-[#008F83] dark:text-[#32D5C4] mb-2" />
        <h4 className="text-sm font-semibold text-foreground dark:text-white">
          No suggested activities pending review
        </h4>
        <p className="text-xs text-muted dark:text-slate-400 max-w-sm mt-1">
          When Property Autopilot detects upcoming lease events, rent reviews, or mandatory compliance checks, they will appear here for one-click activation.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground dark:text-white">
            Autopilot Suggestions ({draftItems.length})
          </h3>
          <p className="text-xs text-muted dark:text-slate-400">
            Review and activate suggested property activities before they enter the active workflow.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {draftItems.map((item) => (
          <div
            key={item.id}
            className="p-4 rounded-2xl bg-surface dark:bg-[#0E1626] border border-border dark:border-[#1E2D4A] space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <Sparkles className="w-3 h-3" />
                  Suggested Draft
                </span>
                <span className="text-[11px] text-muted dark:text-slate-400">
                  {item.activityTypeName}
                </span>
              </div>

              <h4 className="text-xs font-bold text-foreground dark:text-white line-clamp-2">
                {item.title}
              </h4>

              <div className="flex items-center gap-1.5 text-xs text-muted dark:text-slate-400">
                <Home className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{item.propertyName}</span>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-foreground/80 dark:text-slate-300 font-medium">
                <Calendar className="w-3.5 h-3.5 text-[#008F83] shrink-0" />
                <span>Suggested Date: {format(parseISO(item.dueDate), 'dd MMM yyyy')}</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/60 dark:border-[#1E2D4A]/60">
              <button
                type="button"
                onClick={() => onDismiss(item)}
                className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                Dismiss
              </button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onReviewClick(item)}
                >
                  Review
                </Button>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={() => onActivate(item)}
                  className="bg-[#008F83] hover:bg-[#007A70] text-white font-semibold"
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Make Live
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
