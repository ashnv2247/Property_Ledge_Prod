'use client';

import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Edit2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format/currency';

export interface InvestorYieldsData {
  propertyValue?: number;
  currentYearLabel?: string;
  priorYearLabel?: string;
  currentRent?: number;
  priorRent?: number;
  currentExpenses?: number;
  priorExpenses?: number;
  className?: string;
}

export function InvestorYieldsWidget({
  propertyValue: initialPropertyValue = 650000,
  currentYearLabel = '2024/25',
  priorYearLabel = '2023/24',
  currentRent = 28600,
  priorRent = 26000,
  currentExpenses = 6918,
  priorExpenses = 8720,
  className,
}: InvestorYieldsData) {
  const [propertyValue, setPropertyValue] = useState<number>(initialPropertyValue);
  const [isEditingValue, setIsEditingValue] = useState(false);
  const [inputValue, setInputValue] = useState(initialPropertyValue.toString());

  // Clean Year Labels against NaN
  const safeCurrentYear = !currentYearLabel || currentYearLabel.toLowerCase().includes('nan') ? '2024/25' : currentYearLabel;
  const safePriorYear = !priorYearLabel || priorYearLabel.toLowerCase().includes('nan') ? '2023/24' : priorYearLabel;

  // Safe Financial Inputs
  const safePropertyValue = typeof propertyValue === 'number' && !isNaN(propertyValue) && propertyValue > 0 ? propertyValue : 650000;
  const safePriorRent = typeof priorRent === 'number' && !isNaN(priorRent) && priorRent > 0 ? priorRent : 26000;
  const safeCurrentRent = typeof currentRent === 'number' && !isNaN(currentRent) && currentRent > 0 ? currentRent : 28600;
  const safePriorExpenses = typeof priorExpenses === 'number' && !isNaN(priorExpenses) && priorExpenses > 0 ? priorExpenses : 8720;
  const safeCurrentExpenses = typeof currentExpenses === 'number' && !isNaN(currentExpenses) && currentExpenses > 0 ? currentExpenses : 6918;

  // 1. Gross Yield = (Gross Rent / Property Value) * 100
  const priorGrossYield = (safePriorRent / safePropertyValue) * 100;
  const currentGrossYield = (safeCurrentRent / safePropertyValue) * 100;
  const grossYieldDiff = currentGrossYield - priorGrossYield;

  // 2. Net Yield = ((Gross Rent - Expenses) / Property Value) * 100
  const priorNetCash = safePriorRent - safePriorExpenses;
  const currentNetCash = safeCurrentRent - safeCurrentExpenses;
  const priorNetYield = (priorNetCash / safePropertyValue) * 100;
  const currentNetYield = (currentNetCash / safePropertyValue) * 100;
  const netYieldDiff = currentNetYield - priorNetYield;

  // 3. Expense Ratio = (Expenses / Gross Rent) * 100
  const priorExpenseRatio = safePriorRent > 0 ? (safePriorExpenses / safePriorRent) * 100 : 0;
  const currentExpenseRatio = safeCurrentRent > 0 ? (safeCurrentExpenses / safeCurrentRent) * 100 : 0;
  const expenseRatioDiff = currentExpenseRatio - priorExpenseRatio;

  // 4. Cash-on-Cash Return (assumes standard 20% equity down payment: 0.20 * propertyValue)
  const estimatedEquity = safePropertyValue * 0.2;
  const priorCashOnCash = (priorNetCash / estimatedEquity) * 100;
  const currentCashOnCash = (currentNetCash / estimatedEquity) * 100;
  const cashOnCashDiff = currentCashOnCash - priorCashOnCash;

  // 5. Operating Profit Margin = (Net Operating Income / Gross Rent) * 100
  const priorOperatingMargin = safePriorRent > 0 ? (priorNetCash / safePriorRent) * 100 : 0;
  const currentOperatingMargin = safeCurrentRent > 0 ? (currentNetCash / safeCurrentRent) * 100 : 0;
  const operatingMarginDiff = currentOperatingMargin - priorOperatingMargin;

  // Cards definitions
  const kpiCards = [
    {
      id: 'gross-yield',
      label: 'GROSS YIELD',
      badgeColor: 'text-[#008F83] dark:text-[#32D5C4]',
      borderAccent: 'border-[#008F83]/40 dark:border-[#008F83]/50',
      leftBar: 'bg-[#008F83]',
      bgGradient: 'bg-white dark:bg-[#071822] hover:border-[#008F83]',
      priorValue: `${priorGrossYield.toFixed(2)}%`,
      priorYear: safePriorYear,
      currentValue: `${currentGrossYield.toFixed(2)}%`,
      currentYear: safeCurrentYear,
      diffText: `${grossYieldDiff >= 0 ? '+' : ''}${grossYieldDiff.toFixed(2)}%`,
      isPositive: grossYieldDiff >= 0,
      invertTrendColor: false,
    },
    {
      id: 'net-yield',
      label: 'NET YIELD',
      badgeColor: 'text-amber-600 dark:text-[#F3BA63]',
      borderAccent: 'border-amber-500/30 dark:border-[#B58D54]/40',
      leftBar: 'bg-amber-500',
      bgGradient: 'bg-white dark:bg-[#161414] hover:border-amber-500/60',
      priorValue: `${priorNetYield.toFixed(2)}%`,
      priorYear: safePriorYear,
      currentValue: `${currentNetYield.toFixed(2)}%`,
      currentYear: safeCurrentYear,
      diffText: `${netYieldDiff >= 0 ? '+' : ''}${netYieldDiff.toFixed(2)}%`,
      isPositive: netYieldDiff >= 0,
      invertTrendColor: false,
    },
    {
      id: 'expense-ratio',
      label: 'EXPENSE RATIO',
      badgeColor: 'text-indigo-600 dark:text-[#A5B4FC]',
      borderAccent: 'border-indigo-500/30 dark:border-[#384166]/50',
      leftBar: 'bg-indigo-500',
      bgGradient: 'bg-white dark:bg-[#101322] hover:border-indigo-500/60',
      priorValue: `${priorExpenseRatio.toFixed(1)}%`,
      priorYear: safePriorYear,
      currentValue: `${currentExpenseRatio.toFixed(1)}%`,
      currentYear: safeCurrentYear,
      diffText: `${expenseRatioDiff <= 0 ? '' : '+'}${expenseRatioDiff.toFixed(1)}%`,
      isPositive: expenseRatioDiff <= 0,
      invertTrendColor: true,
    },
    {
      id: 'cash-on-cash',
      label: 'CASH-ON-CASH RETURN',
      badgeColor: 'text-sky-600 dark:text-sky-400',
      borderAccent: 'border-sky-500/30 dark:border-sky-500/40',
      leftBar: 'bg-sky-500',
      bgGradient: 'bg-white dark:bg-[#081828] hover:border-sky-500/60',
      priorValue: `${priorCashOnCash.toFixed(1)}%`,
      priorYear: safePriorYear,
      currentValue: `${currentCashOnCash.toFixed(1)}%`,
      currentYear: safeCurrentYear,
      diffText: `${cashOnCashDiff >= 0 ? '+' : ''}${cashOnCashDiff.toFixed(1)}%`,
      isPositive: cashOnCashDiff >= 0,
      invertTrendColor: false,
    },
    {
      id: 'operating-margin',
      label: 'OPERATING MARGIN',
      badgeColor: 'text-emerald-600 dark:text-emerald-400',
      borderAccent: 'border-emerald-500/30 dark:border-emerald-500/40',
      leftBar: 'bg-emerald-500',
      bgGradient: 'bg-white dark:bg-[#0A1A16] hover:border-emerald-500/60',
      priorValue: `${priorOperatingMargin.toFixed(1)}%`,
      priorYear: safePriorYear,
      currentValue: `${currentOperatingMargin.toFixed(1)}%`,
      currentYear: safeCurrentYear,
      diffText: `${operatingMarginDiff >= 0 ? '+' : ''}${operatingMarginDiff.toFixed(1)}%`,
      isPositive: operatingMarginDiff >= 0,
      invertTrendColor: false,
    },
  ];

  const savePropertyValue = () => {
    const parsed = parseFloat(inputValue.replace(/[^0-9.]/g, ''));
    if (!isNaN(parsed) && parsed > 0) {
      setPropertyValue(parsed);
    }
    setIsEditingValue(false);
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header Label */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs sm:text-sm font-bold tracking-wider text-slate-800 dark:text-slate-100 uppercase flex items-center gap-2">
          INVESTOR YIELDS & KPIS
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 lowercase">
            ({safePriorYear} vs {safeCurrentYear})
          </span>
        </h3>
      </div>

      {/* Grid Layout (No horizontal scrolling) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {kpiCards.map((card) => {
          const showGreen = card.invertTrendColor ? card.isPositive : card.isPositive;
          return (
            <div
              key={card.id}
              className={cn(
                'relative w-full rounded-2xl border p-4 shadow-2xs transition-all duration-200 flex flex-col justify-between overflow-hidden',
                card.borderAccent,
                card.bgGradient
              )}
            >
              {/* Left accent color strip */}
              <div className={cn('absolute left-0 top-0 bottom-0 w-1.5', card.leftBar)} />

              {/* Card Title */}
              <div className="flex items-center justify-between pl-1 mb-2">
                <span className={cn('text-[11px] font-bold tracking-wider uppercase truncate', card.badgeColor)}>
                  {card.label}
                </span>
              </div>

              {/* Main Comparative Values: Prior vs Current */}
              <div className="pl-1 flex items-baseline justify-between gap-1 my-1">
                {/* Prior Year Value */}
                <div className="flex-1 min-w-0">
                  <div className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-white tabular-nums tracking-tight truncate">
                    {card.priorValue}
                  </div>
                  <div className="text-[10px] font-medium text-slate-400 dark:text-slate-400 mt-0.5 truncate">
                    {card.priorYear}
                  </div>
                </div>

                {/* VS Indicator */}
                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 px-1 select-none shrink-0">
                  vs
                </span>

                {/* Current Year Value with Trend Diff */}
                <div className="flex-1 min-w-0 text-right">
                  <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight truncate">
                    {card.currentValue}
                  </div>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    <span className="text-[10px] font-medium text-slate-400 dark:text-slate-400 truncate">
                      {card.currentYear}
                    </span>
                    <span
                      className={cn(
                        'inline-flex items-center gap-0.5 text-[10px] font-bold tabular-nums shrink-0',
                        showGreen ? 'text-[#008F83] dark:text-[#32D5C4]' : 'text-rose-600 dark:text-rose-400'
                      )}
                    >
                      {card.isPositive ? (
                        <TrendingUp className="w-2.5 h-2.5 inline-block shrink-0" />
                      ) : (
                        <TrendingDown className="w-2.5 h-2.5 inline-block shrink-0" />
                      )}
                      {card.diffText}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Footnote with property valuation editing */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span>* Calculations are based on user-entered property value</span>
          {isEditingValue ? (
            <span className="inline-flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-[#008F83]">
              <span>$</span>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && savePropertyValue()}
                className="w-24 text-xs font-bold text-slate-900 dark:text-white bg-transparent focus:outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={savePropertyValue}
                className="text-[#008F83] hover:text-[#007A70] p-0.5"
                title="Save"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setIsEditingValue(false)}
                className="text-slate-400 hover:text-slate-600 p-0.5"
                title="Cancel"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => {
                setInputValue(safePropertyValue.toString());
                setIsEditingValue(true);
              }}
              className="font-bold text-slate-700 dark:text-slate-300 underline decoration-dotted hover:text-[#008F83] dark:hover:text-[#32D5C4] inline-flex items-center gap-1 transition-colors"
              title="Click to edit property valuation"
            >
              ({formatCurrency(safePropertyValue)})
              <Edit2 className="w-2.5 h-2.5 opacity-60 hover:opacity-100" />
            </button>
          )}
          <span>and rent estimates.</span>
        </div>
      </div>
    </div>
  );
}

export default InvestorYieldsWidget;
