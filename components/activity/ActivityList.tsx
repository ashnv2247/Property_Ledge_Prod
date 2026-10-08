'use client';

import React from 'react';
import { format, parseISO, isValid } from 'date-fns';
import {
  Calendar,
  Clock,
  User,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Home,
  TrendingUp,
  FileText,
  ShieldCheck,
  FileCheck2,
  Wrench,
  UserCheck,
  CheckSquare,
  MessageSquare,
  ChevronRight,
  MoreVertical,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActivityBoardItem } from '@/types/activity';

interface ActivityListProps {
  items: ActivityBoardItem[];
  onCardClick: (item: ActivityBoardItem) => void;
  onCompleteClick: (item: ActivityBoardItem) => void;
  onArchiveClick: (item: ActivityBoardItem) => void;
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  inspection: Home,
  rent_review: TrendingUp,
  lease_expiry: FileText,
  insurance_renewal: ShieldCheck,
  lease_renewal: FileCheck2,
  repair: Wrench,
  maintenance: Wrench,
  tenant_issue: UserCheck,
  other: CheckSquare,
};

export function ActivityList({
  items,
  onCardClick,
  onCompleteClick,
  onArchiveClick,
}: ActivityListProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 bg-surface dark:bg-[#0E1626] border border-border dark:border-[#1E2D4A] rounded-2xl text-center">
        <CheckSquare className="w-8 h-8 text-muted dark:text-slate-500 mb-2" />
        <h4 className="text-sm font-semibold text-foreground dark:text-white">
          No activities found
        </h4>
        <p className="text-xs text-muted dark:text-slate-400 max-w-sm mt-1">
          No activities match your current search and filters.
        </p>
      </div>
    );
  }

  const renderStatusBadge = (item: ActivityBoardItem) => {
    if (item.status === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3" />
          Completed
        </span>
      );
    }

    if (item.status === 'in_progress') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
          In Progress
        </span>
      );
    }

    if (item.isOverdue) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
          <AlertTriangle className="w-3 h-3" />
          {item.daysOverdue}d Overdue
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
        Due
      </span>
    );
  };

  return (
    <div className="w-full overflow-hidden bg-surface dark:bg-[#0B1320] border border-border dark:border-[#1E293B] rounded-2xl shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-foreground dark:text-slate-200">
          <thead className="bg-surface-subtle dark:bg-[#0E1726]/80 text-[11px] uppercase tracking-wider text-muted dark:text-slate-400 font-semibold border-b border-border dark:border-[#1E293B]">
            <tr>
              <th className="px-4 py-3">Activity</th>
              <th className="px-4 py-3">Property</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Due Date</th>
              <th className="px-4 py-3">Responsible</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 dark:divide-[#1E293B]/60">
            {items.map((item) => {
              const Icon = TYPE_ICONS[item.activityTypeId] || CheckSquare;
              const isCompleted = item.status === 'completed';

              return (
                <tr
                  key={item.id}
                  onClick={() => onCardClick(item)}
                  className="hover:bg-slate-50 dark:hover:bg-[#111C30] transition-colors cursor-pointer group"
                >
                  {/* Title & Recurrence */}
                  <td className="px-4 py-3 font-semibold">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'line-clamp-1 max-w-xs',
                          isCompleted && 'line-through text-muted dark:text-slate-500'
                        )}
                      >
                        {item.title}
                      </span>
                      {item.isAutoCreated && (
                        <span
                          title={item.autoSource ? `Auto Created via ${item.autoSource}` : 'Automatically generated by Autopilot'}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-[#008F83]/10 text-[#008F83] dark:text-[#32D5C4] border border-[#008F83]/25 shrink-0"
                        >
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>Auto</span>
                        </span>
                      )}
                      {item.isRecurring && (
                        <span className="p-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                          <RotateCw className="w-2.5 h-2.5" />
                        </span>
                      )}
                      {item.commentCount > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-muted dark:text-slate-400">
                          <MessageSquare className="w-2.5 h-2.5" />
                          {item.commentCount}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Property */}
                  <td className="px-4 py-3 text-muted dark:text-slate-400 font-medium">
                    <div className="flex items-center gap-1.5 truncate max-w-[180px]">
                      <Home className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{item.propertyName}</span>
                    </div>
                  </td>

                  {/* Type */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 text-[#008F83] dark:text-[#32D5C4] shrink-0" />
                      <span>{item.activityTypeName}</span>
                    </div>
                  </td>

                  {/* Due Date */}
                  <td className="px-4 py-3 whitespace-nowrap font-medium">
                    {item.dueDate ? format(parseISO(item.dueDate), 'dd MMM yyyy') : '—'}
                  </td>

                  {/* Responsible Person */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {item.assignedToName ? (
                        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[#008F83]/15 text-[#008F83] dark:text-[#32D5C4] border border-[#008F83]/30 text-[10px] font-bold uppercase">
                          {item.assignedToName.charAt(0)}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 text-[10px]">
                          <User className="w-3 h-3" />
                        </div>
                      )}
                      <span className="truncate max-w-[120px]">
                        {item.assignedToName || 'Unassigned'}
                      </span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 whitespace-nowrap">{renderStatusBadge(item)}</td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {!isCompleted && (
                        <button
                          type="button"
                          onClick={() => onCompleteClick(item)}
                          className="px-2 py-1 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors"
                        >
                          Complete
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onCardClick(item)}
                        className="p-1 rounded-md text-muted hover:text-foreground dark:text-slate-400 dark:hover:text-white"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
