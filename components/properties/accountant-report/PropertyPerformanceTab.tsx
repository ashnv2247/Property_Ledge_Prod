'use client';

import React, { useState } from 'react';
import { Percent, TrendingUp, DollarSign, Calculator, HelpCircle, Edit3 } from 'lucide-react';
import { PropertyPerformance } from '@/modules/properties/domain/accountant-report-types';
import { formatCurrency } from '@/lib/format/currency';

interface PropertyPerformanceTabProps {
  performance: PropertyPerformance;
  financialYearLabel: string;
}

export function PropertyPerformanceTab({
  performance,
  financialYearLabel,
}: PropertyPerformanceTabProps) {
  // Allow user to dynamically adjust property valuation to model different yields
  const [propertyValue, setPropertyValue] = useState<number>(performance.propertyValue || 650000);
  const [isEditingValuation, setIsEditingValuation] = useState(false);

  const grossRent = performance.grossRent;
  const totalExpenses = performance.totalExpenses;

  // Dynamic calculations based on adjusted or baseline valuation
  const grossYield = propertyValue > 0 ? ((grossRent / propertyValue) * 100).toFixed(2) : '0.00';
  const netCashPosition = grossRent - totalExpenses;
  const netYield = propertyValue > 0 ? ((netCashPosition / propertyValue) * 100).toFixed(2) : '0.00';
  const expenseRatio = grossRent > 0 ? ((totalExpenses / grossRent) * 100).toFixed(2) : '0.00';

  return (
    <div className="space-y-6">
      {/* Base Inputs Bar at Top */}
      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-700/80">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-teal-400" />
              <span>Investment Performance Inputs ({financialYearLabel})</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Authoritative financial figures used to compute annual investor return metrics.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsEditingValuation(!isEditingValuation)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-650 text-slate-200 border border-slate-600 transition-colors w-fit"
          >
            <Edit3 className="w-3.5 h-3.5 text-teal-400" />
            <span>{isEditingValuation ? 'Done Editing' : 'Adjust Valuation'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 text-sm">
          {/* Base Input 1: Property Value */}
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              Property Value
            </span>
            {isEditingValuation ? (
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-mono">$</span>
                <input
                  type="number"
                  aria-label="Property Valuation"
                  value={propertyValue}
                  onChange={(e) => setPropertyValue(Math.max(1, Number(e.target.value)))}
                  className="w-full h-8 px-2 text-sm font-mono font-bold rounded-lg bg-slate-900 border border-teal-500 text-teal-300 focus:outline-none"
                />
              </div>
            ) : (
              <p className="font-mono text-xl font-bold text-slate-100">
                {formatCurrency(propertyValue)}
              </p>
            )}
            <span className="text-[11px] text-slate-500">Asset purchase / market valuation</span>
          </div>

          {/* Base Input 2: Gross Rent */}
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              Annual Gross Rent
            </span>
            <p className="font-mono text-xl font-bold text-teal-400">
              {formatCurrency(grossRent)}
            </p>
            <span className="text-[11px] text-slate-500">Total rent received during {financialYearLabel}</span>
          </div>

          {/* Base Input 3: Total Expenses */}
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              Total Expenses
            </span>
            <p className="font-mono text-xl font-bold text-rose-400">
              {formatCurrency(totalExpenses)}
            </p>
            <span className="text-[11px] text-slate-500">Deductible outgoings & maintenance</span>
          </div>
        </div>
      </div>

      {/* 4 Metric Cards in 2x2 Desktop Grid / 1 Column Mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Gross Rental Yield */}
        <div className="bg-slate-800 rounded-2xl p-6 sm:p-8 border border-slate-700 shadow-xl hover:border-slate-600 transition-colors flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Metric 01
              </span>
              <h4 className="text-lg font-bold text-slate-100 mt-1">
                Gross Rental Yield
              </h4>
            </div>
            <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <Percent className="w-5 h-5" />
            </div>
          </div>

          <div className="my-6">
            <div className="font-mono text-4xl font-extrabold text-teal-400 tracking-tight">
              {grossYield}%
            </div>
          </div>

          <div className="pt-4 border-t border-slate-700/80">
            <p className="text-xs font-semibold text-slate-300 mb-1">Mathematical Formula:</p>
            <p className="font-mono text-xs text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
              (Annual Gross Rent / Property Value) × 100
            </p>
            <p className="font-mono text-[11px] text-teal-400/90 mt-2">
              ({formatCurrency(grossRent)} / {formatCurrency(propertyValue)}) × 100 = {grossYield}%
            </p>
          </div>
        </div>

        {/* Card 2: Net Rental Yield */}
        <div className="bg-slate-800 rounded-2xl p-6 sm:p-8 border border-slate-700 shadow-xl hover:border-slate-600 transition-colors flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Metric 02
              </span>
              <h4 className="text-lg font-bold text-slate-100 mt-1">
                Net Rental Yield
              </h4>
            </div>
            <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <div className="my-6">
            <div className="font-mono text-4xl font-extrabold text-teal-400 tracking-tight">
              {netYield}%
            </div>
          </div>

          <div className="pt-4 border-t border-slate-700/80">
            <p className="text-xs font-semibold text-slate-300 mb-1">Mathematical Formula:</p>
            <p className="font-mono text-xs text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
              ((Annual Gross Rent - Total Expenses) / Property Value) × 100
            </p>
            <p className="font-mono text-[11px] text-teal-400/90 mt-2">
              (({formatCurrency(grossRent)} - {formatCurrency(totalExpenses)}) / {formatCurrency(propertyValue)}) × 100 = {netYield}%
            </p>
          </div>
        </div>

        {/* Card 3: Net Cash Position */}
        <div className="bg-slate-800 rounded-2xl p-6 sm:p-8 border border-slate-700 shadow-xl hover:border-slate-600 transition-colors flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Metric 03
              </span>
              <h4 className="text-lg font-bold text-slate-100 mt-1">
                Net Cash Position
              </h4>
            </div>
            <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          <div className="my-6">
            <div
              className={`font-mono text-4xl font-extrabold tracking-tight ${
                netCashPosition >= 0 ? 'text-teal-400' : 'text-rose-400'
              }`}
            >
              {formatCurrency(netCashPosition)}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-700/80">
            <p className="text-xs font-semibold text-slate-300 mb-1">Mathematical Formula:</p>
            <p className="font-mono text-xs text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
              Annual Gross Rent - Total Expenses
            </p>
            <p className="font-mono text-[11px] text-teal-400/90 mt-2">
              {formatCurrency(grossRent)} - {formatCurrency(totalExpenses)} = {formatCurrency(netCashPosition)}
            </p>
          </div>
        </div>

        {/* Card 4: Expense Ratio */}
        <div className="bg-slate-800 rounded-2xl p-6 sm:p-8 border border-slate-700 shadow-xl hover:border-slate-600 transition-colors flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Metric 04
              </span>
              <h4 className="text-lg font-bold text-slate-100 mt-1">
                Expense Ratio
              </h4>
            </div>
            <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <Percent className="w-5 h-5" />
            </div>
          </div>

          <div className="my-6">
            <div className="font-mono text-4xl font-extrabold text-teal-400 tracking-tight">
              {expenseRatio}%
            </div>
          </div>

          <div className="pt-4 border-t border-slate-700/80">
            <p className="text-xs font-semibold text-slate-300 mb-1">Mathematical Formula:</p>
            <p className="font-mono text-xs text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
              (Total Expenses / Annual Gross Rent) × 100
            </p>
            <p className="font-mono text-[11px] text-teal-400/90 mt-2">
              ({formatCurrency(totalExpenses)} / {formatCurrency(grossRent)}) × 100 = {expenseRatio}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
