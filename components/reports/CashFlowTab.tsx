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
  const safeKpis = kpis || {
    totalInflow: 0,
    totalOutflow: 0,
    netCashFlow: 0,
    operatingMargin: 0,
    monthlyAverageIncome: 0,
    monthlyAverageExpenses: 0,
    monthlyAverageNet: 0,
  };

  const safeMonthlyCashFlow = monthlyCashFlow || [];
  const safeQuarterlyCashFlow = quarterlyCashFlow || [];

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
    ? safeMonthlyCashFlow.find((m) => m?.key === selectedMonthKey)
    : null;

  const currentIncome = activeMonth
    ? activeMonth.income
    : (safeKpis.monthlyAverageIncome || (safeKpis.totalInflow / (safeMonthlyCashFlow.length || 12)));

  const currentExpenses = activeMonth
    ? activeMonth.expenses
    : (safeKpis.monthlyAverageExpenses || (safeKpis.totalOutflow / (safeMonthlyCashFlow.length || 12)));

  const currentNet = activeMonth
    ? activeMonth.net
    : (safeKpis.monthlyAverageNet || (safeKpis.netCashFlow / (safeMonthlyCashFlow.length || 12)));

  const annualizedNet = currentNet * 12;

  // Property details
  const displayPropertyName = propertyContext?.propertyName || selectedProperty?.propertyName || 'Portfolio Overview';
  const displayAddress = propertyContext?.propertyAddress || (selectedProperty as any)?.address_line_1 || 'All Active Properties';
  const tenancyStatus = propertyContext?.tenancyStatus || 'Active';

  // Categories list
  const activeInflows = inflowCategories && inflowCategories.length > 0 ? inflowCategories : [
    { id: 'rent', name: 'Rental Income', amount: safeKpis.totalInflow, monthlyAverage: currentIncome }
  ];

  const activeOutflows = outflowCategories && outflowCategories.length > 0 ? outflowCategories : [
    { id: 'exp', name: 'Operating Outgoings', amount: safeKpis.totalOutflow, monthlyAverage: currentExpenses }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header Hero Card matching PropertyLedge Design System */}
      <div
        className="rounded-2xl border border-teal-600/30 overflow-hidden relative shadow-[0_4px_24px_rgba(0,143,131,0.18)] p-5 sm:p-6 text-white"
        style={{
          background:
            'radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.12), transparent 45%), linear-gradient(120deg, #007F78 0%, #009B91 50%, #008F83 100%)',
        }}
      >
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Monthly Cash Flow Statement
                <Info className="w-4 h-4 text-white/80 inline-block cursor-pointer hover:text-white transition-colors" />
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-white/90 font-medium mt-1">
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
                className="bg-white/15 hover:bg-white/20 text-white font-medium text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-white/30 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-white/40 cursor-pointer transition-all shadow-xs"
              >
                <option value="average" className="text-slate-900 bg-white">
                  {data?.filters?.financialYear ? `FY ${data.filters.financialYear} — Monthly Average` : 'Monthly Average'}
                </option>
                {safeMonthlyCashFlow.map((m) => (
                  <option key={m.key} value={m.key} className="text-slate-900 bg-white">
                    {m.label} ({formatCurrency(m.net)})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Row (3 Large Cards matching PropertyLedge Style) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Key Metrics</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Gross Monthly Income */}
          <div className="bg-white dark:bg-[#0B1726] border border-border rounded-2xl p-5 lg:p-6 shadow-2xs relative overflow-hidden transition-all hover:border-slate-300 dark:hover:border-slate-700">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-[12px] font-semibold uppercase tracking-wider flex items-center gap-1.5">
                Gross Monthly Income
                <Info className="w-3.5 h-3.5 text-slate-400" />
              </span>
              <div className="w-9 h-9 rounded-xl bg-[#008F83]/10 flex items-center justify-center text-[#008F83] dark:text-[#32D5C4]">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-bold text-slate-900 dark:text-white tracking-tight tabular-nums">
              {formatCurrency(currentIncome)}
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {selectedMonthKey === 'average' ? 'Annualized average inflow' : 'Actual inflow this period'}
            </div>
          </div>

          {/* Gross Monthly Expenses */}
          <div className="bg-white dark:bg-[#0B1726] border border-border rounded-2xl p-5 lg:p-6 shadow-2xs relative overflow-hidden transition-all hover:border-slate-300 dark:hover:border-slate-700">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-[12px] font-semibold uppercase tracking-wider flex items-center gap-1.5">
                Gross Monthly Expenses
                <Info className="w-3.5 h-3.5 text-slate-400" />
              </span>
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-bold text-rose-600 dark:text-rose-400 tracking-tight tabular-nums">
              {formatCurrency(currentExpenses)}
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {selectedMonthKey === 'average' ? 'Operating & interest outgoings' : 'Actual outgoings this period'}
            </div>
          </div>

          {/* Net Monthly Cash Flow */}
          <div className="bg-white dark:bg-[#0B1726] border border-border rounded-2xl p-5 lg:p-6 shadow-2xs relative overflow-hidden transition-all hover:border-slate-300 dark:hover:border-slate-700">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-[12px] font-semibold uppercase tracking-wider flex items-center gap-1.5">
                Net Monthly Cash Flow
                <Info className="w-3.5 h-3.5 text-slate-400" />
              </span>
              <div
                className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center font-bold',
                  currentNet >= 0
                    ? 'bg-[#008F83]/10 text-[#008F83] dark:text-[#32D5C4]'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                )}
              >
                {currentNet >= 0 ? '+' : '−'}
              </div>
            </div>
            <div
              className={cn(
                'mt-3 text-3xl font-bold tracking-tight tabular-nums',
                currentNet >= 0 ? 'text-[#008F83] dark:text-[#32D5C4]' : 'text-rose-600 dark:text-rose-400'
              )}
            >
              {currentNet < 0 ? `-${formatCurrency(Math.abs(currentNet))}` : formatCurrency(currentNet)}
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
              Annualized net: {annualizedNet < 0 ? `-${formatCurrency(Math.abs(annualizedNet))}` : formatCurrency(annualizedNet)} / yr
            </div>
          </div>
        </div>
      </div>

      {/* 3. Cash Flow Breakdown (Dual Column Inflow vs Outflow Table) */}
      <div className="bg-white dark:bg-[#08182A] border border-border rounded-2xl shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Cash Flow Breakdown</h3>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#E6F7F5] text-[#008F83] dark:bg-[#008F83]/15 dark:text-[#32D5C4] border border-[#008F83]/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Current Tenant: {tenancyStatus}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">
          {/* INFLOW (Income) Column */}
          <div className="flex flex-col">
            <div className="bg-[#008F83] text-white px-5 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-between">
              <span>INFLOW (Income)</span>
              <span>Amount ($)</span>
            </div>

            <div className="divide-y divide-border-subtle dark:divide-slate-800/60 flex-1">
              {activeInflows.map((item) => (
                <div key={item.id} className="px-5 py-3.5 flex items-center justify-between text-sm hover:bg-slate-50 dark:hover:bg-[#0B1D30]/40 transition-colors">
                  <span className="font-medium text-slate-800 dark:text-slate-200">{item.name}</span>
                  <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                    {formatCurrencyExact(selectedMonthKey === 'average' ? item.monthlyAverage : (item.amount / (safeMonthlyCashFlow.length || 12)))}
                  </span>
                </div>
              ))}
            </div>

            <div className="bg-slate-50/80 dark:bg-[#0B1D30]/60 p-4 border-t border-border flex items-center justify-between font-bold text-sm text-slate-900 dark:text-white mt-auto">
              <span>Total Inflow</span>
              <span className="text-[#008F83] dark:text-[#32D5C4] font-extrabold tabular-nums">
                {formatCurrencyExact(currentIncome)}
              </span>
            </div>
          </div>

          {/* OUTFLOW (Expenses) Column */}
          <div className="flex flex-col">
            <div className="bg-[#061222] dark:bg-[#071526] text-white px-5 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-between border-b border-[#17283A]">
              <span>OUTFLOW (Expenses)</span>
              <span>Amount ($)</span>
            </div>

            <div className="divide-y divide-border-subtle dark:divide-slate-800/60 flex-1">
              {activeOutflows.map((item) => (
                <div key={item.id} className="px-5 py-3.5 flex items-center justify-between text-sm hover:bg-slate-50 dark:hover:bg-[#0B1D30]/40 transition-colors">
                  <span className="font-medium text-slate-800 dark:text-slate-200">{item.name}</span>
                  <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                    {formatCurrencyExact(selectedMonthKey === 'average' ? item.monthlyAverage : (item.amount / (safeMonthlyCashFlow.length || 12)))}
                  </span>
                </div>
              ))}
            </div>

            <div className="bg-slate-50/80 dark:bg-[#0B1D30]/60 p-4 border-t border-border flex items-center justify-between font-bold text-sm text-slate-900 dark:text-white">
              <span>Total Outgoings</span>
              <span className="text-rose-600 dark:text-rose-400 font-extrabold tabular-nums">
                {formatCurrencyExact(currentExpenses)}
              </span>
            </div>

            {/* NET POSITION SECTION */}
            <div className="bg-slate-50/90 dark:bg-[#08182A] p-4.5 border-t border-border space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                NET POSITION
              </div>
              <div className="flex items-center justify-between text-sm font-bold">
                <span className="text-slate-800 dark:text-slate-200">Monthly Net Cash Flow</span>
                <span className={cn('text-base font-extrabold tabular-nums', currentNet >= 0 ? 'text-[#008F83] dark:text-[#32D5C4]' : 'text-rose-600 dark:text-rose-400')}>
                  {currentNet < 0 ? `-${formatCurrencyExact(Math.abs(currentNet))}` : formatCurrencyExact(currentNet)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1.5 border-t border-border-subtle dark:border-slate-800">
                <span>Estimated Annualized Cash Flow</span>
                <span className={cn('font-bold tabular-nums', annualizedNet >= 0 ? 'text-[#008F83] dark:text-[#32D5C4]' : 'text-rose-600 dark:text-rose-400')}>
                  {annualizedNet < 0 ? `-${formatCurrencyExact(Math.abs(annualizedNet))}` : formatCurrencyExact(annualizedNet)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Monthly Trajectory History Table */}
      <div className="bg-white dark:bg-[#08182A] border border-border rounded-2xl p-5 lg:p-6 shadow-2xs space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">12-Month Progression (July to June)</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Click any month to inspect that specific period&apos;s cash flow breakdown.
          </p>
        </div>
        <div className="overflow-x-auto -mx-1 sm:mx-0">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="border-b border-border-subtle text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50/60 dark:bg-[#0B1D30]/60">
                <th className="py-3 px-4 rounded-l-lg font-semibold">Month</th>
                <th className="py-3 px-4 text-right font-semibold">Inflow ($)</th>
                <th className="py-3 px-4 text-right font-semibold">Outflow ($)</th>
                <th className="py-3 px-4 text-right rounded-r-lg font-semibold">Net Cash ($)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle dark:divide-slate-800/50">
              {safeMonthlyCashFlow.map((m: MonthlyFinancialSummary) => {
                const isSelected = selectedMonthKey === m.key;
                return (
                  <tr
                    key={m.key}
                    onClick={() => setSelectedMonthKey(m.key)}
                    className={cn(
                      'hover:bg-slate-50 dark:hover:bg-[#0B1D30]/50 cursor-pointer transition-colors',
                      isSelected ? 'bg-[#008F83]/10 dark:bg-[#008F83]/15 font-semibold' : ''
                    )}
                  >
                    <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      {m.label}
                      {isSelected && (
                        <span className="text-[10px] bg-[#008F83] text-white font-bold px-2 py-0.5 rounded-full shadow-2xs">
                          Selected
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right text-[#008F83] dark:text-[#32D5C4] font-semibold tabular-nums">
                      {formatCurrencyExact(m.income)}
                    </td>
                    <td className="py-3 px-4 text-right text-rose-600 dark:text-rose-400 font-semibold tabular-nums">
                      {formatCurrencyExact(m.expenses)}
                    </td>
                    <td
                      className={cn(
                        'py-3 px-4 text-right font-bold tabular-nums',
                        m.net >= 0 ? 'text-[#008F83] dark:text-[#32D5C4]' : 'text-rose-600 dark:text-rose-400'
                      )}
                    >
                      {m.net < 0 ? `-${formatCurrencyExact(Math.abs(m.net))}` : formatCurrencyExact(m.net)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
export default CashFlowTab;
