'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  CalendarDays,
  FileText,
  FileCheck2,
  Receipt,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Building,
  CheckCircle2,
  Clock,
  Archive,
  ArrowUpRight,
  Filter,
  Search,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  X,
  SlidersHorizontal,
  Info,
} from 'lucide-react';
import { Card, CardContent } from '@/components/admin/ui';
import { Button } from '@/components/admin/ui/Button';
import { Badge } from '@/components/admin/ui/Badge';
import { Modal } from '@/components/admin/ui/Modal';
import { formatCurrency } from '@/lib/format/currency';
import { usePersistentEntityQuery } from '@/lib/hooks/usePersistentEntityQuery';
import {
  FinancialYearsOverviewData,
  FinancialYearSummaryItem,
  FinancialYearDetailData,
  fetchFinancialYearsOverviewAction,
  fetchFinancialYearDetailsAction,
  validateFinancialYearPeriodAction,
} from '@/app/actions/financial-years';
import { usePropertyContext } from '@/components/property/PropertyContext';
import { FinancialReportsNavTabs } from '@/components/finance/reports-nav/FinancialReportsNavTabs';
import { cn } from '@/lib/utils';

interface FinancialYearsViewProps {
  initialData?: FinancialYearsOverviewData | null;
  initialPropertyId?: string;
}

export function FinancialYearsView({ initialData, initialPropertyId }: FinancialYearsViewProps) {
  const router = useRouter();
  const { selectedProperty, availableProperties, setSelectedProperty } = usePropertyContext();

  // Filters
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(() => {
    return initialPropertyId || selectedProperty?.propertyId || 'all';
  });
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const isFirstMountRef = React.useRef(true);

  // Sync when selectedProperty in context changes
  useEffect(() => {
    const nextPropId = selectedProperty?.propertyId || 'all';
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      if (nextPropId !== 'all' && !initialPropertyId) {
        setSelectedPropertyId(nextPropId);
      }
      return;
    }

    if (nextPropId !== selectedPropertyId) {
      setSelectedPropertyId(nextPropId);
    }
  }, [selectedProperty?.propertyId]);

  // Modals
  const [activeDetailYear, setActiveDetailYear] = useState<number | null>(null);
  const [detailData, setDetailData] = useState<FinancialYearDetailData | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);

  const [configureModalOpen, setConfigureModalOpen] = useState(false);
  const [valStartDate, setValStartDate] = useState('2026-07-01');
  const [valEndDate, setValEndDate] = useState('2027-06-30');
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    message: string;
    isStandardAuPeriod: boolean;
    suggestedCode?: string;
  } | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Persistent query with SWR caching
  const fetcher = useCallback(async () => {
    const res = await fetchFinancialYearsOverviewAction(selectedPropertyId);
    if (!res.success || !res.data) {
      throw new Error(res.error || 'Failed to fetch financial years');
    }
    return res.data;
  }, [selectedPropertyId]);

  const {
    data: overviewData,
    isLoading,
    isRefreshing,
    error,
    refresh,
  } = usePersistentEntityQuery<FinancialYearsOverviewData>({
    entity: 'financial-years',
    fetcher,
    initialData,
    propertyId: selectedPropertyId === 'all' ? null : selectedPropertyId,
    extraKey: `prop-${selectedPropertyId}`,
    freshnessTier: 'normal',
  });

  const propertyOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    (overviewData?.properties || []).forEach((p) => {
      map.set(p.id, p);
    });
    (availableProperties || []).forEach((p) => {
      if (!map.has(p.propertyId)) {
        map.set(p.propertyId, { id: p.propertyId, name: p.propertyName });
      }
    });
    return Array.from(map.values());
  }, [overviewData?.properties, availableProperties]);

  const handlePropertyChange = (newPropId: string) => {
    setSelectedPropertyId(newPropId);
    if (newPropId === 'all') {
      setSelectedProperty(null);
    } else {
      const prop = availableProperties.find((p) => p.propertyId === newPropId) || {
        propertyId: newPropId,
        propertyName: propertyOptions.find((p) => p.id === newPropId)?.name || '',
        role: 'owner' as any,
        status: 'active' as any,
        organizationId: '',
        organizationName: '',
      };
      setSelectedProperty(prop);
    }
  };

  const yearsList = overviewData?.financialYears || [];
  const properties = propertyOptions;
  const stats = overviewData?.portfolioStats || {
    totalHistoricalIncome: 0,
    totalHistoricalExpenses: 0,
    totalHistoricalNet: 0,
    totalTransactionsCount: 0,
    activePropertiesCount: 0,
  };

  // Filtered years
  const filteredYears = useMemo(() => {
    return yearsList.filter((item) => {
      if (selectedStatus !== 'all' && item.status !== selectedStatus) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCode = item.code.toLowerCase().includes(q);
        const matchesLabel = item.label.toLowerCase().includes(q);
        const matchesYear = String(item.year).includes(q);
        if (!matchesCode && !matchesLabel && !matchesYear) {
          return false;
        }
      }
      return true;
    });
  }, [yearsList, selectedStatus, searchQuery]);

  // Load FY details drilldown
  const handleOpenDetails = useCallback(async (year: number) => {
    setActiveDetailYear(year);
    setIsLoadingDetails(true);
    try {
      const res = await fetchFinancialYearDetailsAction(
        year,
        selectedPropertyId === 'all' ? undefined : selectedPropertyId
      );
      if (res.success && res.data) {
        setDetailData(res.data);
      }
    } catch (err) {
      console.error('Failed to load FY details:', err);
    } finally {
      setIsLoadingDetails(false);
    }
  }, [selectedPropertyId]);

  // Validate custom period action
  const handleValidatePeriod = useCallback(async () => {
    setIsValidating(true);
    try {
      const res = await validateFinancialYearPeriodAction(valStartDate, valEndDate);
      setValidationResult(res);
    } catch (err: any) {
      setValidationResult({
        isValid: false,
        message: err.message || 'Validation error',
        isStandardAuPeriod: false,
      });
    } finally {
      setIsValidating(false);
    }
  }, [valStartDate, valEndDate]);

  return (
    <div className="h-full w-full min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#F7FAFC] dark:bg-[#07111F]">
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 pb-28">
        {/* Top Section Nav Tabs: Financial Reports | Financial Years | Accountant Reports */}
        <FinancialReportsNavTabs activeSection="financial-years" />

      {/* 1. Header with Title & Period Configuration Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#008F83]/10 text-[#008F83] dark:text-[#32D5C4]">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-heading text-slate-900 dark:text-white tracking-tight">
                Financial Years
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Statutory Australian financial reporting periods (01 July – 30 June) with integrated ledger reconciliation and audit exports.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {isRefreshing && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Updating...</span>
            </span>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setValidationResult(null);
              setConfigureModalOpen(true);
            }}
            leftIcon={<SlidersHorizontal className="w-3.5 h-3.5" />}
          >
            Configure / Validate Period
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refresh()}
            leftIcon={<RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active AFY */}
        <Card className="rounded-2xl border-slate-200 dark:border-white/[0.08] shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Period</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Current AFY
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">
                FY{String(overviewData?.currentFinancialYear || 2026).slice(-2)}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                01 Jul {Number(overviewData?.currentFinancialYear || 2026) - 1} – 30 Jun {overviewData?.currentFinancialYear || 2026}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
              Open for active ledger postings & monthly BAS
            </p>
          </CardContent>
        </Card>

        {/* Total Historical Income */}
        <Card className="rounded-2xl border-slate-200 dark:border-white/[0.08] shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Historical Income</span>
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
              {formatCurrency(stats.totalHistoricalIncome)}
            </div>
            <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
              Across all tracked financial years
            </p>
          </CardContent>
        </Card>

        {/* Total Historical Expenses */}
        <Card className="rounded-2xl border-slate-200 dark:border-white/[0.08] shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Historical Expenses</span>
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <TrendingDown className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
              {formatCurrency(stats.totalHistoricalExpenses)}
            </div>
            <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
              Operating costs & capital investments
            </p>
          </CardContent>
        </Card>

        {/* Total Historical Net Cash Flow */}
        <Card className="rounded-2xl border-slate-200 dark:border-white/[0.08] shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Net Ledger Balance</span>
              <div className={cn(
                'p-1.5 rounded-lg',
                stats.totalHistoricalNet >= 0
                  ? 'bg-[#008F83]/10 text-[#008F83] dark:text-[#32D5C4]'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
              )}>
                <Building className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className={cn(
              'mt-2 text-2xl font-bold',
              stats.totalHistoricalNet >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            )}>
              {formatCurrency(stats.totalHistoricalNet)}
            </div>
            <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
              {stats.totalTransactionsCount} total verified transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-[#0B1E34] border border-slate-200/80 dark:border-white/[0.08]">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Property Selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            <Building className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedPropertyId}
              onChange={(e) => handlePropertyChange(e.target.value)}
              className="text-xs font-medium rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#08182A] text-slate-800 dark:text-slate-200 px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-[#008F83]"
            >
              <option value="all">All Properties (Consolidated)</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs font-medium rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#08182A] text-slate-800 dark:text-slate-200 px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-[#008F83]"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active (Current)</option>
              <option value="closed">Closed (Historical)</option>
              <option value="upcoming">Upcoming</option>
            </select>
          </div>
        </div>

        {/* Quick Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search financial year (e.g. FY26)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#08182A] text-slate-800 dark:text-slate-200 pl-8 pr-3 py-1.5 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-[#008F83]"
          />
        </div>
      </div>

      {/* 4. Financial Years Table */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#08182A] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-[#0E1E33] border-b border-slate-200/80 dark:border-white/[0.08] text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Financial Year</th>
                <th className="py-3.5 px-4">Period Dates</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Transactions</th>
                <th className="py-3.5 px-4 text-right">Income (AUD)</th>
                <th className="py-3.5 px-4 text-right">Expenses (AUD)</th>
                <th className="py-3.5 px-4 text-right">Net Cash Flow</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
              {isLoading && yearsList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#008F83]" />
                    <p className="text-xs font-medium">Loading Australian Financial Years...</p>
                  </td>
                </tr>
              ) : filteredYears.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No financial years match criteria</p>
                    <p className="text-xs text-slate-400 mt-1">Try resetting the status or property filter.</p>
                  </td>
                </tr>
              ) : (
                filteredYears.map((fy) => {
                  const isCurrent = fy.status === 'active';
                  const isUpcoming = fy.status === 'upcoming';
                  const isClosed = fy.status === 'closed';

                  return (
                    <tr
                      key={fy.year}
                      className={cn(
                        'hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors',
                        isCurrent && 'bg-[#008F83]/[0.03] dark:bg-[#008F83]/[0.05]'
                      )}
                    >
                      {/* Financial Year Code */}
                      <td className="py-4 px-4 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-heading">{fy.code}</span>
                          {isCurrent && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300/40">
                              CURRENT
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-normal text-slate-400 block mt-0.5">
                          Ending 30 Jun {fy.year}
                        </span>
                      </td>

                      {/* Period Dates */}
                      <td className="py-4 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {fy.startDate} <span className="text-slate-300 dark:text-slate-600">→</span> {fy.endDate}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        {isCurrent && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active
                          </span>
                        )}
                        {isClosed && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            <Archive className="w-3 h-3 opacity-60" />
                            Closed
                          </span>
                        )}
                        {isUpcoming && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            <Clock className="w-3 h-3 opacity-60" />
                            Upcoming
                          </span>
                        )}
                      </td>

                      {/* Transaction Count */}
                      <td className="py-4 px-4 text-right font-medium">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                          {fy.transactionCount}
                        </span>
                        {fy.propertiesCount > 0 && (
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {fy.propertiesCount} {fy.propertiesCount === 1 ? 'property' : 'properties'}
                          </span>
                        )}
                      </td>

                      {/* Income */}
                      <td className="py-4 px-4 text-right font-medium text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(fy.totalIncome)}
                      </td>

                      {/* Expenses */}
                      <td className="py-4 px-4 text-right font-medium text-slate-700 dark:text-slate-300">
                        {formatCurrency(fy.totalExpenses)}
                      </td>

                      {/* Net Result */}
                      <td className={cn(
                        'py-4 px-4 text-right font-bold',
                        fy.netResult >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      )}>
                        {formatCurrency(fy.netResult)}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenDetails(fy.year)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-[#008F83] dark:text-[#32D5C4] bg-[#008F83]/10 hover:bg-[#008F83]/20 transition-colors inline-flex items-center gap-1"
                            title="View detailed breakdown"
                          >
                            <span>Details</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>

                          <Link
                            href={selectedPropertyId !== 'all' ? `/dashboard/accountant-reports?fy=${fy.year}&propertyId=${selectedPropertyId}` : `/dashboard/accountant-reports?fy=${fy.year}`}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Generate Accountant Pack for this FY"
                          >
                            <FileCheck2 className="w-3.5 h-3.5" />
                          </Link>

                          <Link
                            href={selectedPropertyId !== 'all' ? `/dashboard/bas?fy=${fy.year}&propertyId=${selectedPropertyId}` : `/dashboard/bas?fy=${fy.year}`}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="View BAS Worksheet for this FY"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Details Modal for Selected Financial Year */}
      <Modal
        isOpen={activeDetailYear !== null}
        onClose={() => {
          setActiveDetailYear(null);
          setDetailData(null);
        }}
        title={detailData ? `${detailData.label}` : `Financial Year ${activeDetailYear}`}
        description="Comprehensive Australian financial period reconciliation, 12-month trajectory, and property performance."
        size="xl"
      >
        {isLoadingDetails ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#008F83]" />
            <p className="text-xs font-medium">Reconciling financial year data...</p>
          </div>
        ) : detailData ? (
          <div className="space-y-6 pt-2">
            {/* KPI Summary for this FY */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0E1E33] border border-slate-200/80 dark:border-white/[0.08]">
                <span className="text-[11px] text-slate-400 block font-medium">Total Income</span>
                <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                  {formatCurrency(detailData.summary.totalIncome)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  GST: {formatCurrency(detailData.summary.gstCollected)}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0E1E33] border border-slate-200/80 dark:border-white/[0.08]">
                <span className="text-[11px] text-slate-400 block font-medium">Total Expenses</span>
                <span className="text-base font-bold text-slate-900 dark:text-white mt-0.5 block">
                  {formatCurrency(detailData.summary.totalExpenses)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  GST Paid: {formatCurrency(detailData.summary.gstPaid)}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0E1E33] border border-slate-200/80 dark:border-white/[0.08]">
                <span className="text-[11px] text-slate-400 block font-medium">Net Performance</span>
                <span className={cn(
                  'text-base font-bold mt-0.5 block',
                  detailData.summary.netResult >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                )}>
                  {formatCurrency(detailData.summary.netResult)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Cash Net Margin
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0E1E33] border border-slate-200/80 dark:border-white/[0.08]">
                <span className="text-[11px] text-slate-400 block font-medium">Audit Volume</span>
                <span className="text-base font-bold text-slate-900 dark:text-white mt-0.5 block">
                  {detailData.summary.transactionCount}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Verified entries
                </span>
              </div>
            </div>

            {/* Quick Audit Links */}
            <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-[#008F83]/5 border border-[#008F83]/20">
              <span className="text-xs font-semibold text-[#008F83] dark:text-[#32D5C4] flex items-center gap-1.5 mr-2">
                <FileCheck2 className="w-4 h-4" />
                Audit Shortcuts:
              </span>

              <Link
                href={selectedPropertyId !== 'all' ? `/dashboard/accountant-reports?fy=${detailData.year}&propertyId=${selectedPropertyId}` : `/dashboard/accountant-reports?fy=${detailData.year}`}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold text-[#008F83] dark:text-[#32D5C4] bg-white dark:bg-[#08182A] border border-[#008F83]/30 hover:border-[#008F83] transition-colors inline-flex items-center gap-1"
              >
                <span>Generate Accountant PDF</span>
                <ExternalLink className="w-3 h-3" />
              </Link>

              <Link
                href={selectedPropertyId !== 'all' ? `/dashboard/bas?fy=${detailData.year}&propertyId=${selectedPropertyId}` : `/dashboard/bas?fy=${detailData.year}`}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-[#08182A] border border-slate-200 dark:border-white/[0.1] hover:border-slate-400 transition-colors inline-flex items-center gap-1"
              >
                <span>BAS Statement</span>
                <ExternalLink className="w-3 h-3" />
              </Link>

              <Link
                href={selectedPropertyId !== 'all' ? `/dashboard/money?from=${detailData.startDate}&to=${detailData.endDate}&propertyId=${selectedPropertyId}` : `/dashboard/money?from=${detailData.startDate}&to=${detailData.endDate}`}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-[#08182A] border border-slate-200 dark:border-white/[0.1] hover:border-slate-400 transition-colors inline-flex items-center gap-1"
              >
                <span>View All Transactions</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            {/* 12-Month AFY Progression (July -> June) */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 uppercase tracking-wider">
                12-Month AFY Progression (01 July – 30 June)
              </h4>
              <div className="rounded-xl border border-slate-200/80 dark:border-white/[0.08] overflow-hidden">
                <div className="max-h-48 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-[#0E1E33] text-[10px] text-slate-400 uppercase font-bold sticky top-0">
                      <tr>
                        <th className="py-2 px-3">Month</th>
                        <th className="py-2 px-3 text-right">Income</th>
                        <th className="py-2 px-3 text-right">Expenses</th>
                        <th className="py-2 px-3 text-right">Net Cash</th>
                        <th className="py-2 px-3 text-right">Transactions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                      {detailData.monthlyBreakdown.map((m) => (
                        <tr key={m.key} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                          <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">
                            {m.label}
                          </td>
                          <td className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">
                            {formatCurrency(m.income)}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                            {formatCurrency(m.expenses)}
                          </td>
                          <td className={cn(
                            'py-2 px-3 text-right font-bold font-mono text-[11px]',
                            m.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          )}>
                            {formatCurrency(m.net)}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-400 font-mono text-[11px]">
                            {m.transactionCount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Property Breakdown */}
            {detailData.propertyBreakdown.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 uppercase tracking-wider">
                  Property Portfolio Breakdown
                </h4>
                <div className="rounded-xl border border-slate-200/80 dark:border-white/[0.08] overflow-hidden">
                  <div className="max-h-40 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-[#0E1E33] text-[10px] text-slate-400 uppercase font-bold sticky top-0">
                        <tr>
                          <th className="py-2 px-3">Property</th>
                          <th className="py-2 px-3 text-right">Income</th>
                          <th className="py-2 px-3 text-right">Expenses</th>
                          <th className="py-2 px-3 text-right">Net Result</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                        {detailData.propertyBreakdown.map((p) => (
                          <tr key={p.propertyId}>
                            <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">
                              {p.propertyName}
                            </td>
                            <td className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">
                              {formatCurrency(p.income)}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                              {formatCurrency(p.expenses)}
                            </td>
                            <td className={cn(
                              'py-2 px-3 text-right font-bold font-mono text-[11px]',
                              p.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                            )}>
                              {formatCurrency(p.net)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      {/* 6. Configure / Validate Period Modal */}
      <Modal
        isOpen={configureModalOpen}
        onClose={() => setConfigureModalOpen(false)}
        title="Australian Financial Period Validator"
        description="Verify Australian financial reporting date boundaries and validate statutory conformity with ATO regulations."
        size="md"
      >
        <div className="space-y-4 pt-2">
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2.5">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
            <p>
              In Australia, statutory financial years run strictly from <strong>01 July</strong> through <strong>30 June</strong> of the following year.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Start Date (01 July)
              </label>
              <input
                type="date"
                value={valStartDate}
                onChange={(e) => setValStartDate(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#08182A] text-slate-800 dark:text-slate-200 p-2 focus:ring-1 focus:ring-[#008F83]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                End Date (30 June)
              </label>
              <input
                type="date"
                value={valEndDate}
                onChange={(e) => setValEndDate(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#08182A] text-slate-800 dark:text-slate-200 p-2 focus:ring-1 focus:ring-[#008F83]"
              />
            </div>
          </div>

          <div className="pt-1">
            <Button
              variant="primary"
              size="sm"
              className="w-full"
              onClick={handleValidatePeriod}
              disabled={isValidating}
            >
              {isValidating ? 'Validating...' : 'Validate Date Boundaries'}
            </Button>
          </div>

          {validationResult && (
            <div className={cn(
              'p-3.5 rounded-xl border text-xs',
              validationResult.isValid && validationResult.isStandardAuPeriod
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                : validationResult.isValid
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-300'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-800 dark:text-rose-300'
            )}>
              <div className="flex items-center gap-2 font-bold mb-1">
                {validationResult.isValid ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Info className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                )}
                <span>
                  {validationResult.isStandardAuPeriod
                    ? 'ATO Statutory Compliant Period'
                    : validationResult.isValid
                    ? 'Custom Range'
                    : 'Invalid Period'}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed">{validationResult.message}</p>
            </div>
          )}
        </div>
      </Modal>
      </div>
    </div>
  );
}
