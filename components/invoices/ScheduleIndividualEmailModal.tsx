'use client';

import { useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, Mail, X } from 'lucide-react';
import { Button, useToast } from '@/components/admin/ui';
import { createIndividualInvoiceEmailAction } from '@/app/actions/invoice-schedules';
import { InvoiceDTO } from '@/modules/invoices';
import { getAuTodayString } from '@/lib/format/australian-time';

interface Props {
  isOpen: boolean;
  invoices: InvoiceDTO[];
  onClose: () => void;
  onSuccess?: () => void;
}

const ELIGIBLE_STATUSES = new Set(['issued', 'partially_paid', 'overdue']);

function tomorrowInSydney(): string {
  const today = getAuTodayString();
  const date = new Date(`${today}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function recipientEmail(invoice: InvoiceDTO): string {
  return invoice.snapshot?.billTo?.email || invoice.customerEmail || invoice.recipient?.email || '';
}

export function ScheduleIndividualEmailModal({ isOpen, invoices, onClose, onSuccess }: Props) {
  const { toast } = useToast();
  const [sendDate, setSendDate] = useState(tomorrowInSydney);
  const [subject, setSubject] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const review = useMemo(() => invoices.map((invoice) => {
    const email = recipientEmail(invoice);
    const reason = !ELIGIBLE_STATUSES.has(invoice.status)
      ? `Status ${invoice.status.replaceAll('_', ' ')} is not eligible`
      : !email
        ? 'Recipient email is missing'
        : null;
    return { invoice, email, reason };
  }), [invoices]);
  const validCount = review.filter((item) => !item.reason).length;

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!sendDate || validCount === 0) return;
    setSubmitting(true);
    try {
      const result = await createIndividualInvoiceEmailAction({
        invoiceIds: invoices.map((invoice) => invoice.id),
        sendDate,
        subject,
        customMessage,
      });
      if (!result.success) throw new Error(result.error || 'Unable to schedule invoice email.');
      const scheduledCount = result.scheduled?.length || 0;
      const skippedCount = result.skipped?.length || 0;
      const skippedReasons = (result.skipped || []).slice(0, 3).map((item) => `${item.invoiceNumber || 'Invoice'}: ${item.reason}`).join(' ');
      toast({
        title: scheduledCount > 0 ? 'Invoice email scheduled' : 'Nothing was scheduled',
        description: `${scheduledCount} invoice${scheduledCount === 1 ? '' : 's'} scheduled${skippedCount ? `, ${skippedCount} skipped. ${skippedReasons}` : '.'}`,
        variant: scheduledCount > 0 ? undefined : 'destructive',
      });
      if (scheduledCount > 0) {
        onSuccess?.();
        onClose();
      }
    } catch (error: any) {
      toast({ title: 'Scheduling failed', description: error.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby="individual-email-title" className="relative z-10 w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-[#17283A] dark:bg-[#07111F] sm:p-8">
        <button type="button" onClick={onClose} className="absolute right-5 top-5 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-[#0E1E33] dark:hover:text-white" aria-label="Close dialog">
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#008F83]/10 text-[#008F83]">
            <CalendarClock className="h-5 w-5" />
          </div>
          <h2 id="individual-email-title" className="text-xl font-bold text-slate-900 dark:text-white">Schedule Individual Email</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Send each existing invoice separately to its own recipient.</p>
        </div>

        <div className="space-y-5">
          <div>
            <label htmlFor="individual-send-date" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">Send date (Australia/Sydney)</label>
            <input id="individual-send-date" type="date" min={tomorrowInSydney()} value={sendDate} onChange={(event) => setSendDate(event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#008F83] focus:ring-2 focus:ring-[#008F83]/15 dark:border-slate-700 dark:bg-[#0E1E33] dark:text-white" />
            <p className="mt-1 text-xs text-slate-500">Delivery occurs during the daily scheduled email run.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="individual-email-subject" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">Subject (optional)</label>
              <input id="individual-email-subject" value={subject} maxLength={200} onChange={(event) => setSubject(event.target.value)} placeholder="Your invoice" className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#008F83] focus:ring-2 focus:ring-[#008F83]/15 dark:border-slate-700 dark:bg-[#0E1E33] dark:text-white" />
            </div>
            <div>
              <label htmlFor="individual-email-message" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">Message (optional)</label>
              <textarea id="individual-email-message" value={customMessage} maxLength={2000} onChange={(event) => setCustomMessage(event.target.value)} placeholder="Add a note for the recipient" rows={3} className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#008F83] focus:ring-2 focus:ring-[#008F83]/15 dark:border-slate-700 dark:bg-[#0E1E33] dark:text-white" />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">Invoice review</p>
              <span className="text-xs font-semibold text-[#008F83]">{validCount} ready</span>
            </div>
            <div className="max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
              {review.map(({ invoice, email, reason }) => (
                <div key={invoice.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{invoice.invoiceNumber}</p>
                    <p className="truncate text-xs text-slate-500">{email || 'No recipient email'}</p>
                  </div>
                  {reason ? (
                    <span className="max-w-[230px] text-right text-xs font-semibold text-rose-600 dark:text-rose-400">{reason}</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-[#008F83]"><CheckCircle2 className="h-3.5 w-3.5" /> Ready</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-7 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting || !sendDate || validCount === 0} className="bg-[#008F83] text-white hover:bg-[#007A70]">
            <Mail className="mr-2 h-4 w-4" />
            {submitting ? 'Scheduling...' : `Schedule ${validCount} Email${validCount === 1 ? '' : 's'}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
