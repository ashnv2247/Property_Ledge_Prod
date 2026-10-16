'use client';

import React from 'react';
import {
  ComparativeStatementData,
  CategoryLineItem,
} from '@/modules/finance/domain/accountant-reports-models';
import { formatAccountingAmount } from '@/modules/finance/domain/accountant-reports-format';
import { TrendingUp, TrendingDown, ArrowRight, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ComparativeStatementTabProps {
  data: ComparativeStatementData;
  isLoading?: boolean;
}

export function ComparativeStatementTab({
  data,
  isLoading,
}: ComparativeStatementTabProps) {
  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-400">
        <div className="inline-block animate-spin w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full mb-3" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          Calculating comparative statements across financial years...
        </p>
      </div>
    );
  }

  const {
    property,
    selectedFy,
    previousFy,
    incomeRows,
    expenseRows,
    totalExpensesCurrent,
    totalExpensesPrevious,
    totalExpensesVariance,
    netRentalResultCurrent,
    netRentalResultPrevious,
    netRentalResultVariance,
    summary,
  } = data;

  return (
    <div className="space-y-6">
      {/* 1. Main Comparative Statement Table (Matching Reference Image 3) */}
      <div className="overflow-x-auto rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#0B1728] shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          {/* Header Bar with Yellow Accent Tint */}
          <thead>
            <tr className="bg-[#FCF6C3] dark:bg-[#322A00]/80 border-b border-black/80 dark:border-white/20 text-slate-900 dark:text-white">
              <th className="py-2.5 px-4 font-bold text-[13px] tracking-wide border-r border-black/60 dark:border-white/20">
                COMPARATIVE STATEMENT
              </th>
              <th className="py-2.5 px-4 font-bold text-[12px] text-right w-32 border-r border-black/60 dark:border-white/20">
                {selectedFy}
              </th>
              <th className="py-2.5 px-4 font-bold text-[12px] text-right w-32 border-r border-black/60 dark:border-white/20">
                {previousFy}
              </th>
              <th className="py-2.5 px-4 font-bold text-[12px] text-right w-32">
                Variance
              </th>
            </tr>
            {/* Property / Ownership Subheader */}
            <tr className="bg-[#FEFAE0]/80 dark:bg-[#201C00]/60 border-b border-black/60 dark:border-white/10">
              <td className="py-2.5 px-4 border-r border-black/60 dark:border-white/20">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#DC2626] dark:text-[#F87171]">
                    Note 1 - {property.ownershipPercentage}% ownership
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {property.lotUnitIdentifier || 'Lot 5'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-700 dark:text-slate-300 mt-0.5 font-medium">
                  {property.addressLine1}, {property.city} {property.state} {property.postalCode}
                </div>
              </td>
              <td className="py-2.5 px-4 border-r border-black/60 dark:border-white/20"></td>
              <td className="py-2.5 px-4 border-r border-black/60 dark:border-white/20"></td>
              <td className="py-2.5 px-4"></td>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200/80 dark:divide-white/10 text-slate-800 dark:text-slate-200 font-mono">
            {/* Section 1: INCOME */}
            <tr className="bg-slate-50/50 dark:bg-white/[0.02]">
              <td colSpan={4} className="py-2 px-4 font-sans font-bold text-[11px] text-slate-900 dark:text-white uppercase tracking-wider">
                INCOME
              </td>
            </tr>

            {incomeRows.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                <td className="py-2 px-6 font-sans font-medium text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-white/10">
                  {item.category}
                </td>
                <td className="py-2 px-4 text-right border-r border-slate-200 dark:border-white/10">
                  {formatAccountingAmount(item.currentAmount)}
                </td>
                <td className="py-2 px-4 text-right border-r border-slate-200 dark:border-white/10">
                  {formatAccountingAmount(item.previousAmount)}
                </td>
                <td className="py-2 px-4 text-right">
                  {formatAccountingAmount(item.variance)}
                </td>
              </tr>
            ))}

            {/* Income Divider / Subtotal spacer */}
            <tr className="border-b border-black/40 dark:border-white/20">
              <td className="py-1 px-4 border-r border-slate-200 dark:border-white/10"></td>
              <td className="py-1 px-4 text-right border-r border-slate-200 dark:border-white/10">—</td>
              <td className="py-1 px-4 text-right border-r border-slate-200 dark:border-white/10">—</td>
              <td className="py-1 px-4 text-right">—</td>
            </tr>

            {/* Section 2: LESS: EXPENSES */}
            <tr className="bg-slate-50/50 dark:bg-white/[0.02]">
              <td colSpan={4} className="py-2 px-4 font-sans font-bold text-[11px] text-slate-900 dark:text-white uppercase tracking-wider">
                LESS: EXPENSES
              </td>
            </tr>

            {expenseRows.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                <td className="py-2 px-6 font-sans font-medium text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-white/10">
                  {item.category}
                </td>
                <td className="py-2 px-4 text-right border-r border-slate-200 dark:border-white/10">
                  {formatAccountingAmount(item.currentAmount)}
                </td>
                <td className="py-2 px-4 text-right border-r border-slate-200 dark:border-white/10">
                  {formatAccountingAmount(item.previousAmount)}
                </td>
                <td className="py-2 px-4 text-right">
                  {formatAccountingAmount(item.variance)}
                </td>
              </tr>
            ))}

            {/* Subtotal: Total Expenses */}
            <tr className="border-t-2 border-black/70 dark:border-white/30 font-bold bg-slate-50/80 dark:bg-white/[0.03]">
              <td className="py-2.5 px-4 font-sans text-slate-900 dark:text-white border-r border-black/40 dark:border-white/20">
                Total Expenses
              </td>
              <td className="py-2.5 px-4 text-right border-r border-black/40 dark:border-white/20">
                {formatAccountingAmount(totalExpensesCurrent)}
              </td>
              <td className="py-2.5 px-4 text-right border-r border-black/40 dark:border-white/20">
                {formatAccountingAmount(totalExpensesPrevious)}
              </td>
              <td className="py-2.5 px-4 text-right">
                {formatAccountingAmount(totalExpensesVariance)}
              </td>
            </tr>

            {/* Section 3: NET RENTAL PROPERTY PROFIT/(LOSS) - Yellow Row with Double Bottom Border */}
            <tr className="bg-[#FCF6C3] dark:bg-[#322A00]/80 border-t-2 border-b-4 border-double border-black/80 dark:border-white/40 font-bold text-slate-950 dark:text-white text-[12.5px]">
              <td className="py-3 px-4 font-sans border-r border-black/60 dark:border-white/20">
                NET RENTAL PROPERTY PROFIT/(LOSS)
              </td>
              <td className="py-3 px-4 text-right border-r border-black/60 dark:border-white/20 font-bold">
                {formatAccountingAmount(netRentalResultCurrent)}
              </td>
              <td className="py-3 px-4 text-right border-r border-black/60 dark:border-white/20 font-bold">
                {formatAccountingAmount(netRentalResultPrevious)}
              </td>
              <td className="py-3 px-4 text-right font-bold text-emerald-700 dark:text-emerald-400">
                {formatAccountingAmount(netRentalResultVariance)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 2. Summary KPI Cards Area (Prompt Section 3.5) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Selected FY Net Result */}
        <div className="p-4 rounded-xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#0B1728] shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            {selectedFy} Net Rental Result
          </span>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
            {formatAccountingAmount(netRentalResultCurrent, true)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Tax deductible net loss against individual assessable income.
          </p>
        </div>

        {/* Card 2: Previous FY Net Result */}
        <div className="p-4 rounded-xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#0B1728] shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            {previousFy} Prior Year Comparison
          </span>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
            {formatAccountingAmount(netRentalResultPrevious, true)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Prior financial year benchmark for statutory expense auditing.
          </p>
        </div>

        {/* Card 3: Year-over-Year Movement */}
        <div className="p-4 rounded-xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#0B1728] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              YoY Net Movement
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full',
                summary.hasImprovement
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
              )}
            >
              {summary.hasImprovement ? (
                <>
                  <TrendingUp className="w-3 h-3" />
                  <span>Improvement</span>
                </>
              ) : (
                <>
                  <TrendingDown className="w-3 h-3" />
                  <span>Increased Outlay</span>
                </>
              )}
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
            {summary.netRentalVarianceFormatted}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 leading-snug">
            {summary.narrative}
          </p>
        </div>
      </div>

      {/* Accounting Footnote & Reconciliation Notice */}
      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02] flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Accountant Note:</strong> Negative figures enclosed in parentheses indicate deductible net losses or decreased year-over-year expenditures. Figures reconcile directly to PropertyLedge ledger transactions and Australian tax depreciation schedules (Div 40 &amp; Div 43).
        </p>
      </div>
    </div>
  );
}
