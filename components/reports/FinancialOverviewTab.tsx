'use client';

import dynamic from 'next/dynamic';
import { FinancialOverviewReportDTO } from '@/modules/finance/domain/reporting-types';
import { FinancialKpiCards } from '@/components/reports/FinancialKpiCards';

const IncomeExpenseAnalytics = dynamic(
  () => import('@/components/reports/IncomeExpenseAnalytics').then((mod) => mod.IncomeExpenseAnalytics),
  {
    ssr: false,
    loading: () => (
      <div className="h-80 w-full flex items-center justify-center animate-pulse bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200/80 dark:border-slate-800">
        <span className="text-xs text-slate-400">Loading analytics chart...</span>
      </div>
    ),
  }
);
import { MonthlyBreakdownTable } from '@/components/reports/MonthlyBreakdownTable';
import { CategoryBreakdownSection } from '@/components/reports/CategoryBreakdownSection';

interface FinancialOverviewTabProps {
  data: FinancialOverviewReportDTO;
}

export function FinancialOverviewTab({ data }: FinancialOverviewTabProps) {
  const { kpis, monthlyTrends, incomeByCategory, expenseByCategory } = data;

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* 1. Primary 3-KPI Cards Row */}
      <FinancialKpiCards
        totalIncome={kpis.totalIncome}
        totalExpenses={kpis.totalExpenses}
        netResult={kpis.netResult}
        transactionCount={kpis.transactionCount}
      />

      {/* 2. Main Analytics Section (68% / 32% Grid): Chart & Financial Snapshot */}
      <IncomeExpenseAnalytics
        monthlyTrends={monthlyTrends}
        totalIncome={kpis.totalIncome}
        totalExpenses={kpis.totalExpenses}
        netResult={kpis.netResult}
        gstCollected={kpis.gstCollected}
        gstPaid={kpis.gstPaid}
        netGstPayable={kpis.netGstPayable}
      />

      {/* 3. Monthly Financial Breakdown Table */}
      <MonthlyBreakdownTable
        monthlyTrends={monthlyTrends}
        totalIncome={kpis.totalIncome}
        totalExpenses={kpis.totalExpenses}
        netResult={kpis.netResult}
        totalGstCollected={kpis.gstCollected}
        totalGstPaid={kpis.gstPaid}
      />

      {/* 4. Category Analytics Section (Two Columns) */}
      <CategoryBreakdownSection
        incomeCategories={incomeByCategory}
        expenseCategories={expenseByCategory}
        totalIncome={kpis.totalIncome}
        totalExpenses={kpis.totalExpenses}
      />
    </div>
  );
}
export default FinancialOverviewTab;
