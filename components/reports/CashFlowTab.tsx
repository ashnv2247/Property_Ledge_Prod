'use client';

import React, { useState } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Calendar,
  Download,
  Building,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  DollarSign,
} from 'lucide-react';
import { CashFlowReportDTO, MonthlyFinancialSummary } from '@/modules/finance/domain/reporting-types';
import { usePropertyContext } from '@/components/property/PropertyContext';
import { cn } from '@/lib/utils';

interface CashFlowTabProps {
  data: CashFlowReportDTO;
}

export function CashFlowTab({ data }: CashFlowTabProps) {
  const { kpis, monthlyCashFlow, quarterlyCashFlow, inflowCategories, outflowCategories, propertyContext } = data;
  const { selectedProperty } = usePropertyContext();

  // Mode: 'monthly-average' (as shown in user mockup) or specific month
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('average');

  const formatCurrency = (val: number | undefined | null) => {
    const num = Number(val || 0);
    return `$${num.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const formatCurrencyExact = (val: number | undefined | null) => {
    const num = Number(val || 0);
    return `$${num.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Resolve values based on selection: either annual monthly average or specific month
  const activeMonth = selectedMonthKey !== 'average'
    ? monthlyCashFlow.find((m) => m.key === selectedMonthKey)
    : null;

  const currentIncome = activeMonth
    ? activeMonth.income
    : (kpis.monthlyAverageIncome || (kpis.totalInflow / (monthlyCashFlow.length || 12)));

  const currentExpenses = activeMonth
    ? activeMonth.expenses
    : (kpis.monthlyAverageExpenses || (kpis.totalOutflow / (monthlyCashFlow.length || 12)));

  const currentNet = activeMonth
    ? activeMonth.net
    : (kpis.monthlyAverageNet || (kpis.netCashFlow / (monthlyCashFlow.length || 12)));

  const annualizedNet = currentNet * 12;

  // Property details
  const displayPropertyName = propertyContext?.propertyName || selectedProperty?.propertyName || 'Portfolio Overview';
  const displayAddress = propertyContext?.propertyAddress || (selectedProperty as any)?.address_line_1 || 'All Active Properties';
  const tenancyStatus = propertyContext?.tenancyStatus || 'Active';

  // Categories list
  const activeInflows = inflowCategories && inflowCategories.length > 0 ? inflowCategories : [
    { id: 'rent', name: 'Rental Income', amount: kpis.totalInflow, monthlyAverage: currentIncome }
  ];

  const activeOutflows = outflowCategories && outflowCategories.length > 0 ? outflowCategories : [
    { id: 'exp', name: 'Operating Outgoings', amount: kpis.totalOutflow, monthlyAverage: currentExpenses }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header Hero Card matching Property Statement Design */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0C3B2E] via-[#0D4435] to-[#0A2F25] text-white p-6 shadow-md border border-[#165040]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Monthly Cash Flow Statement
                <Info className="w-4 h-4 text-emerald-300/70 inline-block cursor-pointer hover:text-white transition-colors" />
              </h2>
            </div>
            <p className="text-sm text-emerald-100/80 font-medium mt-1">
              {displayPropertyName} — {displayAddress}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Month / Monthly Average Selector */}
            <div className="relative">
              <select
                aria-label="Select cash flow statement period"
                value={selectedMonthKey}
                onChange={(e) => setSelectedMonthKey(e.target.value)}
                className="bg-white/10 hover:bg-white/15 text-white font-medium text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-white/20 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer transition-all"
              >
                <option value="average" className="text-slate-900 bg-white">
                  {data.filters.financialYear ? `FY ${data.filters.financialYear} — Monthly Average` : 'Monthly Average'}
                </option>
                {monthlyCashFlow.map((m) => (
                  <option key={m.key} value={m.key} className="text-slate-900 bg-white">
                    {m.label} ({formatCurrency(m.net)})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Row (3 Large Cards matching Mockup) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Key Metrics</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Gross Monthly Income */}
          <div className="bg-white dark:bg-[#07111F] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-sm font-semibold flex items-center gap-1.5">
                Gross Monthly Income
                <Info className="w-3.5 h-3.5 text-slate-400" />
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {formatCurrency(currentIncome)}
            </div>
            <div className="mt-2 text-xs text-slate-400 dark:text-slate-500">
              {selectedMonthKey === 'average' ? 'Annualized average inflow' : 'Actual inflow this period'}
            </div>
          </div>

          {/* Gross Monthly Expenses */}
          <div className="bg-white dark:bg-[#07111F] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-sm font-semibold flex items-center gap-1.5">
                Gross Monthly Expenses
                <Info className="w-3.5 h-3.5 text-slate-400" />
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {formatCurrency(currentExpenses)}
            </div>
            <div className="mt-2 text-xs text-slate-400 dark:text-slate-500">
              {selectedMonthKey === 'average' ? 'Operating & interest outgoings' : 'Actual outgoings this period'}
            </div>
          </div>

          {/* Net Monthly Cash Flow (Highlight Card) */}
          <div className={cn(
            'border rounded-2xl p-6 shadow-xs relative overflow-hidden transition-all',
            currentNet >= 0
              ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40'
              : 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40'
          )}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                Net Monthly Cash Flow
                <Info className="w-3.5 h-3.5 text-slate-400" />
              </span>
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center font-bold',
                currentNet >= 0 ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
              )}>
                {currentNet >= 0 ? '+' : '−'}
              </div>
            </div>
            <div className={cn(
              'mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight',
              currentNet >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            )}>
              {currentNet < 0 ? `-${formatCurrency(Math.abs(currentNet))}` : formatCurrency(currentNet)}
            </div>
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
              Annualized net: {annualizedNet < 0 ? `-${formatCurrency(Math.abs(annualizedNet))}` : formatCurrency(annualizedNet)} / yr
            </div>
          </div>
        </div>
      </div>

      {/* 3. Cash Flow Breakdown (Dual Column Inflow vs Outflow Table matching Mockup) */}
      <div className="bg-white dark:bg-[#07111F] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Cash Flow Breakdown</h3>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Current Tenant: {tenancyStatus}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
          {/* INFLOW (Income) Column */}
          <div className="flex flex-col">
            <div className="bg-[#0C3B2E] text-white px-5 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-between">
              <span>INFLOW (Income)</span>
              <span>Amount ($)</span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/60 flex-1">
              {activeInflows.map((item) => (
                <div key={item.id} className="px-5 py-3.5 flex items-center justify-between text-sm hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <span className="font-medium text-slate-800 dark:text-slate-200">{item.name}</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {formatCurrencyExact(selectedMonthKey === 'average' ? item.monthlyAverage : (item.amount / (monthlyCashFlow.length || 12)))}
                  </span>
                </div>
              ))}
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/60 p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between font-bold text-sm text-slate-900 dark:text-white mt-auto">
              <span>Total Inflow</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                {formatCurrencyExact(currentIncome)}
              </span>
            </div>
          </div>

          {/* OUTFLOW (Expenses) Column */}
          <div className="flex flex-col">
            <div className="bg-[#0F223D] text-white px-5 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-between">
              <span>OUTFLOW (Expenses)</span>
              <span>Amount ($)</span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/60 flex-1">
              {activeOutflows.map((item) => (
                <div key={item.id} className="px-5 py-3.5 flex items-center justify-between text-sm hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <span className="font-medium text-slate-800 dark:text-slate-200">{item.name}</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {formatCurrencyExact(selectedMonthKey === 'average' ? item.monthlyAverage : (item.amount / (monthlyCashFlow.length || 12)))}
                  </span>
                </div>
              ))}
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/60 p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between font-bold text-sm text-slate-900 dark:text-white">
              <span>Total Outgoings</span>
              <span className="text-rose-600 dark:text-rose-400 font-extrabold">
                {formatCurrencyExact(currentExpenses)}
              </span>
            </div>

            {/* NET POSITION SECTION */}
            <div className="bg-slate-100 dark:bg-[#0B1728] p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <div className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                NET POSITION
              </div>
              <div className="flex items-center justify-between text-sm font-bold">
                <span className="text-slate-800 dark:text-slate-200">Monthly Net Cash Flow</span>
                <span className={cn('text-base', currentNet >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                  {currentNet < 0 ? `-${formatCurrencyExact(Math.abs(currentNet))}` : formatCurrencyExact(currentNet)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/50 dark:border-slate-800/50">
                <span>Estimated Annualized Cash Flow</span>
                <span className={cn('font-bold', annualizedNet >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                  {annualizedNet < 0 ? `-${formatCurrencyExact(Math.abs(annualizedNet))}` : formatCurrencyExact(annualizedNet)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Monthly Trajectory History Table */}
      <div className="bg-white dark:bg-[#07111F] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">12-Month Progression (July to June)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                <th className="py-2.5 px-3">Month</th>
                <th className="py-2.5 px-3 text-right">Inflow ($)</th>
                <th className="py-2.5 px-3 text-right">Outflow ($)</th>
                <th className="py-2.5 px-3 text-right">Net Cash ($)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {monthlyCashFlow.map((m: MonthlyFinancialSummary) => (
                <tr
                  key={m.key}
                  onClick={() => setSelectedMonthKey(m.key)}
                  className={cn(
                    'hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors',
                    selectedMonthKey === m.key ? 'bg-emerald-50/50 dark:bg-emerald-950/20 font-semibold' : ''
                  )}
                >
                  <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    {m.label}
                    {selectedMonthKey === m.key && (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-sm">Selected</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400 font-semibold">{formatCurrencyExact(m.income)}</td>
                  <td className="py-2.5 px-3 text-right text-rose-600 dark:text-rose-400 font-semibold">{formatCurrencyExact(m.expenses)}</td>
                  <td className={cn('py-2.5 px-3 text-right font-bold', m.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                    {formatCurrencyExact(m.net)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
export default CashFlowTab;
