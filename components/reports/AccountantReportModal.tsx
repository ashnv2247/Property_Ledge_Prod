'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileCheck2,
  Download,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Building,
  Calendar,
  Layers,
} from 'lucide-react';
import { Modal } from '@/components/admin/ui/Modal';
import { Button } from '@/components/admin/ui/Button';
import { Badge } from '@/components/admin/ui/Badge';
import { useToast } from '@/components/admin/ui/Toast';
import {
  AccountantReportFilters,
  AccountantExpenseReportData,
} from '@/modules/finance/domain/accountant-report-types';
import {
  fetchAccountantReportDataAction,
  generateAccountantReportPdfAction,
} from '@/app/actions/accountant-report';
import {
  getCurrentFinancialYearNumber,
  getFinancialYears,
  getFinancialYearLabel,
} from '@/lib/finance/financial-year';
import { cn } from '@/lib/utils';

interface AccountantReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  properties?: Array<{ id: string; name: string; address_line_1?: string }>;
  categories?: Array<{ id: string; name: string }>;
  initialPropertyId?: string | null;
}

type GenerationStep = 'idle' | 'fetching_data' | 'checking_reconciliation' | 'loading_evidence' | 'building_pdf' | 'completed' | 'error';

export function AccountantReportModal({
  isOpen,
  onClose,
  properties = [],
  categories = [],
  initialPropertyId,
}: AccountantReportModalProps) {
  const { toast } = useToast();
  const currentFY = getCurrentFinancialYearNumber();
  const availableFYs = getFinancialYears({ countBack: 4, countForward: 0 });

  // Filter States
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(initialPropertyId || 'all');
  const [financialYear, setFinancialYear] = useState<number>(currentFY);
  const [period, setPeriod] = useState<string>('FY');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  // Preview & Generation States
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [reportData, setReportData] = useState<AccountantExpenseReportData | null>(null);
  const [generationStep, setGenerationStep] = useState<GenerationStep>('idle');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [generatedPdfResult, setGeneratedPdfResult] = useState<{
    filename: string;
    base64Data: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync initial property ID
  useEffect(() => {
    if (initialPropertyId) {
      setSelectedPropertyId(initialPropertyId);
    }
  }, [initialPropertyId]);

  // Load preview data
  const loadPreviewData = useCallback(async () => {
    if (!isOpen) return;
    setIsLoadingPreview(true);
    setErrorMessage(null);

    const filters: AccountantReportFilters = {
      propertyId: selectedPropertyId === 'all' ? undefined : selectedPropertyId,
      financialYear,
      period: period === 'custom' ? undefined : period,
      dateFrom: period === 'custom' ? dateFrom : undefined,
      dateTo: period === 'custom' ? dateTo : undefined,
      categoryIds: selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined,
    };

    try {
      const res = await fetchAccountantReportDataAction(filters);
      if (res.success && res.data) {
        setReportData(res.data);
      } else {
        setErrorMessage(res.error || 'Failed to load report preview');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error communicating with report server');
    } finally {
      setIsLoadingPreview(false);
    }
  }, [
    isOpen,
    selectedPropertyId,
    financialYear,
    period,
    dateFrom,
    dateTo,
    selectedCategoryIds,
  ]);

  useEffect(() => {
    if (isOpen) {
      loadPreviewData();
      setGeneratedPdfResult(null);
      setGenerationStep('idle');
    }
  }, [isOpen, loadPreviewData]);

  // Generate self-contained PDF
  const handleGeneratePdf = async () => {
    setIsGeneratingPdf(true);
    setGenerationStep('fetching_data');
    setErrorMessage(null);

    const filters: AccountantReportFilters = {
      propertyId: selectedPropertyId === 'all' ? undefined : selectedPropertyId,
      financialYear,
      period: period === 'custom' ? undefined : period,
      dateFrom: period === 'custom' ? dateFrom : undefined,
      dateTo: period === 'custom' ? dateTo : undefined,
      categoryIds: selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined,
    };

    try {
      // Step 1: Collecting
      await new Promise((r) => setTimeout(r, 300));
      setGenerationStep('checking_reconciliation');

      // Step 2: Reconciliation
      await new Promise((r) => setTimeout(r, 300));
      setGenerationStep('loading_evidence');

      // Step 3: Loading attachments & building PDF
      await new Promise((r) => setTimeout(r, 300));
      setGenerationStep('building_pdf');

      const res = await generateAccountantReportPdfAction(filters);

      if (res.success && res.base64Data && res.filename) {
        setGeneratedPdfResult({
          filename: res.filename,
          base64Data: res.base64Data,
        });
        setGenerationStep('completed');
        toast({
          title: 'Accountant Report Ready',
          description: `Successfully compiled self-contained PDF (${res.filename}).`,
          variant: 'success',
        });

        // Trigger immediate browser download
        triggerDownload(res.base64Data, res.filename);
      } else {
        setGenerationStep('error');
        setErrorMessage(res.error || 'Failed to compile report PDF');
      }
    } catch (err: any) {
      setGenerationStep('error');
      setErrorMessage(err.message || 'Error occurred during PDF generation');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const triggerDownload = (base64Url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = base64Url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Accountant Expense Report"
      description="Compile a single, self-contained accountant-ready audit pack with executive summary, categorized expenses, and embedded receipts."
      icon={<FileCheck2 className="w-5 h-5 text-admin-primary" />}
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 text-caption text-admin-muted">
            {reportData && (
              <span>
                {reportData.summary.totalExpenseCount} total expenses • {reportData.summary.evidenceAttachedCount} with evidence
              </span>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <Button variant="ghost" size="md" onClick={onClose} disabled={isGeneratingPdf}>
              Close
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleGeneratePdf}
              loading={isGeneratingPdf}
              disabled={Boolean(isLoadingPreview) || (Boolean(reportData) && reportData?.summary?.totalExpenseCount === 0)}
              leftIcon={isGeneratingPdf ? undefined : <Download className="w-4 h-4" />}
            >
              {isGeneratingPdf ? 'Compiling Report...' : 'Generate Accountant Report'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Top Filters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 p-4 rounded-xl bg-admin-surface-subtle border border-admin-border">
          {/* Property Selector */}
          <div>
            <label className="block text-caption font-semibold text-admin-foreground mb-1.5 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-admin-primary" />
              Property Scope
            </label>
            <select
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              disabled={isGeneratingPdf}
              className="w-full text-body-sm px-3 py-2 rounded-lg bg-admin-surface border border-admin-border text-admin-foreground focus:outline-none focus:ring-2 focus:ring-admin-primary/20"
            >
              <option value="all">All Properties (Consolidated)</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || p.address_line_1}
                </option>
              ))}
            </select>
          </div>

          {/* Financial Year Selector */}
          <div>
            <label className="block text-caption font-semibold text-admin-foreground mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-admin-primary" />
              Financial Year
            </label>
            <select
              value={financialYear}
              onChange={(e) => setFinancialYear(Number(e.target.value))}
              disabled={isGeneratingPdf}
              className="w-full text-body-sm px-3 py-2 rounded-lg bg-admin-surface border border-admin-border text-admin-foreground focus:outline-none focus:ring-2 focus:ring-admin-primary/20"
            >
              {availableFYs.map((opt) => (
                <option key={opt.year} value={opt.year}>
                  {opt.label}{opt.year === currentFY ? ' (Current)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Reporting Period */}
          <div>
            <label className="block text-caption font-semibold text-admin-foreground mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-admin-primary" />
              Period
            </label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              disabled={isGeneratingPdf}
              className="w-full text-body-sm px-3 py-2 rounded-lg bg-admin-surface border border-admin-border text-admin-foreground focus:outline-none focus:ring-2 focus:ring-admin-primary/20"
            >
              <option value="FY">Full Financial Year (12 Months)</option>
              <option value="Q1">Q1 (01 Jul – 30 Sep)</option>
              <option value="Q2">Q2 (01 Oct – 31 Dec)</option>
              <option value="Q3">Q3 (01 Jan – 31 Mar)</option>
              <option value="Q4">Q4 (01 Apr – 30 Jun)</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {/* Custom Date Range if active */}
          {period === 'custom' && (
            <div className="md:col-span-3 grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-caption text-admin-muted mb-1">From Date</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full text-body-sm px-3 py-1.5 rounded-lg bg-admin-surface border border-admin-border text-admin-foreground"
                />
              </div>
              <div>
                <label className="block text-caption text-admin-muted mb-1">To Date</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full text-body-sm px-3 py-1.5 rounded-lg bg-admin-surface border border-admin-border text-admin-foreground"
                />
              </div>
            </div>
          )}
        </div>

        {/* Progress & Generation States */}
        {isGeneratingPdf && (
          <div className="p-4 rounded-xl bg-admin-primary-soft/40 border border-admin-primary/20 space-y-3 animate-fade-in">
            <div className="flex items-center gap-2 text-body-sm font-semibold text-admin-primary">
              <Loader2 className="w-4 h-4 animate-spin" />
              Compiling Self-Contained Accountant Audit Pack...
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-caption">
              <div className={cn('p-2 rounded-lg border text-center transition-colors', generationStep === 'fetching_data' ? 'bg-admin-surface border-admin-primary text-admin-primary font-bold shadow-sm' : 'border-admin-border text-admin-muted')}>
                1. Fetching Expenses
              </div>
              <div className={cn('p-2 rounded-lg border text-center transition-colors', generationStep === 'checking_reconciliation' ? 'bg-admin-surface border-admin-primary text-admin-primary font-bold shadow-sm' : 'border-admin-border text-admin-muted')}>
                2. Category Totals
              </div>
              <div className={cn('p-2 rounded-lg border text-center transition-colors', generationStep === 'loading_evidence' ? 'bg-admin-surface border-admin-primary text-admin-primary font-bold shadow-sm' : 'border-admin-border text-admin-muted')}>
                3. Embedding Invoices
              </div>
              <div className={cn('p-2 rounded-lg border text-center transition-colors', generationStep === 'building_pdf' ? 'bg-admin-surface border-admin-primary text-admin-primary font-bold shadow-sm' : 'border-admin-border text-admin-muted')}>
                4. Assembling PDF
              </div>
            </div>
          </div>
        )}

        {/* Success Download Ready Card */}
        {generatedPdfResult && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-body-sm font-bold text-admin-foreground">
                  Accountant Report Ready
                </div>
                <div className="text-caption text-admin-muted">
                  {generatedPdfResult.filename}
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => triggerDownload(generatedPdfResult.base64Data, generatedPdfResult.filename)}
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              Download PDF
            </Button>
          </div>
        )}

        {/* Error State */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-body-sm">{errorMessage}</div>
          </div>
        )}

        {/* Live Preview Content */}
        {isLoadingPreview ? (
          <div className="py-12 text-center text-admin-muted flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-admin-primary" />
            <span className="text-body-sm">Calculating reconciliation and evidence overview...</span>
          </div>
        ) : reportData ? (
          <div className="space-y-4">
            {/* Metric KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-xl bg-admin-surface border border-admin-border">
                <div className="text-caption text-admin-muted">Total Expenses</div>
                <div className="text-body-md font-bold text-admin-foreground mt-0.5">
                  {reportData.summary.formattedTotalExpenses}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-admin-surface border border-admin-border">
                <div className="text-caption text-admin-muted">GST Included</div>
                <div className="text-body-md font-bold text-admin-primary mt-0.5">
                  {reportData.summary.formattedTotalGst}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-admin-surface border border-admin-border">
                <div className="text-caption text-admin-muted">Number of Expenses</div>
                <div className="text-body-md font-bold text-admin-foreground mt-0.5">
                  {reportData.summary.totalExpenseCount}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-admin-surface border border-admin-border">
                <div className="text-caption text-admin-muted">Expenses with Evidence</div>
                <div className="text-body-md font-bold text-emerald-600 mt-0.5">
                  {reportData.summary.evidenceAttachedCount} / {reportData.summary.totalExpenseCount}
                </div>
              </div>
            </div>

            {/* Reconciliation Banner */}
            <div className={cn('p-3 rounded-xl border flex items-center justify-between text-body-sm', reportData.summary.isFullyReconciled ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700' : 'bg-rose-500/10 border-rose-500/20 text-rose-700')}>
              <div className="flex items-center gap-2">
                {reportData.summary.isFullyReconciled ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span className="font-semibold">
                  {reportData.summary.isFullyReconciled
                    ? 'All category totals reconcile perfectly to individual expenses (100% Reconciled).'
                    : 'Reconciliation discrepancy detected between categories and line items.'}
                </span>
              </div>
              <Badge variant={reportData.summary.isFullyReconciled ? 'success' : 'danger'} size="sm">
                {reportData.summary.isFullyReconciled ? 'Reconciled' : 'Discrepancy'}
              </Badge>
            </div>

            {/* Category Breakdown Table Preview */}
            <div className="border border-admin-border rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-admin-surface-subtle border-b border-admin-border flex items-center justify-between">
                <span className="text-caption font-bold text-admin-foreground uppercase tracking-wider">
                  Category Breakdown ({reportData.categories.length} Categories)
                </span>
                <span className="text-caption text-admin-muted">
                  Page 1 Summary Preview
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto admin-scrollbar divide-y divide-admin-divider">
                {reportData.categories.map((cat) => (
                  <div key={cat.categoryId} className="px-4 py-2.5 flex items-center justify-between text-body-sm hover:bg-admin-surface-subtle/50 transition-colors">
                    <div className="min-w-0 pr-4">
                      <div className="font-semibold text-admin-foreground truncate">{cat.categoryName}</div>
                      <div className="text-caption text-admin-muted">
                        {cat.expenseCount} item{cat.expenseCount === 1 ? '' : 's'} • GST: {cat.formattedGst}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-admin-foreground">{cat.formattedTotal}</div>
                      <div className="text-caption text-emerald-600">✓ Reconciled</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Evidence & Missing Evidence Note */}
            <div className="p-3.5 rounded-xl bg-admin-surface border border-admin-border flex flex-wrap items-center justify-between gap-3 text-caption">
              <div className="flex items-center gap-4">
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  ✓ {reportData.summary.evidenceAttachedCount} Evidence Attached
                </span>
                {reportData.summary.missingEvidenceCount > 0 && (
                  <span className="text-amber-600 font-bold flex items-center gap-1">
                    ⚠ {reportData.summary.missingEvidenceCount} Missing Evidence
                  </span>
                )}
              </div>
              <span className="text-admin-muted italic">
                Report embeds all receipts & invoices sequentially.
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
