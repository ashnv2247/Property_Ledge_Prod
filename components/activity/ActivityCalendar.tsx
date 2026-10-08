'use client';

import React, { useState } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
  isValid,
} from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  RotateCw,
  Home,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActivityBoardItem } from '@/types/activity';

interface ActivityCalendarProps {
  items: ActivityBoardItem[];
  onCardClick: (item: ActivityBoardItem) => void;
  onNewActivityOnDate: (dateStr: string) => void;
}

export function ActivityCalendar({
  items,
  onCardClick,
  onNewActivityOnDate,
}: ActivityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

  return (
    <div className="w-full bg-surface dark:bg-[#0B1320] border border-border dark:border-[#1E293B] rounded-2xl shadow-xs overflow-hidden">
      {/* Calendar Header / Navigation */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/80 dark:border-[#1E293B]/80 bg-surface-subtle dark:bg-[#0E1726]/80">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-bold text-foreground dark:text-white">
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
          <button
            type="button"
            onClick={goToToday}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-[#152238] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#1E2D4A] transition-colors"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={prevMonth}
            className="p-1.5 rounded-lg text-muted hover:text-foreground dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Previous month"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="p-1.5 rounded-lg text-muted hover:text-foreground dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Next month"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-border/60 dark:border-[#1E293B]/60 text-center text-[11px] font-semibold text-muted dark:text-slate-400 py-2.5 bg-slate-50/50 dark:bg-[#080D1A]/50 uppercase tracking-wider">
        <div>Mon</div>
        <div>Tue</div>
        <div>Wed</div>
        <div>Thu</div>
        <div>Fri</div>
        <div>Sat</div>
        <div>Sun</div>
      </div>

      {/* Month Days Grid */}
      <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-border/60 dark:divide-[#1E293B]/60">
        {days.map((day) => {
          const dayStr = format(day, 'yyyy-MM-dd');
          const dayItems = items.filter((i) => i.dueDate === dayStr);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isCurrentDay = isToday(day);

          return (
            <div
              key={dayStr}
              onClick={() => onNewActivityOnDate(dayStr)}
              className={cn(
                'min-h-[110px] p-2 flex flex-col justify-between group text-left cursor-pointer transition-colors',
                isCurrentMonth
                  ? 'bg-surface dark:bg-[#0B1320] hover:bg-slate-50 dark:hover:bg-[#0E1626]'
                  : 'bg-slate-50/40 dark:bg-[#070C16]/60 opacity-40 hover:opacity-80',
                isCurrentDay && 'bg-teal-500/5 dark:bg-[#008F83]/10'
              )}
            >
              {/* Day Number Header */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    'text-xs font-semibold rounded-full w-6 h-6 flex items-center justify-center',
                    isCurrentDay
                      ? 'bg-[#008F83] text-white'
                      : 'text-foreground dark:text-slate-300'
                  )}
                >
                  {format(day, 'd')}
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNewActivityOnDate(dayStr);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted hover:text-foreground dark:text-slate-400 dark:hover:text-white"
                  title="Add activity"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              {/* Day Events */}
              <div className="flex-1 space-y-1 overflow-y-auto max-h-[80px]">
                {dayItems.map((item) => {
                  const isCompleted = item.status === 'completed';

                  return (
                    <div
                      key={item.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onCardClick(item);
                      }}
                      className={cn(
                        'flex items-center gap-1.5 px-1.5 py-0.5 rounded-md text-[10.5px] font-medium transition-all truncate border',
                        isCompleted
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 line-through opacity-70'
                          : item.isOverdue
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                          : 'bg-slate-100 dark:bg-[#152238] text-slate-800 dark:text-slate-200 border-slate-200 dark:border-[#223555] hover:border-[#008F83]'
                      )}
                    >
                      <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-current" />
                      <span className="truncate">{item.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
