'use client';

import React, { useState } from 'react';
import {
  Clock,
  Calendar,
  PlayCircle,
  CheckCircle2,
  Plus,
  AlertTriangle,
  FolderOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActivityCard } from '@/components/activity/ActivityCard';
import type { ActivityBoardItem, OccurrenceStatus } from '@/types/activity';

interface ActivityBoardProps {
  items: ActivityBoardItem[];
  onCardClick: (item: ActivityBoardItem) => void;
  onCompleteClick: (item: ActivityBoardItem) => void;
  onArchiveClick: (item: ActivityBoardItem) => void;
  onStatusChange: (occurrenceId: string, newStatus: OccurrenceStatus) => Promise<void>;
  onNewActivityClick?: (defaultStatus?: string) => void;
  allowCreate?: boolean;
}

interface ColumnConfig {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
  headerBg: string;
  filter: (item: ActivityBoardItem) => boolean;
  targetStatus: OccurrenceStatus;
}

export function ActivityBoard({
  items,
  onCardClick,
  onCompleteClick,
  onArchiveClick,
  onStatusChange,
  onNewActivityClick,
  allowCreate = true,
}: ActivityBoardProps) {
  const [draggedItem, setDraggedItem] = useState<ActivityBoardItem | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const COLUMNS: ColumnConfig[] = [
    {
      id: 'upcoming',
      title: 'UPCOMING',
      subtitle: 'Future scheduled activities',
      icon: Calendar,
      color: 'text-slate-600 dark:text-slate-400',
      headerBg: 'bg-slate-100/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800',
      targetStatus: 'open',
      filter: (item) => {
        if (item.status === 'completed' || item.status === 'in_progress') return false;
        // Upcoming = not overdue and diffDays > 3
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(item.dueDate);
        due.setHours(0, 0, 0, 0);
        const diff = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diff > 3;
      },
    },
    {
      id: 'due',
      title: 'DUE & OVERDUE',
      subtitle: 'Immediate attention required',
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
      headerBg: 'bg-amber-500/10 dark:bg-amber-500/10 border-amber-500/20',
      targetStatus: 'open',
      filter: (item) => {
        if (item.status === 'completed' || item.status === 'in_progress') return false;
        // Due = overdue OR due within 3 days
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(item.dueDate);
        due.setHours(0, 0, 0, 0);
        const diff = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diff <= 3 || item.isOverdue;
      },
    },
    {
      id: 'in_progress',
      title: 'IN PROGRESS',
      subtitle: 'Actively being actioned',
      icon: PlayCircle,
      color: 'text-blue-600 dark:text-blue-400',
      headerBg: 'bg-blue-500/10 dark:bg-blue-500/10 border-blue-500/20',
      targetStatus: 'in_progress',
      filter: (item) => item.status === 'in_progress',
    },
    {
      id: 'completed',
      title: 'COMPLETED',
      subtitle: 'Archived & actioned instances',
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400',
      headerBg: 'bg-emerald-500/10 dark:bg-emerald-500/10 border-emerald-500/20',
      targetStatus: 'completed',
      filter: (item) => item.status === 'completed',
    },
  ];

  const handleDragStart = (e: React.DragEvent, item: ActivityBoardItem) => {
    setDraggedItem(item);
    e.dataTransfer.setData('text/plain', item.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== colId) {
      setDragOverColumn(colId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, colId: string) => {
    if (dragOverColumn === colId) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, column: ColumnConfig) => {
    e.preventDefault();
    setDragOverColumn(null);
    const item = draggedItem;
    setDraggedItem(null);

    if (!item) return;

    if (column.id === 'completed') {
      onCompleteClick(item);
      return;
    }

    if (column.targetStatus !== item.status) {
      await onStatusChange(item.id, column.targetStatus);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start pb-12 overflow-x-auto min-w-full">
      {COLUMNS.map((column) => {
        const columnItems = items.filter(column.filter);
        const Icon = column.icon;
        const isTargeted = dragOverColumn === column.id;

        return (
          <div
            key={column.id}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={(e) => handleDragLeave(e, column.id)}
            onDrop={(e) => handleDrop(e, column)}
            className={cn(
              'flex flex-col min-w-[280px] rounded-2xl border transition-all duration-150',
              'bg-surface-subtle/50 dark:bg-[#070D18]/70 border-border/70 dark:border-[#152238]',
              isTargeted && 'border-[#008F83] ring-2 ring-[#008F83]/20 bg-[#008F83]/5'
            )}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between p-3.5 border-b border-border/60 dark:border-[#152238]">
              <div className="flex items-center gap-2">
                <Icon className={cn('w-4 h-4', column.color)} />
                <span className="text-xs font-bold tracking-wider text-foreground dark:text-slate-200">
                  {column.title}
                </span>
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10.5px] font-bold bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {columnItems.length}
                </span>
              </div>

              {allowCreate && onNewActivityClick && (
                <button
                  type="button"
                  onClick={() => onNewActivityClick(column.id)}
                  className="p-1 rounded-lg text-muted hover:text-foreground dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title={`Add activity in ${column.title}`}
                  aria-label={`Add activity in ${column.title}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Cards List Container */}
            <div className="flex-1 p-2.5 space-y-2.5 min-h-[420px] max-h-[75vh] overflow-y-auto">
              {columnItems.map((item) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item)}
                >
                  <ActivityCard
                    item={item}
                    onClick={onCardClick}
                    onCompleteClick={onCompleteClick}
                    onArchiveClick={onArchiveClick}
                    isDragging={draggedItem?.id === item.id}
                  />
                </div>
              ))}

              {columnItems.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center border border-dashed border-border/80 dark:border-[#1A2A42] rounded-xl bg-transparent">
                  <span className="text-xs font-medium text-muted dark:text-slate-500 mb-1">
                    No {column.title.toLowerCase()}
                  </span>
                  <p className="text-[11px] text-muted/80 dark:text-slate-600 mb-3">
                    {column.subtitle}
                  </p>
                  {allowCreate && onNewActivityClick && (
                    <button
                      type="button"
                      onClick={() => onNewActivityClick(column.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#008F83] dark:text-[#32D5C4] hover:bg-[#008F83]/10 rounded-lg transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add activity</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
