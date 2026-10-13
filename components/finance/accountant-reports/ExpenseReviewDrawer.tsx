'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  Download,
  Upload,
  Eye,
  Maximize2,
  Calendar,
  Building,
  Tag,
  DollarSign,
  CreditCard,
  Hash,
  ShieldCheck,
  AlertCircle,
  FileCheck,
  ExternalLink,
} from 'lucide-react';
import { Drawer } from '@/components/admin/ui/Drawer';
import { Badge } from '@/components/admin/ui/Badge';
import { Button } from '@/components/admin/ui/Button';
import { Modal } from '@/components/admin/ui/Modal';
import { useToast } from '@/components/admin/ui/Toast';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format/currency';
import {
  AccountantExpenseItem,
  AccountantExpenseAttachment,
} from '@/modules/finance/domain/accountant-report-types';
import {
  saveAccountantTransactionReviewAction,
  uploadTransactionReceiptAction,
} from '@/app/actions/accountant-report';
import { AccountantReviewStatus } from '@/lib/finance/accountant-review-service';

export interface ExpenseReviewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  expense: AccountantExpenseItem | null;
  onExpenseUpdated?: (updated: AccountantExpenseItem) => void;
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  currentIndex?: number;
  totalCount?: number;
}

export function ExpenseReviewDrawer({
  isOpen,
  onClose,
  expense,
  onExpenseUpdated,
  onNavigatePrevious,
  onNavigateNext,
  hasPrevious = false,
  hasNext = false,
  currentIndex,
  totalCount,
}: ExpenseReviewDrawerProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Review Form State
  const [reviewStatus, setReviewStatus] = useState<AccountantReviewStatus>('unreviewed');
  const [accountantNotes, setAccountantNotes] = useState<string>('');
  const [isSavingReview, setIsSavingReview] = useState(false);

  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Lightbox Zoom Modal State
  const [zoomImage, setZoomImage] = useState<{ url: string; title: string } | null>(null);

  // Synchronize state when expense changes
  useEffect(() => {
    if (expense) {
      setReviewStatus(expense.reviewStatus || 'unreviewed');
      setAccountantNotes(expense.accountantNotes || '');
      setUploadError(null);
    }
  }, [expense?.id, expense?.reviewStatus, expense?.accountantNotes]);

  if (!expense) return null;

  const handleSaveReview = async () => {
    if (!expense) return;
    setIsSavingReview(true);

    try {
      const res = await saveAccountantTransactionReviewAction({
        transactionId: expense.id,
        reviewStatus,
        accountantNotes,
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to save review decision');
      }

      toast({
        title: 'Review Saved',
        description: `Expense ${expense.displayId} status set to "${reviewStatus.toUpperCase()}".`,
        variant: 'success',
      });

      if (onExpenseUpdated) {
        onExpenseUpdated({
          ...expense,
          reviewStatus,
          accountantNotes,
          reviewedBy: res.review?.reviewedBy || 'Accountant',
          reviewedAt: res.review?.reviewedAt || new Date().toISOString(),
        });
      }
    } catch (err: any) {
      toast({
        title: 'Save Failed',
        description: err.message || 'Unable to persist review decision',
        variant: 'destructive',
      });
    } finally {
      setIsSavingReview(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !expense) return;

    // Client-side file validation
    const maxSizeBytes = 15 * 1024 * 1024; // 15MB
    if (file.size > maxSizeBytes) {
      setUploadError('File exceeds maximum allowable size of 15MB.');
      return;
    }

    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setUploadError('Unsupported document format. Allowed formats: PDF, JPG, PNG, WEBP.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('transactionId', expense.id);
      formData.append('file', file);

      const res = await uploadTransactionReceiptAction(formData);
      if (!res.success || !res.attachment) {
        throw new Error(res.error || 'Failed to upload receipt');
      }

      const newAttachment: AccountantExpenseAttachment = {
        id: res.attachment.id,
        fileName: res.attachment.fileName,
        fileSize: res.attachment.fileSize,
        mimeType: res.attachment.mimeType,
        url: res.attachment.url,
        isPdf: res.attachment.isPdf,
        isImage: res.attachment.isImage,
      };

      const updatedAttachments = [newAttachment, ...(expense.attachments || [])];

      toast({
        title: 'Receipt Uploaded',
        description: `Successfully attached ${res.attachment.fileName} to ${expense.displayId}.`,
        variant: 'success',
      });

      if (onExpenseUpdated) {
        onExpenseUpdated({
          ...expense,
          hasEvidence: true,
          attachments: updatedAttachments,
        });
      }
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed. Please check network and retry.');
      toast({
        title: 'Upload Failed',
        description: err.message || 'Could not attach receipt document',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      // Reset input value
      e.target.value = '';
    }
  };

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        title=""
        width="xl"
        className="dark:bg-[#071322] border-l border-slate-200 dark:border-white/[0.08]"
      >
        <div className="flex flex-col h-full -mx-4 -my-4 sm:-mx-6 sm:-my-6 divide-y divide-slate-100 dark:divide-white/[0.06]">
          {/* Custom Header Bar */}
          <div className="p-5 sm:p-6 bg-slate-50/70 dark:bg-[#0A1A2E]/80 backdrop-blur-sm sticky top-0 z-20">
            <div className="flex items-center justify-between gap-4 mb-3">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-sm font-bold px-2.5 py-1 rounded-md bg-[#008F83]/10 text-[#008F83] dark:text-[#32D5C4] border border-[#008F83]/20">
                  {expense.displayId}
                </span>

                {/* Review Status Badge */}
                {reviewStatus === 'verified' && (
                  <Badge variant="success" className="gap-1 text-[11px] font-semibold">
                    <CheckCircle2 className="w-3 h-3" />
                    Verified
                  </Badge>
                )}
                {reviewStatus === 'needs_review' && (
                  <Badge variant="warning" className="gap-1 text-[11px] font-semibold">
                    <Clock className="w-3 h-3" />
                    Needs Review
                  </Badge>
                )}
                {reviewStatus === 'disputed' && (
                  <Badge variant="danger" className="gap-1 text-[11px] font-semibold">
                    <AlertTriangle className="w-3 h-3" />
                    Disputed
                  </Badge>
                )}
                {reviewStatus === 'unreviewed' && (
                  <Badge variant="neutral" className="text-[11px] font-medium text-slate-500">
                    Unreviewed
                  </Badge>
                )}
              </div>

              {/* Navigation & Close Controls */}
              <div className="flex items-center gap-1.5">
                {typeof currentIndex === 'number' && typeof totalCount === 'number' && (
                  <span className="text-xs font-mono text-slate-400 mr-2">
                    {currentIndex + 1} of {totalCount}
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onNavigatePrevious}
                  disabled={!hasPrevious}
                  title="Previous expense in queue"
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onNavigateNext}
                  disabled={!hasNext}
                  title="Next expense in queue"
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <div className="w-px h-5 bg-slate-200 dark:bg-white/[0.1] mx-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Vendor & Financial Highlight */}
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {expense.vendorName}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {expense.categoryName} • {expense.propertyName}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                  {expense.formattedAmount}
                </div>
                <div className="text-xs font-mono text-amber-600 dark:text-amber-400">
                  GST: {expense.formattedGst} ({expense.gstInclusive ? 'Included' : 'Excluded'})
                </div>
              </div>
            </div>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            {/* 1. Evidentiary Documentation Card */}
            <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0A1A2E] p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-[#008F83] dark:text-[#32D5C4]" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Evidentiary Documentation
                  </h3>
                </div>
                {expense.hasEvidence ? (
                  <Badge variant="success" className="text-[10px] font-semibold">
                    Evidence Attached
                  </Badge>
                ) : (
                  <Badge variant="danger" className="text-[10px] font-semibold animate-pulse">
                    Missing Evidence
                  </Badge>
                )}
              </div>

              {/* Attached Evidence View */}
              {expense.hasEvidence && expense.attachments.length > 0 ? (
                <div className="space-y-3">
                  {expense.attachments.map((att, idx) => (
                    <div
                      key={att.id || idx}
                      className="group rounded-xl border border-slate-200/80 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#008F83]/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {att.isImage ? (
                          <div
                            onClick={() => setZoomImage({ url: att.url, title: att.fileName })}
                            className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-200 dark:border-white/[0.1] bg-slate-100 dark:bg-slate-800 flex-shrink-0 cursor-pointer group/img"
                            title="Click to zoom image"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={att.url}
                              alt={att.fileName}
                              className="w-full h-full object-cover group-hover/img:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                              <Maximize2 className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 flex items-center justify-center flex-shrink-0 text-rose-600 dark:text-rose-400">
                            <FileText className="w-6 h-6" />
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={att.fileName}>
                            {att.fileName}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                            <span>{att.fileSize ? `${Math.round(att.fileSize / 1024)} KB` : 'Tax Invoice'}</span>
                            <span>•</span>
                            <span className="uppercase">{att.mimeType?.split('/')[1] || 'Document'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {att.isImage && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setZoomImage({ url: att.url, title: att.fileName })}
                            className="text-xs gap-1.5 h-8"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Preview
                          </Button>
                        )}
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-[#008F83] hover:text-white transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Missing Evidence Alert Panel */
                <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/60 dark:bg-rose-950/20 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-rose-900 dark:text-rose-300">
                        No supporting evidence attached
                      </h4>
                      <p className="text-xs text-rose-700 dark:text-rose-400 mt-0.5 leading-relaxed">
                        No invoice, receipt, or voucher is currently attached to this transaction. Australian tax law requires supporting records for deductible expenses.
                      </p>
                    </div>
                  </div>

                  {/* Upload Dropzone */}
                  <div className="pt-2">
                    <label className={cn(
                      "flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl cursor-pointer transition-all",
                      isUploading
                        ? "border-[#008F83] bg-[#008F83]/5 pointer-events-none"
                        : "border-slate-300 dark:border-white/[0.15] hover:border-[#008F83] bg-white/60 dark:bg-white/[0.02]"
                    )}>
                      <Upload className={cn(
                        "w-5 h-5 mb-1.5",
                        isUploading ? "animate-bounce text-[#008F83]" : "text-slate-400"
                      )} />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {isUploading ? 'Uploading receipt document...' : 'Attach Receipt or Tax Invoice'}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        PDF, JPG, PNG or WEBP (max 15MB)
                      </span>
                      <input
                        type="file"
                        accept="application/pdf,image/jpeg,image/png,image/webp"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                        className="hidden"
                      />
                    </label>

                    {uploadError && (
                      <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 mt-2">
                        {uploadError}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Accountant Review Decision Workflow */}
            <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0A1A2E] p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#008F83] dark:text-[#32D5C4]" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Accountant Review Decision
                  </h3>
                </div>
                {expense.reviewedAt && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    Updated: {new Date(expense.reviewedAt).toLocaleDateString('en-AU')}
                  </span>
                )}
              </div>

              {/* Status Radio Pills */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* 1. Verified */}
                <button
                  type="button"
                  onClick={() => setReviewStatus('verified')}
                  className={cn(
                    "flex flex-col items-start p-3 rounded-xl border text-left transition-all",
                    reviewStatus === 'verified'
                      ? "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/20"
                      : "border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.15] bg-slate-50/50 dark:bg-white/[0.01]"
                  )}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verified</span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    Receipt matched & verified
                  </span>
                </button>

                {/* 2. Needs Review */}
                <button
                  type="button"
                  onClick={() => setReviewStatus('needs_review')}
                  className={cn(
                    "flex flex-col items-start p-3 rounded-xl border text-left transition-all",
                    reviewStatus === 'needs_review'
                      ? "border-amber-500 bg-amber-50/60 dark:bg-amber-950/30 text-amber-950 dark:text-amber-100 ring-2 ring-amber-500/20"
                      : "border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.15] bg-slate-50/50 dark:bg-white/[0.01]"
                  )}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-amber-600 dark:text-amber-400">
                    <Clock className="w-4 h-4" />
                    <span>Needs Review</span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    Missing docs or query client
                  </span>
                </button>

                {/* 3. Disputed / Issue */}
                <button
                  type="button"
                  onClick={() => setReviewStatus('disputed')}
                  className={cn(
                    "flex flex-col items-start p-3 rounded-xl border text-left transition-all",
                    reviewStatus === 'disputed'
                      ? "border-rose-500 bg-rose-50/60 dark:bg-rose-950/30 text-rose-950 dark:text-rose-100 ring-2 ring-rose-500/20"
                      : "border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.15] bg-slate-50/50 dark:bg-white/[0.01]"
                  )}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-rose-600 dark:text-rose-400">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Issue / Dispute</span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    Incorrect amount or rejected
                  </span>
                </button>
              </div>

              {/* Accountant Notes Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Accountant Review Notes & Tax Comments
                </label>
                <textarea
                  rows={3}
                  value={accountantNotes}
                  onChange={(e) => setAccountantNotes(e.target.value)}
                  placeholder="Enter tax adjustments, audit verification notes, or queries for the client..."
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50/50 dark:bg-[#071322] p-3 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#008F83]"
                />
              </div>

              {/* Save Review Button */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-400">
                  Persists to financial ledger audit trail
                </span>
                <Button
                  onClick={handleSaveReview}
                  disabled={isSavingReview}
                  className="bg-[#008F83] hover:bg-[#008F83]/90 text-white font-bold text-xs px-5 h-9"
                >
                  {isSavingReview ? 'Saving Decision...' : 'Save Review Decision'}
                </Button>
              </div>
            </div>

            {/* 3. Complete Financial & Ledger Metadata */}
            <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0A1A2E] p-4 sm:p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                Transaction Ledger Details
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02]">
                  <span className="text-[10px] text-slate-400 block">Transaction Date</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                    {expense.formattedDate}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02]">
                  <span className="text-[10px] text-slate-400 block">Expense Category</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {expense.categoryName}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02]">
                  <span className="text-[10px] text-slate-400 block">Tax Classification</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {expense.taxClassificationName} {expense.basCode ? `(${expense.basCode})` : ''}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02]">
                  <span className="text-[10px] text-slate-400 block">Payment Method</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {expense.paymentMethod}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02]">
                  <span className="text-[10px] text-slate-400 block">Reconciliation</span>
                  <span className={cn(
                    "font-semibold font-mono",
                    expense.isReconciled ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600"
                  )}>
                    {expense.reconciliationStatus}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02]">
                  <span className="text-[10px] text-slate-400 block">Invoice / Ref #</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono truncate block" title={expense.reference || 'None'}>
                    {expense.reference || '—'}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="pt-2 border-t border-slate-100 dark:border-white/[0.04]">
                <span className="text-[10px] text-slate-400 block mb-1">Description</span>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50/50 dark:bg-white/[0.01] p-2.5 rounded-xl">
                  {expense.description}
                </p>
              </div>

              {/* Original User Notes (if any) */}
              {expense.userNotes && (
                <div className="pt-2 border-t border-slate-100 dark:border-white/[0.04]">
                  <span className="text-[10px] text-slate-400 block mb-1">Property Manager Notes</span>
                  <p className="text-xs text-slate-600 dark:text-slate-400 italic bg-slate-50/30 dark:bg-white/[0.01] p-2.5 rounded-xl">
                    {expense.userNotes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Drawer>

      {/* Full Image Zoom Lightbox Modal */}
      {zoomImage && (
        <Modal
          isOpen={true}
          onClose={() => setZoomImage(null)}
          title={zoomImage.title}
          size="xl"
        >
          <div className="flex flex-col items-center justify-center p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={zoomImage.url}
              alt={zoomImage.title}
              className="max-h-[75vh] w-auto object-contain rounded-lg border border-slate-200 dark:border-white/[0.1]"
            />
            <div className="mt-3 flex items-center justify-between w-full">
              <span className="text-xs font-mono text-slate-400">{zoomImage.title}</span>
              <a
                href={zoomImage.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-[#008F83] hover:underline inline-flex items-center gap-1"
              >
                <span>Open original in new tab</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
