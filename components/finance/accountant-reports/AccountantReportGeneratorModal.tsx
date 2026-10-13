'use client';

import React, { useState } from 'react';
import {
  FileText,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  ShieldCheck,
  Building,
  Calendar,
  Layers,
  Sparkles,
  Loader2,
  X,
} from 'lucide-react';
import { Modal } from '@/components/admin/ui/Modal';
import { Button } from '@/components/admin/ui/Button';
import { Badge } from '@/components/admin/ui/Badge';
import { useToast } from '@/components/admin/ui/Toast';
import { formatCurrency } from '@/lib/format/currency';
import {
  AccountantExpenseReportData,
  AccountantReportFilters,
} from '@/modules/finance/domain/accountant-report-types';
import { generateAccountantReportPdfAction } from '@/app/actions/accountant-report';
import { exportReportCsvAction } from '@/app/actions/reports';

export interface AccountantReportGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportData: AccountantExpenseReportData | null;
  filters: AccountantReportFilters;
  propertyOptions?: Array<{ id: string; name: string }>;
}

export function AccountantReportGeneratorModal({
  isOpen,
  onClose,
  reportData,
  filters,
}: AccountantReportGeneratorModalProps) {
  const { toast } = useToast();

  const [includeReceipts, setIncludeReceipts] = useState(true);
  const [includeWarnings, setIncludeWarnings] = useState(true);
  const [includeReviewSignoff, setIncludeReviewSignoff] = useState(true);

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('idle');
  const [isExportingCsv, setIsExportingCsv] = useState(false);

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    setGenerationStep('Resolving transactions and calculating GST...');

    try {
      setTimeout(() => {
        setGenerationStep('Embedding receipt documents and evidence pages...');
      }, 600);

      const res = await generateAccountantReportPdfAction(filters);

      if (!res.success || !res.base64Data) {
        throw new Error(res.error || 'Failed to generate accountant PDF report');
      }

      setGenerationStep('Assembling multi-page evidence pack...');

      // Trigger automatic browser download
      const link = document.createElement('a');
      link.href = res.base64Data;
      link.download = res.filename || 'PropertyLedge_Accountant_Expense_Report.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Report Downloaded',
        description: `Successfully exported ${res.filename}`,
        variant: 'success',
      });

      onClose();
    } catch (err: any) {
      toast({
        title: 'PDF Generation Failed',
        description: err.message || 'An error occurred during report generation',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingPdf(false);
      setGenerationStep('idle');
    }
  };

  const handleExportCsv = async () => {
    setIsExportingCsv(true);

    try {
      const res = await exportReportCsvAction('expenses', {
        financialYear: typeof filters.financialYear === 'number' ? filters.financialYear : undefined,
        propertyId: filters.propertyId === 'all' ? undefined : (filters.propertyId || undefined),
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      });

      if (!res.success || !res.csvContent) {
        throw new Error((res as any).error || 'Failed to generate CSV');
      }

      const blob = new Blob([res.csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = res.filename || 'Accountant_Expenses_Export.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'CSV Export Complete',
        description: `Downloaded ${res.filename}`,
        variant: 'success',
      });
    } catch (err: any) {
      toast({
        title: 'CSV Export Failed',
        description: err.message || 'Failed to export CSV',
        variant: 'destructive',
      });
    } finally {
      setIsExportingCsv(false);
    }
  };

  if (!reportData) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Accountant Expense Report & Audit Pack"
      size="lg"
    >
      <div className="space-y-6">
        {/* Intro */}
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Configure and export a self-contained, audit-ready Australian Accountant Expense Report.
          Includes executive summary, category totals, evidentiary receipts, and statutory compliance declarations.
        </p>

        {/* Live Report Scope & Summary Preview Box */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/70 dark:bg-[#0A1A2E] p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-white/[0.06] pb-2.5">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-[#008F83] dark:text-[#32D5C4]" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {reportData.metadata.propertyName}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-500">
              <Calendar className="w-3.5 h-3.5" />
              <span>{reportData.metadata.periodLabel}</span>
            </div>
          </div>

          {/* Metric Grid Preview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04]">
              <span className="text-[10px] text-slate-400 block">Total Expenses</span>
              <span className="font-bold text-sm font-mono text-slate-900 dark:text-white">
                {reportData.summary.formattedTotalExpenses}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04]">
              <span className="text-[10px] text-slate-400 block">GST Amount</span>
              <span className="font-bold text-sm font-mono text-amber-600 dark:text-amber-400">
                {reportData.summary.formattedTotalGst}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04]">
              <span className="text-[10px] text-slate-400 block">Number of Expenses</span>
              <span className="font-bold text-sm font-mono text-slate-800 dark:text-slate-200">
                {reportData.summary.totalExpenseCount} transactions
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04]">
              <span className="text-[10px] text-slate-400 block">Evidence Coverage</span>
              <span className="font-bold text-sm font-mono text-emerald-600 dark:text-emerald-400">
                {reportData.summary.evidenceAttachedCount} / {reportData.summary.totalExpenseCount}
              </span>
            </div>
          </div>
        </div>

        {/* Configuration Options */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Report Output Options
          </h4>

          <div className="space-y-2 text-xs">
            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200/80 dark:border-white/[0.06] bg-white dark:bg-white/[0.01] cursor-pointer hover:bg-slate-50/50">
              <input
                type="checkbox"
                checked={includeReceipts}
                onChange={(e) => setIncludeReceipts(e.target.checked)}
                className="w-4 h-4 rounded text-[#008F83] focus:ring-[#008F83]"
              />
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                  Embed High-Resolution Tax Receipts & Documents
                </span>
                <span className="text-[11px] text-slate-400">
                  Renders original receipts and visual vouchers for ATO substantiation audit compliance.
                </span>
              </div>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200/80 dark:border-white/[0.06] bg-white dark:bg-white/[0.01] cursor-pointer hover:bg-slate-50/50">
              <input
                type="checkbox"
                checked={includeWarnings}
                onChange={(e) => setIncludeWarnings(e.target.checked)}
                className="w-4 h-4 rounded text-[#008F83] focus:ring-[#008F83]"
              />
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                  Include Missing Evidence Warning Notices
                </span>
                <span className="text-[11px] text-slate-400">
                  Flags transactions without tax invoices so the accountant can query the client before lodgment.
                </span>
              </div>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200/80 dark:border-white/[0.06] bg-white dark:bg-white/[0.01] cursor-pointer hover:bg-slate-50/50">
              <input
                type="checkbox"
                checked={includeReviewSignoff}
                onChange={(e) => setIncludeReviewSignoff(e.target.checked)}
                className="w-4 h-4 rounded text-[#008F83] focus:ring-[#008F83]"
              />
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                  Include Accountant Verification Checkboxes & Notes Section
                </span>
                <span className="text-[11px] text-slate-400">
                  Renders checkboxes (Verified, Needs Review, Disputed) and review lines for physical sign-off.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Progress or Actions */}
        {isGeneratingPdf ? (
          <div className="p-4 rounded-xl bg-[#008F83]/10 border border-[#008F83]/20 flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-[#008F83] animate-spin flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                Generating Accountant Report PDF...
              </p>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                {generationStep}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={isExportingCsv}
              className="w-full sm:w-auto text-xs gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>{isExportingCsv ? 'Exporting...' : 'Export CSV Data'}</span>
            </Button>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDownloadPdf}
                className="bg-[#008F83] hover:bg-[#008F83]/90 text-white font-bold text-xs gap-1.5 px-5"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF Audit Pack</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
