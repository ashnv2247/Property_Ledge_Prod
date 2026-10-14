'use client';

import React, { useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Percent, GitCompare, Calendar } from 'lucide-react';
import { PropertyAccountantReportPayload } from '@/modules/properties/domain/accountant-report-types';
import { formatCurrency } from '@/lib/format/currency';
import { YearCompareTable } from './YearCompareTable';

interface FinancialSummaryTabProps {
  data: PropertyAccountantReportPayload;
  selectedYear: number;
  availableYears: { year: number; label: string }[];
  onYearChange: (year: number) => void;
}

export function FinancialSummaryTab({
  data,
  selectedYear,
  availableYears,
  onYearChange,
}: FinancialSummaryTabProps) {
  const [comparePastYear, setComparePastYear] = useState(true);
  const { summary, performance } = data;

  return (
    <div className="space-y-6">
      {/* Controls Bar: Year Selector & Compare Toggle */}
      <div className="bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-700 shadow-xl flex flex-wrap items-center justify-between gap-4">
        {/* Year Selector */}
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-teal-400" />
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Financial Year:
          </span>
          <select
            aria-label="Select Financial Year"
            value={selectedYear}
            onChange={(e) => onYearChange(Number(e.target.value))}
            className="h-9 px-3 text-sm font-semibold rounded-xl bg-slate-900 border border-slate-700 text-teal-300 focus:outline-none focus:ring-1 focus:ring-teal-400 cursor-pointer"
          >
            {availableYears.map((fy) => (
              <option key={fy.year} value={fy.year}>
                {fy.label}
              </option>
            ))}
          </select>
        </div>

        {/* Compare Past Year Toggle */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-300">Compare Past Year</span>
          <button
            type="button"
            role="switch"
            aria-checked={comparePastYear}
            onClick={() => setComparePastYear(!comparePastYear)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              comparePastYear ? 'bg-teal-500' : 'bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                comparePastYear ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* 5 Key ATO Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Gross Rent */}
        <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700 shadow-xl hover:border-slate-600 transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Gross Rent</span>
            <DollarSign className="w-4 h-4 text-teal-400" />
          </div>
          <div className="my-1">
            <p className="font-mono text-2xl font-bold text-slate-100">
              {formatCurrency(summary.grossRent)}
            </p>
          </div>
          <p className="text-[11px] text-slate-400">Total annual rental income</p>
        </div>

        {/* Card 2: Total Expenses */}
        <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700 shadow-xl hover:border-slate-600 transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Expenses</span>
            <TrendingDown className="w-4 h-4 text-rose-400" />
          </div>
          <div className="my-1">
            <p className="font-mono text-2xl font-bold text-rose-400">
              {formatCurrency(summary.totalExpenses)}
            </p>
          </div>
          <p className="text-[11px] text-slate-400">Operating & deductible costs</p>
        </div>

        {/* Card 3: Net Cash Position */}
        <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700 shadow-xl hover:border-slate-600 transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Net Position</span>
            <TrendingUp className="w-4 h-4 text-teal-400" />
          </div>
          <div className="my-1">
            <p
              className={`font-mono text-2xl font-bold ${
                summary.netCashPosition >= 0 ? 'text-teal-400' : 'text-rose-400'
              }`}
            >
              {formatCurrency(summary.netCashPosition)}
            </p>
          </div>
          <p className="text-[11px] text-slate-400">Pre-tax cash flow</p>
        </div>

        {/* Card 4: Gross Yield */}
        <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700 shadow-xl hover:border-slate-600 transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Gross Yield</span>
            <Percent className="w-4 h-4 text-teal-400" />
          </div>
          <div className="my-1">
            <p className="font-mono text-2xl font-bold text-teal-400">
              {summary.grossYield.toFixed(2)}%
            </p>
          </div>
          <p className="text-[11px] text-slate-400 font-mono">Rent / Property Value</p>
        </div>

        {/* Card 5: Net Yield */}
        <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700 shadow-xl hover:border-slate-600 transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Net Yield</span>
            <Percent className="w-4 h-4 text-teal-400" />
          </div>
          <div className="my-1">
            <p className="font-mono text-2xl font-bold text-teal-400">
              {summary.netYield.toFixed(2)}%
            </p>
          </div>
          <p className="text-[11px] text-slate-400 font-mono">(Rent - Exp) / Value</p>
        </div>
      </div>

      {/* Side-By-Side Comparison Table or Standard Summary */}
      {comparePastYear ? (
        <YearCompareTable comparison={data.yoyComparison} />
      ) : (
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl">
          <h3 className="text-base font-bold text-slate-100 mb-4">
            Financial Summary Overview ({data.financialYearLabel})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-slate-700">
                <span className="text-slate-400">Property Valuation</span>
                <span className="font-mono font-bold text-slate-100">
                  {formatCurrency(performance.propertyValue)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-700">
                <span className="text-slate-400">Annual Gross Rent</span>
                <span className="font-mono font-bold text-teal-400">
                  {formatCurrency(summary.grossRent)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-700">
                <span className="text-slate-400">Operating Expenses</span>
                <span className="font-mono font-bold text-rose-400">
                  {formatCurrency(summary.totalExpenses)}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-slate-700">
                <span className="text-slate-400">Net Cash Position</span>
                <span className="font-mono font-bold text-teal-400">
                  {formatCurrency(summary.netCashPosition)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-700">
                <span className="text-slate-400">Expense-to-Rent Ratio</span>
                <span className="font-mono font-bold text-slate-100">
                  {summary.expenseRatio.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-700">
                <span className="text-slate-400">Net Return On Asset</span>
                <span className="font-mono font-bold text-teal-400">
                  {summary.netYield.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
