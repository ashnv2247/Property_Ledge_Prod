'use client';

import React, { useState } from 'react';
import { Clock, AlertTriangle, PlayCircle, Calendar, CheckCircle2, ChevronDown, ChevronUp, Pin } from 'lucide-react';
import { ActivityCard } from '@/components/activity/ActivityCard';
import type { ActivityBoardItem } from '@/types/activity';

interface ActivityMyViewProps {
  items: ActivityBoardItem[];
  onCardClick: (item: ActivityBoardItem) => void;
  onCompleteClick: (item: ActivityBoardItem) => void;
  onArchiveClick: (item: ActivityBoardItem) => void;
  onTogglePin?: (item: ActivityBoardItem) => void;
  pinningIds?: Set<string>;
}

export function ActivityMyView({
  items,
  onCardClick,
  onCompleteClick,
  onArchiveClick,
  onTogglePin,
  pinningIds,
}: ActivityMyViewProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    pinned: true,
    overdue: true,
    today: true,
    in_progress: true,
    upcoming: true,
    completed: false,
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sortByPinned = (a: ActivityBoardItem, b: ActivityBoardItem) => {
    const aPinned = Boolean(a.isPinned);
    const bPinned = Boolean(b.isPinned);
    if (aPinned !== bPinned) return aPinned ? -1 : 1;
    const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
    const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
    if (dateA !== dateB) return dateA - dateB;
    return a.id.localeCompare(b.id);
  };

  const pinnedItems = items
    .filter((i) => i.isPinned && i.status !== 'completed')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const dueTodayItems = items
    .filter((i) => {
      if (i.status === 'completed') return false;
      const due = new Date(i.dueDate);
      due.setHours(0, 0, 0, 0);
      return due.getTime() === today.getTime() && !i.isOverdue;
    })
    .sort(sortByPinned);

  const overdueItems = items
    .filter((i) => i.isOverdue && i.status !== 'completed')
    .sort(sortByPinned);

  const inProgressItems = items
    .filter(
      (i) => i.status === 'in_progress' && !i.isOverdue && dueTodayItems.every((d) => d.id !== i.id)
    )
    .sort(sortByPinned);

  const upcomingItems = items
    .filter((i) => {
      if (i.status === 'completed' || i.isOverdue) return false;
      const due = new Date(i.dueDate);
      due.setHours(0, 0, 0, 0);
      return due.getTime() > today.getTime() && i.status !== 'in_progress';
    })
    .sort(sortByPinned);

  const completedItems = items
    .filter((i) => i.status === 'completed')
    .sort(sortByPinned);

  const SECTIONS = [
    {
      id: 'pinned',
      title: 'Pinned Activities',
      items: pinnedItems,
      icon: Pin,
      color: 'text-amber-500',
    },
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

  const activeSections = SECTIONS.filter((s) => s.items.length > 0);
  const allExpanded = activeSections.every((s) => expandedSections[s.id] !== false);

  const handleToggleExpandAll = () => {
    const nextValue = !allExpanded;
    const newMap: Record<string, boolean> = {};
    activeSections.forEach((s) => {
      newMap[s.id] = nextValue;
    });
    setExpandedSections((prev) => ({ ...prev, ...newMap }));
  };

  const handleToggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: prev[sectionId] !== undefined ? !prev[sectionId] : false,
    }));
  };

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
      {activeSections.length > 1 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleToggleExpandAll}
            className="text-xs font-semibold text-[#008F83] dark:text-[#32D5C4] hover:underline cursor-pointer"
          >
            {allExpanded ? 'Collapse All Sections' : 'Expand All Sections'}
          </button>
        </div>
      )}

      {activeSections.map((section) => {
        const Icon = section.icon;
        const isExpanded = expandedSections[section.id] !== false;

        return (
          <div key={section.id} className="space-y-3">
            <button
              type="button"
              onClick={() => handleToggleSection(section.id)}
              className="flex items-center justify-between w-full p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer text-left select-none"
            >
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${section.color}`} />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground dark:text-slate-200">
                  {section.title}
                </h3>
                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {section.items.length}
                </span>
              </div>
              <div className="text-muted dark:text-slate-400">
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </div>
            </button>

            {isExpanded && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {section.items.map((item) => (
                  <ActivityCard
                    key={item.id}
                    item={item}
                    onClick={onCardClick}
                    onCompleteClick={onCompleteClick}
                    onArchiveClick={onArchiveClick}
                    onTogglePin={onTogglePin}
                    isPinning={pinningIds?.has(item.activityId)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
