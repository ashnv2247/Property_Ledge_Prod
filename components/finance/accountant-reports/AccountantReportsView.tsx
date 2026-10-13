'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileText,
  FileCheck2,
  Receipt,
  Download,
  Building,
  Calendar,
  Filter,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  X,
  FileSpreadsheet,
  AlertCircle,
  Image as ImageIcon,
  ShieldCheck,
  FileX2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/admin/ui';
import { Button } from '@/components/admin/ui/Button';
import { Badge } from '@/components/admin/ui/Badge';
import { useToast } from '@/components/admin/ui/Toast';
import { formatCurrency } from '@/lib/format/currency';
import {
  getCurrentFinancialYearNumber,
  getFinancialYears,
  getFinancialYearLabel,
} from '@/lib/finance/financial-year';
import {
  fetchAccountantReportsHubDataAction,
  AccountantHubFilters,
} from '@/app/actions/accountant-reports-hub';
import {
  generateAccountantReportPdfAction,
} from '@/app/actions/accountant-report';
import {
  exportReportCsvAction,
} from '@/app/actions/reports';
import { usePersistentEntityQuery } from '@/lib/hooks/usePersistentEntityQuery';
import { FinancialReportsNavTabs } from '@/components/finance/reports-nav/FinancialReportsNavTabs';
import { ExpenseReviewDrawer } from './ExpenseReviewDrawer';
import { ExpenseCategorySummaryView } from './ExpenseCategorySummary';
import { ExpenseTransactionsGrid } from './ExpenseTransactionsGrid';
import { AccountantReportGeneratorModal } from './AccountantReportGeneratorModal';
import {
  AccountantExpenseItem,
  AccountantExpenseReportData,
} from '@/modules/finance/domain/accountant-report-types';
import { cn } from '@/lib/utils';

interface AccountantReportsViewProps {
  initialProperties?: Array<{ id: string; name: string }>;
  initialFinancialYear?: number;
}

export function AccountantReportsView({
  initialProperties = [],
  initialFinancialYear,
}: AccountantReportsViewProps) {
  const { toast } = useToast();
  const currentFY = getCurrentFinancialYearNumber();
  const availableFys = getFinancialYears({ countBack: 5, countForward: 0 });

  // Filters
  const [selectedFY, setSelectedFY] = useState<number>(initialFinancialYear || currentFY);
  const [selectedPeriod, setSelectedPeriod] = useState<'FY' | 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'custom'>('FY');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const activeTab = 'receipts-expenses';

  // Interactive Workspace State
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<AccountantExpenseItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isGeneratorModalOpen, setIsGeneratorModalOpen] = useState(false);

  // Filter payload
  const currentFilters: AccountantHubFilters = useMemo(() => ({
    financialYear: selectedFY,
    period: selectedPeriod,
    propertyId: selectedPropertyId,
    dateFrom: selectedPeriod === 'custom' ? dateFrom : undefined,
    dateTo: selectedPeriod === 'custom' ? dateTo : undefined,
  }), [selectedFY, selectedPeriod, selectedPropertyId, dateFrom, dateTo]);

  // Query Data via persistent SWR caching
  const fetcher = useCallback(async () => {
    const res: any = await fetchAccountantReportsHubDataAction(activeTab, currentFilters);
    if (!res.success || !res.data) {
      throw new Error(res.error || 'Failed to fetch accountant report data');
    }
    return res.data;
  }, [activeTab, currentFilters]);

  const {
    data: reportData,
    isLoading,
    isRefreshing,
    error,
    refresh,
  } = usePersistentEntityQuery<any>({
    entity: `accountant-report-${activeTab}`,
    fetcher,
    extraKey: `fy-${selectedFY}-p-${selectedPeriod}-prop-${selectedPropertyId}`,
    freshnessTier: 'normal',
  });

  // Current scope expenses list (flattened across categories or direct)
  const expensesList: AccountantExpenseItem[] = useMemo(() => {
    if (!reportData) return [];
    if (Array.isArray(reportData.expenses)) return reportData.expenses;
    if (Array.isArray(reportData.categories)) {
      return reportData.categories.flatMap((c: any) => c.expenses || []);
    }
    return [];
  }, [reportData]);

  // Index of currently selected expense in the current list
  const currentExpenseIndex = useMemo(() => {
    if (!selectedExpense || expensesList.length === 0) return -1;
    return expensesList.findIndex((e) => e.id === selectedExpense.id);
  }, [selectedExpense, expensesList]);

  // Handlers for drawer navigation and mutations
  const handleSelectExpense = (exp: AccountantExpenseItem) => {
    setSelectedExpense(exp);
    setIsDrawerOpen(true);
  };

  const handleNavigatePrevious = () => {
    if (currentExpenseIndex > 0) {
      setSelectedExpense(expensesList[currentExpenseIndex - 1]);
    }
  };

  const handleNavigateNext = () => {
    if (currentExpenseIndex < expensesList.length - 1) {
      setSelectedExpense(expensesList[currentExpenseIndex + 1]);
    }
  };

  const handleExpenseUpdated = (updated: AccountantExpenseItem) => {
    setSelectedExpense(updated);
    if (reportData && Array.isArray(reportData.expenses)) {
      const updatedList = reportData.expenses.map((e: AccountantExpenseItem) =>
        e.id === updated.id ? updated : e
      );
      reportData.expenses = updatedList;

      // Update category list in reportData if present
      if (Array.isArray(reportData.categories)) {
        reportData.categories.forEach((cat: any) => {
          if (Array.isArray(cat.expenses)) {
            cat.expenses = cat.expenses.map((e: any) => e.id === updated.id ? updated : e);
          }
        });
      }

      // Update summary counts
      const verifiedCount = updatedList.filter((e: any) => e.reviewStatus === 'verified').length;
      const needsReviewCount = updatedList.filter((e: any) => e.reviewStatus === 'needs_review').length;
      const disputedCount = updatedList.filter((e: any) => e.reviewStatus === 'disputed').length;
      const evidenceAttachedCount = updatedList.filter((e: any) => e.hasEvidence).length;
      const missingEvidenceCount = updatedList.length - evidenceAttachedCount;

      if (reportData.summary) {
        reportData.summary.verifiedCount = verifiedCount;
        reportData.summary.needsReviewCount = needsReviewCount;
        reportData.summary.disputedCount = disputedCount;
        reportData.summary.unreviewedCount = updatedList.length - (verifiedCount + needsReviewCount + disputedCount);
        reportData.summary.evidenceAttachedCount = evidenceAttachedCount;
        reportData.summary.missingEvidenceCount = missingEvidenceCount;
      }
    }
  };

  // Resolve property display label
  const selectedPropertyLabel = useMemo(() => {
    if (selectedPropertyId === 'all') return 'All Properties (Consolidated)';
    const p = initialProperties.find((x) => x.id === selectedPropertyId);
    return p ? p.name : 'Selected Property';
  }, [selectedPropertyId, initialProperties]);

  return (
    <div className="h-full w-full min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#F7FAFC] dark:bg-[#07111F]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-6 pb-28">
        {/* 1. Universal Top Navigation Tabs */}
        <FinancialReportsNavTabs activeSection="accountant-reports" />

      {/* 2. Workspace Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Accountant Reports
            </h1>
            <Badge variant="primary" className="text-xs font-mono font-semibold">
              FY{selectedFY}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Review property expenses, verify supporting documents, reconciliation status, and accountant-ready financial reports.
          </p>
        </div>

        {/* Global Primary Actions */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refresh()}
            disabled={isRefreshing}
            className="text-xs gap-1.5 h-9"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />
            <span>Refresh Data</span>
          </Button>

          <Button
            onClick={() => setIsGeneratorModalOpen(true)}
            className="bg-[#008F83] hover:bg-[#008F83]/90 text-white font-bold text-xs gap-1.5 h-9 px-4 shadow-sm"
          >
            <FileText className="w-4 h-4" />
            <span>Generate & Export Report</span>
          </Button>
        </div>
      </div>

      {/* 3. Report Scope & Filter Bar */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-[#0E1E33]/60 p-3 sm:p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Financial Year Selector */}
            <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-slate-500 dark:text-slate-400">Financial Year:</span>
              <select
                value={selectedFY}
                onChange={(e) => setSelectedFY(parseInt(e.target.value, 10))}
                className="text-xs font-bold rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#08182A] text-slate-900 dark:text-white px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-[#008F83]"
              >
                {availableFys.map((fy) => (
                  <option key={fy.year} value={fy.year}>
                    {fy.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Period Selector */}
            <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
              <span className="font-semibold text-slate-500 dark:text-slate-400">Period:</span>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as any)}
                className="text-xs font-semibold rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#08182A] text-slate-900 dark:text-white px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-[#008F83]"
              >
                <option value="FY">Full Year (FY)</option>
                <option value="Q1">Q1 (01 Jul – 30 Sep)</option>
                <option value="Q2">Q2 (01 Oct – 31 Dec)</option>
                <option value="Q3">Q3 (01 Jan – 31 Mar)</option>
                <option value="Q4">Q4 (01 Apr – 30 Jun)</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {/* Property Selector */}
            <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-slate-500 dark:text-slate-400">Property:</span>
              <select
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                className="text-xs font-semibold rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#08182A] text-slate-900 dark:text-white px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-[#008F83]"
              >
                <option value="all">All Properties (Portfolio Consolidated)</option>
                {initialProperties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Scope Indicator Tag */}
          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span>Active Scope: {selectedPropertyLabel}</span>
          </div>
        </div>

        {/* Custom Date Range Row */}
        {selectedPeriod === 'custom' && (
          <div className="pt-2 border-t border-slate-200/80 dark:border-white/[0.08] flex items-center gap-3 text-xs">
            <span className="font-semibold text-slate-500">Custom Dates:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="text-xs rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#08182A] p-1.5"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="text-xs rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#08182A] p-1.5"
            />
          </div>
        )}
      </div>

      {/* 4. Single Workspace Tab: Expense Audit Pack & Workspace */}
      {/* <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/[0.08] overflow-x-auto pb-px">
        <div
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl bg-white dark:bg-[#08182A] text-[#008F83] dark:text-[#32D5C4] border-t-2 border-t-[#008F83] border-x border-slate-200/80 dark:border-white/[0.08] shadow-2xs select-none"
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Expense Audit Pack & Workspace</span>
        </div>
      </div> */}

      {/* 5. Tab Content */}
      {isLoading && !reportData ? (
        <div className="py-24 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-[#008F83]" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Loading Accountant Reports Workspace...
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Aggregating authorized transactions, GST classifications, and evidentiary audit packs.
          </p>
        </div>
      ) : (
        <div>
          {/* Expense Audit Pack & Workspace */}
          <div className="space-y-6">
              {/* Financial Summary Metric Cards (5 Cards) */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {/* Card 1: Total Deductible Expenses */}
                <Card className="rounded-xl border-slate-200 dark:border-white/[0.08] shadow-xs">
                  <CardContent className="p-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Total Expenses
                    </span>
                    <div className="text-lg font-black text-slate-900 dark:text-white mt-1 font-mono">
                      {reportData?.summary?.formattedTotalExpenses || formatCurrency(reportData?.summary?.totalExpenses || 0)}
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Deductible scope spend
                    </span>
                  </CardContent>
                </Card>

                {/* Card 2: GST Included */}
                <Card className="rounded-xl border-slate-200 dark:border-white/[0.08] shadow-xs">
                  <CardContent className="p-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      GST Included
                    </span>
                    <div className="text-lg font-black text-amber-600 dark:text-amber-400 mt-1 font-mono">
                      {reportData?.summary?.formattedTotalGst || formatCurrency(reportData?.summary?.totalGst || 0)}
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      1B Input tax credit claim
                    </span>
                  </CardContent>
                </Card>

                {/* Card 3: Expense Count */}
                <Card className="rounded-xl border-slate-200 dark:border-white/[0.08] shadow-xs">
                  <CardContent className="p-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Number of Expenses
                    </span>
                    <div className="text-lg font-black text-slate-800 dark:text-slate-200 mt-1 font-mono">
                      {reportData?.summary?.totalExpenseCount || expensesList.length}
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Individual line items
                    </span>
                  </CardContent>
                </Card>

                {/* Card 4: Evidence Attached */}
                <Card className="rounded-xl border-slate-200 dark:border-white/[0.08] shadow-xs">
                  <CardContent className="p-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Evidence Attached
                    </span>
                    <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                      {reportData?.summary?.evidenceAttachedCount || 0} / {reportData?.summary?.totalExpenseCount || expensesList.length}
                    </div>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block mt-0.5 font-semibold">
                      {reportData?.summary?.totalExpenseCount
                        ? `${Math.round((reportData.summary.evidenceAttachedCount / reportData.summary.totalExpenseCount) * 100)}% coverage`
                        : '0% coverage'}
                    </span>
                  </CardContent>
                </Card>

                {/* Card 5: Missing Evidence Alert */}
                <Card className={cn(
                  "rounded-xl shadow-xs transition-colors",
                  (reportData?.summary?.missingEvidenceCount || 0) > 0
                    ? "border-rose-200 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20"
                    : "border-slate-200 dark:border-white/[0.08]"
                )}>
                  <CardContent className="p-4">
                    <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
                      Missing Evidence
                    </span>
                    <div className="text-lg font-black text-rose-600 dark:text-rose-400 mt-1 font-mono flex items-center gap-1.5">
                      {(reportData?.summary?.missingEvidenceCount || 0) > 0 && (
                        <AlertTriangle className="w-4 h-4 animate-bounce" />
                      )}
                      <span>{reportData?.summary?.missingEvidenceCount || 0} items</span>
                    </div>
                    <span className="text-[10px] text-rose-600/80 dark:text-rose-400/80 block mt-0.5">
                      Requires receipt substantiation
                    </span>
                  </CardContent>
                </Card>
              </div>

              {/* Review Status & Compliance Strip */}
              <div className="rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-[#0E1E33] p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                    <ShieldCheck className="w-4 h-4 text-[#008F83] dark:text-[#32D5C4]" />
                    <span className="font-bold text-slate-800 dark:text-slate-200">Accountant Audit Queue:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md font-bold text-[11px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                      {reportData?.summary?.verifiedCount || 0} Verified
                    </span>
                    <span className="px-2 py-0.5 rounded-md font-bold text-[11px] bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                      {reportData?.summary?.needsReviewCount || 0} Needs Review
                    </span>
                    <span className="px-2 py-0.5 rounded-md font-bold text-[11px] bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                      {reportData?.summary?.disputedCount || 0} Disputed
                    </span>
                    <span className="px-2 py-0.5 rounded-md font-medium text-[11px] bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {reportData?.summary?.unreviewedCount || 0} Unreviewed
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-slate-400">Reconciliation:</span>
                  <span className={cn(
                    "font-bold",
                    reportData?.summary?.isFullyReconciled
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600"
                  )}>
                    {reportData?.summary?.isFullyReconciled ? '100% RECONCILED' : 'DISCREPANCY DETECTED'}
                  </span>
                </div>
              </div>

              {/* Expense Category Summary Breakdown */}
              <ExpenseCategorySummaryView
                categories={reportData?.categories || []}
                totalExpenses={reportData?.summary?.totalExpenses || 0}
                selectedCategoryName={selectedCategoryName}
                onSelectCategory={setSelectedCategoryName}
              />

              {/* Main Expense Transactions Table with Saved Queue Views */}
              <ExpenseTransactionsGrid
                expenses={expensesList}
                selectedCategoryName={selectedCategoryName}
                onClearCategoryFilter={() => setSelectedCategoryName(null)}
                onSelectExpense={handleSelectExpense}
              />

              {/* Transaction Detail & Evidence-Review Drawer */}
              <ExpenseReviewDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                expense={selectedExpense}
                onExpenseUpdated={handleExpenseUpdated}
                onNavigatePrevious={handleNavigatePrevious}
                onNavigateNext={handleNavigateNext}
                hasPrevious={currentExpenseIndex > 0}
                hasNext={currentExpenseIndex < expensesList.length - 1}
                currentIndex={currentExpenseIndex}
                totalCount={expensesList.length}
              />

              {/* Dedicated Report Generator Modal */}
              <AccountantReportGeneratorModal
                isOpen={isGeneratorModalOpen}
                onClose={() => setIsGeneratorModalOpen(false)}
                reportData={reportData}
                filters={currentFilters}
                propertyOptions={initialProperties}
              />
            </div>
        </div>
      )}
      </div>
    </div>
  );
}
