'use client';

import React, { useState, useMemo } from 'react';
import {
  Home,
  Calendar,
  ChevronDown,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import {
  FinanceReportFilters,
  FinancialOverviewReportDTO,
} from '@/modules/finance/domain/reporting-types';
import {
  buildCategoryQuarterlyData,
  CategoryQuarterlyRow,
} from '@/lib/finance/category-report-data';
import { CategoryBreakdownAgGrid } from '@/components/reports/CategoryBreakdownAgGrid';
import { CategoryBreakdownMobileView } from '@/components/reports/CategoryBreakdownMobileView';
import { MonthlyBreakdownTable } from '@/components/reports/MonthlyBreakdownTable';
import { MonthlyBreakdownAgGrid } from '@/components/reports/MonthlyBreakdownAgGrid';
import { getFinancialYears, getCurrentFinancialYear } from '@/lib/finance/financial-year';
import { exportReportCsvAction, exportReportPdfAction } from '@/app/actions/reports';
import { cn } from '@/lib/utils';

interface FinancialReportViewProps {
  data: FinancialOverviewReportDTO;
  filters: FinanceReportFilters;
  onFilterChange: (newFilters: FinanceReportFilters) => void;
  properties: Array<{ id: string; name: string; address_line_1?: string }>;
  categories: Array<{ id: string; name: string; type?: string }>;
  onRefresh?: () => void;
  isLoading?: boolean;
  onOpenAccountantReport?: () => void;
}

export function FinancialReportView({
  data,
  filters,
  onFilterChange,
  properties = [],
  categories = [],
  onRefresh,
  isLoading = false,
  onOpenAccountantReport,
}: FinancialReportViewProps) {
  // View toggle: 'category' (default, matching Image 1) or 'month'
  const [reportView, setReportView] = useState<'category' | 'month'>('category');

  // Dropdown states
  const [isPropertyDropdownOpen, setIsPropertyDropdownOpen] = useState(false);
  const [isFyDropdownOpen, setIsFyDropdownOpen] = useState(false);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const availableFYs = useMemo(() => getFinancialYears({ countBack: 4, countForward: 1 }), []);
  const currentFY = filters.financialYear || getCurrentFinancialYear();

  // Find selected property display name / address
  const selectedProperty = useMemo(() => {
    if (!filters.propertyId) return null;
    return properties.find((p) => p.id === filters.propertyId) || null;
  }, [filters.propertyId, properties]);

  const propertyDisplayName = useMemo(() => {
    if (selectedProperty) {
      return selectedProperty.address_line_1 || selectedProperty.name;
    }
    // If no property is explicitly selected, default to the demo property or first property
    if (properties.length > 0) {
      return properties[0].address_line_1 || properties[0].name;
    }
    return 'Lot 5 · Unit 323, 213A Princes Highway, Arncliffe NSW 2205';
  }, [selectedProperty, properties]);

  // Aggregate category quarterly breakdown rows
  const categoryRows = useMemo<CategoryQuarterlyRow[]>(() => {
    const rawTx = (data as any)?.transactions || [];
    return buildCategoryQuarterlyData(rawTx, categories);
  }, [data, categories]);

  const totalExpenses = useMemo(() => {
    const kpiTotal = data?.kpis?.totalExpenses;
    if (typeof kpiTotal === 'number' && kpiTotal > 0) return kpiTotal;
    return categoryRows.reduce((acc, row) => acc + row.totalAmount, 0);
  }, [data, categoryRows]);

  const monthlyTrends = data?.monthlyTrends || [];

  // Export handlers
  const handleExportCsv = async () => {
    setIsExporting(true);
    setIsExportDropdownOpen(false);
    try {
      const res = await exportReportCsvAction('expenses', filters);
      const blob = new Blob([res.csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export CSV:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    setIsExportDropdownOpen(false);
    try {
      const res = await exportReportPdfAction('expenses', filters);
      if (res.success && res.base64Data) {
        const link = document.createElement('a');
        link.href = res.base64Data;
        link.setAttribute('download', res.filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('Failed to export PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ========================================================
          DESKTOP HEADER LAYOUT (matching Image 1 Desktop mockup)
          Row 1: Title + Property selector + FY selector
          Row 2: [ By category | By month ] on left + [ Export v ] on right
          ======================================================== */}
      <div className="hidden md:block space-y-3.5">
        {/* Row 1: Title + Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[26px] lg:text-[28px] font-bold tracking-tight text-slate-900 dark:text-white mr-2">
            Financial report
          </h1>

          {/* Property Selector Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsPropertyDropdownOpen((v) => !v);
                setIsFyDropdownOpen(false);
                setIsExportDropdownOpen(false);
              }}
              className="flex items-center gap-2 py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#08182A] text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 shadow-2xs hover:border-[#238358] transition-all cursor-pointer max-w-[360px] truncate"
            >
              <Home className="w-4 h-4 text-slate-600 dark:text-slate-400 shrink-0" />
              <span className="truncate">{propertyDisplayName}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
            </button>

            {isPropertyDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsPropertyDropdownOpen(false)}
                />
                <div className="absolute left-0 mt-1.5 w-80 max-h-72 overflow-y-auto rounded-xl border border-border bg-white dark:bg-[#08182A] shadow-xl z-50 p-1.5 space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      onFilterChange({ ...filters, propertyId: undefined });
                      setIsPropertyDropdownOpen(false);
                    }}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-between cursor-pointer',
                      !filters.propertyId
                        ? 'bg-[#238358]/10 text-[#238358] dark:text-[#32D5C4]'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    )}
                  >
                    <span>All Properties (Consolidated)</span>
                  </button>

                  {properties.map((p) => {
                    const isSelected = filters.propertyId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          onFilterChange({ ...filters, propertyId: p.id });
                          setIsPropertyDropdownOpen(false);
                        }}
                        className={cn(
                          'w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex flex-col cursor-pointer',
                          isSelected
                            ? 'bg-[#238358]/10 text-[#238358] dark:text-[#32D5C4]'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        )}
                      >
                        <span className="font-semibold truncate">{p.name}</span>
                        {p.address_line_1 && (
                          <span className="text-[11px] text-slate-400 truncate">
                            {p.address_line_1}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Financial Year Selector Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsFyDropdownOpen((v) => !v);
                setIsPropertyDropdownOpen(false);
                setIsExportDropdownOpen(false);
              }}
              className="flex items-center gap-2 py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#08182A] text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 shadow-2xs hover:border-[#238358] transition-all cursor-pointer shrink-0"
            >
              <Calendar className="w-4 h-4 text-slate-600 dark:text-slate-400 shrink-0" />
              <span>{currentFY}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-0.5" />
            </button>

            {isFyDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsFyDropdownOpen(false)}
                />
                <div className="absolute left-0 mt-1.5 w-48 rounded-xl border border-border bg-white dark:bg-[#08182A] shadow-xl z-50 p-1.5 space-y-1">
                  {availableFYs.map((fy) => {
                    const isSelected = currentFY === fy.label;
                    return (
                      <button
                        key={fy.label}
                        type="button"
                        onClick={() => {
                          onFilterChange({ ...filters, financialYear: fy.label });
                          setIsFyDropdownOpen(false);
                        }}
                        className={cn(
                          'w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer',
                          isSelected
                            ? 'bg-[#238358] text-white shadow-2xs'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        )}
                      >
                        {fy.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Row 2: Left: [ By category | By month ] Toggle | Right: [ Export v ] */}
        <div className="flex items-center justify-between gap-3 pt-1">
          {/* Segmented Control Pill Toggle */}
          <div className="inline-flex items-center p-1 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
            <button
              type="button"
              onClick={() => setReportView('category')}
              className={cn(
                'py-1.5 px-5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer',
                reportView === 'category'
                  ? 'bg-[#238358] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              By category
            </button>
            <button
              type="button"
              onClick={() => setReportView('month')}
              className={cn(
                'py-1.5 px-5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer',
                reportView === 'month'
                  ? 'bg-[#238358] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              By month
            </button>
          </div>

          {/* Export Dropdown Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsExportDropdownOpen((v) => !v);
                setIsPropertyDropdownOpen(false);
                setIsFyDropdownOpen(false);
              }}
              disabled={isExporting}
              className="flex items-center gap-2 py-1.5 px-4 rounded-xl border border-[#238358] text-[#238358] dark:text-[#32D5C4] hover:bg-[#238358]/10 text-xs sm:text-sm font-semibold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Exporting...' : 'Export'}</span>
              <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
            </button>

            {isExportDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsExportDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-1.5 w-56 rounded-xl border border-border bg-white dark:bg-[#08182A] shadow-xl z-50 p-1.5 space-y-1">
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Export CSV / Excel</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportPdf}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-rose-600" />
                    <span>Export PDF Report</span>
                  </button>
                  {onOpenAccountantReport && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsExportDropdownOpen(false);
                        onOpenAccountantReport();
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-[#238358]" />
                      <span>Accountant Report Verification</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================
          MOBILE HEADER LAYOUT (matching Image 1 Mobile phone mockup)
          Title -> Property Card -> FY Card -> Full-width toggle
          ======================================================== */}
      <div className="block md:hidden space-y-3">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Financial report
        </h1>

        {/* Property Selector Card Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setIsPropertyDropdownOpen((v) => !v);
              setIsFyDropdownOpen(false);
              setIsExportDropdownOpen(false);
            }}
            className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#08182A] shadow-2xs text-left cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0 pr-2">
              <Home className="w-4 h-4 text-slate-600 dark:text-slate-400 shrink-0" />
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                {propertyDisplayName}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
          </button>

          {isPropertyDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsPropertyDropdownOpen(false)}
              />
              <div className="absolute left-0 right-0 mt-1.5 max-h-72 overflow-y-auto rounded-xl border border-border bg-white dark:bg-[#08182A] shadow-xl z-50 p-1.5 space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    onFilterChange({ ...filters, propertyId: undefined });
                    setIsPropertyDropdownOpen(false);
                  }}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-between cursor-pointer',
                    !filters.propertyId
                      ? 'bg-[#238358]/10 text-[#238358] dark:text-[#32D5C4]'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >
                  <span>All Properties (Consolidated)</span>
                </button>
                {properties.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onFilterChange({ ...filters, propertyId: p.id });
                      setIsPropertyDropdownOpen(false);
                    }}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex flex-col cursor-pointer',
                      filters.propertyId === p.id
                        ? 'bg-[#238358]/10 text-[#238358] dark:text-[#32D5C4]'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    )}
                  >
                    <span className="font-semibold truncate">{p.name}</span>
                    {p.address_line_1 && (
                      <span className="text-[11px] text-slate-400 truncate">
                        {p.address_line_1}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* FY Selector Card Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setIsFyDropdownOpen((v) => !v);
              setIsPropertyDropdownOpen(false);
              setIsExportDropdownOpen(false);
            }}
            className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#08182A] shadow-2xs text-left cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0 pr-2">
              <Calendar className="w-4 h-4 text-slate-600 dark:text-slate-400 shrink-0" />
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {currentFY}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
          </button>

          {isFyDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsFyDropdownOpen(false)}
              />
              <div className="absolute left-0 right-0 mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-border bg-white dark:bg-[#08182A] shadow-xl z-50 p-1.5 space-y-1">
                {availableFYs.map((fy) => (
                  <button
                    key={fy.label}
                    type="button"
                    onClick={() => {
                      onFilterChange({ ...filters, financialYear: fy.label });
                      setIsFyDropdownOpen(false);
                    }}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer',
                      currentFY === fy.label
                        ? 'bg-[#238358] text-white shadow-2xs'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    )}
                  >
                    {fy.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Segmented Control Pill Toggle (Full Width Grid on Mobile) */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
          <button
            type="button"
            onClick={() => setReportView('category')}
            className={cn(
              'py-2 px-3 rounded-lg text-xs font-semibold text-center transition-all cursor-pointer',
              reportView === 'category'
                ? 'bg-[#238358] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            )}
          >
            By category
          </button>
          <button
            type="button"
            onClick={() => setReportView('month')}
            className={cn(
              'py-2 px-3 rounded-lg text-xs font-semibold text-center transition-all cursor-pointer',
              reportView === 'month'
                ? 'bg-[#238358] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            )}
          >
            By month
          </button>
        </div>
      </div>

      {/* Main Content: By category vs By month */}
      {reportView === 'category' ? (
        <div>
          {/* Desktop view: AG Grid with Master-Detail drilldown */}
          <div className="hidden md:block">
            <CategoryBreakdownAgGrid
              rows={categoryRows}
              totalExpenses={totalExpenses}
              propertyId={filters.propertyId || undefined}
              financialYear={currentFY}
            />
          </div>

          {/* Mobile view: Accordion card breakdown list matching Image 1 */}
          <div className="md:hidden">
            <CategoryBreakdownMobileView
              rows={categoryRows}
              totalExpenses={totalExpenses}
              propertyId={filters.propertyId || undefined}
              financialYear={currentFY}
            />
          </div>
        </div>
      ) : (
        /* By month: Monthly Breakdown AG Grid on desktop, Table on mobile */
        <div>
          <div className="hidden md:block">
            <MonthlyBreakdownAgGrid
              monthlyTrends={monthlyTrends}
              totalIncome={data?.kpis?.totalIncome || 0}
              totalExpenses={totalExpenses}
              netResult={(data?.kpis?.totalIncome || 0) - totalExpenses}
              totalGstCollected={data?.kpis?.gstCollected || 0}
              totalGstPaid={data?.kpis?.gstPaid || 0}
              propertyId={filters.propertyId || undefined}
              financialYear={currentFY}
              rawTransactions={(data as any)?.transactions || []}
              categoryRows={categoryRows}
            />
          </div>
          <div className="md:hidden">
            <MonthlyBreakdownTable
              monthlyTrends={monthlyTrends}
              totalIncome={data?.kpis?.totalIncome || 0}
              totalExpenses={totalExpenses}
              netResult={(data?.kpis?.totalIncome || 0) - totalExpenses}
              totalGstCollected={data?.kpis?.gstCollected || 0}
              totalGstPaid={data?.kpis?.gstPaid || 0}
              propertyId={filters.propertyId || undefined}
              financialYear={currentFY}
              rawTransactions={(data as any)?.transactions || []}
              categoryRows={categoryRows}
            />
          </div>
        </div>
      )}
    </div>
  );
}
