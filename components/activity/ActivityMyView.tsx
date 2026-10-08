'use client';

import React from 'react';
import { Clock, AlertTriangle, PlayCircle, Calendar, CheckCircle2 } from 'lucide-react';
import { ActivityCard } from '@/components/activity/ActivityCard';
import type { ActivityBoardItem } from '@/types/activity';

interface ActivityMyViewProps {
  items: ActivityBoardItem[];
  onCardClick: (item: ActivityBoardItem) => void;
  onCompleteClick: (item: ActivityBoardItem) => void;
  onArchiveClick: (item: ActivityBoardItem) => void;
}

export function ActivityMyView({
  items,
  onCardClick,
  onCompleteClick,
  onArchiveClick,
}: ActivityMyViewProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueTodayItems = items.filter((i) => {
    if (i.status === 'completed') return false;
    const due = new Date(i.dueDate);
    due.setHours(0, 0, 0, 0);
    return due.getTime() === today.getTime() && !i.isOverdue;
  });

  const overdueItems = items.filter((i) => i.isOverdue && i.status !== 'completed');

  const inProgressItems = items.filter(
    (i) => i.status === 'in_progress' && !i.isOverdue && dueTodayItems.every((d) => d.id !== i.id)
  );

  const upcomingItems = items.filter((i) => {
    if (i.status === 'completed' || i.isOverdue) return false;
    const due = new Date(i.dueDate);
    due.setHours(0, 0, 0, 0);
    return due.getTime() > today.getTime() && i.status !== 'in_progress';
  });

  const completedItems = items.filter((i) => i.status === 'completed');

  const SECTIONS = [
    {
      id: 'overdue',
      title: 'Overdue Activities',
      items: overdueItems,
      icon: AlertTriangle,
      color: 'text-rose-500',
    },
    {
      id: 'today',
      title: 'Due Today',
      items: dueTodayItems,
      icon: Clock,
      color: 'text-amber-500',
    },
    {
      id: 'in_progress',
      title: 'In Progress',
      items: inProgressItems,
      icon: PlayCircle,
      color: 'text-blue-500',
    },
    {
      id: 'upcoming',
      title: 'Upcoming',
      items: upcomingItems,
      icon: Calendar,
      color: 'text-slate-400',
    },
    {
      id: 'completed',
      title: 'Completed',
      items: completedItems,
      icon: CheckCircle2,
      color: 'text-emerald-500',
    },
  ];

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 bg-surface dark:bg-[#0B1320] border border-border dark:border-[#1E293B] rounded-2xl text-center">
        <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
        <h4 className="text-sm font-semibold text-foreground dark:text-white">
          You're all caught up!
        </h4>
        <p className="text-xs text-muted dark:text-slate-400 max-w-sm mt-1">
          No activities are currently assigned to you across your active properties.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {SECTIONS.map((section) => {
        if (section.items.length === 0) return null;
        const Icon = section.icon;

        return (
          <div key={section.id} className="space-y-3">
            <div className="flex items-center gap-2">
              <Icon className={`w-4 h-4 ${section.color}`} />
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground dark:text-slate-200">
                {section.title} ({section.items.length})
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {section.items.map((item) => (
                <ActivityCard
                  key={item.id}
                  item={item}
                  onClick={onCardClick}
                  onCompleteClick={onCompleteClick}
                  onArchiveClick={onArchiveClick}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
