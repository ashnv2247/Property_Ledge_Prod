'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { useCollapsibleWidget } from '@/lib/stores/useWidgetPreferencesStore';
import { cn } from '@/lib/utils';

export interface CollapsibleDashboardWidgetProps {
  widgetId: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  headerActions?: React.ReactNode;
  headerLeftIcon?: React.ReactNode;
  defaultCollapsed?: boolean;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}

export function CollapsibleDashboardWidget({
  widgetId,
  title,
  subtitle,
  badge,
  headerActions,
  headerLeftIcon,
  defaultCollapsed = false,
  className,
  headerClassName,
  bodyClassName,
  children,
}: CollapsibleDashboardWidgetProps) {
  const { isCollapsed, toggle } = useCollapsibleWidget(widgetId, defaultCollapsed);

  // Derive accessible string title for aria-label
  const accessibleTitle = typeof title === 'string' ? title : widgetId.replace(/-/g, ' ');

  return (
    <div
      data-widget-id={widgetId}
      className={cn(
        'rounded-[24px] border border-slate-200/80 dark:border-white/[0.06] bg-white dark:bg-[#08182A] shadow-[0_2px_12px_rgba(0,0,0,0.02)] dark:shadow-none transition-all duration-200',
        className
      )}
    >
      {/* Widget Header */}
      <div
        className={cn(
          'flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-6 lg:p-7',
          isCollapsed ? 'pb-6 lg:pb-7' : 'pb-4',
          headerClassName
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {headerLeftIcon && (
            <div className="shrink-0 text-slate-500 dark:text-slate-400">
              {headerLeftIcon}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl font-heading font-bold text-slate-900 dark:text-white tracking-tight truncate">
                {title}
              </h3>
              {badge && <div className="shrink-0">{badge}</div>}
            </div>
            {subtitle && (
              <p className="text-xs text-slate-400 dark:text-[#7F8B99] mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Controls & Header Actions */}
        <div
          className="flex items-center gap-2 self-end sm:self-center shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {headerActions}

          {/* Dedicated Collapse / Expand Button */}
          <button
            type="button"
            data-testid={`collapse-btn-${widgetId}`}
            onClick={(e) => {
              e.stopPropagation();
              toggle();
            }}
            aria-expanded={!isCollapsed}
            aria-controls={`widget-body-${widgetId}`}
            aria-label={isCollapsed ? `Expand ${accessibleTitle}` : `Collapse ${accessibleTitle}`}
            title={isCollapsed ? `Expand ${accessibleTitle}` : `Collapse ${accessibleTitle}`}
            className="p-1.5 rounded-xl border border-slate-200/80 dark:border-white/[0.08] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-[#008F83]"
          >
            <ChevronDown
              className={cn(
                'w-4 h-4 transition-transform duration-200',
                isCollapsed ? '-rotate-90 text-slate-400' : 'rotate-0 text-slate-600 dark:text-slate-300'
              )}
            />
          </button>
        </div>
      </div>

      {/* Widget Body (Retains React DOM/state when collapsed for instant restoration) */}
      <div
        id={`widget-body-${widgetId}`}
        style={{ display: isCollapsed ? 'none' : 'block' }}
        className={cn('px-6 lg:px-7 pb-6 lg:pb-7 pt-0', bodyClassName)}
      >
        {children}
      </div>
    </div>
  );
}
