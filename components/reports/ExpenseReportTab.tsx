'use client';

import React, { useMemo } from 'react';
import { TrendingDown, Users, Tag, Scale, Receipt } from 'lucide-react';
import {
  ExpenseReportDTO,
  TaxClassificationFinancialSummary,
  VendorFinancialSummary,
} from '@/modules/finance/domain/reporting-types';
import { buildCategoryQuarterlyData } from '@/lib/finance/category-report-data';
import { CategoryBreakdownAgGrid } from '@/components/reports/CategoryBreakdownAgGrid';
import { CategoryBreakdownMobileView } from '@/components/reports/CategoryBreakdownMobileView';

interface ExpenseReportTabProps {
  data: ExpenseReportDTO;
}

export function ExpenseReportTab({ data }: ExpenseReportTabProps) {
  const { kpis, monthlyExpenses, byOperationalCategory, byTaxClassification, byProperty, byVendor, transactions } = data;

  const formatCurrency = (val: number) => {
    return `$${val.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const categoryRows = useMemo(() => {
    return buildCategoryQuarterlyData(transactions || []);
  }, [transactions]);

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#08182A] border border-border rounded-2xl p-5 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Expenses</span>
          <div className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">
            {formatCurrency(kpis.totalExpenses)}
          </div>
          <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">{kpis.transactionCount} transactions</div>
        </div>

        <div className="bg-white dark:bg-[#08182A] border border-border rounded-2xl p-5 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">ATO Deductible (100%)</span>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(kpis.deductibleExpenses)}
          </div>
          <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">Repairs, rates, insurance & management</div>
        </div>

        <div className="bg-white dark:bg-[#08182A] border border-border rounded-2xl p-5 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Capital Works (Div 43)</span>
          <div className="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400">
            {formatCurrency(kpis.capitalExpenses)}
          </div>
          <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">Structural improvements / depreciation</div>
        </div>

        <div className="bg-white dark:bg-[#08182A] border border-border rounded-2xl p-5 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">GST Paid on Purchases</span>
          <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {formatCurrency(kpis.gstPaid)}
          </div>
          <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">Input tax credits for claim</div>
        </div>
      </div>

      {/* Category Breakdown Table (Desktop AG Grid Master-Detail + Mobile View) */}
      <div className="space-y-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Category Breakdown & ATO Deductions
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Quarterly breakdown of fixed ATO statutory expenses and property ledger entries with master-detail transactions.
          </p>
        </div>

        <div className="hidden md:block">
          <CategoryBreakdownAgGrid
            rows={categoryRows}
            totalExpenses={kpis.totalExpenses}
            propertyId={data?.filters?.propertyId || undefined}
            financialYear={data?.filters?.financialYear}
          />
        </div>

        <div className="md:hidden">
          <CategoryBreakdownMobileView
            rows={categoryRows}
            totalExpenses={kpis.totalExpenses}
            propertyId={data?.filters?.propertyId || undefined}
            financialYear={data?.filters?.financialYear}
          />
        </div>
      </div>

      {/* Tax Classification & Vendor Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expenses by Tax Classification */}
        <div className="bg-white dark:bg-[#08182A] border border-border rounded-2xl p-6 shadow-2xs">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">ATO Tax Classification Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                  <th className="py-2.5 px-2">Classification</th>
                  <th className="py-2.5 px-2 text-right">Count</th>
                  <th className="py-2.5 px-2 text-right">Amount ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                {byTaxClassification.map((t: TaxClassificationFinancialSummary) => (
                  <tr key={t.classificationId} className="hover:bg-slate-50/50 dark:hover:bg-[#0B1D30]/40">
                    <td className="py-2.5 px-2 font-medium text-slate-800 dark:text-slate-200">{t.classificationName}</td>
                    <td className="py-2.5 px-2 text-right text-slate-400">{t.transactionCount}</td>
                    <td className="py-2.5 px-2 text-right font-bold text-slate-900 dark:text-white">
                      {formatCurrency(t.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Vendors */}
        <div className="bg-white dark:bg-[#08182A] border border-border rounded-2xl p-6 shadow-2xs">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Top Payees / Vendors</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                  <th className="py-2.5 px-2">Payee / Vendor</th>
                  <th className="py-2.5 px-2 text-right">Invoices</th>
                  <th className="py-2.5 px-2 text-right">Total Spent ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                {byVendor.slice(0, 10).map((v: VendorFinancialSummary) => (
                  <tr key={v.vendorName} className="hover:bg-slate-50/50 dark:hover:bg-[#0B1D30]/40">
                    <td className="py-2.5 px-2 font-medium text-slate-800 dark:text-slate-200">{v.vendorName}</td>
                    <td className="py-2.5 px-2 text-right text-slate-400">{v.transactionCount}</td>
                    <td className="py-2.5 px-2 text-right font-bold text-rose-600 dark:text-rose-400">
                      {formatCurrency(v.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
