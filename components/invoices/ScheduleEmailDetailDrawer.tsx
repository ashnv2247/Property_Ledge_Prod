'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  FileText,
  Mail,
  Send,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Pause,
  Play,
  Ban,
  RotateCw,
  ExternalLink,
  Building,
  User,
  ArrowUpRight,
  DollarSign,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { Button, useToast } from '@/components/admin/ui';
import {
  InvoiceEmailScheduleDTO,
  InvoiceScheduledEmailJobDTO,
} from '@/modules/invoices/domain/entities/invoice-schedule';
import { formatCurrency } from '@/modules/invoices/domain/value-objects/currency';
import { formatAuDisplayDate, formatAuDisplayDateTime } from '@/lib/format/australian-time';
import {
  pauseInvoiceScheduleAction,
  resumeInvoiceScheduleAction,
  cancelInvoiceScheduleAction,
  retryScheduledEmailJobAction,
} from '@/app/actions/invoice-schedules';
import { cn } from '@/lib/utils';

interface ScheduleEmailDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: InvoiceEmailScheduleDTO | null;
  generatedInvoices: any[];
  emailJobs: InvoiceScheduledEmailJobDTO[];
  onRefresh: () => Promise<void> | void;
  onViewInvoice?: (invoiceId: string) => void;
}

export function ScheduleEmailDetailDrawer({
  isOpen,
  onClose,
  schedule,
  generatedInvoices = [],
  emailJobs = [],
  onRefresh,
  onViewInvoice,
}: ScheduleEmailDetailDrawerProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'activity'>('overview');
  const [actionLoading, setActionLoading] = useState(false);
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);

  if (!isOpen || !schedule) return null;

  const handlePause = async () => {
    setActionLoading(true);
    try {
      const res = await pauseInvoiceScheduleAction(schedule.id);
      if (!res.success) throw new Error(res.error);
      toast({ title: 'Schedule Paused', description: 'Scheduled operations are now paused.' });
      await onRefresh();
    } catch (e: any) {
      toast({ title: 'Pause Failed', description: e.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    setActionLoading(true);
    try {
      const res = await resumeInvoiceScheduleAction(schedule.id);
      if (!res.success) throw new Error(res.error);
      toast({ title: 'Schedule Resumed', description: 'Schedule is now active.' });
      await onRefresh();
    } catch (e: any) {
      toast({ title: 'Resume Failed', description: e.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this schedule? Future scheduled emails will be stopped. Generated invoices will remain intact.')) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await cancelInvoiceScheduleAction(schedule.id);
      if (!res.success) throw new Error(res.error);
      toast({ title: 'Schedule Cancelled', description: 'Future operations cancelled. Invoices preserved.' });
      await onRefresh();
    } catch (e: any) {
      toast({ title: 'Cancel Failed', description: e.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetryJob = async (jobId: string) => {
    setRetryingJobId(jobId);
    try {
      const res = await retryScheduledEmailJobAction(jobId);
      if (!res.success) throw new Error(res.error);
      toast({ title: 'Email Delivered', description: 'Failed job retried and delivered successfully.' });
      await onRefresh();
    } catch (e: any) {
      toast({ title: 'Retry Failed', description: e.message, variant: 'destructive' });
    } finally {
      setRetryingJobId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'paused':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'cancelled':
        return 'bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-500/20';
      case 'completed':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'failed':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getEmailStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'processing':
        return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20';
      case 'scheduled':
      case 'pending':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'failed':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      case 'cancelled':
        return 'bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-500/20';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
      />

      {/* Drawer */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="relative w-full max-w-2xl bg-white dark:bg-[#07111F] border-l border-slate-200 dark:border-[#17283A] shadow-2xl z-10 flex flex-col h-full"
      >
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-200 dark:border-[#17283A] flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={cn('px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border', getStatusBadge(schedule.status))}>
                {schedule.status}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                ID: {schedule.id.slice(0, 8)}...
              </span>
            </div>
            <h3 className="text-xl font-heading font-bold text-slate-900 dark:text-white truncate">
              Schedule: {schedule.recipientName}
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5 truncate">
              {schedule.propertyName ? `${schedule.propertyName} • ` : ''}
              {schedule.billingStartMonth} to {schedule.billingEndMonth} ({schedule.frequency})
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#0E1E33] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 border-b border-slate-200 dark:border-[#17283A] bg-slate-50/50 dark:bg-slate-900/30">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={cn(
              'py-3 px-3 text-xs font-bold transition-all border-b-2 -mb-px flex items-center gap-2',
              activeTab === 'overview'
                ? 'border-[#008F83] text-[#008F83]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            )}
          >
            <Layers className="w-4 h-4" /> Overview
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('invoices')}
            className={cn(
              'py-3 px-3 text-xs font-bold transition-all border-b-2 -mb-px flex items-center gap-2',
              activeTab === 'invoices'
                ? 'border-[#008F83] text-[#008F83]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            )}
          >
            <FileText className="w-4 h-4" /> Generated Invoices ({generatedInvoices.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('activity')}
            className={cn(
              'py-3 px-3 text-xs font-bold transition-all border-b-2 -mb-px flex items-center gap-2',
              activeTab === 'activity'
                ? 'border-[#008F83] text-[#008F83]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            )}
          >
            <Mail className="w-4 h-4" /> Email Activity ({emailJobs.length})
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Management Actions Toolbar */}
              <div className="flex items-center gap-2.5 flex-wrap p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                {schedule.status === 'active' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handlePause}
                    disabled={actionLoading}
                    className="font-bold text-xs flex items-center gap-1.5"
                  >
                    <Pause className="w-3.5 h-3.5 text-amber-500" /> Pause Schedule
                  </Button>
                )}

                {schedule.status === 'paused' && (
                  <Button
                    size="sm"
                    onClick={handleResume}
                    disabled={actionLoading}
                    className="font-bold text-xs bg-[#008F83] text-white flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5" /> Resume Schedule
                  </Button>
                )}

                {schedule.status !== 'cancelled' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={actionLoading}
                    className="font-bold text-xs text-rose-600 hover:bg-rose-500/10 border-rose-200 dark:border-rose-900/50 flex items-center gap-1.5"
                  >
                    <Ban className="w-3.5 h-3.5" /> Cancel Schedule
                  </Button>
                )}
              </div>

              {/* Core Details Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <div>
                  <span className="text-slate-400 block font-medium">Source Invoice:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white mt-0.5 block text-sm">
                    {schedule.sourceInvoiceNumber || '—'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block font-medium">Recipient / Tenant:</span>
                  <span className="font-semibold text-slate-900 dark:text-white mt-0.5 block">
                    {schedule.recipientName}
                  </span>
                  <span className="text-slate-500 text-[11px] block">{schedule.recipientEmail}</span>
                </div>

                <div>
                  <span className="text-slate-400 block font-medium">Property:</span>
                  <span className="font-semibold text-slate-900 dark:text-white mt-0.5 block">
                    {schedule.propertyName || 'Independent'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block font-medium">Email Delivery Mode:</span>
                  <span className="font-bold mt-0.5 block capitalize text-[#008F83]">
                    {schedule.emailMode === 'automatic' ? 'Automatic Delivery' : 'Manual Delivery'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block font-medium">Billing Period:</span>
                  <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">
                    {schedule.billingStartMonth} to {schedule.billingEndMonth}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block font-medium">Generation Rule:</span>
                  <span className="text-slate-900 dark:text-white mt-0.5 block font-medium">
                    Day {schedule.generationDayOfMonth} of month (+{schedule.dueDaysAfter}d due)
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block font-medium">Created Date:</span>
                  <span className="text-slate-900 dark:text-white mt-0.5 block">
                    {formatAuDisplayDate(schedule.createdAt)}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block font-medium">Timezone:</span>
                  <span className="text-slate-900 dark:text-white mt-0.5 block">
                    {schedule.timezone}
                  </span>
                </div>
              </div>

              {/* Progress Summary Cards */}
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Generated</span>
                  <span className="text-lg font-heading font-extrabold text-slate-900 dark:text-white mt-0.5 block">
                    {schedule.invoicesGeneratedCount}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Sent</span>
                  <span className="text-lg font-heading font-extrabold text-emerald-600 mt-0.5 block">
                    {schedule.emailsSentCount}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40">
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Pending</span>
                  <span className="text-lg font-heading font-extrabold text-blue-600 mt-0.5 block">
                    {schedule.emailsPendingCount}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40">
                  <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">Failed</span>
                  <span className="text-lg font-heading font-extrabold text-rose-600 mt-0.5 block">
                    {schedule.emailsFailedCount}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GENERATED INVOICES */}
          {activeTab === 'invoices' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                All {generatedInvoices.length} invoices generated for this schedule. Each invoice is completely independent
                and can be edited without altering other billing months.
              </p>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/50">
                {generatedInvoices.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    No generated invoices found for this schedule.
                  </div>
                ) : (
                  generatedInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                            {inv.invoice_number}
                          </span>
                          <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border', getStatusBadge(inv.status))}>
                            {inv.status}
                          </span>
                          {inv.email_status && (
                            <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border', getEmailStatusBadge(inv.email_status))}>
                              Email: {inv.email_status}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
                          <span>Billing: {inv.billing_period_start} to {inv.billing_period_end}</span>
                          <span>•</span>
                          <span>Due: {formatAuDisplayDate(inv.due_date)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className="font-heading font-bold text-sm text-slate-900 dark:text-white block">
                            {formatCurrency(inv.total_amount, inv.currency || 'AUD')}
                          </span>
                          <span className="text-[11px] text-slate-400 block">
                            Balance: {formatCurrency(inv.balance_due, inv.currency || 'AUD')}
                          </span>
                        </div>

                        {onViewInvoice && (
                          <button
                            type="button"
                            onClick={() => onViewInvoice(inv.id)}
                            className="p-2 text-slate-400 hover:text-[#008F83] hover:bg-[#008F83]/10 rounded-lg transition-colors"
                            title="View Invoice"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: EMAIL ACTIVITY */}
          {activeTab === 'activity' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Log of all scheduled and attempted email deliveries for this recurring schedule.
              </p>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/50">
                {emailJobs.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    {schedule.emailMode === 'manual'
                      ? 'This schedule was configured with Manual Email Delivery. Invoices are sent on-demand by the manager.'
                      : 'No email delivery jobs found.'}
                  </div>
                ) : (
                  emailJobs.map((job) => (
                    <div
                      key={job.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                            {job.invoiceNumber || 'Invoice'}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">({job.billingMonth})</span>
                          <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border', getEmailStatusBadge(job.status))}>
                            {job.status}
                          </span>
                          {job.attempts > 0 && (
                            <span className="text-[10px] text-slate-400">
                              (Attempt {job.attempts}/{job.maxAttempts})
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-500 mt-1 space-y-0.5">
                          <div>Recipient: {job.recipientEmail}</div>
                          <div>Scheduled: {formatAuDisplayDateTime(job.scheduledSendDate)}</div>
                          {job.deliveredAt && (
                            <div className="text-emerald-600 font-medium">
                              Delivered: {formatAuDisplayDateTime(job.deliveredAt)}
                            </div>
                          )}
                          {job.failureReason && (
                            <div className="text-rose-600 font-medium">
                              Reason: {job.failureReason}
                            </div>
                          )}
                        </div>
                      </div>

                      {job.status === 'failed' && (
                        <div className="shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRetryJob(job.id)}
                            disabled={retryingJobId === job.id}
                            className="font-bold text-xs text-rose-600 hover:bg-rose-50 border-rose-200"
                          >
                            <RotateCw className={cn('w-3.5 h-3.5 mr-1', retryingJobId === job.id && 'animate-spin')} />
                            {retryingJobId === job.id ? 'Retrying...' : 'Retry Delivery'}
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

