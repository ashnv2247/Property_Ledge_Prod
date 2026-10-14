'use client';

import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { YearOverYearComparison } from '@/modules/properties/domain/accountant-report-types';
import { formatCurrency } from '@/lib/format/currency';

interface YearCompareTableProps {
  comparison: YearOverYearComparison;
}

export function YearCompareTable({ comparison }: YearCompareTableProps) {
  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-700 bg-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-slate-100">Year-Over-Year Financial Comparison</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Side-by-side comparison between {comparison.selectedFy} and {comparison.previousFy}
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-teal-400">
            <span className="w-2 h-2 rounded-full bg-teal-400" />
            <span>Increase</span>
          </div>
          <div className="flex items-center gap-1.5 text-rose-400">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            <span>Decrease</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-900/40 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-6">Income & Deduction Category</th>
              <th className="py-3 px-6 text-right font-mono">{comparison.selectedFy}</th>
              <th className="py-3 px-6 text-right font-mono">{comparison.previousFy}</th>
              <th className="py-3 px-6 text-right">Variance / Difference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/60 font-medium">
            {comparison.items.map((item, idx) => {
              const isHighlight =
                item.category === 'Gross Rental Income' ||
                item.category === 'Total Expenses (Deductions)' ||
                item.category === 'Net Rental Position';

              const isIncrease = item.difference > 0;
              const isDecrease = item.difference < 0;

              return (
                <tr
                  key={idx}
                  className={`transition-colors ${
                    isHighlight
                      ? 'bg-slate-800/90 font-bold border-t border-slate-600'
                      : 'hover:bg-slate-750/30'
                  }`}
                >
                  <td className="py-3 px-6 text-slate-200">
                    <span className={isHighlight ? 'text-teal-300 font-bold' : ''}>
                      {item.category}
                    </span>
                  </td>

                  {/* Selected FY Amount */}
                  <td className="py-3 px-6 text-right font-mono text-slate-100">
                    {formatCurrency(item.selectedFyAmount)}
                  </td>

                  {/* Previous FY Amount */}
                  <td className="py-3 px-6 text-right font-mono text-slate-400">
                    {formatCurrency(item.previousFyAmount)}
                  </td>

                  {/* Variance Column */}
                  <td className="py-3 px-6 text-right font-mono">
                    <div className="flex items-center justify-end gap-1.5">
                      {isIncrease ? (
                        <>
                          <ArrowUpRight className="w-4 h-4 text-teal-400 inline shrink-0" />
                          <span className="text-teal-400 font-bold">
                            +{formatCurrency(item.difference)}
                            {item.percentageChange !== null && ` (+${item.percentageChange}%)`}
                          </span>
                        </>
                      ) : isDecrease ? (
                        <>
                          <ArrowDownRight className="w-4 h-4 text-rose-400 inline shrink-0" />
                          <span className="text-rose-400 font-bold">
                            {formatCurrency(item.difference)}
                            {item.percentageChange !== null && ` (${item.percentageChange}%)`}
                          </span>
                        </>
                      ) : (
                        <>
                          <Minus className="w-3.5 h-3.5 text-slate-500 inline shrink-0" />
                          <span className="text-slate-500 font-medium">$0.00</span>
                        </>
                      )}
                    </div>
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
