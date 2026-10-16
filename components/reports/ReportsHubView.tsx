'use client';

import React, { useState, useEffect, useTransition, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  FinanceReportType,
  FinanceReportFilters,
} from '@/modules/finance/domain/reporting-types';
import { fetchReportDataAction } from '@/app/actions/reports';
import { getCurrentFinancialYear } from '@/lib/finance/financial-year';
import { FinancialReportView } from '@/components/reports/FinancialReportView';
import { AccountantReportModal } from '@/components/reports/AccountantReportModal';
import { usePropertyContext } from '@/components/property/PropertyContext';

interface ReportsHubViewProps {
  initialReportType: FinanceReportType;
  initialFilters: FinanceReportFilters;
  filterOptions: {
    properties: Array<{ id: string; name: string; address_line_1?: string }>;
    categories: Array<{ id: string; name: string; type?: string }>;
    taxClassifications: Array<{ id: string; name: string; code?: string }>;
  };
  initialData?: any;
}

export function ReportsHubView({
  initialReportType,
  initialFilters,
  filterOptions,
  initialData,
}: ReportsHubViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const { selectedProperty, availableProperties } = usePropertyContext();

  const [filters, setFilters] = useState<FinanceReportFilters>(() => ({
    financialYear: initialFilters.financialYear || getCurrentFinancialYear(),
    ...initialFilters,
    propertyId: initialFilters.propertyId ?? (selectedProperty?.propertyId || undefined),
  }));

  const [reportData, setReportData] = useState<any>(initialData || null);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAccountantReportOpen, setIsAccountantReportOpen] = useState(false);
  const isFirstMountRef = useRef(true);

  // Merge available properties from context and filterOptions to ensure complete coverage
  const mergedProperties = useMemo(() => {
    const map = new Map<string, { id: string; name: string; address_line_1?: string }>();
    (filterOptions.properties || []).forEach((p) => {
      map.set(p.id, p);
    });
    (availableProperties || []).forEach((p) => {
      if (!map.has(p.propertyId)) {
        map.set(p.propertyId, {
          id: p.propertyId,
          name: p.propertyName,
        });
      }
    });
    return Array.from(map.values());
  }, [filterOptions.properties, availableProperties]);

  const handleFilterChange = (newFilters: FinanceReportFilters) => {
    setFilters(newFilters);
    setIsLoading(true);
    setErrorMessage(null);

    // Sync URL search parameters cleanly without page refresh
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (newFilters.financialYear) params.set('fy', String(newFilters.financialYear));
    if (newFilters.propertyId) params.set('propertyId', newFilters.propertyId);
    else params.delete('propertyId');

    startTransition(() => {
      router.replace(`?${params.toString()}`, { scroll: false });
    });

    fetchReportDataAction('overview', newFilters)
      .then((res) => {
        setReportData(res.data);
      })
      .catch((err) => {
        setErrorMessage(err.message || 'Failed to fetch financial report');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleRefresh = () => {
    handleFilterChange(filters);
  };

  return (
    <div className="h-full w-full min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#FAFBFB] dark:bg-[#07111F]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {isLoading && !reportData ? (
          <div className="h-[620px] w-full flex items-center justify-center animate-pulse bg-white dark:bg-[#08182A] rounded-2xl border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-400 font-medium">Loading Financial Report...</span>
          </div>
        ) : errorMessage ? (
          <div className="p-6 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl text-rose-700 dark:text-rose-300 space-y-3">
            <h3 className="text-base font-bold">Unable to load financial report</h3>
            <p className="text-xs text-rose-600 dark:text-rose-400">{errorMessage}</p>
            <button
              type="button"
              onClick={handleRefresh}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : (
          <FinancialReportView
            data={reportData}
            filters={filters}
            onFilterChange={handleFilterChange}
            properties={mergedProperties}
            categories={filterOptions.categories}
            onRefresh={handleRefresh}
            isLoading={isLoading}
            onOpenAccountantReport={() => setIsAccountantReportOpen(true)}
          />
        )}
      </div>

      {/* Accountant Expense Verification Report Modal */}
      <AccountantReportModal
        isOpen={isAccountantReportOpen}
        onClose={() => setIsAccountantReportOpen(false)}
        properties={mergedProperties}
        categories={filterOptions.categories}
        initialPropertyId={filters.propertyId || undefined}
      />
    </div>
  );
}
