'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ArrowRight,
  Receipt,
  Info,
} from 'lucide-react';
import {
  CategoryQuarterlyRow,
  formatReportCurrency,
} from '@/lib/finance/category-report-data';
import { CategoryIcon } from '@/components/reports/CategoryIcon';
import { cn } from '@/lib/utils';

interface CategoryBreakdownMobileViewProps {
  rows: CategoryQuarterlyRow[];
  totalExpenses: number;
  propertyId?: string;
  financialYear?: string | number;
}

export function CategoryBreakdownMobileView({
  rows,
  totalExpenses,
  propertyId,
  financialYear,
}: CategoryBreakdownMobileViewProps) {
  // Default Repairs & maintenance category to expanded matching desktop and Image 1
  const [expandedId, setExpandedId] = useState<string | null>(() => {
    const repairRow = rows.find((r) => r.categoryName?.toLowerCase().includes('repair'));
    if (repairRow) return repairRow.id;
    const firstWithTx = rows.find((r) => r.transactions && r.transactions.length > 0);
    return firstWithTx ? firstWithTx.id : null;
  });

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-3 pb-8">
      {/* Category List */}
      <div className="bg-white dark:bg-[#08182A] border border-border rounded-2xl divide-y divide-slate-100 dark:divide-slate-800/80 shadow-2xs overflow-hidden">
        {rows.map((row) => {
          const isExpanded = expandedId === row.id;
          const hasTransactions = row.transactions && row.transactions.length > 0;
          const hasAmount = row.totalAmount > 0;

          return (
            <div
              key={row.id}
              className={cn(
                'transition-colors',
                isExpanded && 'bg-[#008F83]/5 dark:bg-[#008F83]/10'
              )}
            >
              {/* Category Header Row */}
              <button
                type="button"
                onClick={() => toggleExpand(row.id)}
                className="w-full flex items-center justify-between p-4 text-left transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40 cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div
                    className={cn(
                      'p-2 rounded-xl shrink-0 transition-colors',
                      isExpanded
                        ? 'bg-[#008F83] text-white shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    )}
                  >
                    <CategoryIcon name={row.iconName} className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span
                      className={cn(
                        'text-sm font-semibold truncate block',
                        isExpanded
                          ? 'text-slate-900 dark:text-white'
                          : 'text-slate-700 dark:text-slate-200'
                      )}
                    >
                      {row.categoryName}
                    </span>
                    {/* Compact quarterly hints if available and collapsed */}
                    {!isExpanded && hasAmount && (
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        {row.transactionCount > 0
                          ? `${row.transactionCount} ${row.transactionCount === 1 ? 'transaction' : 'transactions'}`
                          : 'Scheduled expense'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={cn(
                      'text-sm font-bold tabular-nums',
                      hasAmount
                        ? 'text-slate-900 dark:text-white'
                        : 'text-slate-400 dark:text-slate-500'
                    )}
                  >
                    {hasAmount && !isExpanded ? `Total · ` : ''}
                    {formatReportCurrency(row.totalAmount)}
                  </span>
                  {hasTransactions ? (
                    isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                  )}
                </div>
              </button>

              {/* Expanded Accordion Detail View */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 space-y-3 border-t border-slate-100 dark:border-slate-800/60 bg-white/70 dark:bg-[#071728]/70">
                  {/* Period Subtitle & Transaction Badge */}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      {row.q2Amount > 0 ? `Oct–Dec · ${formatReportCurrency(row.q2Amount)}` : `Annual Total`}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#EAF7EE] text-[#1E7E34] border border-[#C3E6CB]">
                      {row.transactions.length}{' '}
                      {row.transactions.length === 1 ? 'transaction' : 'transactions'}
                    </span>
                  </div>

                  {/* List of Transactions as clean table matching mobile mockup */}
                  {row.transactions.length === 0 ? (
                    <div className="py-4 text-center text-xs text-slate-400">
                      No individual transactions recorded for this category.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-[#08182A]">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-900/40">
                            <th className="py-2 px-3 font-semibold w-24">Date</th>
                            <th className="py-2 px-3 font-semibold">Description</th>
                            <th className="py-2 px-3 text-right font-semibold w-20">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/70 dark:divide-slate-800/50">
                          {row.transactions.map((tx) => (
                            <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-2 px-3 text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                {tx.formattedDate}
                              </td>
                              <td className="py-2 px-3 text-[11px] font-medium text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                                {tx.description}
                              </td>
                              <td className="py-2 px-3 text-right text-[11px] font-semibold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">
                                {formatReportCurrency(tx.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 font-bold">
                            <td colSpan={2} className="py-2 px-3 text-right font-bold text-slate-800 dark:text-slate-200 text-xs">
                              Total
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-white tabular-nums text-xs whitespace-nowrap">
                              {formatReportCurrency(row.totalAmount)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}

                  {/* View All Expenses Link */}
                  <div className="pt-1 text-right">
                    <Link
                      href={`/dashboard/money?type=expense${
                        propertyId ? `&propertyId=${propertyId}` : ''
                      }&search=${encodeURIComponent(row.categoryName)}`}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0070BA] dark:text-[#32D5C4] hover:underline"
                    >
                      <span>View in transactions</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile Total Expenses Summary Banner */}
      <div className="bg-white dark:bg-[#08182A] border border-border rounded-2xl p-4 flex items-center justify-between shadow-2xs">
        <span className="text-sm font-bold text-slate-900 dark:text-white">
          Total expenses
        </span>
        <span className="text-base font-bold text-[#008F83] dark:text-[#32D5C4] tabular-nums">
          {formatReportCurrency(totalExpenses)}
        </span>
      </div>

      {/* Caption note */}
      <div className="flex items-center gap-2 px-1 text-xs text-slate-500 dark:text-slate-400">
        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span>Tap any category to view its individual transactions.</span>
      </div>
    </div>
  );
}
