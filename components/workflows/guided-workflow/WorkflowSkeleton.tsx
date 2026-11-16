'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface WorkflowSkeletonProps {
  className?: string;
}

export function WorkflowSkeleton({ className }: WorkflowSkeletonProps) {
  return (
    <div className={cn('p-6 space-y-6 w-full animate-pulse', className)} aria-label="Loading workflow...">
      {/* Question skeleton */}
      <div className="space-y-2">
        <div className="h-6 w-1/2 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        <div className="h-4 w-3/4 bg-slate-100 dark:bg-slate-800/60 rounded-md" />
      </div>

      {/* Choice cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 bg-slate-50/50 dark:bg-slate-900/30"
          >
            <div className="h-32 bg-slate-200/70 dark:bg-slate-800 rounded-xl" />
            <div className="h-5 w-2/3 bg-slate-200 dark:bg-slate-800 rounded-md" />
            <div className="h-4 w-full bg-slate-100 dark:bg-slate-800/50 rounded-md" />
            <div className="h-4 w-4/5 bg-slate-100 dark:bg-slate-800/50 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
