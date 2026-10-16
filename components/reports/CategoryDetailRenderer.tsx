'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Receipt } from 'lucide-react';
import { CategoryQuarterlyRow, formatReportCurrency } from '@/lib/finance/category-report-data';

interface CategoryDetailRendererProps {
  data: CategoryQuarterlyRow;
  propertyId?: string;
  financialYear?: string | number;
}

export function CategoryDetailRenderer({
  data,
  propertyId,
  financialYear,
}: CategoryDetailRendererProps) {
  const transactions = data?.transactions || [];
  const totalAmount = data?.totalAmount || 0;

  // Build link to view full transactions list filtered to this category
  const viewAllHref = `/dashboard/money?type=expense${
    propertyId ? `&propertyId=${propertyId}` : ''
  }&search=${encodeURIComponent(data?.categoryName || '')}`;

  return (
    <div className="bg-[#F8FAFB] dark:bg-[#061524] px-6 py-4 border-y border-slate-200/80 dark:border-slate-800 space-y-3.5 transition-all">
      {/* Detail Header Toolbar matching Image 1 */}
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold bg-[#EAF7EE] text-[#1E7E34] border border-[#C3E6CB]">
          {transactions.length} {transactions.length === 1 ? 'transaction' : 'transactions'}
        </span>

        <Link
          href={viewAllHref}
          className="inline-flex items-center gap-1 text-xs font-medium text-[#0070BA] hover:underline transition-colors"
        >
          <span>View all expenses</span>
          <span className="font-bold">&rarr;</span>
        </Link>
      </div>

      {/* Transaction Subtable */}
      {transactions.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
          No individual transactions recorded for this category in this period.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-[#08182A] shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800/80 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-900/40">
                <th className="py-2.5 px-4 font-semibold w-32">Date</th>
                <th className="py-2.5 px-4 font-semibold">Description</th>
                <th className="py-2.5 px-4 font-semibold">Supplier</th>
                <th className="py-2.5 px-4 text-right font-semibold w-28">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80 dark:divide-slate-800/60">
              {transactions.map((tx) => (
                <tr
                  key={tx.id}
                  className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-2.5 px-4 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {tx.formattedDate}
                  </td>
                  <td className="py-2.5 px-4 text-slate-800 dark:text-slate-200 font-medium">
                    {tx.description}
                  </td>
                  <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">
                    {tx.supplier}
                  </td>
                  <td className="py-2.5 px-4 text-right font-semibold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">
                    {formatReportCurrency(tx.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 font-bold">
                <td colSpan={3} className="py-2.5 px-4 text-right font-bold text-slate-800 dark:text-slate-200">
                  Total
                </td>
                <td className="py-2.5 px-4 text-right font-bold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">
                  {formatReportCurrency(totalAmount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
