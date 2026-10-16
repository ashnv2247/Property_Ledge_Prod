'use client';

import React, { useState, useMemo } from 'react';
import { MonthlyFinancialSummary } from '@/modules/finance/domain/reporting-types';
import {
  CategoryQuarterlyRow,
  MonthlyBreakdownRow,
  buildMonthlyBreakdownData,
  formatReportCurrency,
} from '@/lib/finance/category-report-data';
import { MonthDetailRenderer } from '@/components/reports/MonthDetailRenderer';
import { cn } from '@/lib/utils';
import { Calendar, ChevronDown, ChevronRight, Info } from 'lucide-react';

interface MonthlyBreakdownTableProps {
  monthlyTrends: MonthlyFinancialSummary[];
  totalIncome: number;
  totalExpenses: number;
  netResult: number;
  totalGstCollected: number;
  totalGstPaid: number;
  className?: string;
  propertyId?: string;
  financialYear?: string | number;
  rawTransactions?: any[];
  categoryRows?: CategoryQuarterlyRow[];
}

export function MonthlyBreakdownTable({
  monthlyTrends = [],
  totalIncome,
  totalExpenses,
  netResult,
  totalGstCollected,
  totalGstPaid,
  className,
  propertyId,
  financialYear,
  rawTransactions = [],
  categoryRows = [],
}: MonthlyBreakdownTableProps) {
  const isOverallProfitable = netResult >= 0;

  // Build full monthly data with transactions attached for master-detail expansion
  const monthlyRows = useMemo<MonthlyBreakdownRow[]>(() => {
    return buildMonthlyBreakdownData(monthlyTrends, rawTransactions, categoryRows);
  }, [monthlyTrends, rawTransactions, categoryRows]);

  // Default expand first month with transactions (e.g. Oct 2025 in demo)
  const [expandedKey, setExpandedKey] = useState<string | null>(() => {
    const monthWithTx = monthlyRows.find((m) => m.transactions && m.transactions.length > 0);
    return monthWithTx ? monthWithTx.key : null;
  });

  const toggleExpand = (key: string) => {
    setExpandedKey((prev) => (prev === key ? null : key));
  };

  return (
    <div className={cn('bg-white dark:bg-[#08182A] border border-border rounded-2xl p-4 sm:p-6 shadow-2xs space-y-4', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            Monthly Financial Breakdown
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            A detailed breakdown of income, expenses, and profit by month across the Australian Financial Year
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>12 Months (Jul → Jun)</span>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto -mx-1 sm:mx-0 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <table className="w-full text-left text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider bg-slate-50/80 dark:bg-[#0B1D30]/80">
              <th className="py-3 px-4 font-semibold border-r border-slate-200/80 dark:border-slate-800">
                Month
              </th>
              <th className="py-3 px-4 text-center font-semibold border-r border-slate-200/80 dark:border-slate-800">
                Income ($)
              </th>
              <th className="py-3 px-4 text-center font-semibold border-r border-slate-200/80 dark:border-slate-800">
                Expenses ($)
              </th>
              <th className="py-3 px-4 text-center font-semibold border-r border-slate-200/80 dark:border-slate-800">
                Net Profit ($)
              </th>
              <th className="py-3 px-4 text-center font-semibold border-r border-slate-200/80 dark:border-slate-800">
                GST Collected
              </th>
              <th className="py-3 px-4 text-center font-semibold">
                GST Paid
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {monthlyRows.map((m) => {
              const isExpanded = expandedKey === m.key;
              const isMonthProfitable = m.net >= 0;
              const hasActivity = m.income > 0 || m.expenses > 0;

              return (
                <React.Fragment key={m.key}>
                  <tr
                    onClick={() => toggleExpand(m.key)}
                    className={cn(
                      'cursor-pointer transition-colors border-b border-slate-100 dark:border-slate-800/80',
                      isExpanded
                        ? 'bg-[#EAF7EE]/50 dark:bg-[#008F83]/10 border-l-4 border-l-[#238358]'
                        : 'hover:bg-slate-50/70 dark:hover:bg-[#0B1D30]/40'
                    )}
                  >
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap border-r border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center gap-2.5">
                        <span className="p-1 rounded text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-[#238358] dark:text-[#32D5C4]" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          )}
                        </span>
                        <div
                          className={cn(
                            'p-1.5 rounded-lg shrink-0 transition-colors',
                            isExpanded
                              ? 'bg-[#238358] text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          )}
                        >
                          <Calendar className="w-3.5 h-3.5" />
                        </div>
                        <span className={isExpanded ? 'font-bold text-slate-900 dark:text-white' : ''}>
                          {m.label}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-[#238358] dark:text-[#32D5C4] tabular-nums whitespace-nowrap border-r border-slate-100 dark:border-slate-800/80">
                      {formatReportCurrency(m.income)}
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-slate-900 dark:text-white tabular-nums whitespace-nowrap border-r border-slate-100 dark:border-slate-800/80">
                      {formatReportCurrency(m.expenses)}
                    </td>
                    <td
                      className={cn(
                        'py-3 px-4 text-center font-bold tabular-nums whitespace-nowrap border-r border-slate-100 dark:border-slate-800/80',
                        hasActivity
                          ? isMonthProfitable
                            ? 'text-[#238358] dark:text-[#32D5C4]'
                            : 'text-rose-600 dark:text-rose-400'
                          : 'text-slate-400 dark:text-slate-500'
                      )}
                    >
                      {formatReportCurrency(m.net)}
                    </td>
                    <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-400 tabular-nums whitespace-nowrap border-r border-slate-100 dark:border-slate-800/80 font-medium">
                      {formatReportCurrency(m.gstCollected)}
                    </td>
                    <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-400 tabular-nums whitespace-nowrap font-medium">
                      {formatReportCurrency(m.gstPaid)}
                    </td>
                  </tr>

                  {/* Expanded Transaction Drilldown */}
                  {isExpanded && (
                    <tr className="bg-[#F8FAFB] dark:bg-[#061524]">
                      <td colSpan={6} className="p-0">
                        <MonthDetailRenderer
                          data={m}
                          propertyId={propertyId}
                          financialYear={financialYear}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-300 dark:border-slate-600 font-bold bg-slate-50/95 dark:bg-[#071526] text-slate-900 dark:text-white shadow-xs">
              <td className="py-3.5 px-4 font-bold border-r border-slate-200/80 dark:border-slate-700 text-sm sm:text-base">
                Annual Total
              </td>
              <td className="py-3.5 px-4 text-center text-[#238358] dark:text-[#32D5C4] tabular-nums whitespace-nowrap font-bold border-r border-slate-200/80 dark:border-slate-700 text-sm sm:text-base">
                {formatReportCurrency(totalIncome)}
              </td>
              <td className="py-3.5 px-4 text-center text-slate-900 dark:text-white tabular-nums whitespace-nowrap font-bold border-r border-slate-200/80 dark:border-slate-700 text-sm sm:text-base">
                {formatReportCurrency(totalExpenses)}
              </td>
              <td
                className={cn(
                  'py-3.5 px-4 text-center tabular-nums whitespace-nowrap font-bold border-r border-slate-200/80 dark:border-slate-700 text-sm sm:text-base',
                  isOverallProfitable ? 'text-[#238358] dark:text-[#32D5C4]' : 'text-rose-600 dark:text-rose-400'
                )}
              >
                {formatReportCurrency(netResult)}
              </td>
              <td className="py-3.5 px-4 text-center tabular-nums whitespace-nowrap text-slate-900 dark:text-white font-bold border-r border-slate-200/80 dark:border-slate-700 text-sm sm:text-base">
                {formatReportCurrency(totalGstCollected)}
              </td>
              <td className="py-3.5 px-4 text-center tabular-nums whitespace-nowrap text-slate-900 dark:text-white font-bold text-sm sm:text-base">
                {formatReportCurrency(totalGstPaid)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex items-center gap-2 px-1 text-xs text-slate-500 dark:text-slate-400">
        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span>Click a month row to expand and view its transactions.</span>
      </div>
    </div>
  );
}
