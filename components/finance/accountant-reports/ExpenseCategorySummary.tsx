'use client';

import React from 'react';
import {
  Layers,
  CheckCircle2,
  AlertTriangle,
  X,
  Filter,
  TrendingUp,
} from 'lucide-react';
import { formatCurrency } from '@/lib/format/currency';
import { AccountantCategorySummary } from '@/modules/finance/domain/accountant-report-types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/admin/ui/Badge';

export interface ExpenseCategorySummaryProps {
  categories: AccountantCategorySummary[];
  totalExpenses: number;
  selectedCategoryName: string | null;
  onSelectCategory: (categoryName: string | null) => void;
}

export function ExpenseCategorySummaryView({
  categories = [],
  totalExpenses = 0,
  selectedCategoryName,
  onSelectCategory,
}: ExpenseCategorySummaryProps) {
  if (categories.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#08182A] p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#008F83] dark:text-[#32D5C4]" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Expense Category Summary Breakdown
          </h3>
          <span className="text-xs text-slate-400">
            ({categories.length} statutory categories)
          </span>
        </div>

        {selectedCategoryName && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Filtered by:</span>
            <Badge variant="primary" className="gap-1 text-xs">
              <span>{selectedCategoryName}</span>
              <button
                type="button"
                onClick={() => onSelectCategory(null)}
                className="hover:text-white ml-0.5"
                title="Clear category filter"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          </div>
        )}
      </div>

      {/* Categories Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-white/[0.06]">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-[#0E1E33] text-[10px] uppercase font-bold text-slate-400">
            <tr>
              <th className="py-2.5 px-4">Category</th>
              <th className="py-2.5 px-4 text-center">Expenses</th>
              <th className="py-2.5 px-4 text-right">GST Amount</th>
              <th className="py-2.5 px-4 text-right">Total (AUD)</th>
              <th className="py-2.5 px-4 text-right">Share of Spend</th>
              <th className="py-2.5 px-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
            {categories.map((cat) => {
              const isSelected = selectedCategoryName === cat.categoryName;
              const percent = totalExpenses > 0 ? (cat.totalAmount / totalExpenses) * 100 : 0;

              return (
                <tr
                  key={cat.categoryId}
                  onClick={() => onSelectCategory(isSelected ? null : cat.categoryName)}
                  className={cn(
                    "cursor-pointer transition-colors",
                    isSelected
                      ? "bg-[#008F83]/10 dark:bg-[#008F83]/15 font-semibold"
                      : "hover:bg-slate-50/70 dark:hover:bg-white/[0.02]"
                  )}
                >
                  <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "w-2 h-2 rounded-full",
                        isSelected ? "bg-[#008F83]" : "bg-slate-300 dark:bg-slate-600"
                      )} />
                      <span>{cat.categoryName}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-center font-mono text-slate-500">
                    {cat.expenseCount}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-amber-600 dark:text-amber-400 font-medium">
                    {cat.formattedGst}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                    {cat.formattedTotal}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden hidden sm:block">
                        <div
                          className="h-full bg-[#008F83] rounded-full"
                          style={{ width: `${Math.min(100, Math.max(2, percent))}%` }}
                        />
                      </div>
                      <span className="font-mono text-slate-500 w-10 text-right">
                        {percent.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    {cat.isReconciled ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" />
                        Reconciled
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                        <AlertTriangle className="w-3 h-3" />
                        Diff ${cat.reconciliationDifference.toFixed(2)}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
