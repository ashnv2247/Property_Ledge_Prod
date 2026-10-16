'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import {
  MonthlyBreakdownRow,
  MonthDetailTransaction,
  formatReportCurrency,
} from '@/lib/finance/category-report-data';
import { cn } from '@/lib/utils';

interface MonthDetailRendererProps {
  data: MonthlyBreakdownRow;
  propertyId?: string;
  financialYear?: string | number;
}

export function MonthDetailRenderer({
  data,
  propertyId,
  financialYear,
}: MonthDetailRendererProps) {
  const transactions = data?.transactions || [];
  const monthKey = data?.key || '';
  const monthLabel = data?.label || 'Selected Month';

  // Build link to view full transactions list filtered to this month/period
  const [yearStr, monthStr] = monthKey.split('-');
  const viewAllHref = `/dashboard/money?${
    propertyId ? `propertyId=${propertyId}&` : ''
  }${yearStr && monthStr ? `from=${monthKey}-01&` : ''}period=${encodeURIComponent(monthLabel)}`;

  return (
    <div className="bg-[#F8FAFB] dark:bg-[#061524] px-6 py-4 border-y border-slate-200/80 dark:border-slate-800 space-y-3.5 transition-all">
      {/* Detail Header Toolbar matching Category Detail */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold bg-[#EAF7EE] text-[#1E7E34] border border-[#C3E6CB]">
            {transactions.length} {transactions.length === 1 ? 'transaction' : 'transactions'}
          </span>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            in {monthLabel}
          </span>
        </div>

        <Link
          href={viewAllHref}
          className="inline-flex items-center gap-1 text-xs font-medium text-[#0070BA] hover:underline transition-colors"
        >
          <span>View all transactions</span>
          <span className="font-bold">&rarr;</span>
        </Link>
      </div>

      {/* Transaction Subtable */}
      {transactions.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500 bg-white dark:bg-[#08182A] rounded-xl border border-slate-200/70 dark:border-slate-800">
          No individual transactions recorded for {monthLabel}.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-[#08182A] shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800/80 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-900/40">
                <th className="py-2.5 px-4 font-semibold w-32 border-r border-slate-100 dark:border-slate-800/60">
                  Date
                </th>
                <th className="py-2.5 px-4 font-semibold border-r border-slate-100 dark:border-slate-800/60">
                  Description
                </th>
                <th className="py-2.5 px-4 font-semibold border-r border-slate-100 dark:border-slate-800/60">
                  Category / Supplier
                </th>
                <th className="py-2.5 px-3 text-center font-semibold w-24 border-r border-slate-100 dark:border-slate-800/60">
                  Type
                </th>
                <th className="py-2.5 px-4 text-center font-semibold w-28">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80 dark:divide-slate-800/60">
              {transactions.map((tx) => {
                const isIncome = tx.type === 'income';
                return (
                  <tr
                    key={tx.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-2.5 px-4 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap border-r border-slate-100/80 dark:border-slate-800/60">
                      {tx.formattedDate}
                    </td>
                    <td className="py-2.5 px-4 text-slate-800 dark:text-slate-200 font-medium border-r border-slate-100/80 dark:border-slate-800/60">
                      {tx.description}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 border-r border-slate-100/80 dark:border-slate-800/60">
                      <span>{tx.supplier}</span>
                      {tx.categoryName && tx.categoryName !== tx.supplier && (
                        <span className="text-[11px] text-slate-400 ml-1.5">
                          ({tx.categoryName})
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center border-r border-slate-100/80 dark:border-slate-800/60">
                      <span
                        className={cn(
                          'inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
                          isIncome
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-[#238358] dark:text-[#32D5C4] border border-emerald-200 dark:border-emerald-800'
                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40'
                        )}
                      >
                        {isIncome ? 'Income' : 'Expense'}
                      </span>
                    </td>
                    <td
                      className={cn(
                        'py-2.5 px-4 text-center font-semibold tabular-nums whitespace-nowrap',
                        isIncome
                          ? 'text-[#238358] dark:text-[#32D5C4]'
                          : 'text-slate-900 dark:text-white'
                      )}
                    >
                      {isIncome ? `+${formatReportCurrency(tx.amount)}` : formatReportCurrency(tx.amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 font-bold">
                <td
                  colSpan={4}
                  className="py-2.5 px-4 text-right font-bold text-slate-800 dark:text-slate-200 border-r border-slate-200/80 dark:border-slate-800"
                >
                  Monthly Total
                </td>
                <td className="py-2.5 px-4 text-center font-bold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">
                  {formatReportCurrency(data.expenses > 0 ? data.expenses : data.income)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
