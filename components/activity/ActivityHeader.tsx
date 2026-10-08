'use client';

import React from 'react';
import {
  Kanban,
  List,
  Calendar,
  UserCheck,
  Sparkles,
  Plus,
  RotateCw,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { ActivityFilters } from '@/types/activity';

interface ActivityHeaderProps {
  title?: string;
  subtitle?: string;
  badgeText?: string;
  newButtonText?: string;
  hideViewSelector?: boolean;
  hideNewButton?: boolean;
  currentView: ActivityFilters['viewMode'];
  onViewChange: (view: ActivityFilters['viewMode']) => void;
  draftCount?: number;
  myActivitiesCount?: number;
  onNewActivityClick?: () => void;
}

export function ActivityHeader({
  title = 'Activities',
  subtitle = 'Stay on top of what needs to happen across your properties.',
  badgeText = 'Autopilot Ready',
  newButtonText = 'New Activity',
  hideViewSelector = false,
  hideNewButton = false,
  currentView = 'board',
  onViewChange,
  draftCount = 0,
  myActivitiesCount,
  onNewActivityClick,
}: ActivityHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
      {/* Title & Subtitle */}
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground dark:text-white">
            {title}
          </h1>
          {badgeText && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-[#008F83]/15 text-[#008F83] dark:text-[#32D5C4] border border-[#008F83]/30">
              <RotateCw className="w-2.5 h-2.5" />
              {badgeText}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-muted dark:text-slate-400 mt-1">
            {subtitle}
          </p>
        )}
      </div>

      {/* Right side: View selector and New Activity button */}
      <div className="flex items-center gap-3 shrink-0 flex-wrap">
        {/* View mode segmented pill */}
        {!hideViewSelector && (
          <div className="flex items-center p-1 rounded-xl bg-surface-subtle dark:bg-[#0A111F] border border-border dark:border-[#1E2D4A] shadow-xs">
            <button
              type="button"
              onClick={() => onViewChange('board')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                currentView === 'board'
                  ? 'bg-surface dark:bg-[#0E1E33] text-foreground dark:text-white shadow-xs border border-border/80 dark:border-[#1E293B]'
                  : 'text-muted dark:text-slate-400 hover:text-foreground dark:hover:text-white'
              )}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Board</span>
            </button>

            <button
              type="button"
              onClick={() => onViewChange('list')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                currentView === 'list'
                  ? 'bg-surface dark:bg-[#0E1E33] text-foreground dark:text-white shadow-xs border border-border/80 dark:border-[#1E293B]'
                  : 'text-muted dark:text-slate-400 hover:text-foreground dark:hover:text-white'
              )}
            >
              <List className="w-3.5 h-3.5" />
              <span>List</span>
            </button>

            <button
              type="button"
              onClick={() => onViewChange('calendar')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                currentView === 'calendar'
                  ? 'bg-surface dark:bg-[#0E1E33] text-foreground dark:text-white shadow-xs border border-border/80 dark:border-[#1E293B]'
                  : 'text-muted dark:text-slate-400 hover:text-foreground dark:hover:text-white'
              )}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Calendar</span>
            </button>

            <button
              type="button"
              onClick={() => onViewChange('my')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                currentView === 'my'
                  ? 'bg-surface dark:bg-[#0E1E33] text-foreground dark:text-white shadow-xs border border-border/80 dark:border-[#1E293B]'
                  : 'text-muted dark:text-slate-400 hover:text-foreground dark:hover:text-white'
              )}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>My Activities</span>
            </button>

            {draftCount > 0 && (
              <button
                type="button"
                onClick={() => onViewChange('review')}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                  currentView === 'review'
                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                    : 'text-amber-600/80 dark:text-amber-400/80 hover:text-amber-600'
                )}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Needs Review ({draftCount})</span>
              </button>
            )}
          </div>
        )}

        {/* Primary Action Button */}
        {!hideNewButton && onNewActivityClick && (
          <Button
            type="button"
            onClick={onNewActivityClick}
            variant="default"
            size="sm"
            className="bg-[#008F83] hover:bg-[#007A70] text-white font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{newButtonText}</span>
          </Button>
        )}
      </div>
    </div>
  );
}
