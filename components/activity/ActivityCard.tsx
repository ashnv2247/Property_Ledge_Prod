'use client';

import React, { useState } from 'react';
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
  MoreVertical,
  Trash2,
  Archive,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRecurrenceLabel } from '@/lib/activity/recurrence';
import type { ActivityBoardItem } from '@/types/activity';

interface ActivityCardProps {
  item: ActivityBoardItem;
  onClick: (item: ActivityBoardItem) => void;
  onCompleteClick?: (item: ActivityBoardItem) => void;
  onArchiveClick?: (item: ActivityBoardItem) => void;
  isDragging?: boolean;
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

const TYPE_COLORS: Record<string, string> = {
  inspection: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
  rent_review: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  lease_expiry: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  insurance_renewal: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  lease_renewal: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
  repair: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  maintenance: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
  tenant_issue: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  other: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
};

export function ActivityCard({
  item,
  onClick,
  onCompleteClick,
  onArchiveClick,
  isDragging,
}: ActivityCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const Icon = TYPE_ICONS[item.activityTypeId] || CheckSquare;
  const colorClass = TYPE_COLORS[item.activityTypeId] || TYPE_COLORS.other;

  const isCompleted = item.status === 'completed';

  // Format Due Date Semantics
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDateObj = parseISO(item.dueDate);
  dueDateObj.setHours(0, 0, 0, 0);

  const diffDays = isValid(dueDateObj)
    ? Math.floor((dueDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const renderDueBadge = () => {
    if (isCompleted) {
      return (
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>
            {item.completedAt ? format(parseISO(item.completedAt), 'dd MMM') : 'Completed'}
          </span>
          {item.daysLate > 0 && (
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
              · {item.daysLate}d late
            </span>
          )}
        </div>
      );
    }

    if (item.isOverdue) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 animate-pulse">
          <AlertTriangle className="w-3 h-3" />
          {item.daysOverdue} {item.daysOverdue === 1 ? 'day' : 'days'} overdue
        </span>
      );
    }

    if (diffDays === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          <Clock className="w-3 h-3" />
          Due today
        </span>
      );
    }

    if (diffDays === 1) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20">
          <Clock className="w-3 h-3" />
          Due tomorrow
        </span>
      );
    }

    if (diffDays > 1 && diffDays <= 5) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-[#152238] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#223555]">
          <Calendar className="w-3 h-3 text-slate-400" />
          Due in {diffDays} days
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted dark:text-slate-400">
        <Calendar className="w-3 h-3" />
        Due {isValid(dueDateObj) ? format(dueDateObj, 'dd MMM') : item.dueDate}
      </span>
    );
  };

  return (
    <div
      onClick={() => onClick(item)}
      className={cn(
        'group relative flex flex-col justify-between p-3.5 rounded-2xl border transition-all duration-150 cursor-pointer select-none text-left',
        isCompleted
          ? 'bg-surface/60 dark:bg-[#080D1A]/60 border-border/60 dark:border-[#17243A]/60 opacity-80 hover:opacity-100 hover:border-border dark:hover:border-[#1E2D4A]'
          : 'bg-surface dark:bg-[#0E1626] border-border dark:border-[#1E2D4A] hover:border-[#008F83]/70 dark:hover:border-[#008F83]/60 shadow-xs hover:shadow-md dark:shadow-none hover:-translate-y-0.5',
        isDragging && 'opacity-50 ring-2 ring-[#008F83]'
      )}
    >
      {/* Top row: Type badge & Auto indicator & Recurrence & Action Menu */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold border shrink-0',
              colorClass
            )}
          >
            <Icon className="w-3 h-3" />
            <span className="truncate max-w-[110px]">{item.activityTypeName}</span>
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
            <span
              title={formatRecurrenceLabel(item.recurrenceFrequency, item.recurrenceInterval)}
              className="inline-flex items-center p-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0"
            >
              <RotateCw className="w-2.5 h-2.5" />
            </span>
          )}
        </div>

        {/* Action Menu */}
        <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded-md text-muted hover:text-foreground dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors opacity-0 group-hover:opacity-100"
            aria-label="Activity options"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-6 z-30 w-44 bg-surface dark:bg-[#0B1320] border border-border dark:border-[#1E293B] rounded-xl shadow-xl py-1 text-xs text-foreground dark:text-slate-200 animate-in fade-in zoom-in-95 duration-100">
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  onClick(item);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
              >
                <span>View Details</span>
              </button>

              {!isCompleted && onCompleteClick && (
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onCompleteClick(item);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mark Complete</span>
                </button>
              )}

              {onArchiveClick && (
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onArchiveClick(item);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 text-muted dark:text-slate-400"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>Archive</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Title */}
      <h4
        className={cn(
          'text-xs font-semibold leading-snug mb-2 line-clamp-2',
          isCompleted
            ? 'text-muted dark:text-slate-400 line-through'
            : 'text-foreground dark:text-white'
        )}
      >
        {item.title}
      </h4>

      {/* Property Context */}
      <div className="flex items-center gap-1 text-[11px] text-muted dark:text-slate-400 mb-3 truncate">
        <Home className="w-3 h-3 text-slate-400 shrink-0" />
        <span className="truncate font-medium text-foreground/80 dark:text-slate-300">
          {item.propertyName}
        </span>
      </div>

      {/* Card Footer: Due state, Assignee, Comments count */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50 dark:border-[#1E2D4A]/50">
        <div>{renderDueBadge()}</div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Comments Bubble */}
          {item.commentCount > 0 && (
            <div className="flex items-center gap-1 text-[11px] text-muted dark:text-slate-400 font-medium">
              <MessageSquare className="w-3 h-3" />
              <span>{item.commentCount}</span>
            </div>
          )}

          {/* Assignee Avatar */}
          {item.assignedToName ? (
            <div
              title={`Assigned to: ${item.assignedToName}`}
              className="flex items-center justify-center w-5 h-5 rounded-full bg-[#008F83]/15 text-[#008F83] dark:text-[#32D5C4] border border-[#008F83]/30 text-[10px] font-bold shrink-0 uppercase"
            >
              {item.assignedToName.charAt(0)}
            </div>
          ) : (
            <div
              title="Unassigned"
              className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 text-[10px] shrink-0"
            >
              <User className="w-3 h-3" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
