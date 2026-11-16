'use client';

import React from 'react';
import { Pencil, CheckCircle2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WorkflowSummaryItem {
  label: string;
  value: React.ReactNode;
  stepIndex?: number;
  isDefault?: boolean;
}

export interface WorkflowSummarySection {
  title: string;
  items: WorkflowSummaryItem[];
  stepIndex?: number;
}

export interface WorkflowRelationshipNode {
  label: string;
  value: string;
  subtext?: string;
  icon?: React.ReactNode;
}

export interface WorkflowSummaryProps {
  title?: string;
  description?: string;
  relationshipChain?: WorkflowRelationshipNode[];
  sections: WorkflowSummarySection[];
  onEditStep?: (stepIndex: number) => void;
  className?: string;
}

export function WorkflowSummary({
  title = 'Review & Confirmation',
  description = 'Please verify your information before completing this workflow.',
  relationshipChain,
  sections,
  onEditStep,
  className,
}: WorkflowSummaryProps) {
  return (
    <div className={cn('space-y-6 w-full text-left', className)}>
      <div className="space-y-1">
        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
          {title}
        </h3>
        {description && (
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {description}
          </p>
        )}
      </div>

      {/* Visual Relationship Chain Diagram if provided */}
      {relationshipChain && relationshipChain.length > 1 && (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-4 overflow-x-auto">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Relationship Flow
          </div>
          <div className="flex items-center gap-2 min-w-max">
            {relationshipChain.map((node, i) => (
              <React.Fragment key={i}>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
                  {node.icon && <div className="text-[#008F83] shrink-0">{node.icon}</div>}
                  <div>
                    <span className="block text-[10px] font-semibold text-slate-400 uppercase">
                      {node.label}
                    </span>
                    <span className="block text-xs font-bold text-slate-900 dark:text-white truncate max-w-[140px]">
                      {node.value}
                    </span>
                    {node.subtext && (
                      <span className="block text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[140px]">
                        {node.subtext}
                      </span>
                    )}
                  </div>
                </div>

                {i < relationshipChain.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Summary Group Sections */}
      <div className="space-y-4">
        {sections.map((section, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-4 sm:p-5 shadow-2xs space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/80">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                {section.title}
              </h4>
              {section.stepIndex !== undefined && onEditStep && (
                <button
                  type="button"
                  onClick={() => onEditStep(section.stepIndex!)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#008F83] hover:underline"
                >
                  <Pencil className="w-3 h-3" />
                  Edit
                </button>
              )}
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {section.items.map((item, itemIdx) => (
                <div key={itemIdx} className="space-y-0.5">
                  <dt className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {item.label}
                    {item.isDefault && (
                      <span className="ml-1 text-[10px] text-slate-400 italic">
                        (Default)
                      </span>
                    )}
                  </dt>
                  <dd className="font-semibold text-slate-900 dark:text-slate-100 break-words">
                    {item.value || <span className="text-slate-400">—</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}
