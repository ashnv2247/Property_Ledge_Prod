'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileText,
  Download,
  Building,
  Calendar,
  RefreshCw,
  FileSpreadsheet,
  Check,
  ChevronDown,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/admin/ui/Button';
import { Badge } from '@/components/admin/ui/Badge';
import { useToast } from '@/components/admin/ui/Toast';
import {
  getCurrentFinancialYearNumber,
  getFinancialYears,
} from '@/lib/finance/financial-year';
import {
  fetchComparativeStatementAction,
  fetchRentalScheduleAction,
  generateAccountantReportPdfExportAction,
  exportAccountantReportCsvExportAction,
} from '@/app/actions/accountant-reports-hub';
import { generateAccountantReportPdfAction } from '@/app/actions/accountant-report';
import { usePropertyContext } from '@/components/property/PropertyContext';
import { ComparativeStatementTab } from './ComparativeStatementTab';
import { RentalScheduleTab } from './RentalScheduleTab';
import {
  ComparativeStatementData,
  RentalScheduleData,
  AccountantReportType,
} from '@/modules/finance/domain/accountant-reports-models';
import { cn } from '@/lib/utils';

interface AccountantReportsViewProps {
  initialProperties?: Array<{ id: string; name: string }>;
  initialFinancialYear?: number;
  initialPropertyId?: string;
}

export function AccountantReportsView({
  initialProperties = [],
  initialFinancialYear,
  initialPropertyId,
}: AccountantReportsViewProps) {
  const { toast } = useToast();
  const currentFY = getCurrentFinancialYearNumber();
  const availableFys = getFinancialYears({ countBack: 5, countForward: 1 });
  const { selectedProperty, availableProperties, setSelectedProperty } = usePropertyContext();

  // Active Report Type Tab: 'comparative' or 'schedule'
  const [activeReportType, setActiveReportType] = useState<AccountantReportType>('comparative');

  // Filters State
  const [selectedFY, setSelectedFY] = useState<number>(initialFinancialYear || currentFY);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(() => {
    return initialPropertyId || selectedProperty?.propertyId || 'all';
  });

  // Export State & Menu
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingAuditPack, setIsExportingAuditPack] = useState(false);

  // Loaded Report Data
  const [comparativeData, setComparativeData] = useState<ComparativeStatementData | null>(null);
  const [rentalScheduleData, setRentalScheduleData] = useState<RentalScheduleData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sync when selectedProperty in global context changes
  useEffect(() => {
    const nextPropId = selectedProperty?.propertyId || 'all';
    if (nextPropId !== selectedPropertyId && nextPropId !== 'all') {
      setSelectedPropertyId(nextPropId);
    }
  }, [selectedProperty?.propertyId]);

  // Merge available properties from context and server options
  const propertyOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    (initialProperties || []).forEach((p) => {
      map.set(p.id, p);
    });
    (availableProperties || []).forEach((p) => {
      if (!map.has(p.propertyId)) {
        map.set(p.propertyId, { id: p.propertyId, name: p.propertyName });
      }
    });
    return Array.from(map.values());
  }, [initialProperties, availableProperties]);

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

  // Main Data Loader
  const loadReportData = useCallback(async (showRefreshingSpinner = false) => {
    if (showRefreshingSpinner) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      if (activeReportType === 'comparative') {
        const res = await fetchComparativeStatementAction(
          selectedPropertyId === 'all' ? undefined : selectedPropertyId,
          selectedFY
        );
        if (res.success && res.data) {
          setComparativeData(res.data);
        } else {
          toast({
            title: 'Error loading comparative statement',
            description: res.error || 'Unable to aggregate financial figures.',
            variant: 'destructive',
          });
        }
      } else {
        const res = await fetchRentalScheduleAction(
          selectedPropertyId === 'all' ? undefined : selectedPropertyId,
          selectedFY
        );
        if (res.success && res.data) {
          setRentalScheduleData(res.data);
        } else {
          toast({
            title: 'Error loading rental schedule',
            description: res.error || 'Unable to generate ATO rental schedule.',
            variant: 'destructive',
          });
        }
      }
    } catch (err: any) {
      console.error('[LOAD_ACCOUNTANT_REPORT_ERROR]', err);
      toast({
        title: 'Connection error',
        description: 'Failed to communicate with report service.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeReportType, selectedPropertyId, selectedFY, toast]);

  // Re-fetch whenever report type, property, or financial year changes
  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  // Handle Audit Pack PDF Export (multi-page Accountant Expense Report & Audit Pack)
  const handleExportAuditPackPdf = async () => {
    setIsExportMenuOpen(false);
    setIsExporting(true);
    setIsExportingAuditPack(true);
    try {
      toast({
        title: 'Generating Audit Pack...',
        description: 'Compiling self-contained Accountant Expense Report & Evidence Pack.',
      });

      const res = await generateAccountantReportPdfAction({
        propertyId: selectedPropertyId === 'all' ? undefined : selectedPropertyId,
        financialYear: selectedFY,
        period: 'FY',
      });

      if (res.success && res.base64Data && res.filename) {
        const link = document.createElement('a');
        link.href = res.base64Data;
        link.download = res.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
          title: 'Audit Pack Downloaded',
          description: `Successfully downloaded ${res.filename}`,
          variant: 'success',
        });
      } else {
        throw new Error(res.error || 'Failed to generate accountant audit pack PDF');
      }
    } catch (err: any) {
      console.error('[EXPORT_AUDIT_PACK_ERROR]', err);
      toast({
        title: 'Export Failed',
        description: err.message || 'Unable to export Accountant Expense Report & Audit Pack.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
      setIsExportingAuditPack(false);
    }
  };

  // Handle PDF Export
  const handleExportPdf = async () => {
    setIsExportMenuOpen(false);
    setIsExporting(true);
    try {
      const res = await generateAccountantReportPdfExportAction(
        activeReportType,
        selectedPropertyId === 'all' ? undefined : selectedPropertyId,
        selectedFY
      );

      if (res.success && res.base64Data && res.filename) {
        // Trigger browser download
        const link = document.createElement('a');
        link.href = res.base64Data;
        link.download = res.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
          title: 'PDF Report Exported',
          description: `Downloaded ${res.filename}`,
          variant: 'success',
        });
      } else {
        throw new Error(res.error || 'Failed to generate PDF document');
      }
    } catch (err: any) {
      console.error('[EXPORT_PDF_ERROR]', err);
      toast({
        title: 'Export Failed',
        description: err.message || 'Unable to export report to PDF.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Handle CSV Export
  const handleExportCsv = async () => {
    setIsExportMenuOpen(false);
    setIsExporting(true);
    try {
      const res = await exportAccountantReportCsvExportAction(
        activeReportType,
        selectedPropertyId === 'all' ? undefined : selectedPropertyId,
        selectedFY
      );

      if (res.success && res.csvContent && res.filename) {
        const blob = new Blob([res.csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = res.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
          title: 'CSV Exported',
          description: `Downloaded ${res.filename}`,
          variant: 'success',
        });
      } else {
        throw new Error(res.error || 'Failed to export CSV');
      }
    } catch (err: any) {
      console.error('[EXPORT_CSV_ERROR]', err);
      toast({
        title: 'Export Failed',
        description: err.message || 'Unable to export report to CSV.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Resolve current property label
  const currentPropertyDisplay = useMemo(() => {
    if (selectedPropertyId === 'all') {
      return propertyOptions[0]?.name || 'Lot 5 · Unit 323, 213A Princes Highway, Arncliffe NSW 2205';
    }
    const found = propertyOptions.find((p) => p.id === selectedPropertyId);
    return found ? found.name : 'Selected Property';
  }, [selectedPropertyId, propertyOptions]);

  return (
    <div className="h-full w-full min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#F7FAFC] dark:bg-[#07111F]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-6 pb-32">
        
        {/* Page Header and Controls Toolbar matching Reference Image media_1792062786017.png */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0A2540] dark:text-white">
              Accountant reports
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Generate reports for tax preparation and financial analysis.
            </p>
          </div>

          {/* Property Selector & Financial Year Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Property Selector Pill */}
            <div className="relative inline-flex items-center">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#0B1728] shadow-2xs hover:border-slate-300 transition-colors">
                <Building className="w-4 h-4 text-slate-500 shrink-0" />
                <select
                  value={selectedPropertyId}
                  onChange={(e) => handlePropertyChange(e.target.value)}
                  className="text-xs font-semibold bg-transparent text-slate-800 dark:text-slate-100 focus:outline-hidden pr-6 cursor-pointer max-w-[280px] truncate"
                >
                  <option value="all">
                    {propertyOptions.length > 0 ? propertyOptions[0].name : 'Lot 5 · Unit 323, 213A Princes Highway, Arncliffe NSW 2205'}
                  </option>
                  {propertyOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
              </div>
            </div>

            {/* Financial Year Selector Pill */}
            <div className="relative inline-flex items-center">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#0B1728] shadow-2xs hover:border-slate-300 transition-colors">
                <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
                <select
                  value={selectedFY}
                  onChange={(e) => setSelectedFY(parseInt(e.target.value, 10))}
                  className="text-xs font-semibold bg-transparent text-slate-800 dark:text-slate-100 focus:outline-hidden pr-6 cursor-pointer"
                >
                  {availableFys.map((fy) => (
                    <option key={fy.year} value={fy.year}>
                      {fy.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
              </div>
            </div>

            {/* Refresh Data Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadReportData(true)}
              disabled={isRefreshing || isLoading}
              className="text-xs h-9 px-3 gap-1.5 rounded-lg border-slate-200/90 dark:border-white/10"
              title="Refresh financial calculations"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>

        {/* 3. Report-Type Navigation & Export Action Bar (Matching Reference Image media_1792062786017.png) */}
        <div className="flex items-center justify-between gap-3 pt-1">
          {/* Green Pill Report Selector Toggle */}
          <div className="inline-flex p-1 rounded-xl bg-slate-100/90 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/10">
            <button
              type="button"
              onClick={() => setActiveReportType('comparative')}
              className={cn(
                'px-4 py-2 rounded-lg text-xs font-bold transition-all duration-150',
                activeReportType === 'comparative'
                  ? 'bg-[#238358] text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              Comparative Statement
            </button>
            <button
              type="button"
              onClick={() => setActiveReportType('schedule')}
              className={cn(
                'px-4 py-2 rounded-lg text-xs font-bold transition-all duration-150',
                activeReportType === 'schedule'
                  ? 'bg-[#238358] text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              ATO Rental Schedule
            </button>
          </div>

          {/* Desktop Actions: Direct Audit Pack Button & Export Dropdown */}
          <div className="flex items-center gap-2">
            {/* Quick 1-Click Audit Pack Download Button */}
            <Button
              onClick={handleExportAuditPackPdf}
              disabled={isExporting || isLoading}
              className="hidden sm:inline-flex bg-[#238358] hover:bg-[#1e6f4a] text-white font-bold text-xs h-9 px-3.5 gap-2 rounded-lg shadow-xs transition-colors"
              title="Download Accountant Expense Report with Tax Invoices & Evidence Pack"
            >
              <ShieldCheck className={cn('w-4 h-4', isExportingAuditPack && 'animate-spin')} />
              <span>{isExportingAuditPack ? 'Generating Audit Pack...' : 'Download Audit Pack (PDF)'}</span>
            </Button>

            {/* Desktop Export Dropdown */}
            <div className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => setIsExportMenuOpen((prev) => !prev)}
                disabled={isExporting || isLoading}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#238358]/50 dark:border-[#238358]/60 bg-white dark:bg-[#0B1728] text-[#238358] dark:text-emerald-400 font-bold text-xs shadow-2xs hover:bg-[#238358]/5 transition-colors disabled:opacity-50"
              >
                <Download className={cn('w-3.5 h-3.5', isExporting && !isExportingAuditPack && 'animate-bounce')} />
                <span>{isExporting ? 'Exporting...' : 'Export'}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {/* Dropdown Menu */}
              {isExportMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setIsExportMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-1.5 w-72 rounded-xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#0B1728] shadow-xl z-30 py-1.5 text-xs">
                    <button
                      type="button"
                      onClick={handleExportAuditPackPdf}
                      className="w-full flex items-start gap-2.5 px-3.5 py-2.5 text-left font-medium text-slate-800 dark:text-slate-200 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/30 border-b border-slate-100 dark:border-white/[0.06] transition-colors"
                    >
                      <ShieldCheck className="w-4 h-4 text-[#238358] dark:text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          Expense Audit Pack (PDF)
                          <span className="text-[9px] px-1.5 py-0.2 font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 rounded">
                            Audit Pack
                          </span>
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          Multi-page financial summary & original receipt evidence pack
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={handleExportPdf}
                      className="w-full flex items-start gap-2.5 px-3.5 py-2 text-left font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors"
                    >
                      <FileText className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {activeReportType === 'comparative' ? 'Comparative Statement (PDF)' : 'Rental Schedule (PDF)'}
                        </p>
                        <p className="text-[10px] text-slate-400">Formal A4 Print Ready Statement</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={handleExportCsv}
                      className="w-full flex items-start gap-2.5 px-3.5 py-2 text-left font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">Export CSV Spreadsheet</p>
                        <p className="text-[10px] text-slate-400">Auditor Working Data Spreadsheet</p>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 4. Main Report Content Area */}
        <div className="transition-opacity duration-200">
          {activeReportType === 'comparative' ? (
            comparativeData ? (
              <ComparativeStatementTab
                data={comparativeData}
                isLoading={isLoading}
              />
            ) : null
          ) : (
            rentalScheduleData ? (
              <RentalScheduleTab
                data={rentalScheduleData}
                isLoading={isLoading}
              />
            ) : null
          )}
        </div>

        {/* 5. Mobile Sticky Bottom Export Action (Prompt Section 2.5) */}
        <div className="fixed sm:hidden bottom-0 inset-x-0 p-3 bg-white/95 dark:bg-[#0B1728]/95 backdrop-blur-md border-t border-slate-200/90 dark:border-white/10 z-20 flex gap-2">
          <Button
            onClick={handleExportAuditPackPdf}
            disabled={isExporting || isLoading}
            className="flex-1 bg-[#238358] hover:bg-[#1e6f4a] text-white font-bold text-xs h-10 gap-1.5 rounded-lg"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Audit Pack</span>
          </Button>
          <Button
            variant="outline"
            onClick={handleExportPdf}
            disabled={isExporting || isLoading}
            className="flex-1 text-xs h-10 gap-1.5 rounded-lg border-slate-200 dark:border-white/10"
          >
            <FileText className="w-4 h-4" />
            <span>Statement</span>
          </Button>
          <Button
            variant="outline"
            onClick={handleExportCsv}
            disabled={isExporting || isLoading}
            className="flex-1 text-xs h-10 gap-1.5 rounded-lg border-slate-200 dark:border-white/10"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>CSV</span>
          </Button>
        </div>

      </div>
    </div>
  );
}
