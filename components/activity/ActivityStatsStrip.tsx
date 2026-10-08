'use client';

import React from 'react';
import {
  Clock,
  AlertTriangle,
  PlayCircle,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActivityStats } from '@/types/activity';

interface ActivityStatsStripProps {
  stats?: ActivityStats;
  onFilterClick?: (status: string) => void;
}

export function ActivityStatsStrip({ stats, onFilterClick }: ActivityStatsStripProps) {
  if (!stats) return null;

  const STATS_CARDS = [
    {
      id: 'due',
      label: 'Due Today / Soon',
      value: stats.dueTodayCount + stats.dueSoonCount,
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-500/10 dark:bg-amber-500/10 border-amber-500/20',
    },
    {
      id: 'overdue',
      label: 'Overdue',
      value: stats.overdueCount,
      icon: AlertTriangle,
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-500/10 dark:bg-rose-500/10 border-rose-500/20',
      urgent: stats.overdueCount > 0,
    },
    {
      id: 'in_progress',
      label: 'In Progress',
      value: stats.inProgressCount,
      icon: PlayCircle,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-500/10 dark:bg-blue-500/10 border-blue-500/20',
    },
    {
      id: 'upcoming',
      label: 'Upcoming',
      value: stats.upcomingCount,
      icon: Calendar,
      color: 'text-slate-600 dark:text-slate-400',
      bg: 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800',
    },
    {
      id: 'completed',
      label: 'Completed',
      value: stats.completedCount,
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/10 border-emerald-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {STATS_CARDS.map((card) => {
        const Icon = card.icon;
        return (
          <button
            key={card.id}
            type="button"
            onClick={() => onFilterClick?.(card.id)}
            className={cn(
              'flex items-center justify-between p-3 rounded-xl border text-left transition-all hover:scale-[1.01] cursor-pointer',
              'bg-surface dark:bg-[#0B1320] border-border dark:border-[#1E293B]',
              card.urgent && 'ring-1 ring-rose-500/30'
            )}
          >
            <div>
              <span className="text-[11px] font-semibold text-muted dark:text-slate-400 block mb-0.5">
                {card.label}
              </span>
              <span className="text-lg font-bold text-foreground dark:text-white tracking-tight">
                {card.value}
              </span>
            </div>

            <div
              className={cn(
                'w-8 h-8 rounded-lg border flex items-center justify-center shrink-0',
                card.bg,
                card.color
              )}
            >
              <Icon className="w-4 h-4" />
            </div>
          </button>
        );
      })}
    </div>
  );
}
