'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
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
  { id: 1, name: 'Select Invoice', desc: 'Verify the source invoice details.' },
  { id: 2, name: 'Schedule', desc: 'Configure billing period and generation dates.' },
  { id: 3, name: 'Email Settings', desc: 'Configure automatic or manual email delivery.' },
  { id: 4, name: 'Review', desc: 'Review everything and confirm schedule.' },
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
    }

    setActiveStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  const handleConfirmCreate = async () => {
    if (!sourceInvoice) return;
    if (monthsCount <= 0) {
      toast({
        title: 'Invalid Date Range',
        description: 'Please choose a valid billing period.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createInvoiceScheduleAction({
        sourceInvoiceId: sourceInvoice.id,
        startMonth,
        endMonth,
        frequency: 'monthly',
        generationDayOfMonth: generationDay,
        dueDaysAfter: dueDateType === 'relative' ? dueDaysAfter : 7,
        dueDateFixed: dueDateType === 'fixed' ? fixedDueDay : null,
        timezone,
        emailMode,
        subjectTemplate: subjectTemplate.trim() || undefined,
        customMessage: customMessage.trim() || undefined,
        driveFolderUrl: driveFolderUrl.trim() || undefined,
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to create schedule');
      }

      toast({
        title: 'Schedule Created Successfully',
        description: `Generated ${res.count || monthsCount} independent monthly invoices for ${sourceInvoice.recipient?.name || sourceInvoice.customerName || 'customer'}.`,
      });

      onSuccess?.(res.count || monthsCount);
      onClose();
    } catch (err: any) {
      toast({
        title: 'Creation Failed',
        description: err.message || 'Unable to create recurring email schedule.',
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
        className="relative w-full max-w-2xl bg-white dark:bg-[#07111F] border border-slate-200 dark:border-[#17283A] rounded-3xl shadow-2xl overflow-y-auto max-h-[92vh] z-10 p-6 sm:p-8"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-5 right-5 p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#0E1E33] transition-colors focus:outline-none focus:ring-2 focus:ring-[#008F83]/30"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Centered Header (Standardized Reference UI) */}
        <div className="text-center mb-6">
          <h2 className="text-xl sm:text-2xl font-bold font-heading tracking-tight text-slate-900 dark:text-white">
            Schedule Email
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure automated recurring monthly invoices and independent delivery schedules.
          </p>
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
                      Generation Day of Month
                    </label>
                    <Select
                      value={String(generationDay)}
                      onChange={(e) => setGenerationDay(Number(e.target.value))}
                      className="bg-white dark:bg-slate-800"
                    >
                      <option value="1">1st of month</option>
                      <option value="5">5th of month</option>
                      <option value="10">10th of month</option>
                      <option value="15">15th of month</option>
                      <option value="20">20th of month</option>
                      <option value="25">25th of month</option>
                      <option value="28">28th of month</option>
                    </Select>
                    <span className="text-[11px] text-slate-400 block mt-1">
                      Day when invoice is officially dated each month.
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

                  <div>
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
                      <Select
                        value={String(fixedDueDay)}
                        onChange={(e) => setFixedDueDay(Number(e.target.value))}
                        className="bg-white dark:bg-slate-800"
                      >
                        <option value="7">7th of month</option>
                        <option value="14">14th of month</option>
                        <option value="15">15th of month</option>
                        <option value="21">21st of month</option>
                        <option value="28">28th of month</option>
                      </Select>
                    )}
                    <span className="text-[11px] text-slate-400 block mt-1">
                      Payment deadline displayed on customer invoices.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Timezone
                    </label>
                    <Select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="bg-white dark:bg-slate-800"
                    >
                      <option value="Australia/Sydney">Australia/Sydney (AEST/AEDT)</option>
                      <option value="Australia/Melbourne">Australia/Melbourne</option>
                      <option value="Australia/Brisbane">Australia/Brisbane (AEST)</option>
                      <option value="Australia/Adelaide">Australia/Adelaide (ACST/ACDT)</option>
                      <option value="Australia/Perth">Australia/Perth (AWST)</option>
                    </Select>
                    <span className="text-[11px] text-slate-400 block mt-1">
                      Timezone used for monthly job execution.
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
                      {/* Visual Asset Illustration Banner (Dark & Light Mode) */}
                      <div className="relative w-full h-32 rounded-xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/60 shadow-2xs group-hover:shadow-sm transition-all">
                        <Image
                          src="/images/invoices/email_auto_light.jpg"
                          alt="Automatic Email Sending"
                          fill
                          className="object-cover dark:hidden"
                          sizes="(max-width: 768px) 100vw, 320px"
                        />
                        <Image
                          src="/images/invoices/email_auto_dark.jpg"
                          alt="Automatic Email Sending"
                          fill
                          className="object-cover hidden dark:block"
                          sizes="(max-width: 768px) 100vw, 320px"
                        />
                        <div className="absolute top-2 right-2">
                          <span className={cn(
                            'text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs backdrop-blur-md',
                            emailMode === 'automatic'
                              ? 'bg-[#008F83] text-white border-[#008F83]'
                              : 'bg-white/85 dark:bg-slate-900/85 text-[#008F83] border-[#008F83]/30'
                          )}>
                            Automated
                          </span>
                        </div>
                      </div>

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
                        Invoices are sent automatically to the tenant on the configured generation date. Includes retry and delivery logs.
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
                      {/* Visual Asset Illustration Banner (Dark & Light Mode) */}
                      <div className="relative w-full h-32 rounded-xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/60 shadow-2xs group-hover:shadow-sm transition-all">
                        <Image
                          src="/images/invoices/email_manual_light.jpg"
                          alt="Manual Email Sending"
                          fill
                          className="object-cover dark:hidden"
                          sizes="(max-width: 768px) 100vw, 320px"
                        />
                        <Image
                          src="/images/invoices/email_manual_dark.jpg"
                          alt="Manual Email Sending"
                          fill
                          className="object-cover hidden dark:block"
                          sizes="(max-width: 768px) 100vw, 320px"
                        />
                        <div className="absolute top-2 right-2">
                          <span className={cn(
                            'text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs backdrop-blur-md',
                            emailMode === 'manual'
                              ? 'bg-amber-600 text-white border-amber-600'
                              : 'bg-white/85 dark:bg-slate-900/85 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          )}>
                            Review First
                          </span>
                        </div>
                      </div>

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
                        Generates all monthly invoices in pending-send state. You can review, add custom charges, and send each invoice individually.
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

            {/* STEP 4: Review and Confirm */}
            {activeStep === 3 && (
              <motion.div
                key="step-review-confirm"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="space-y-5"
              >
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Schedule Summary
                    </span>
                    <span
                      className={cn(
                        'px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider',
                        emailMode === 'automatic'
                          ? 'bg-[#008F83]/15 text-[#008F83]'
                          : 'bg-amber-500/15 text-amber-600'
                      )}
                    >
                      {emailMode === 'automatic' ? 'Automatic Delivery' : 'Manual Delivery'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block">Source Invoice:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white mt-0.5 block">
                        {sourceInvoice?.invoiceNumber}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block">Tenant / Bill To:</span>
                      <span className="font-semibold text-slate-900 dark:text-white mt-0.5 block truncate">
                        {sourceInvoice?.recipient?.name || sourceInvoice?.customerName || 'Customer'}
                      </span>
                      <span className="text-slate-400 text-[11px] block truncate">
                        {sourceInvoice?.recipient?.email || sourceInvoice?.customerEmail}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block">Billing Period:</span>
                      <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">
                        {startMonth} to {endMonth}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block">Invoices to Generate:</span>
                      <span className="font-heading text-base font-bold text-[#008F83] mt-0.5 block">
                        {monthsCount} Individual Invoices
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block">Monthly Amount:</span>
                      <span className="font-heading text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                        {formatCurrency(sourceInvoice?.total || 0, sourceInvoice?.currency || 'AUD')} / mo
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block">Generation & Due Date:</span>
                      <span className="font-semibold text-slate-900 dark:text-white mt-0.5 block">
                        Day {generationDay} of month (Due: {dueDateType === 'relative' ? `+${dueDaysAfter}d` : `Day ${fixedDueDay}`})
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
                    <p className="font-semibold mb-0.5">Independent Snapshot Guarantee</p>
                    <p className="text-[11px] text-blue-800 dark:text-blue-300">
                      Each generated invoice is completely independent. You can edit line items, add utilities or
                      adjust amounts for any single month without affecting other months or the source invoice.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Modal Footer Actions (Standardized Reference UI) */}
        <div className="mt-8 pt-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={activeStep === 0 ? onClose : handleBack}
            disabled={isSubmitting}
            className="h-11 px-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#008F83]/30 disabled:opacity-50"
          >
            {activeStep === 0 ? 'Cancel' : 'Back'}
          </button>

          <button
            type="button"
            onClick={activeStep === steps.length - 1 ? handleConfirmCreate : handleNext}
            disabled={isSubmitting || !sourceInvoice || monthsCount <= 0}
            className="h-11 px-6 rounded-xl bg-[#008F83] text-white font-semibold text-sm hover:bg-[#008F83]/90 shadow-xs transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#008F83]/30 disabled:opacity-50 min-w-[140px]"
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating...
              </span>
            ) : activeStep === steps.length - 1 ? (
              'Create Schedule'
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
