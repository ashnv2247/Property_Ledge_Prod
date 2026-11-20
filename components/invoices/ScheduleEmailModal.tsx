'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Check,
  Calendar,
  Mail,
  Send,
  Clock,
  FileText,
  Building,
  User,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  CalendarRange,
  Edit3,
  Calculator,
  ChevronDown,
  ChevronUp,
  Info,
  Coins,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button, Input, Select, Textarea, useToast } from '@/components/admin/ui';
import { InvoiceDTO } from '@/modules/invoices';
import { formatCurrency } from '@/modules/invoices/domain/value-objects/currency';
import { createInvoiceScheduleAction } from '@/app/actions/invoice-schedules';
import { formatAuDisplayDate } from '@/lib/format/australian-time';
import { cn } from '@/lib/utils';

interface ScheduleEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedInvoice?: InvoiceDTO | null;
  availableInvoices?: InvoiceDTO[];
  onSuccess?: (count: number) => void;
}

const steps = [
  { id: 1, name: 'Source Invoice', desc: 'Choose the invoice to copy.' },
  { id: 2, name: 'Invoice Schedule', desc: 'Choose months and invoice dates.' },
  { id: 3, name: 'Email Delivery', desc: 'Choose automatic or manual delivery.' },
  { id: 4, name: 'Review & Generate', desc: 'Confirm the invoices to create.' },
];

export function ScheduleEmailModal({
  isOpen,
  onClose,
  selectedInvoice: initialSelectedInvoice,
  availableInvoices = [],
  onSuccess,
}: ScheduleEmailModalProps) {
  const { toast } = useToast();

  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selected source invoice
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(
    initialSelectedInvoice?.id || (availableInvoices[0]?.id ?? '')
  );

  useEffect(() => {
    if (initialSelectedInvoice) {
      setSelectedInvoiceId(initialSelectedInvoice.id);
    } else if (availableInvoices.length > 0 && !selectedInvoiceId) {
      setSelectedInvoiceId(availableInvoices[0].id);
    }
  }, [initialSelectedInvoice, availableInvoices, selectedInvoiceId]);

  const sourceInvoice = useMemo(() => {
    if (initialSelectedInvoice && initialSelectedInvoice.id === selectedInvoiceId) {
      return initialSelectedInvoice;
    }
    return availableInvoices.find((inv) => inv.id === selectedInvoiceId) || initialSelectedInvoice || null;
  }, [selectedInvoiceId, initialSelectedInvoice, availableInvoices]);

  // Schedule Dates Configuration
  const [startMonth, setStartMonth] = useState(() => {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
  });

  const [endMonth, setEndMonth] = useState(() => {
    const now = new Date();
    const futureMonth = new Date(now.getFullYear(), now.getMonth() + 12, 1);
    return `${futureMonth.getFullYear()}-${String(futureMonth.getMonth() + 1).padStart(2, '0')}`;
  });

  // Calculate number of months between start and end
  const monthsCount = useMemo(() => {
    try {
      const [sY, sM] = startMonth.split('-').map(Number);
      const [eY, eM] = endMonth.split('-').map(Number);
      if (!sY || !sM || !eY || !eM) return 0;
      const count = (eY - sY) * 12 + (eM - sM) + 1;
      return count > 0 ? count : 0;
    } catch {
      return 0;
    }
  }, [startMonth, endMonth]);

  const [generationDay, setGenerationDay] = useState<number>(1);
  const [dueDaysAfter, setDueDaysAfter] = useState<number>(7);
  const [dueDateType, setDueDateType] = useState<'relative' | 'fixed'>('relative');
  const [fixedDueDay, setFixedDueDay] = useState<number>(15);
  const [timezone, setTimezone] = useState<string>('Australia/Sydney');

  // Email Settings
  const [emailMode, setEmailMode] = useState<'automatic' | 'manual'>('automatic');
  const [subjectTemplate, setSubjectTemplate] = useState<string>('');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [driveFolderUrl, setDriveFolderUrl] = useState<string>('');

  // Editable Preview Invoices List for Step 4
  interface PreviewInvoiceRow {
    month: string;      // YYYY-MM
    label: string;      // e.g. 'Dec 2026'
    issueDate: string;  // YYYY-MM-DD
    dueDate: string;    // YYYY-MM-DD
    amount: number;     // number
    isCustomized?: boolean;
  }
  const [previewInvoices, setPreviewInvoices] = useState<PreviewInvoiceRow[]>([]);
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [isExpandedAll, setIsExpandedAll] = useState<boolean>(false);
  const [isBulkEditing, setIsBulkEditing] = useState<boolean>(false);

  const displayInvoicesCount = previewInvoices.length > 0 ? previewInvoices.length : monthsCount;

  const totalValue = useMemo(() => {
    return previewInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  }, [previewInvoices]);

  const billingPeriodLabel = useMemo(() => {
    if (previewInvoices.length === 0) return `${startMonth} – ${endMonth}`;
    return `${previewInvoices[0].label} – ${previewInvoices[previewInvoices.length - 1].label}`;
  }, [previewInvoices, startMonth, endMonth]);

  const visibleInvoices = useMemo(() => {
    return isExpandedAll || previewInvoices.length <= 3
      ? previewInvoices
      : previewInvoices.slice(0, 3);
  }, [isExpandedAll, previewInvoices]);

  const getOrdinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const handleAddInvoiceRow = () => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let nextY: number;
    let nextM: number;

    if (previewInvoices.length > 0) {
      const lastInv = previewInvoices[previewInvoices.length - 1];
      const [y, m] = lastInv.month.split('-').map(Number);
      if (m === 12) {
        nextY = y + 1;
        nextM = 1;
      } else {
        nextY = y;
        nextM = m + 1;
      }
    } else {
      const now = new Date();
      nextY = now.getFullYear();
      nextM = now.getMonth() + 1;
    }

    const ym = `${nextY}-${String(nextM).padStart(2, '0')}`;
    const label = `${monthNames[nextM - 1]} ${nextY}`;

    const lastDay = new Date(Date.UTC(nextY, nextM, 0)).getUTCDate();
    const actualGenDay = Math.min(Math.max(1, generationDay), lastDay);
    const issueDateObj = new Date(Date.UTC(nextY, nextM - 1, actualGenDay));
    const issueDate = issueDateObj.toISOString().split('T')[0];

    let dueDate: string;
    if (dueDateType === 'fixed' && fixedDueDay) {
      const actualFixedDay = Math.min(fixedDueDay, lastDay);
      const fixedDueObj = new Date(Date.UTC(nextY, nextM - 1, actualFixedDay));
      if (fixedDueObj < issueDateObj) {
        const nextMonth = nextM === 12 ? 1 : nextM + 1;
        const nextYear = nextM === 12 ? nextY + 1 : nextY;
        const nextLastDay = new Date(Date.UTC(nextYear, nextMonth, 0)).getUTCDate();
        dueDate = new Date(Date.UTC(nextYear, nextMonth - 1, Math.min(actualFixedDay, nextLastDay))).toISOString().split('T')[0];
      } else {
        dueDate = fixedDueObj.toISOString().split('T')[0];
      }
    } else {
      const dueObj = new Date(issueDateObj.getTime() + (dueDaysAfter || 7) * 24 * 60 * 60 * 1000);
      dueDate = dueObj.toISOString().split('T')[0];
    }

    const newRow: PreviewInvoiceRow = {
      month: ym,
      label,
      issueDate,
      dueDate,
      amount: sourceInvoice?.total || 0,
      isCustomized: true,
    };

    setPreviewInvoices((prev) => [...prev, newRow]);
    setIsExpandedAll(true);
    setEditingRowIndex(previewInvoices.length);
  };

  const handleDeleteInvoiceRow = (index: number) => {
    setPreviewInvoices((prev) => prev.filter((_, i) => i !== index));
    if (editingRowIndex === index) {
      setEditingRowIndex(null);
    } else if (editingRowIndex !== null && editingRowIndex > index) {
      setEditingRowIndex(editingRowIndex - 1);
    }
  };

  // Synchronize preview invoices whenever schedule parameters or source invoice change
  useEffect(() => {
    if (!sourceInvoice) return;
    try {
      const [sY, sM] = startMonth.split('-').map(Number);
      const [eY, eM] = endMonth.split('-').map(Number);
      if (!sY || !sM || !eY || !eM) return;

      const monthsList: string[] = [];
      let curY = sY;
      let curM = sM;
      while (curY < eY || (curY === eY && curM <= eM)) {
        monthsList.push(`${curY}-${String(curM).padStart(2, '0')}`);
        curM++;
        if (curM > 12) {
          curM = 1;
          curY++;
        }
      }

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const defaultAmount = sourceInvoice.total || 0;

      setPreviewInvoices((prev) => {
        const prevMap = new Map(prev.map((p) => [p.month, p]));

        return monthsList.map((ym) => {
          const [year, month] = ym.split('-').map(Number);
          const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
          const actualGenDay = Math.min(Math.max(1, generationDay), lastDay);
          const issueDateObj = new Date(Date.UTC(year, month - 1, actualGenDay));
          const defaultIssueDate = issueDateObj.toISOString().split('T')[0];

          let defaultDueDate: string;
          if (dueDateType === 'fixed' && fixedDueDay) {
            const actualFixedDay = Math.min(fixedDueDay, lastDay);
            const fixedDueObj = new Date(Date.UTC(year, month - 1, actualFixedDay));
            if (fixedDueObj < issueDateObj) {
              const nextMonth = month === 12 ? 1 : month + 1;
              const nextYear = month === 12 ? year + 1 : year;
              const nextLastDay = new Date(Date.UTC(nextYear, nextMonth, 0)).getUTCDate();
              defaultDueDate = new Date(Date.UTC(nextYear, nextMonth - 1, Math.min(actualFixedDay, nextLastDay))).toISOString().split('T')[0];
            } else {
              defaultDueDate = fixedDueObj.toISOString().split('T')[0];
            }
          } else {
            const dueObj = new Date(issueDateObj.getTime() + (dueDaysAfter || 7) * 24 * 60 * 60 * 1000);
            defaultDueDate = dueObj.toISOString().split('T')[0];
          }

          const label = `${monthNames[month - 1]} ${year}`;
          const existing = prevMap.get(ym);

          if (existing && existing.isCustomized) {
            return {
              ...existing,
              month: ym,
              label,
            };
          }

          return {
            month: ym,
            label,
            issueDate: defaultIssueDate,
            dueDate: defaultDueDate,
            amount: defaultAmount,
            isCustomized: false,
          };
        });
      });
    } catch {
      // Ignore calculation errors
    }
  }, [sourceInvoice, startMonth, endMonth, generationDay, dueDateType, dueDaysAfter, fixedDueDay]);

  const handleUpdatePreviewRow = (idx: number, updates: Partial<PreviewInvoiceRow>) => {
    setPreviewInvoices((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, ...updates, isCustomized: true } : item))
    );
  };

  // Reset step on open
  useEffect(() => {
    if (isOpen) {
      setActiveStep(0);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleNext = () => {
    if (activeStep === 0) {
      if (!sourceInvoice) {
        toast({
          title: 'Invoice Required',
          description: 'Please select a valid source invoice to schedule.',
          variant: 'destructive',
        });
        return;
      }
    }

    if (activeStep === 1) {
      if (monthsCount <= 0) {
        toast({
          title: 'Invalid Date Range',
          description: 'Ending month must be greater than or equal to starting month.',
          variant: 'destructive',
        });
        return;
      }
      if (generationDay < 1 || generationDay > 31 || (dueDateType === 'fixed' && (fixedDueDay < 1 || fixedDueDay > 31))) {
        toast({
          title: 'Invalid Day of Month',
          description: 'Invoice and fixed due days must be between 1 and 31.',
          variant: 'destructive',
        });
        return;
      }
    }

    setActiveStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  const handleConfirmCreate = async () => {
    if (!sourceInvoice) return;
    const finalInvoices = previewInvoices.length > 0 ? previewInvoices : [];
    if (finalInvoices.length === 0 && monthsCount <= 0) {
      toast({
        title: 'Invalid Date Range',
        description: 'Please choose a valid billing period.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const customizedItems = finalInvoices.map((inv) => ({
        month: inv.month,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
        amount: inv.amount,
      }));

      const effectiveStart = finalInvoices[0]?.month || startMonth;
      const effectiveEnd = finalInvoices[finalInvoices.length - 1]?.month || endMonth;

      const res = await createInvoiceScheduleAction({
        sourceInvoiceId: sourceInvoice.id,
        startMonth: effectiveStart,
        endMonth: effectiveEnd,
        frequency: 'monthly',
        generationDayOfMonth: generationDay,
        dueDaysAfter: dueDateType === 'relative' ? dueDaysAfter : 7,
        dueDateFixed: dueDateType === 'fixed' ? fixedDueDay : null,
        timezone,
        emailMode,
        subjectTemplate: subjectTemplate.trim() || undefined,
        customMessage: customMessage.trim() || undefined,
        driveFolderUrl: driveFolderUrl.trim() || undefined,
        customInvoices: customizedItems.length > 0 ? customizedItems : undefined,
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to generate invoices');
      }

      toast({
        title: 'Invoices Generated Successfully',
        description: `Generated ${res.count || finalInvoices.length || monthsCount} independent monthly invoices for ${sourceInvoice.recipient?.name || sourceInvoice.customerName || 'customer'}.`,
      });

      onSuccess?.(res.count || finalInvoices.length || monthsCount);
      onClose();
    } catch (err: any) {
      toast({
        title: 'Creation Failed',
        description: err.message || 'Unable to bulk generate invoices.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'relative w-full bg-white dark:bg-[#07111F] border border-slate-200 dark:border-[#17283A] rounded-3xl shadow-2xl overflow-y-auto max-h-[92vh] z-10 p-6 sm:p-8 transition-all duration-300',
          activeStep === 3 ? 'max-w-4xl' : 'max-w-2xl'
        )}
      >
        {/* Header matching Reference Design */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#008F83]/10 text-[#008F83] flex items-center justify-center shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold font-heading tracking-tight text-slate-900 dark:text-white">
                {activeStep === 3 ? 'Create Monthly Invoices' : 'Bulk Generate'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {activeStep === 3
                  ? `Review the details below and generate ${displayInvoicesCount} monthly invoices.`
                  : 'Copy one invoice into independent monthly invoices, with optional email delivery.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#0E1E33] transition-colors focus:outline-none focus:ring-2 focus:ring-[#008F83]/30 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Elegant Step Indicator matching Add Property */}
        <nav aria-label="Progress" className="mb-8">
          <div className="relative flex items-center justify-between">
            {/* Connecting Track */}
            <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-100 dark:bg-slate-800 -z-0" />
            <div
              className="absolute top-4 left-6 h-0.5 bg-[#008F83] transition-all duration-300 -z-0"
              style={{
                width:
                  activeStep === 0
                    ? '0%'
                    : activeStep === 1
                    ? '33%'
                    : activeStep === 2
                    ? '66%'
                    : 'calc(100% - 48px)',
              }}
            />

            <div className="w-full flex items-center justify-between z-10 px-1">
              {steps.map((step, idx) => {
                const isCurrent = idx === activeStep;
                const isCompleted = idx < activeStep;

                return (
                  <div key={step.id} className="flex flex-col items-center group">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                        isCurrent
                          ? 'bg-[#008F83] text-white shadow-md ring-4 ring-[#008F83]/15 scale-105'
                          : isCompleted
                          ? 'bg-[#008F83] text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {isCompleted ? <Check className="w-4 h-4 stroke-[2.5]" /> : step.id}
                    </div>
                    <span
                      className={`mt-1.5 text-[11px] font-medium transition-colors text-center ${
                        isCurrent
                          ? 'text-[#008F83] font-semibold'
                          : isCompleted
                          ? 'text-slate-700 dark:text-slate-300'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {step.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Step Content */}
        <div className="min-h-[320px]">
          <AnimatePresence mode="wait">
            {/* STEP 1: Select Invoice */}
            {activeStep === 0 && (
              <motion.div
                key="step-select-invoice"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="space-y-5"
              >
                {/* Invoice Selector if multiple are available */}
                {availableInvoices.length > 1 && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Select Source Invoice *
                    </label>
                    <Select
                      value={selectedInvoiceId}
                      onChange={(e) => setSelectedInvoiceId(e.target.value)}
                      className="bg-white dark:bg-slate-800 font-medium"
                    >
                      {availableInvoices.map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.invoiceNumber} — {inv.recipient?.name || inv.customerName || 'Customer'} (
                          {formatCurrency(inv.total, inv.currency)})
                        </option>
                      ))}
                    </Select>
                  </div>
                )}

                <div className="rounded-xl border border-[#008F83]/20 bg-[#008F83]/5 px-4 py-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  <strong className="text-[#008F83]">What gets copied:</strong> recipient, property, line items, tax, amount, and invoice design. The source invoice is never changed.
                </div>

                {/* Source Invoice Details Card */}
                {sourceInvoice ? (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#008F83]/10 text-[#008F83] flex items-center justify-center shrink-0 border border-[#008F83]/20">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                            Source Template Invoice
                          </span>
                          <h4 className="font-heading text-lg font-bold text-slate-900 dark:text-white font-mono">
                            {sourceInvoice.invoiceNumber}
                          </h4>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#008F83]/10 text-[#008F83] border border-[#008F83]/20">
                        {sourceInvoice.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-slate-200/80 dark:border-slate-800 text-xs">
                      <div>
                        <span className="text-slate-400 block font-medium">Tenant / Recipient:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block text-sm">
                          {sourceInvoice.recipient?.name || sourceInvoice.customerName || 'Customer'}
                        </span>
                        <span className="text-slate-500 text-[11px] block">
                          {sourceInvoice.recipient?.email || sourceInvoice.customerEmail || 'No email specified'}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block font-medium">Total Amount:</span>
                        <span className="font-heading text-lg font-extrabold text-[#008F83] mt-0.5 block">
                          {formatCurrency(sourceInvoice.total, sourceInvoice.currency)}
                        </span>
                        <span className="text-slate-500 text-[11px] block">
                          Includes Subtotal: {formatCurrency(sourceInvoice.subtotal, sourceInvoice.currency)} + Tax:{' '}
                          {formatCurrency(sourceInvoice.taxAmount, sourceInvoice.currency)}
                        </span>
                      </div>
                    </div>

                    {/* Line Items Preview */}
                    {sourceInvoice.items && sourceInvoice.items.length > 0 && (
                      <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                          Items to replicate across scheduled months:
                        </span>
                        <div className="space-y-1.5">
                          {sourceInvoice.items.map((it, idx) => (
                            <div
                              key={it.id || idx}
                              className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60"
                            >
                              <span className="font-medium text-slate-700 dark:text-slate-300">
                                {it.description}
                              </span>
                              <span className="font-mono font-bold text-slate-900 dark:text-white">
                                {formatCurrency(it.lineTotal || (it.quantity * it.unitPrice), sourceInvoice.currency)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                    <p className="font-medium">No source invoice selected.</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* STEP 2: Schedule Configuration */}
            {activeStep === 1 && (
              <motion.div
                key="step-schedule-config"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="space-y-5"
              >
                {/* Month Range Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Starting Month *
                    </label>
                    <Input
                      type="month"
                      value={startMonth}
                      onChange={(e) => setStartMonth(e.target.value)}
                      className="bg-white dark:bg-slate-800 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Ending Month *
                    </label>
                    <Input
                      type="month"
                      value={endMonth}
                      onChange={(e) => setEndMonth(e.target.value)}
                      className="bg-white dark:bg-slate-800 font-medium"
                    />
                  </div>
                </div>

                {/* Calculation Summary Pill */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#008F83]/10 border border-[#008F83]/20 text-xs">
                  <div className="flex items-center gap-2">
                    <CalendarRange className="w-4 h-4 text-[#008F83]" />
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Calculated Recurrence:
                    </span>
                  </div>
                  <span className="font-extrabold text-[#008F83]">
                    {monthsCount} {monthsCount === 1 ? 'Month' : 'Months'} ({monthsCount} Invoices to generate)
                  </span>
                </div>

                {/* Schedule Parameters & Due Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Invoice Date Each Month
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={31}
                      value={generationDay}
                      onChange={(e) => setGenerationDay(Number(e.target.value))}
                      className="bg-white dark:bg-slate-800"
                    />
                    <span className="text-[11px] text-slate-400 block mt-1">
                      Any day from 1–31. Shorter months use their final day.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Due Date Rule
                    </label>
                    <Select
                      value={dueDateType}
                      onChange={(e) => setDueDateType(e.target.value as any)}
                      className="bg-white dark:bg-slate-800"
                    >
                      <option value="relative">Days after issue (Relative)</option>
                      <option value="fixed">Fixed day of month</option>
                    </Select>
                    <span className="text-[11px] text-slate-400 block mt-1">
                      How invoice payment deadline is calculated.
                    </span>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      {dueDateType === 'relative' ? 'Payment Terms (Days)' : 'Fixed Due Day'}
                    </label>
                    {dueDateType === 'relative' ? (
                      <Select
                        value={String(dueDaysAfter)}
                        onChange={(e) => setDueDaysAfter(Number(e.target.value))}
                        className="bg-white dark:bg-slate-800"
                      >
                        <option value="3">3 days</option>
                        <option value="7">7 days (Net 7)</option>
                        <option value="14">14 days (Net 14)</option>
                        <option value="30">30 days (Net 30)</option>
                      </Select>
                    ) : (
                      <Input
                        type="number"
                        min={1}
                        max={31}
                        value={fixedDueDay}
                        onChange={(e) => setFixedDueDay(Number(e.target.value))}
                        className="bg-white dark:bg-slate-800"
                      />
                    )}
                    <span className="text-[11px] text-slate-400 block mt-1">
                      Payment deadline displayed on customer invoices.
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: Email Settings */}
            {activeStep === 2 && (
              <motion.div
                key="step-email-settings"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="space-y-5"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Option A: Automatic Sending */}
                  <div
                    onClick={() => setEmailMode('automatic')}
                    className={cn(
                      'cursor-pointer rounded-2xl p-4 border-2 transition-all text-left flex flex-col justify-between gap-3 relative group hover:shadow-lg',
                      emailMode === 'automatic'
                        ? 'border-[#008F83] bg-[#008F83]/5 dark:bg-[#008F83]/10 ring-2 ring-[#008F83]/20 shadow-md'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs'
                    )}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0',
                          emailMode === 'automatic'
                            ? 'bg-[#008F83] text-white shadow-xs'
                            : 'bg-[#008F83]/10 text-[#008F83]'
                        )}>
                          <Send className="w-4 h-4" />
                        </div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                          Automatic Email Sending
                        </h4>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Create every invoice now, then email each one automatically on its invoice date. Includes retries and delivery logs.
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#008F83]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Hands-free delivery
                      </div>
                      <span className={cn(
                        'text-[10.5px] font-bold transition-colors',
                        emailMode === 'automatic' ? 'text-[#008F83]' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                      )}>
                        {emailMode === 'automatic' ? '✓ Selected' : 'Select'}
                      </span>
                    </div>
                  </div>

                  {/* Option B: Manual Sending */}
                  <div
                    onClick={() => setEmailMode('manual')}
                    className={cn(
                      'cursor-pointer rounded-2xl p-4 border-2 transition-all text-left flex flex-col justify-between gap-3 relative group hover:shadow-lg',
                      emailMode === 'manual'
                        ? 'border-[#008F83] bg-[#008F83]/5 dark:bg-[#008F83]/10 ring-2 ring-[#008F83]/20 shadow-md'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs'
                    )}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0',
                          emailMode === 'manual'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-amber-500/10 text-amber-600'
                        )}>
                          <Edit3 className="w-4 h-4" />
                        </div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                          Manual Email Sending
                        </h4>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Create every invoice now without automatic delivery. Review, edit, and send each invoice when ready.
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-600">
                        <Clock className="w-3.5 h-3.5" /> Manual send control
                      </div>
                      <span className={cn(
                        'text-[10.5px] font-bold transition-colors',
                        emailMode === 'manual' ? 'text-[#008F83]' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                      )}>
                        {emailMode === 'manual' ? '✓ Selected' : 'Select'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Email Customization Fields */}
                <div className="space-y-4 pt-2">
                  <div>
                    <Input
                      label="Custom Email Subject (Optional)"
                      placeholder="e.g. Monthly Rent Invoice - {property_name} - {due_date}"
                      value={subjectTemplate}
                      onChange={(e) => setSubjectTemplate(e.target.value)}
                      className="bg-white dark:bg-slate-800"
                    />
                    <span className="text-[11px] text-slate-400 block mt-1">
                      Placeholders: {'{tenant_name}'}, {'{invoice_number}'}, {'{due_date}'}, {'{amount}'}
                    </span>
                  </div>

                  <div>
                    <Textarea
                      label="Custom Message or Instructions (Optional)"
                      placeholder="Enter a message to be included in the email body..."
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      rows={3}
                      className="bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 4: Review and Confirm — 2-Column Dashboard Layout matching Mockup */}
            {activeStep === 3 && (
              <motion.div
                key="step-review-confirm"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Left Column: Invoice Summary Card */}
                  <div className="lg:col-span-4 rounded-3xl p-5 bg-[#E6F4F1]/60 dark:bg-[#008F83]/10 border border-[#008F83]/20 flex flex-col justify-between space-y-5">
                    <div>
                      <h3 className="font-heading font-bold text-base text-slate-900 dark:text-white mb-5">
                        Invoice Summary
                      </h3>

                      <div className="space-y-5">
                        {/* Stat 1: Invoices to create */}
                        <div className="flex items-start gap-3.5">
                          <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 text-[#008F83] flex items-center justify-center shadow-xs shrink-0 border border-[#008F83]/15">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block">
                              Invoices to create
                            </span>
                            <p className="font-heading font-extrabold text-xl text-[#008F83] leading-tight mt-0.5">
                              {displayInvoicesCount} invoices
                            </p>
                          </div>
                        </div>

                        {/* Stat 2: Monthly amount */}
                        <div className="flex items-start gap-3.5">
                          <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 text-[#008F83] flex items-center justify-center shadow-xs shrink-0 border border-[#008F83]/15">
                            <Coins className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block">
                              Monthly amount
                            </span>
                            <p className="font-heading font-bold text-lg text-slate-900 dark:text-white leading-tight mt-0.5">
                              {formatCurrency(sourceInvoice?.total || 0, sourceInvoice?.currency || 'AUD')}
                            </p>
                          </div>
                        </div>

                        {/* Stat 3: Total invoice value */}
                        <div className="flex items-start gap-3.5">
                          <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 text-[#008F83] flex items-center justify-center shadow-xs shrink-0 border border-[#008F83]/15">
                            <Calculator className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block">
                              Total invoice value
                            </span>
                            <p className="font-heading font-bold text-lg text-slate-900 dark:text-white leading-tight mt-0.5">
                              {formatCurrency(totalValue, sourceInvoice?.currency || 'AUD')}
                            </p>
                          </div>
                        </div>

                        {/* Stat 4: Billing period */}
                        <div className="flex items-start gap-3.5">
                          <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 text-[#008F83] flex items-center justify-center shadow-xs shrink-0 border border-[#008F83]/15">
                            <Calendar className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block">
                              Billing period
                            </span>
                            <p className="font-bold text-xs text-slate-900 dark:text-white mt-0.5">
                              {billingPeriodLabel}
                            </p>
                            <span className="text-[10.5px] text-slate-500 dark:text-slate-400 block mt-1">
                              Issued on the {getOrdinal(generationDay)} of each month
                            </span>
                            <span className="text-[10.5px] text-slate-500 dark:text-slate-400 block">
                              {dueDateType === 'relative'
                                ? (previewInvoices[0]
                                    ? `Due on the ${getOrdinal(parseInt(previewInvoices[0].dueDate.split('-')[2], 10))}`
                                    : `Due ${dueDaysAfter} days after issue`)
                                : `Due on the ${getOrdinal(fixedDueDay)}`}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Invoices & Configuration */}
                  <div className="lg:col-span-8 space-y-4">
                    {/* Bill to & Source Invoice metadata row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-3.5 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 text-slate-500 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-700/60">
                          <User className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] text-slate-400 font-medium block">Bill to</span>
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {sourceInvoice?.recipient?.name || sourceInvoice?.customerName || 'Customer'}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {sourceInvoice?.recipient?.email || sourceInvoice?.customerEmail}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-3.5 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 text-slate-500 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-700/60">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] text-slate-400 font-medium block">Source invoice</span>
                          <p className="font-mono text-xs font-bold text-slate-900 dark:text-white truncate">
                            {sourceInvoice?.invoiceNumber}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Monthly Invoices Section */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h4 className="font-heading font-bold text-sm text-slate-900 dark:text-white">
                          Monthly Invoices ({displayInvoicesCount})
                        </h4>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleAddInvoiceRow}
                            className="text-xs font-semibold text-[#008F83] hover:text-[#008F83]/90 bg-[#008F83]/10 hover:bg-[#008F83]/15 border border-[#008F83]/30 rounded-xl px-2.5 py-1 flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add Invoice Row
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsBulkEditing(!isBulkEditing)}
                            className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-[#008F83] border border-slate-200 dark:border-slate-700 hover:border-[#008F83]/40 rounded-xl px-2.5 py-1 flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            {isBulkEditing ? 'Done Editing' : 'Edit All Amounts'}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
                        {visibleInvoices.map((inv) => {
                          const realIdx = previewInvoices.findIndex((p) => p.month === inv.month);
                          const isEditing = editingRowIndex === realIdx || isBulkEditing;

                          return (
                            <div
                              key={inv.month}
                              className={cn(
                                'rounded-xl border p-3 transition-all text-xs flex flex-col justify-center',
                                isEditing
                                  ? 'border-[#008F83]/40 bg-[#008F83]/5 dark:bg-[#008F83]/10 ring-1 ring-[#008F83]/20'
                                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:border-slate-300 dark:hover:border-slate-700'
                              )}
                            >
                              {isEditing ? (
                                <div className="space-y-2.5">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className="w-7 h-7 rounded-lg bg-[#008F83]/10 text-[#008F83] flex items-center justify-center shrink-0">
                                        <Calendar className="w-3.5 h-3.5" />
                                      </div>
                                      <span className="font-bold text-slate-900 dark:text-white">{inv.label}</span>
                                      <span className="text-[10px] font-mono text-slate-400">({inv.month})</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      {previewInvoices.length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteInvoiceRow(realIdx)}
                                          className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
                                          title="Remove this invoice"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                      {!isBulkEditing && (
                                        <button
                                          type="button"
                                          onClick={() => setEditingRowIndex(null)}
                                          className="px-3 py-1 rounded-lg bg-[#008F83] text-white text-[11px] font-semibold hover:bg-[#008F83]/90 transition-colors shadow-2xs cursor-pointer"
                                        >
                                          Done
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    <div>
                                      <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1">Issue Date</label>
                                      <Input
                                        type="date"
                                        value={inv.issueDate}
                                        onChange={(e) => handleUpdatePreviewRow(realIdx, { issueDate: e.target.value })}
                                        className="h-8 text-xs bg-white dark:bg-slate-800"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1">Due Date</label>
                                      <Input
                                        type="date"
                                        value={inv.dueDate}
                                        onChange={(e) => handleUpdatePreviewRow(realIdx, { dueDate: e.target.value })}
                                        className="h-8 text-xs bg-white dark:bg-slate-800"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1">Amount ($)</label>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        min={0}
                                        value={inv.amount}
                                        onChange={(e) => handleUpdatePreviewRow(realIdx, { amount: parseFloat(e.target.value) || 0 })}
                                        className="h-8 text-xs bg-white dark:bg-slate-800 font-semibold"
                                      />
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-[#008F83]/10 text-[#008F83] flex items-center justify-center shrink-0">
                                      <Calendar className="w-4 h-4" />
                                    </div>
                                    <span className="font-heading font-bold text-xs text-slate-900 dark:text-white w-20">
                                      {inv.label}
                                    </span>
                                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
                                      <span>Issue: {formatAuDisplayDate(inv.issueDate)}</span>
                                      <span>•</span>
                                      <span>Due: {formatAuDisplayDate(inv.dueDate)}</span>
                                    </div>
                                    {inv.isCustomized && (
                                      <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded">
                                        Customized
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="font-mono font-bold text-slate-900 dark:text-white text-xs mr-1">
                                      {formatCurrency(inv.amount, sourceInvoice?.currency || 'AUD')}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setEditingRowIndex(realIdx)}
                                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-[#008F83] hover:border-[#008F83]/40 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                      Edit
                                    </button>
                                    {previewInvoices.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteInvoiceRow(realIdx)}
                                        className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
                                        title="Remove this invoice"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* View all toggle if more than 3 invoices */}
                        {previewInvoices.length > 3 && (
                          <button
                            type="button"
                            onClick={() => setIsExpandedAll(!isExpandedAll)}
                            className="w-full py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                          >
                            {isExpandedAll ? (
                              <>
                                <ChevronUp className="w-3.5 h-3.5" /> Show less
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-3.5 h-3.5" /> View all {previewInvoices.length} invoices
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Automatic Email Delivery Toggle Card */}
                    <div className="rounded-2xl p-3.5 border border-[#008F83]/30 bg-[#008F83]/5 dark:bg-[#008F83]/10 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 text-[#008F83] flex items-center justify-center shadow-2xs shrink-0">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                            Automatic email delivery
                          </h5>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {emailMode === 'automatic'
                              ? 'Each invoice will be emailed automatically on its issue date.'
                              : 'Manual delivery selected: no emails will be sent automatically.'}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={emailMode === 'automatic'}
                        onClick={() => setEmailMode(emailMode === 'automatic' ? 'manual' : 'automatic')}
                        className="flex items-center gap-2 group cursor-pointer focus:outline-none shrink-0"
                      >
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {emailMode === 'automatic' ? 'Enabled' : 'Disabled'}
                        </span>
                        <div
                          className={cn(
                            'w-11 h-6 rounded-full transition-colors relative p-0.5',
                            emailMode === 'automatic' ? 'bg-[#008F83]' : 'bg-slate-300 dark:bg-slate-700'
                          )}
                        >
                          <div
                            className={cn(
                              'w-5 h-5 rounded-full bg-white shadow-xs transition-transform',
                              emailMode === 'automatic' ? 'translate-x-5' : 'translate-x-0'
                            )}
                          />
                        </div>
                      </button>
                    </div>

                    {/* Footnote */}
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
                      <Info className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>You can edit each invoice separately without affecting the others.</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Modal Footer Actions matching Reference UI */}
        <div className="mt-8 pt-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={activeStep === 0 ? onClose : handleBack}
            disabled={isSubmitting}
            className="h-11 px-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#008F83]/30 disabled:opacity-50 flex items-center gap-1.5"
          >
            {activeStep === 0 ? 'Cancel' : (
              <>
                <ArrowLeft className="w-4 h-4" /> Back
              </>
            )}
          </button>

          <button
            type="button"
            onClick={activeStep === steps.length - 1 ? handleConfirmCreate : handleNext}
            disabled={isSubmitting || !sourceInvoice || displayInvoicesCount <= 0}
            className="h-11 px-6 rounded-xl bg-[#008F83] text-white font-semibold text-sm hover:bg-[#008F83]/90 shadow-xs transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#008F83]/30 disabled:opacity-50 min-w-[150px]"
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating...
              </span>
            ) : activeStep === steps.length - 1 ? (
              <span className="inline-flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Generate {displayInvoicesCount} Invoices
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                Continue <ArrowRight className="w-4 h-4" />
              </span>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
