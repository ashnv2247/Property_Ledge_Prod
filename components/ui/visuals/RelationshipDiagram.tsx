'use client';

import React from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RelationshipNode {
  id?: string;
  label: string;
  value: string;
  subtext?: string;
  icon?: React.ReactNode;
  isActive?: boolean;
  badge?: string;
}

export interface RelationshipDiagramProps {
  nodes: RelationshipNode[];
  title?: string;
  className?: string;
}

export function RelationshipDiagram({
  nodes,
  title,
  className,
}: RelationshipDiagramProps) {
  if (!nodes || nodes.length < 2) return null;

  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-4 transition-colors',
        className
      )}
      role="region"
      aria-label={title || 'Entity relationship diagram'}
    >
      {title && (
        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2.5">
          {title}
        </div>
      )}

      <div className="flex items-center gap-2 overflow-x-auto min-w-max pb-0.5 scrollbar-none">
        {nodes.map((node, i) => {
          const isLast = i === nodes.length - 1;
          const isActive = node.isActive !== false;

          return (
            <React.Fragment key={node.id || i}>
              {/* Node Card */}
              <div
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all shadow-2xs',
                  isActive
                    ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white'
                    : 'bg-slate-100/60 dark:bg-slate-800/40 border-slate-200/50 dark:border-slate-800 text-slate-400 dark:text-slate-500 opacity-60'
                )}
              >
                {node.icon && (
                  <div
                    className={cn(
                      'shrink-0',
                      isActive ? 'text-[#008F83]' : 'text-slate-400'
                    )}
                  >
                    {node.icon}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-tight truncate max-w-[120px]">
                      {node.label}
                    </span>
                    {node.badge && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#008F83]/10 text-[#008F83]">
                        {node.badge}
                      </span>
                    )}
                  </div>
                  <span className="block text-xs font-bold truncate max-w-[140px] leading-tight">
                    {node.value}
                  </span>
                  {node.subtext && (
                    <span className="block text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[140px]">
                      {node.subtext}
                    </span>
                  )}
                </div>
              </div>

              {/* Connecting Connector */}
              {!isLast && (
                <div className="flex items-center text-slate-300 dark:text-slate-600 px-0.5 shrink-0">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
