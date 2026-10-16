'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  FileSpreadsheet,
  FileText,
  TrendingUp,
  ArrowLeft,
  Building,
  RefreshCw,
  AlertCircle,
  Download,
  ShieldCheck,
} from 'lucide-react';
import { PropertyAccountantReportPayload } from '@/modules/properties/domain/accountant-report-types';
import { fetchPropertyAccountantReportAction } from '@/app/actions/property-accountant-report';
import { generateAccountantReportPdfAction } from '@/app/actions/accountant-report';
import { FinancialSummaryTab } from './FinancialSummaryTab';
import { ATOFormTab } from './ATOFormTab';
import { PropertyPerformanceTab } from './PropertyPerformanceTab';

interface AccountantReportPageProps {
  propertyId: string;
  initialFy?: number;
}

export function AccountantReportPage({ propertyId, initialFy }: AccountantReportPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tab State: 'financial-summary' | 'ato-form' | 'property-performance'
  const initialTab = searchParams?.get('tab') || 'financial-summary';
  const [activeTab, setActiveTabState] = useState<'financial-summary' | 'ato-form' | 'property-performance'>(
    (initialTab as any) || 'financial-summary'
  );

  // Financial Year State
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    const fyParam = searchParams?.get('fy');
    if (fyParam) {
      const parsed = parseInt(fyParam, 10);
      if (!isNaN(parsed)) return parsed;
    }
    return initialFy || 2025;
  });

  const [data, setData] = useState<PropertyAccountantReportPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const availableYears = [
    { year: 2026, label: 'FY 2025/26 (Current)' },
    { year: 2025, label: 'FY 2024/25' },
    { year: 2024, label: 'FY 2023/24' },
    { year: 2023, label: 'FY 2022/23' },
    { year: 2022, label: 'FY 2021/22' },
  ];

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchPropertyAccountantReportAction(propertyId, selectedYear);
      if (!res.success || !res.data) {
        throw new Error(res.error || 'Failed to load report');
      }
      setData(res.data);
    } catch (err: any) {
      setError(err?.message || 'Error fetching accountant report');
    } finally {
      setIsLoading(false);
    }
  }, [propertyId, selectedYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const setActiveTab = (tab: 'financial-summary' | 'ato-form' | 'property-performance') => {
    setActiveTabState(tab);
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('tab', tab);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const [isDownloadingAuditPack, setIsDownloadingAuditPack] = useState(false);

  const handleDownloadAuditPack = async () => {
    setIsDownloadingAuditPack(true);
    try {
      const res = await generateAccountantReportPdfAction({
        propertyId,
        financialYear: selectedYear,
        period: 'FY',
      });
      if (res.success && res.base64Data && res.filename) {
        const link = document.createElement('a');
        link.href = res.base64Data;
        link.download = res.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        throw new Error(res.error || 'Failed to download report');
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to download accountant audit pack');
    } finally {
      setIsDownloadingAuditPack(false);
    }
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('fy', String(year));
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-4 sm:p-8 font-sans antialiased">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation Breadcrumb & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Link
              href="/dashboard/properties"
              className="hover:text-teal-400 transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Properties</span>
            </Link>
            <span className="text-slate-600">/</span>
            <Link
              href={`/dashboard/properties/${propertyId}`}
              className="hover:text-teal-400 transition-colors"
            >
              {data?.property.name || 'Property Details'}
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-teal-400">ATO Accountant Report</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadAuditPack}
              disabled={isDownloadingAuditPack || isLoading}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-[#008F83] hover:bg-[#007a70] text-white shadow-xs transition-colors disabled:opacity-50"
              title="Download Accountant Expense Report with Tax Invoices & Evidence"
            >
              <ShieldCheck className={`w-3.5 h-3.5 ${isDownloadingAuditPack ? 'animate-spin' : ''}`} />
              <span>{isDownloadingAuditPack ? 'Generating Audit Pack...' : 'Download Audit Pack (PDF)'}</span>
            </button>

            <button
              type="button"
              onClick={loadData}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-750 text-slate-300 hover:text-white transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-teal-400' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Property Header Banner */}
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shrink-0">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-100">
                  {data?.property.name || 'Rental Property'}
                </h1>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-slate-700 text-teal-300 border border-slate-600">
                  {data?.property.propertyType || 'Residential'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                {data?.property.address || 'Address loading...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-700 text-right">
              <span className="text-[11px] text-slate-400 block font-medium">Reporting Period</span>
              <span className="text-sm font-mono font-bold text-teal-400">
                {data?.financialYearLabel || `FY ${selectedYear}`}
              </span>
            </div>
          </div>
        </div>

        {/* 3 Navigation Tabs */}
        <div className="flex items-center border-b border-slate-700 overflow-x-auto no-scrollbar gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('financial-summary')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'financial-summary'
                ? 'border-teal-400 text-teal-400 bg-slate-800/40 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Financial Summary</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ato-form')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'ato-form'
                ? 'border-teal-400 text-teal-400 bg-slate-800/40 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>ATO Form (Schedule Replica)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('property-performance')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'property-performance'
                ? 'border-teal-400 text-teal-400 bg-slate-800/40 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Property Performance</span>
          </button>
        </div>

        {/* Content Section */}
        {isLoading && !data ? (
          <div className="space-y-6 animate-pulse">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-28 bg-slate-800 rounded-2xl border border-slate-700" />
              ))}
            </div>
            <div className="h-96 bg-slate-800 rounded-2xl border border-slate-700" />
          </div>
        ) : error && !data ? (
          <div className="bg-slate-800 rounded-2xl p-8 border border-rose-500/40 text-center max-w-lg mx-auto space-y-4">
            <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-100">Unable to Load Report</h3>
            <p className="text-xs text-slate-400">{error}</p>
            <button
              type="button"
              onClick={loadData}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-500 text-slate-950 hover:bg-teal-400 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : data ? (
          <>
            {activeTab === 'financial-summary' && (
              <FinancialSummaryTab
                data={data}
                selectedYear={selectedYear}
                availableYears={availableYears}
                onYearChange={handleYearChange}
              />
            )}

            {activeTab === 'ato-form' && <ATOFormTab data={data} />}

            {activeTab === 'property-performance' && (
              <PropertyPerformanceTab
                performance={data.performance}
                financialYearLabel={data.financialYearLabel}
              />
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
