'use client';

import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
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
  User,
  CreditCard,
  Globe,
  Layers,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit3,
  CalendarClock,
  CalendarCheck2,
  Search,
  Filter,
  Check,
} from 'lucide-react';
import { Button, useToast } from '@/components/admin/ui';
import {
  InvoiceEmailScheduleDTO,
  InvoiceScheduledEmailJobDTO,
} from '@/modules/invoices/domain/entities/invoice-schedule';
import { formatCurrency } from '@/modules/invoices/domain/value-objects/currency';
import {
  formatAuDateIso,
  formatAuDisplayDate,
  formatAuDisplayDateTime,
  getAuTodayString,
} from '@/lib/format/australian-time';
import {
  pauseInvoiceScheduleAction,
  resumeInvoiceScheduleAction,
  cancelInvoiceScheduleAction,
  retryScheduledEmailJobAction,
  rescheduleInvoiceEmailJobAction,
} from '@/app/actions/invoice-schedules';
import {
  fetchInvoiceByIdAction,
  issueInvoiceAction,
  sendInvoiceEmailAction,
  updateInvoiceAction,
} from '@/app/actions/invoices';
import { InvoiceDTO, UpdateInvoiceDTO } from '@/modules/invoices';
import { cn } from '@/lib/utils';

const CreateInvoiceModal = dynamic(
  () => import('./CreateInvoiceModal').then((mod) => mod.CreateInvoiceModal),
  { ssr: false }
);

function tomorrowInSydney(): string {
  const date = new Date(`${getAuTodayString()}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function formatMonthYear(monthStr?: string): string {
  if (!monthStr) return '—';
  try {
    const [year, month] = monthStr.split('-').map(Number);
    if (!year || !month) return monthStr;
    const d = new Date(Date.UTC(year, month - 1, 1));
    return new Intl.DateTimeFormat('en-AU', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
  } catch {
    return monthStr;
  }
}

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
  const [sendingInvoiceId, setSendingInvoiceId] = useState<string | null>(null);
  const [loadingInvoiceId, setLoadingInvoiceId] = useState<string | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceDTO | null>(null);

  // Tab 2: Invoices search & pagination
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoicePage, setInvoicePage] = useState(1);
  const INVOICES_PER_PAGE = 9;

  // Tab 3: Email Activity search, filter & pagination
  const [emailSearch, setEmailSearch] = useState('');
  const [emailMonthFilter, setEmailMonthFilter] = useState('all');
  const [emailStatusFilter, setEmailStatusFilter] = useState('all');
  const [emailPage, setEmailPage] = useState(1);
  const EMAILS_PER_PAGE = 6;

  // Rescheduling state
  const [reschedulingJobId, setReschedulingJobId] = useState<string | null>(null);
  const [rescheduleDates, setRescheduleDates] = useState<Record<string, string>>({});

  if (!isOpen || !schedule) return null;

  // Filtered generated invoices
  const filteredInvoices = useMemo(() => {
    if (!invoiceSearch.trim()) return generatedInvoices;
    const q = invoiceSearch.toLowerCase().trim();
    return generatedInvoices.filter((inv) => {
      const invNum = (inv.invoice_number || '').toLowerCase();
      const bStart = (inv.billing_period_start || '').toLowerCase();
      const bEnd = (inv.billing_period_end || '').toLowerCase();
      const status = (inv.status || '').toLowerCase();
      return invNum.includes(q) || bStart.includes(q) || bEnd.includes(q) || status.includes(q);
    });
  }, [generatedInvoices, invoiceSearch]);

  const totalInvoicePages = Math.max(1, Math.ceil(filteredInvoices.length / INVOICES_PER_PAGE));
  const paginatedInvoices = useMemo(() => {
    const start = (invoicePage - 1) * INVOICES_PER_PAGE;
    return filteredInvoices.slice(start, start + INVOICES_PER_PAGE);
  }, [filteredInvoices, invoicePage]);

  // Unique months from email jobs
  const availableEmailMonths = useMemo(() => {
    const set = new Set<string>();
    emailJobs.forEach((job) => {
      if (job.billingMonth) set.add(job.billingMonth);
    });
    return Array.from(set);
  }, [emailJobs]);

  // Filtered email jobs
  const filteredEmailJobs = useMemo(() => {
    return emailJobs.filter((job) => {
      if (emailSearch.trim()) {
        const q = emailSearch.toLowerCase().trim();
        const num = (job.invoiceNumber || '').toLowerCase();
        const month = (job.billingMonth || '').toLowerCase();
        const email = (job.recipientEmail || '').toLowerCase();
        if (!num.includes(q) && !month.includes(q) && !email.includes(q)) return false;
      }
      if (emailMonthFilter !== 'all' && job.billingMonth !== emailMonthFilter) {
        return false;
      }
      if (emailStatusFilter !== 'all' && job.status !== emailStatusFilter) {
        return false;
      }
      return true;
    });
  }, [emailJobs, emailSearch, emailMonthFilter, emailStatusFilter]);

  const totalEmailPages = Math.max(1, Math.ceil(filteredEmailJobs.length / EMAILS_PER_PAGE));
  const paginatedEmailJobs = useMemo(() => {
    const start = (emailPage - 1) * EMAILS_PER_PAGE;
    return filteredEmailJobs.slice(start, start + EMAILS_PER_PAGE);
  }, [filteredEmailJobs, emailPage]);

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

  const handleViewInvoice = (invoiceId: string) => {
    window.open(`/api/invoices/${invoiceId}/pdf`, '_blank', 'noopener,noreferrer');
  };

  const handleEditInvoice = async (invoiceId: string) => {
    setLoadingInvoiceId(invoiceId);
    try {
      const invoice = await fetchInvoiceByIdAction(invoiceId);
      if (!invoice) throw new Error('Invoice could not be loaded.');
      setEditingInvoice(invoice);
    } catch (e: any) {
      toast({ title: 'Unable to Edit Invoice', description: e.message, variant: 'destructive' });
    } finally {
      setLoadingInvoiceId(null);
    }
  };

  const handleUpdateInvoice = async (invoiceId: string, dto: UpdateInvoiceDTO) => {
    const result = await updateInvoiceAction(invoiceId, dto);
    if (!result.success) throw new Error(result.error || 'Invoice update failed.');
    toast({ title: 'Invoice Updated', description: 'The scheduled email will use the latest saved invoice and PDF.' });
    setEditingInvoice(null);
    await onRefresh();
  };

  const handleIssueExistingInvoice = async (
    invoiceId: string,
    dto: UpdateInvoiceDTO,
    emailOptions?: { subject?: string; customMessage?: string; driveFolderUrl?: string },
    downloadImmediately = false
  ) => {
    const updateResult = await updateInvoiceAction(invoiceId, { ...dto, status: 'draft' });
    if (!updateResult.success) throw new Error(updateResult.error || 'Invoice update failed.');
    const issueResult = await issueInvoiceAction(invoiceId);
    if (!issueResult.success) throw new Error(issueResult.error || 'Invoice issue failed.');
    if (emailOptions) {
      const emailResult = await sendInvoiceEmailAction(
        invoiceId,
        emailOptions.customMessage,
        emailOptions.driveFolderUrl,
        emailOptions.subject
      );
      if (!emailResult.success) throw new Error(emailResult.error || 'Invoice issued, but email delivery failed.');
    }
    if (downloadImmediately) window.open(`/api/invoices/${invoiceId}/pdf?download=1`, '_blank', 'noopener,noreferrer');
    toast({ title: 'Invoice Issued', description: 'The existing draft was updated and issued.' });
    setEditingInvoice(null);
    await onRefresh();
  };

  const handleSendInvoiceNow = async (invoiceId: string) => {
    if (!window.confirm('Send this invoice email now? Its latest PDF will be generated before delivery.')) return;
    setSendingInvoiceId(invoiceId);
    try {
      const existingJob = emailJobs.find((job) => job.invoiceId === invoiceId && ['scheduled', 'pending', 'failed'].includes(job.status));
      if (existingJob && schedule.status !== 'active') {
        throw new Error('Resume this schedule before sending its pending email now.');
      }
      const result = existingJob
        ? await retryScheduledEmailJobAction(existingJob.id)
        : await sendInvoiceEmailAction(invoiceId);
      if (!result.success) throw new Error(result.error || 'Email delivery failed.');
      toast({ title: 'Invoice Email Sent', description: 'The invoice and latest PDF were delivered successfully.' });
      await onRefresh();
    } catch (e: any) {
      toast({ title: 'Email Failed', description: e.message, variant: 'destructive' });
    } finally {
      setSendingInvoiceId(null);
    }
  };

  const handleRescheduleJob = async (jobId: string) => {
    const sendDate = rescheduleDates[jobId];
    if (!sendDate) {
      toast({ title: 'Choose a Date', description: 'Select a future delivery date first.', variant: 'destructive' });
      return;
    }
    setActionLoading(true);
    try {
      const result = await rescheduleInvoiceEmailJobAction(jobId, sendDate);
      if (!result.success) throw new Error(result.error || 'Unable to change scheduled date.');
      toast({ title: 'Delivery Date Updated', description: `Email rescheduled for ${formatAuDisplayDate(sendDate)}.` });
      setReschedulingJobId(null);
      await onRefresh();
    } catch (e: any) {
      toast({ title: 'Reschedule Failed', description: e.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  // Progress calculations
  const totalInvoicesCount = schedule.invoicesGeneratedCount || generatedInvoices.length || 12;
  const emailsSent = schedule.emailsSentCount || 0;
  const awaitingCount = Math.max(0, totalInvoicesCount - emailsSent - (schedule.emailsFailedCount || 0));
  const progressPercent = totalInvoicesCount > 0 ? Math.round((emailsSent / totalInvoicesCount) * 100) : 0;

  return (
    <>
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
          className="relative w-full max-w-2xl bg-white dark:bg-[#07111F] border-l border-slate-200 dark:border-[#17283A] shadow-2xl z-10 flex flex-col h-full overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-100 dark:border-[#17283A] bg-white dark:bg-[#07111F] flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 shadow-xs">
                <Calendar className="w-6 h-6" />
              </div>

              <div className="min-w-0">
                <h2 className="text-xl font-heading font-bold text-slate-900 dark:text-white truncate">
                  Monthly Invoice Schedule
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {schedule.propertyName || 'Independent Customer Billing'}
                </p>

                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span
                    className={cn(
                      'px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1.5 border',
                      schedule.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                        : schedule.status === 'paused'
                        ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
                        : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                    )}
                  >
                    <span
                      className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        schedule.status === 'active'
                          ? 'bg-emerald-500'
                          : schedule.status === 'paused'
                          ? 'bg-amber-500'
                          : 'bg-slate-400'
                      )}
                    />
                    {schedule.status === 'active'
                      ? 'Active'
                      : schedule.status === 'paused'
                      ? 'Paused'
                      : schedule.status}
                  </span>

                  <span className="text-slate-300 dark:text-slate-700">|</span>

                  <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {formatMonthYear(schedule.billingStartMonth)} – {formatMonthYear(schedule.billingEndMonth)} • Repeats every month
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#0E1E33] transition-colors shrink-0"
              aria-label="Close Schedule Details"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-6 px-6 border-b border-slate-100 dark:border-[#17283A] bg-white dark:bg-[#07111F]">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={cn(
                'py-3.5 text-xs font-bold transition-all border-b-2 -mb-px flex items-center gap-2',
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
                'py-3.5 text-xs font-bold transition-all border-b-2 -mb-px flex items-center gap-2',
                activeTab === 'invoices'
                  ? 'border-[#008F83] text-[#008F83]'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              )}
            >
              <FileText className="w-4 h-4" /> Invoices ({generatedInvoices.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('activity')}
              className={cn(
                'py-3.5 text-xs font-bold transition-all border-b-2 -mb-px flex items-center gap-2',
                activeTab === 'activity'
                  ? 'border-[#008F83] text-[#008F83]'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              )}
            >
              <Mail className="w-4 h-4" /> Email History ({emailJobs.length})
            </button>
          </div>

          {/* Drawer Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30 dark:bg-[#07111F]/50">
            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* How your schedule works banner */}
                <div className="bg-[#ecfdf5] dark:bg-emerald-950/20 border border-[#a7f3d0] dark:border-emerald-900/40 rounded-2xl p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 shadow-xs">
                    <CalendarCheck2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      How your schedule works
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                      An invoice is created on the {schedule.generationDayOfMonth ? `${schedule.generationDayOfMonth}${getOrdinal(schedule.generationDayOfMonth)}` : '1st'} of every month, payment is due {schedule.dueDaysAfter || 7} days later, and an email is sent {schedule.emailMode === 'automatic' ? 'automatically to the recipient.' : 'manually on demand.'}
                    </p>
                  </div>
                </div>

                {/* Schedule Progress */}
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2">
                    Schedule Progress
                  </h3>

                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-1.5">
                    <span>Emails sent</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {emailsSent} of {totalInvoicesCount}
                    </span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  {/* 4 Stat Cards */}
                  <div className="grid grid-cols-4 gap-3 mt-4">
                    <div className="p-3 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between h-20 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <span className="text-xl font-heading font-extrabold text-slate-900 dark:text-white">
                          {totalInvoicesCount}
                        </span>
                      </div>
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-tight">
                        Invoices generated
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40 flex flex-col justify-between h-20 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="text-xl font-heading font-extrabold text-emerald-600">
                          {emailsSent}
                        </span>
                      </div>
                      <span className="text-[11px] font-medium text-emerald-700/80 dark:text-emerald-400 leading-tight">
                        Emails sent
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 flex flex-col justify-between h-20 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <Clock className="w-4 h-4 text-blue-600" />
                        <span className="text-xl font-heading font-extrabold text-blue-600">
                          {awaitingCount}
                        </span>
                      </div>
                      <span className="text-[11px] font-medium text-blue-700/80 dark:text-blue-400 leading-tight">
                        Awaiting delivery
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 flex flex-col justify-between h-20 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                        <span className="text-xl font-heading font-extrabold text-rose-600">
                          {schedule.emailsFailedCount || 0}
                        </span>
                      </div>
                      <span className="text-[11px] font-medium text-rose-700/80 dark:text-rose-400 leading-tight">
                        Failed deliveries
                      </span>
                    </div>
                  </div>
                </div>

                {/* Who receives the invoices? */}
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2">
                    Who receives the invoices?
                  </h3>

                  <div className="bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                          {schedule.recipientName}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          {schedule.recipientEmail}
                        </p>
                      </div>
                    </div>

                    <a
                      href={`mailto:${schedule.recipientEmail}`}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                      title="Send direct email"
                    >
                      <Mail className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                {/* Billing Schedule */}
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2">
                    Billing Schedule
                  </h3>

                  <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900/60 shadow-2xs text-xs">
                    <div className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span>Start month</span>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatMonthYear(schedule.billingStartMonth)}
                      </span>
                    </div>

                    <div className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span>End month</span>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatMonthYear(schedule.billingEndMonth)}
                      </span>
                    </div>

                    <div className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400">
                        <RotateCw className="w-4 h-4 text-slate-400" />
                        <span>Repeats</span>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white capitalize">
                        Every month
                      </span>
                    </div>

                    <div className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span>Invoice date</span>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {schedule.generationDayOfMonth ? `${schedule.generationDayOfMonth}${getOrdinal(schedule.generationDayOfMonth)}` : '1st'} of each month
                      </span>
                    </div>

                    <div className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400">
                        <CreditCard className="w-4 h-4 text-slate-400" />
                        <span>Payment due</span>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {schedule.dueDaysAfter || 7} days after invoice date
                      </span>
                    </div>

                    <div className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span>Email delivery</span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        {schedule.emailMode === 'automatic' ? 'Automatic' : 'Manual'}
                      </span>
                    </div>

                    <div className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400">
                        <Globe className="w-4 h-4 text-slate-400" />
                        <span>Time zone</span>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {schedule.timezone || 'Australia/Sydney'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                    <span className="text-slate-400">ⓘ</span> Additional Information
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center gap-3 shadow-2xs">
                      <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[11px] text-slate-400 font-medium block">
                          Source invoice
                        </span>
                        <span className="font-mono font-bold text-xs text-slate-900 dark:text-white truncate block">
                          {schedule.sourceInvoiceNumber || '—'}
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center gap-3 shadow-2xs">
                      <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 shrink-0">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[11px] text-slate-400 font-medium block">
                          Created on
                        </span>
                        <span className="font-bold text-xs text-slate-900 dark:text-white truncate block">
                          {formatAuDisplayDate(schedule.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-6 border-t border-slate-200/80 dark:border-slate-800">
                  {schedule.status === 'active' && (
                    <button
                      type="button"
                      onClick={handlePause}
                      disabled={actionLoading}
                      className="py-2.5 px-4 rounded-xl border border-amber-300 dark:border-amber-700/70 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 font-bold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                      <Pause className="w-4 h-4 text-amber-500" />
                      <span>Pause Schedule</span>
                    </button>
                  )}

                  {schedule.status === 'paused' && (
                    <button
                      type="button"
                      onClick={handleResume}
                      disabled={actionLoading}
                      className="py-2.5 px-4 rounded-xl border border-emerald-300 dark:border-emerald-700/70 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 font-bold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                      <Play className="w-4 h-4 text-emerald-600" />
                      <span>Resume Schedule</span>
                    </button>
                  )}

                  {schedule.status !== 'cancelled' && (
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={actionLoading}
                      className="py-2.5 px-4 rounded-xl border border-rose-300 dark:border-rose-800/70 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 font-bold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                      <Ban className="w-4 h-4 text-rose-500" />
                      <span>Cancel Schedule</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: INVOICES */}
            {activeTab === 'invoices' && (
              <div className="space-y-4">
                {/* Search and Filter Bar */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    All Generated Invoices
                  </h3>

                  <div className="flex items-center gap-2 flex-1 max-w-sm justify-end">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search by invoice number or month"
                        value={invoiceSearch}
                        onChange={(e) => {
                          setInvoiceSearch(e.target.value);
                          setInvoicePage(1);
                        }}
                        className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#008F83]"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setInvoiceSearch('')}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 shrink-0"
                    >
                      <Filter className="w-3.5 h-3.5 text-slate-500" />
                      <span>Filter</span>
                    </button>
                  </div>
                </div>

                {/* List of Invoices */}
                <div className="space-y-2.5">
                  {paginatedInvoices.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                      No invoices found matching your search.
                    </div>
                  ) : (
                    paginatedInvoices.map((inv) => (
                      <article
                        key={inv.id}
                        className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 flex items-center justify-between gap-3 shadow-2xs transition-all"
                      >
                        {/* Left: Icon & Invoice Details */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/50 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                                {inv.invoice_number}
                              </span>

                              {/* Status Badges */}
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50 flex items-center gap-1">
                                <Check className="w-2.5 h-2.5" />
                                <span className="capitalize">{inv.status || 'Issued'}</span>
                              </span>

                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-100 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900/50">
                                {inv.email_status === 'sent'
                                  ? 'Email Sent'
                                  : inv.email_status === 'failed'
                                  ? 'Email Failed'
                                  : 'Email Scheduled'}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                              Billing: {formatAuDisplayDate(inv.billing_period_start)} – {formatAuDisplayDate(inv.billing_period_end)}
                            </p>
                          </div>
                        </div>

                        {/* Middle-Right: Due Date */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 shrink-0">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-medium">
                            Due: <strong className="font-bold text-slate-800 dark:text-white">{formatAuDisplayDate(inv.due_date)}</strong>
                          </span>
                        </div>

                        {/* Right: Amounts & Actions */}
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-right">
                            <span className="font-bold text-sm text-slate-900 dark:text-white block">
                              {formatCurrency(inv.total_amount, inv.currency || 'AUD')}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              Balance: {formatCurrency(inv.balance_due, inv.currency || 'AUD')}
                            </span>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1 border-l border-slate-100 dark:border-slate-800 pl-3">
                            <button
                              type="button"
                              onClick={() => onViewInvoice ? onViewInvoice(inv.id) : handleViewInvoice(inv.id)}
                              className="p-1.5 text-slate-400 hover:text-[#008F83] rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                              title="View Invoice PDF"
                              aria-label={`View ${inv.invoice_number}`}
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {!['paid', 'cancelled', 'void'].includes(inv.status) && (
                              <button
                                type="button"
                                onClick={() => handleEditInvoice(inv.id)}
                                disabled={loadingInvoiceId === inv.id}
                                className="p-1.5 text-slate-400 hover:text-[#008F83] rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                                title="Edit Invoice"
                                aria-label={`Edit ${inv.invoice_number}`}
                              >
                                <Edit3 className={cn('w-4 h-4', loadingInvoiceId === inv.id && 'animate-pulse')} />
                              </button>
                            )}

                            {!['cancelled', 'void'].includes(inv.status) && (
                              <button
                                type="button"
                                onClick={() => handleSendInvoiceNow(inv.id)}
                                disabled={sendingInvoiceId === inv.id}
                                className="p-1.5 text-slate-400 hover:text-[#008F83] rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                                title="Send Email Now"
                                aria-label={`Send email now for ${inv.invoice_number}`}
                              >
                                <Send className={cn('w-4 h-4', sendingInvoiceId === inv.id && 'animate-pulse')} />
                              </button>
                            )}
                          </div>
                        </div>
                      </article>
                    ))
                  )}
                </div>

                {/* Bottom Pagination */}
                {filteredInvoices.length > 0 && (
                  <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
                    <span>
                      Showing {(invoicePage - 1) * INVOICES_PER_PAGE + 1} - {Math.min(invoicePage * INVOICES_PER_PAGE, filteredInvoices.length)} of {filteredInvoices.length} invoices
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setInvoicePage((p) => Math.max(1, p - 1))}
                        disabled={invoicePage <= 1}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
                        aria-label="Previous Page"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>

                      {Array.from({ length: totalInvoicePages }, (_, i) => i + 1).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setInvoicePage(p)}
                          className={cn(
                            'px-2.5 py-1 rounded-lg text-xs font-bold transition-colors',
                            invoicePage === p
                              ? 'bg-[#008F83] text-white'
                              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
                          )}
                        >
                          {p}
                        </button>
                      ))}

                      <button
                        type="button"
                        onClick={() => setInvoicePage((p) => Math.min(totalInvoicePages, p + 1))}
                        disabled={invoicePage >= totalInvoicePages}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
                        aria-label="Next Page"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: EMAIL HISTORY */}
            {activeTab === 'activity' && (
              <div className="space-y-4">
                {/* Search and Filters Bar */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by invoice number or month"
                      value={emailSearch}
                      onChange={(e) => {
                        setEmailSearch(e.target.value);
                        setEmailPage(1);
                      }}
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#008F83]"
                    />
                  </div>

                  <select
                    value={emailMonthFilter}
                    onChange={(e) => {
                      setEmailMonthFilter(e.target.value);
                      setEmailPage(1);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#008F83]"
                  >
                    <option value="all">All Months</option>
                    {availableEmailMonths.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>

                  <select
                    value={emailStatusFilter}
                    onChange={(e) => {
                      setEmailStatusFilter(e.target.value);
                      setEmailPage(1);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#008F83]"
                  >
                    <option value="all">All Status</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="pending">Pending</option>
                    <option value="sent">Sent</option>
                    <option value="failed">Failed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {/* List of Email Activity Cards */}
                <div className="space-y-2.5">
                  {paginatedEmailJobs.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                      {schedule.emailMode === 'manual'
                        ? 'This schedule was configured with Manual Email Delivery. Invoices are sent on-demand.'
                        : 'No email deliveries found.'}
                    </div>
                  ) : (
                    paginatedEmailJobs.map((job) => (
                      <article
                        key={job.id}
                        className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 flex flex-col gap-2.5 shadow-2xs transition-all"
                      >
                        <div className="flex items-center justify-between gap-3">
                          {/* Left: Document icon & invoice info */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>

                            <div className="min-w-0">
                              <h4 className="font-mono font-bold text-xs text-slate-900 dark:text-white truncate">
                                {job.invoiceNumber || 'Invoice'}
                              </h4>
                              <p className="text-[11px] text-slate-400 truncate">
                                Billing: {job.billingMonth}
                              </p>
                            </div>
                          </div>

                          {/* Middle: Recipient & Scheduled Time */}
                          <div className="min-w-0 text-left space-y-0.5">
                            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 truncate">
                              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{job.recipientEmail}</span>
                            </div>

                            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 truncate">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{formatAuDisplayDateTime(job.scheduledSendDate)}</span>
                            </div>
                          </div>

                          {/* Right: Status badge & Change Date button */}
                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={cn(
                                'px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 border',
                                job.status === 'sent'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
                                  : job.status === 'failed'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400'
                                  : 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400'
                              )}
                            >
                              <Calendar className="w-3 h-3" />
                              <span className="capitalize">{job.status}</span>
                            </span>

                            {['scheduled', 'pending'].includes(job.status) && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (reschedulingJobId === job.id) {
                                    setReschedulingJobId(null);
                                  } else {
                                    setReschedulingJobId(job.id);
                                    if (!rescheduleDates[job.id]) {
                                      setRescheduleDates((cur) => ({
                                        ...cur,
                                        [job.id]: formatAuDateIso(job.scheduledSendDate) || tomorrowInSydney(),
                                      }));
                                    }
                                  }
                                }}
                                className="px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
                              >
                                <CalendarClock className="w-3.5 h-3.5 text-slate-500" />
                                <span>Change Date</span>
                              </button>
                            )}

                            {job.status === 'failed' && (
                              <button
                                type="button"
                                onClick={() => handleRetryJob(job.id)}
                                disabled={retryingJobId === job.id}
                                className="px-3 py-1 rounded-xl border border-rose-200 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                              >
                                <RotateCw className={cn('w-3.5 h-3.5', retryingJobId === job.id && 'animate-spin')} />
                                <span>{retryingJobId === job.id ? 'Retrying...' : 'Retry Delivery'}</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Inline Reschedule Date Picker */}
                        {reschedulingJobId === job.id && (
                          <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 justify-end">
                            <span className="text-xs text-slate-500">Pick new date:</span>
                            <input
                              type="date"
                              min={tomorrowInSydney()}
                              value={rescheduleDates[job.id] || formatAuDateIso(job.scheduledSendDate)}
                              onChange={(e) => setRescheduleDates((cur) => ({ ...cur, [job.id]: e.target.value }))}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white bg-white dark:bg-slate-900 focus:outline-none focus:border-[#008F83]"
                            />
                            <button
                              type="button"
                              onClick={() => handleRescheduleJob(job.id)}
                              disabled={actionLoading}
                              className="px-3 py-1 rounded-lg bg-[#008F83] text-white text-xs font-bold hover:bg-[#007b70] transition-colors disabled:opacity-50"
                            >
                              Save Date
                            </button>
                            <button
                              type="button"
                              onClick={() => setReschedulingJobId(null)}
                              className="px-2.5 py-1 rounded-lg text-xs text-slate-500 hover:text-slate-800"
                            >
                              Cancel
                            </button>
                          </div>
                        )}

                        {job.failureReason && (
                          <div className="text-[11px] text-rose-600 bg-rose-50/60 p-2 rounded-lg border border-rose-100">
                            Failure: {job.failureReason}
                          </div>
                        )}
                      </article>
                    ))
                  )}
                </div>

                {/* Bottom Pagination */}
                {filteredEmailJobs.length > 0 && (
                  <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
                    <span>
                      Showing {(emailPage - 1) * EMAILS_PER_PAGE + 1} - {Math.min(emailPage * EMAILS_PER_PAGE, filteredEmailJobs.length)} of {filteredEmailJobs.length} email activities
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEmailPage((p) => Math.max(1, p - 1))}
                        disabled={emailPage <= 1}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
                        aria-label="Previous Email Page"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>

                      {Array.from({ length: totalEmailPages }, (_, i) => i + 1).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setEmailPage(p)}
                          className={cn(
                            'px-2.5 py-1 rounded-lg text-xs font-bold transition-colors',
                            emailPage === p
                              ? 'bg-[#008F83] text-white'
                              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
                          )}
                        >
                          {p}
                        </button>
                      ))}

                      <button
                        type="button"
                        onClick={() => setEmailPage((p) => Math.min(totalEmailPages, p + 1))}
                        disabled={emailPage >= totalEmailPages}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
                        aria-label="Next Email Page"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {editingInvoice && (
        <CreateInvoiceModal
          isOpen
          invoiceToEdit={editingInvoice}
          onClose={() => setEditingInvoice(null)}
          onSubmit={async () => ({ success: false })}
          onUpdate={handleUpdateInvoice}
          onIssueExisting={handleIssueExistingInvoice}
          initialPropertyId={editingInvoice.propertyId || undefined}
        />
      )}
    </>
  );
}
