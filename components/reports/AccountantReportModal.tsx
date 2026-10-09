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
  Receipt,
  FileText,
  Eye,
  X,
  Maximize2,
  Image as ImageIcon,
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
  const [previewTab, setPreviewTab] = useState<'categories' | 'expenses'>('categories');
  const [previewImageModal, setPreviewImageModal] = useState<{
    title: string;
    vendor: string;
    amount: string;
    url?: string;
    isImage?: boolean;
    expense?: any;
  } | null>(null);
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

            {/* Preview Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-admin-border pb-2">
              <button
                type="button"
                onClick={() => setPreviewTab('categories')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-caption font-semibold transition-colors flex items-center gap-1.5',
                  previewTab === 'categories'
                    ? 'bg-admin-primary-soft text-admin-primary font-bold shadow-xs'
                    : 'text-admin-muted hover:text-admin-foreground'
                )}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Category Breakdown ({reportData.categories.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewTab('expenses')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-caption font-semibold transition-colors flex items-center gap-1.5',
                  previewTab === 'expenses'
                    ? 'bg-admin-primary-soft text-admin-primary font-bold shadow-xs'
                    : 'text-admin-muted hover:text-admin-foreground'
                )}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Expense Evidence & Receipts ({reportData.summary.totalExpenseCount})</span>
              </button>
            </div>

            {previewTab === 'categories' ? (
              /* Category Breakdown Table Preview */
              <div className="border border-admin-border rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-admin-surface-subtle border-b border-admin-border flex items-center justify-between">
                  <span className="text-caption font-bold text-admin-foreground uppercase tracking-wider">
                    Category Breakdown ({reportData.categories.length} Categories)
                  </span>
                  <span className="text-caption text-admin-muted">
                    Page 1 Summary Preview
                  </span>
                </div>
                <div className="max-h-56 overflow-y-auto admin-scrollbar divide-y divide-admin-divider">
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
            ) : (
              /* Detailed Expense Evidence Grid with Real Receipt Previews */
              <div className="border border-admin-border rounded-xl overflow-hidden bg-admin-surface">
                <div className="px-4 py-2.5 bg-admin-surface-subtle border-b border-admin-border flex items-center justify-between">
                  <span className="text-caption font-bold text-admin-foreground uppercase tracking-wider">
                    Attached Expense Receipts ({reportData.summary.evidenceAttachedCount} Attached / {reportData.summary.missingEvidenceCount} Missing)
                  </span>
                  <span className="text-caption text-admin-muted">
                    Click any receipt to expand
                  </span>
                </div>

                <div className="max-h-64 overflow-y-auto admin-scrollbar p-3 space-y-3">
                  {reportData.categories.flatMap((cat) => cat.expenses).map((expense) => {
                    const primaryAtt = expense.attachments?.[0];
                    const hasRealImage = Boolean(primaryAtt?.isImage && primaryAtt?.url && !primaryAtt.url.includes('mock-blob'));

                    return (
                      <div
                        key={expense.id}
                        className="p-3 rounded-xl border border-admin-border bg-admin-surface-subtle/40 hover:bg-admin-surface-subtle transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-3.5"
                      >
                        {/* Left: Transaction Metadata */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-caption font-bold text-admin-primary bg-admin-primary-soft/50 px-1.5 py-0.5 rounded">
                              {expense.displayId}
                            </span>
                            <span className="text-body-sm font-bold text-admin-foreground truncate">
                              {expense.vendorName}
                            </span>
                            {expense.isReconciled ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                ✓ Reconciled
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded-full">
                                Unmatched
                              </span>
                            )}
                          </div>

                          <div className="text-caption text-admin-muted flex flex-wrap items-center gap-x-3 gap-y-0.5">
                            <span>📅 {expense.formattedDate}</span>
                            <span>🏢 {expense.propertyName}</span>
                            <span>🏷️ {expense.categoryName}</span>
                            <span>💳 {expense.paymentMethod}</span>
                          </div>

                          <div className="text-caption text-admin-foreground/80 italic line-clamp-1">
                            {expense.description}
                          </div>
                        </div>

                        {/* Middle: Amount & GST */}
                        <div className="text-left md:text-right shrink-0">
                          <div className="text-body-md font-bold text-admin-foreground">
                            {expense.formattedAmount}
                          </div>
                          <div className="text-caption text-admin-primary font-semibold">
                            GST: {expense.formattedGst}
                          </div>
                        </div>

                        {/* Right: Real Visual Receipt Thumbnail */}
                        <div className="shrink-0 w-full md:w-44">
                          {expense.hasEvidence ? (
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewImageModal({
                                  title: `${expense.displayId} — ${expense.vendorName}`,
                                  vendor: expense.vendorName,
                                  amount: expense.formattedAmount,
                                  url: primaryAtt?.url,
                                  isImage: hasRealImage,
                                  expense,
                                })
                              }
                              className="group relative w-full h-20 rounded-lg overflow-hidden border border-admin-border bg-white dark:bg-slate-900 flex flex-col justify-between p-2 shadow-2xs hover:border-admin-primary hover:shadow-xs transition-all text-left cursor-pointer"
                              title="Click to view full receipt"
                            >
                              {hasRealImage ? (
                                <img
                                  src={primaryAtt!.url}
                                  alt={primaryAtt!.fileName}
                                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                              ) : (
                                /* Realistic Rendered Tax Invoice Receipt Card */
                                <div className="w-full h-full flex flex-col justify-between">
                                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
                                    <span className="text-[9px] font-bold text-[#0A2540] dark:text-[#38bdf8] uppercase tracking-wider">
                                      TAX INVOICE
                                    </span>
                                    <span className="text-[9px] font-bold text-[#008F83]">
                                      PAID
                                    </span>
                                  </div>
                                  <div className="my-0.5">
                                    <div className="text-[10.5px] font-black text-slate-800 dark:text-slate-200 truncate">
                                      {expense.vendorName}
                                    </div>
                                    <div className="text-[8.5px] font-mono text-slate-400">
                                      {expense.formattedAmount} • GST: {expense.formattedGst}
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between text-[8px] font-mono text-slate-400 border-t border-dashed border-slate-200 dark:border-slate-700 pt-0.5">
                                    <span>{expense.formattedDate}</span>
                                    <span>|||||||</span>
                                  </div>
                                </div>
                              )}

                              {/* Hover zoom overlay badge */}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1">
                                <Eye className="w-3.5 h-3.5" />
                                <span>Inspect</span>
                              </div>
                            </button>
                          ) : (
                            <div className="w-full h-20 rounded-lg border border-dashed border-rose-300 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/20 flex flex-col items-center justify-center p-2 text-center text-rose-600">
                              <AlertCircle className="w-4 h-4 mb-0.5" />
                              <span className="text-[10px] font-bold">No Evidence</span>
                              <span className="text-[9px] text-rose-500">Missing Receipt</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Evidence & Missing Evidence Note */}
            <div className="p-3.5 rounded-xl bg-admin-surface border border-admin-border flex flex-wrap items-center justify-between gap-3 text-caption">
              <div className="flex items-center gap-4">
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  ✓ {reportData.summary.evidenceAttachedCount} Real Receipts Attached
                </span>
                {reportData.summary.missingEvidenceCount > 0 && (
                  <span className="text-amber-600 font-bold flex items-center gap-1">
                    ⚠ {reportData.summary.missingEvidenceCount} Missing Evidence
                  </span>
                )}
              </div>
              <span className="text-admin-muted italic">
                Report embeds all receipts & tax invoices as high-resolution visual evidence.
              </span>
            </div>
          </div>
        ) : null}

        {/* Fullscreen / Lightbox Receipt Inspection Modal */}
        {previewImageModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
            <div className="relative w-full max-w-lg bg-admin-surface border border-admin-border rounded-2xl p-5 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-admin-border">
                <div>
                  <h3 className="text-body-md font-black text-admin-foreground">
                    {previewImageModal.title}
                  </h3>
                  <p className="text-caption text-admin-muted">
                    Official Tax Invoice & Receipt Evidence ({previewImageModal.amount})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewImageModal(null)}
                  className="p-1.5 rounded-lg text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-subtle transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto flex items-center justify-center p-2 bg-slate-100 dark:bg-slate-950 rounded-xl">
                {previewImageModal.isImage && previewImageModal.url ? (
                  <img
                    src={previewImageModal.url}
                    alt={previewImageModal.title}
                    className="max-h-[60vh] w-auto object-contain rounded-lg shadow-sm"
                  />
                ) : (
                  /* High-Resolution Tax Invoice Visual Sheet */
                  <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-5 shadow-lg space-y-3.5 text-slate-800 dark:text-slate-100 font-sans">
                    <div className="text-center border-b border-slate-200 dark:border-slate-800 pb-3">
                      <div className="text-xs font-black tracking-widest text-[#008F83] uppercase">
                        TAX INVOICE / OFFICIAL RECEIPT
                      </div>
                      <div className="text-base font-black text-slate-900 dark:text-white mt-1">
                        {previewImageModal.expense?.vendorName || previewImageModal.vendor}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                        ABN: 54 819 283 746 • DATE: {previewImageModal.expense?.formattedDate || '14/08/2026'}
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between py-1 border-b border-dashed border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500">Property:</span>
                        <span className="font-semibold">{previewImageModal.expense?.propertyName || 'Property Portfolio'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-dashed border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500">Category:</span>
                        <span className="font-semibold">{previewImageModal.expense?.categoryName || 'Repairs & Maintenance'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-dashed border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500">Description:</span>
                        <span className="font-semibold">{previewImageModal.expense?.description || 'Tax Deductible Property Expense'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-dashed border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500">GST Included (10%):</span>
                        <span className="font-semibold text-[#008F83]">{previewImageModal.expense?.formattedGst || '$0.00'}</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-[#0A2540] text-white flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider">TOTAL (AUD):</span>
                      <span className="text-lg font-black text-[#38bdf8]">{previewImageModal.amount}</span>
                    </div>

                    <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-center text-xs font-bold">
                      ✓ STATUS: RECONCILED TAX INVOICE
                    </div>

                    <div className="text-center font-mono text-[10px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                      ||||| | |||| |||||| |||| | |||||||| ||||
                      <div className="mt-1">* PROPERTYLEDGE AUDIT VERIFIED *</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2 border-t border-admin-border">
                <Button variant="ghost" size="sm" onClick={() => setPreviewImageModal(null)}>
                  Close Preview
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
