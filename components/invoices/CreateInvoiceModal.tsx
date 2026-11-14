'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  X,
  Plus,
  Trash2,
  Calculator,
  Check,
  AlertCircle,
  Building,
  User,
  FileText,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Download,
  Mail,
  CheckCircle2,
  Calendar,
  DollarSign,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  LayoutTemplate,
  Building2,
  CalendarRange,
} from 'lucide-react';
import { Button, Input, Select, Textarea } from '@/components/admin/ui';
import { CreateInvoiceDTO, UpdateInvoiceDTO, InvoiceDTO, InvoiceTemplateDTO } from '@/modules/invoices';
import {
  PREDEFINED_INVOICE_TEMPLATES,
  PredefinedInvoiceTemplate,
  getPredefinedTemplateById,
} from '@/modules/invoices/domain/constants/predefined-templates';
import { formatCurrency, SUPPORTED_CURRENCIES } from '@/modules/invoices/domain/value-objects/currency';
import { fetchDashboardProperties, fetchAllWorkspaceLeases, fetchDashboardLeases } from '@/app/actions/dashboard';
import { getInvoiceDownloadUrlAction, generateInvoiceDocumentAction, sendInvoiceEmailAction, fetchInvoiceTemplatesAction } from '@/app/actions/invoices';
import { sendAutomationTestEmailAction } from '@/app/actions/automations';
import { LiveInvoiceRenderer } from './LiveInvoiceRenderer';
import { InvoiceTemplateModal } from './InvoiceTemplateModal';
import {
  getAuTodayString,
  getAuDateParts,
  formatAuDateIso,
  formatAuDisplayDateTime,
  formatAuDisplayDate,
  createAuDate,
} from '@/lib/format/australian-time';
import { cn } from '@/lib/utils';

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    dto: CreateInvoiceDTO,
    issueImmediately?: boolean,
    emailOptions?: { subject?: string; customMessage?: string; driveFolderUrl?: string }
  ) => Promise<void>;
  invoiceToEdit?: InvoiceDTO | null;
  onUpdate?: (id: string, dto: UpdateInvoiceDTO) => Promise<void>;
  initialTemplateId?: string;
  initialPropertyId?: string;
  onOpenBulkModal?: () => void;
}

const WIZARD_STEPS = [
  { idx: 0, name: 'Invoice Type' },
  { idx: 1, name: 'Details' },
  { idx: 2, name: 'Preview & Issue' },
];

export function CreateInvoiceModal({
  isOpen,
  onClose,
  onSubmit,
  invoiceToEdit,
  onUpdate,
  initialTemplateId,
  initialPropertyId,
  onOpenBulkModal,
}: CreateInvoiceModalProps) {
  const isEditMode = Boolean(invoiceToEdit);

  // 3-Step Wizard: 0 = Invoice Type, 1 = Invoice Details, 2 = Live Preview & Send
  const [step, setStep] = useState<number>(isEditMode ? 1 : 0);
  const [selectedTemplate, setSelectedTemplate] = useState<PredefinedInvoiceTemplate>(() => {
    return getPredefinedTemplateById(initialTemplateId || 'template_classic');
  });

  // Live Australian Time state
  const [auCurrentTimeStr, setAuCurrentTimeStr] = useState<string>(() =>
    formatAuDisplayDateTime(new Date(), true)
  );
  // Custom templates / blueprints state
  const [customTemplates, setCustomTemplates] = useState<InvoiceTemplateDTO[]>([]);
  const [isTemplateBuilderOpen, setIsTemplateBuilderOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const updateTimer = () => {
      setAuCurrentTimeStr(formatAuDisplayDateTime(new Date(), true));
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Invoice Mode & Core Metadata
  const [invoiceType, setInvoiceType] = useState<'standalone' | 'lease'>('standalone');
  const [status, setStatus] = useState<string>('draft');
  const [currency, setCurrency] = useState('AUD');
  const [invoiceNumber, setInvoiceNumber] = useState(
    `INV-${getAuDateParts(new Date()).year}-${Math.floor(1000 + Math.random() * 9000)}`
  );

  // Test Email State
  const [testRecipient, setTestRecipient] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testSuccess, setTestSuccess] = useState<string | null>(null);

  // Issuer (Issued By) Details - Clean, not prefilled with demo data
  const [isEditingIssuer, setIsEditingIssuer] = useState(false);
  const [issuerName, setIssuerName] = useState('');
  const [issuerEmail, setIssuerEmail] = useState('');
  const [issuerPhone, setIssuerPhone] = useState('');
  const [issuerAddress, setIssuerAddress] = useState('');
  const [issuerTaxId, setIssuerTaxId] = useState('');

  // Recipient (Issued To) Details
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');

  // Dates & Payment Terms in Australian Timezone
  const [issueDate, setIssueDate] = useState(() => getAuTodayString());
  const [dueDate, setDueDate] = useState(() => {
    const todayParts = getAuDateParts(new Date());
    const dueObj = createAuDate(todayParts.year, todayParts.month, todayParts.day + 14);
    return formatAuDateIso(dueObj);
  });
  const [paymentTermsDays, setPaymentTermsDays] = useState<number>(14);

  // Lease / Property Linkage
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [selectedLeaseId, setSelectedLeaseId] = useState<string>('');
  const [properties, setProperties] = useState<any[]>([]);
  const [leases, setLeases] = useState<any[]>([]);

  // Line Items
  const [items, setItems] = useState<Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    discount?: number;
  }>>([
    { description: '', quantity: 1, unitPrice: 0, taxRate: 10, discount: 0 },
  ]);

  // Notes & Payment Instructions (Clean default, not prefilled with demo data)
  const [notes, setNotes] = useState('');
  const [paymentInstructions, setPaymentInstructions] = useState('');

  // Email template & message body customization
  const [emailSubject, setEmailSubject] = useState('');
  const [customEmailMessage, setCustomEmailMessage] = useState('');
  const [driveFolderUrl, setDriveFolderUrl] = useState('');
  const [showEmailCustomizer, setShowEmailCustomizer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const prevModalInvoiceIdRef = useRef<string | null>(null);

  // Load properties & leases on open
  useEffect(() => {
    if (isOpen) {
      const currentInvoiceId = invoiceToEdit?.id || '__new__';
      if (prevModalInvoiceIdRef.current === currentInvoiceId) {
        return; // Guard active edits from being wiped by background refreshes
      }
      prevModalInvoiceIdRef.current = currentInvoiceId;

      setStep(isEditMode ? 1 : 0);
      setError(null);
      setActionSuccessMessage(null);

      const loadData = async () => {
        const [propsRes, leasesRes, templatesRes] = await Promise.allSettled([
          fetchDashboardProperties(),
          fetchAllWorkspaceLeases(),
          fetchInvoiceTemplatesAction(),
        ]);

        if (propsRes.status === 'fulfilled') {
          const props = propsRes.value;
          if (Array.isArray(props)) setProperties(props);
          else if (props && (props as any).data && Array.isArray((props as any).data)) setProperties((props as any).data);
        }

        if (leasesRes.status === 'fulfilled') {
          let leaseData = leasesRes.value;
          if (!Array.isArray(leaseData) || leaseData.length === 0) {
            try {
              leaseData = await fetchDashboardLeases();
            } catch {
              // ignore fallback error
            }
          }
          if (Array.isArray(leaseData)) setLeases(leaseData);
          else if (leaseData && (leaseData as any).data && Array.isArray((leaseData as any).data)) setLeases((leaseData as any).data);
        }

        if (templatesRes.status === 'fulfilled' && Array.isArray(templatesRes.value)) {
          setCustomTemplates(templatesRes.value);
        }
      };
      loadData();

      if (invoiceToEdit) {
        setInvoiceType(invoiceToEdit.leaseId ? 'lease' : 'standalone');
        setStatus(invoiceToEdit.status || 'draft');
        setCurrency(invoiceToEdit.currency || 'AUD');
        if (invoiceToEdit.invoiceNumber) setInvoiceNumber(invoiceToEdit.invoiceNumber);
        setRecipientName(invoiceToEdit.customerName || (invoiceToEdit as any).recipientName || '');
        setRecipientEmail(invoiceToEdit.customerEmail || (invoiceToEdit as any).recipientEmail || '');
        setRecipientAddress(invoiceToEdit.customerAddress || (invoiceToEdit as any).recipientAddress || '');
        setRecipientPhone((invoiceToEdit as any).recipientPhone || '');
        setIssueDate(invoiceToEdit.issueDate ? formatAuDateIso(invoiceToEdit.issueDate) : getAuTodayString());
        setDueDate(invoiceToEdit.dueDate ? formatAuDateIso(invoiceToEdit.dueDate) : getAuTodayString());
        setSelectedPropertyId(invoiceToEdit.propertyId || '');
        setSelectedLeaseId(invoiceToEdit.leaseId || '');

        if (invoiceToEdit.items && invoiceToEdit.items.length > 0) {
          setItems(
            invoiceToEdit.items.map((i) => ({
              description: i.description,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              taxRate: i.taxRate ?? 10,
              discount: (i as any).discount || 0,
            }))
          );
        }
        const issuer = invoiceToEdit.snapshot?.issuer;
        setIssuerName(issuer?.name || '');
        setIssuerEmail(issuer?.email || '');
        setIssuerPhone(issuer?.phone || '');
        setIssuerAddress(issuer?.address || '');
        setIssuerTaxId(issuer?.taxId || '');
        setIsEditingIssuer(Boolean(issuer?.name || issuer?.email || issuer?.taxId));
        setNotes(invoiceToEdit.notes || '');
        setPaymentInstructions(invoiceToEdit.paymentInstructions || '');
      } else {
        if (initialPropertyId) {
          setSelectedPropertyId(initialPropertyId);
          setInvoiceType('lease');
        } else {
          setSelectedPropertyId('');
          setInvoiceType('standalone');
        }
        setStatus('draft');
        setCurrency('AUD');
        setInvoiceNumber(`INV-${getAuDateParts(new Date()).year}-${Math.floor(1000 + Math.random() * 9000)}`);
        setRecipientName('');
        setRecipientEmail('');
        setRecipientPhone('');
        setRecipientAddress('');
        const todayStr = getAuTodayString();
        setIssueDate(todayStr);
        const parts = getAuDateParts(new Date());
        const dueD = createAuDate(parts.year, parts.month, parts.day + 14);
        setDueDate(formatAuDateIso(dueD));
        setSelectedLeaseId('');
        setItems([{ description: '', quantity: 1, unitPrice: 0, taxRate: 10, discount: 0 }]);
        setSelectedTemplate(getPredefinedTemplateById(initialTemplateId || 'template_classic'));
        setIssuerName('');
        setIssuerEmail('');
        setIssuerPhone('');
        setIssuerAddress('');
        setIssuerTaxId('');
        setIsEditingIssuer(false);
        setNotes('');
        setPaymentInstructions('');
      }
    } else {
      prevModalInvoiceIdRef.current = null;
    }
  }, [isOpen, invoiceToEdit, initialTemplateId, initialPropertyId]);


  const handleSelectCustomTemplate = (customTmpl: InvoiceTemplateDTO) => {
    const basePreset = getPredefinedTemplateById(customTmpl.layoutStyle || 'classic');
    const merged: PredefinedInvoiceTemplate = {
      ...basePreset,
      id: customTmpl.id,
      name: customTmpl.name,
      badge: customTmpl.isDefault ? 'Workspace Default' : 'Custom Blueprint',
      description: customTmpl.description || `Custom ${customTmpl.layoutStyle} blueprint configuration.`,
      layoutStyle: customTmpl.layoutStyle || 'classic',
      brandColor: customTmpl.brandColor || basePreset.brandColor,
      accentColor: customTmpl.accentColor || basePreset.accentColor,
    };
    setSelectedTemplate(merged);

    if (customTmpl.notes) setNotes(customTmpl.notes);
    if (customTmpl.paymentInstructions) setPaymentInstructions(customTmpl.paymentInstructions);
    if (customTmpl.paymentTermsDays) setPaymentTermsDays(Number(customTmpl.paymentTermsDays));
    if (customTmpl.items && customTmpl.items.length > 0) {
      setItems(
        customTmpl.items.map((i: any) => ({
          description: i.description || 'Service',
          quantity: Number(i.quantity) || 1,
          unitPrice: Number(i.unitPrice) || 0,
          taxRate: i.taxRate !== undefined ? Number(i.taxRate) : 10,
        }))
      );
    }
  };

  if (!isOpen) return null;

  // Handle Preset Due Terms (Net 7, 14, 30) using Australian timezone
  const handleSetTerms = (days: number) => {
    setPaymentTermsDays(days);
    const baseDateStr = issueDate || getAuTodayString();
    const [y, m, d] = baseDateStr.split('-').map((n) => parseInt(n, 10));
    const dueObj = createAuDate(y, m, d + days);
    setDueDate(formatAuDateIso(dueObj));
  };

  // Handle Lease Auto-fill
  const handleLeaseSelect = (leaseId: string) => {
    setSelectedLeaseId(leaseId);
    const found = leases.find((l) => l.id === leaseId);
    if (found) {
      setSelectedPropertyId(found.property_id || found.propertyId || '');
      const tenantRel = found.lease_tenants?.[0] || found.tenants?.[0];
      const t = tenantRel?.tenant || tenantRel;
      if (t) {
        const name = `${t.first_name || t.firstName || ''} ${t.last_name || t.lastName || ''}`.trim() || t.name || '';
        if (name) setRecipientName(name);
        if (t.email) setRecipientEmail(t.email);
        if (t.phone) setRecipientPhone(t.phone);
      }
      if (found.property) {
        const addr = [
          found.property.address_line_1,
          found.property.city || found.property.suburb,
          found.property.state,
          found.property.postal_code,
        ].filter(Boolean).join(', ');
        if (addr) setRecipientAddress(addr);
      }
      const rentAmt = Number(found.rent_amount || found.rentAmount || 0);
      setItems([
        {
          description: `Rent - ${found.rent_frequency || found.rentFrequency || 'Monthly'} (${dueDate})`,
          quantity: 1,
          unitPrice: rentAmt,
          taxRate: 0,
          discount: 0,
        },
      ]);
    }
  };

  // Line Item Helpers
  const handleAddItem = () => {
    setItems((prev) => [...prev, { description: '', quantity: 1, unitPrice: 0, taxRate: 10, discount: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // Math Calculations
  const subtotal = items.reduce(
    (sum, item) => sum + Math.max(0, (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0) - (Number(item.discount) || 0)),
    0
  );
  const taxTotal = items.reduce((sum, item) => {
    const base = Math.max(0, (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0) - (Number(item.discount) || 0));
    return sum + (base * (Number(item.taxRate) || 0)) / 100;
  }, 0);
  const grandTotal = subtotal + taxTotal;

  // Pure boolean check without side-effects for render-time disable conditions
  const isStep2Complete = useMemo(() => {
    return (
      Boolean(recipientName.trim()) &&
      items.length > 0 &&
      items.every((i) => Boolean(i.description.trim()) && (Number(i.quantity) || 0) > 0)
    );
  }, [recipientName, items]);

  // Validate Step 2 (called on user action, displays error banner)
  const validateStep2 = () => {
    setError(null);
    if (!recipientName.trim()) {
      setError('Recipient name is required.');
      return false;
    }
    if (items.some((i) => !i.description.trim())) {
      setError('All invoice line items must have a description.');
      return false;
    }
    if (items.some((i) => (Number(i.quantity) || 0) <= 0)) {
      setError('Line item quantity must be greater than zero.');
      return false;
    }
    return true;
  };

  // Construct Payload
  const buildDto = (issueImmediately: boolean): CreateInvoiceDTO => {
    return {
      templateId: selectedTemplate.id,
      propertyId: invoiceType === 'lease' && selectedPropertyId ? selectedPropertyId : undefined,
      leaseId: invoiceType === 'lease' && selectedLeaseId ? selectedLeaseId : undefined,
      recipientName: recipientName.trim(),
      recipientEmail: recipientEmail.trim() || undefined,
      recipientPhone: recipientPhone.trim() || undefined,
      recipientAddress: recipientAddress.trim() || undefined,
      issueDate,
      dueDate,
      currency,
      issuer: {
        name: issuerName.trim(),
        email: issuerEmail.trim() || undefined,
        phone: issuerPhone.trim() || undefined,
        address: issuerAddress.trim() || undefined,
        taxId: issuerTaxId.trim() || undefined,
      },
      items: items.map((i) => ({
        description: i.description.trim(),
        quantity: Number(i.quantity) || 1,
        unitPrice: Number(i.unitPrice) || 0,
        taxRate: Number(i.taxRate) || 0,
        discount: Number(i.discount) || 0,
      })),
      notes: notes.trim() || undefined,
      paymentInstructions: paymentInstructions.trim() || undefined,
    };
  };

  // Actions
  const handleSaveDraft = async () => {
    if (!validateStep2()) return;
    setLoading(true);
    try {
      if (isEditMode && invoiceToEdit && onUpdate) {
        await onUpdate(invoiceToEdit.id, {
          status: status as any,
          customerName: recipientName.trim(),
          customerEmail: recipientEmail.trim() || undefined,
          customerAddress: recipientAddress.trim() || undefined,
          recipientName: recipientName.trim(),
          recipientEmail: recipientEmail.trim() || undefined,
          recipientAddress: recipientAddress.trim() || undefined,
          issueDate,
          dueDate,
          currency,
          items: items.map((i) => ({
            description: i.description,
            quantity: Number(i.quantity) || 1,
            unitPrice: Number(i.unitPrice) || 0,
            taxRate: Number(i.taxRate) || 0,
          })),
          notes: notes.trim() || undefined,
          paymentInstructions: paymentInstructions.trim() || undefined,
        });
      } else {
        await onSubmit(buildDto(false), false);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save draft');
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestEmail = async () => {
    setIsSendingTest(true);
    setTestSuccess(null);
    setError(null);
    try {
      const res = await sendAutomationTestEmailAction({
        automationType: 'invoice',
        testRecipient,
        customerName: recipientName.trim() || 'Valued Recipient',
        customerEmail: recipientEmail.trim() || undefined,
        customerAddress: recipientAddress.trim() || undefined,
        description: items[0]?.description || 'Invoice Services',
        amount: grandTotal,
        currency,
        invoiceTemplateId: selectedTemplate.id,
        issuedByOverride: {
          name: issuerName.trim(),
          email: issuerEmail.trim(),
          phone: issuerPhone.trim(),
          address: issuerAddress.trim(),
          taxId: issuerTaxId.trim(),
        },
      });

      if (!res.success) throw new Error(res.error || 'Failed to send test email');
      setTestSuccess(`Test invoice email sent to ${res.recipient || testRecipient || 'your inbox'}!`);
      setTimeout(() => setTestSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to send test email');
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleIssueAndDownload = async () => {
    if (!validateStep2()) return;
    setLoading(true);
    try {
      await onSubmit(buildDto(true), true);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to issue invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleIssueAndSendEmail = async () => {
    if (!validateStep2()) return;
    if (!recipientEmail.trim()) {
      setError('A recipient email address is required to send this invoice via email.');
      return;
    }
    setLoading(true);
    try {
      await onSubmit(buildDto(true), true, {
        subject: emailSubject.trim() || undefined,
        customMessage: customEmailMessage.trim() || undefined,
        driveFolderUrl: driveFolderUrl.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to issue and send invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in font-sans overflow-y-auto" role="dialog" aria-modal="true">
      <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl p-6 sm:p-8 my-auto overflow-hidden">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-5 right-5 p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-[#008F83]/30 z-20"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Centered Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-1">
            <h2 className="text-xl sm:text-2xl font-bold font-heading tracking-tight text-slate-900 dark:text-white">
              {isEditMode ? `Edit Invoice ${invoiceToEdit?.invoiceNumber}` : 'Create New Invoice'}
            </h2>
            <span className="text-[10.5px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border bg-[#008F83]/10 text-[#008F83] border-[#008F83]/20">
              {invoiceType === 'lease' ? 'Lease Linked' : 'Standalone'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {step === 0
              ? 'Choose whether to bill an active lease tenancy or an independent client.'
              : step === 1
              ? 'Define invoice recipient, terms, and itemized charges.'
              : 'Review the generated document preview and issue or download.'}
          </p>
        </div>

        {/* Centered Stepper */}
        <nav aria-label="Progress" className="mb-6">
          <div className="flex items-center justify-center max-w-md mx-auto relative">
            <div className="absolute top-4 left-8 right-8 h-0.5 bg-slate-200 dark:bg-slate-800 -z-0" />
            <div
              className="absolute top-4 left-8 h-0.5 bg-[#008F83] -z-0 transition-all duration-300"
              style={{
                width: step === 0 ? '0%' : step === 1 ? '50%' : 'calc(100% - 64px)',
              }}
            />

            <div className="w-full flex items-center justify-between z-10 px-2">
              {WIZARD_STEPS.map((s, idx) => {
                const isCurrent = idx === step;
                const isCompleted = idx < step;
                return (
                  <div key={s.idx} className="flex flex-col items-center group">
                    <button
                      type="button"
                      disabled={idx > step && (idx > 1 || !isStep2Complete)}
                      onClick={() => {
                        if (idx === 2 && !validateStep2()) return;
                        setStep(idx);
                      }}
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 cursor-pointer',
                        isCurrent
                          ? 'bg-[#008F83] text-white shadow-md ring-4 ring-[#008F83]/15 scale-105'
                          : isCompleted
                          ? 'bg-[#008F83] text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
                      )}
                    >
                      {isCompleted ? <Check className="w-4 h-4 stroke-[2.5]" /> : s.idx + 1}
                    </button>
                    <span
                      className={cn(
                        'mt-1.5 text-[11px] font-medium transition-colors text-center',
                        isCurrent
                          ? 'text-[#008F83] font-semibold'
                          : isCompleted
                          ? 'text-slate-700 dark:text-slate-300'
                          : 'text-slate-400 dark:text-slate-500'
                      )}
                    >
                      {s.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Global Alerts */}
        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-500 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Scrollable Wizard Body */}
        <div className="overflow-y-auto flex-1 space-y-6 text-sm px-0.5 py-1">

          {/* ═══════════════════════════════════════════════════════
              STEP 0: CHOOSE INVOICE TYPE (STANDALONE VS PROPERTY LEASE RENT)
             ═══════════════════════════════════════════════════════ */}
          {step === 0 && (
            <div className="space-y-6 py-2">
              <div className="text-center max-w-xl mx-auto mb-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#008F83]/10 text-[#008F83] text-xs font-bold border border-[#008F83]/20 mb-2">
                  <Sparkles className="w-3.5 h-3.5" /> Step 1 of 3 · Invoice Workflow
                </span>
                <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Select Invoice Category
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Choose how you want to bill this invoice. You can bill an independent client or link directly to an active property tenancy.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl mx-auto">
                {/* Option 1: Independent Customer Invoice */}
                <div
                  onClick={() => setInvoiceType('standalone')}
                  className={cn(
                    'cursor-pointer rounded-3xl p-6 border-2 transition-all flex flex-col justify-between relative group hover:shadow-xl',
                    invoiceType === 'standalone'
                      ? 'border-[#008F83] bg-[#008F83]/5 dark:bg-[#008F83]/10 shadow-lg ring-4 ring-[#008F83]/15'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
                  )}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className={cn(
                        'w-12 h-12 rounded-2xl flex items-center justify-center transition-colors',
                        invoiceType === 'standalone'
                          ? 'bg-[#008F83] text-white shadow-md'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-[#008F83]/10 group-hover:text-[#008F83]'
                      )}>
                        <User className="w-6 h-6" />
                      </div>
                      <span className={cn(
                        'text-[10.5px] font-bold px-2.5 py-1 rounded-full border',
                        invoiceType === 'standalone'
                          ? 'bg-[#008F83]/15 text-[#008F83] border-[#008F83]/30'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      )}>
                        Standard Direct
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-[#008F83] transition-colors">
                        Independent Customer Invoice
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                        Bill external clients, contractors, or customers directly for consulting, maintenance services, or custom ad-hoc charges.
                      </p>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className={cn('w-4 h-4', invoiceType === 'standalone' ? 'text-[#008F83]' : 'text-slate-400')} />
                        <span>No lease or tenancy linkage required</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className={cn('w-4 h-4', invoiceType === 'standalone' ? 'text-[#008F83]' : 'text-slate-400')} />
                        <span>Custom client recipient information</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className={cn('w-4 h-4', invoiceType === 'standalone' ? 'text-[#008F83]' : 'text-slate-400')} />
                        <span>Itemized line items with custom tax & rates</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <span className={cn(
                      'text-xs font-bold transition-colors',
                      invoiceType === 'standalone' ? 'text-[#008F83]' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                    )}>
                      {invoiceType === 'standalone' ? '✓ Selected Category' : 'Click to select'}
                    </span>
                    <div className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center transition-all',
                      invoiceType === 'standalone'
                        ? 'bg-[#008F83] text-white shadow-xs'
                        : 'border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-transparent'
                    )}>
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                  </div>
                </div>

                {/* Option 2: Property Lease Rent Invoice */}
                <div
                  onClick={() => setInvoiceType('lease')}
                  className={cn(
                    'cursor-pointer rounded-3xl p-6 border-2 transition-all flex flex-col justify-between relative group hover:shadow-xl',
                    invoiceType === 'lease'
                      ? 'border-[#008F83] bg-[#008F83]/5 dark:bg-[#008F83]/10 shadow-lg ring-4 ring-[#008F83]/15'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
                  )}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className={cn(
                        'w-12 h-12 rounded-2xl flex items-center justify-center transition-colors',
                        invoiceType === 'lease'
                          ? 'bg-[#008F83] text-white shadow-md'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-[#008F83]/10 group-hover:text-[#008F83]'
                      )}>
                        <Building2 className="w-6 h-6" />
                      </div>
                      <span className={cn(
                        'text-[10.5px] font-bold px-2.5 py-1 rounded-full border',
                        invoiceType === 'lease'
                          ? 'bg-[#008F83]/15 text-[#008F83] border-[#008F83]/30'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      )}>
                        Tenancy Linked
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-[#008F83] transition-colors">
                        Property Lease Rent Invoice
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                        Formal tenancy billing tied to active leases. Automatically synchronizes tenant details, property address, and recurring rent schedule.
                      </p>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className={cn('w-4 h-4', invoiceType === 'lease' ? 'text-[#008F83]' : 'text-slate-400')} />
                        <span>Auto-populates tenant & property records</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className={cn('w-4 h-4', invoiceType === 'lease' ? 'text-[#008F83]' : 'text-slate-400')} />
                        <span>Pre-loads agreed rent amount & frequency</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className={cn('w-4 h-4', invoiceType === 'lease' ? 'text-[#008F83]' : 'text-slate-400')} />
                        <span>Syncs directly to property financial ledger</span>
                      </div>
                    </div>

                    {/* Quick lease selector if lease mode is selected */}
                    {invoiceType === 'lease' && (
                      <div
                        className="mt-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-[#008F83]/30 shadow-xs space-y-1.5 animate-in fade-in"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Select
                          label="Select Active Lease (Optional here or in details)"
                          value={selectedLeaseId}
                          onChange={(e) => handleLeaseSelect(e.target.value)}
                          className="text-xs font-semibold"
                        >
                          <option value="">-- Choose active tenancy lease ({leases.length} available) --</option>
                          {leases.map((l) => {
                            const tenantRel = l.lease_tenants?.[0] || l.tenants?.[0];
                            const t = tenantRel?.tenant || tenantRel;
                            const tenantName = t ? `${t.first_name || ''} ${t.last_name || ''}`.trim() : '';
                            const propTitle = l.property?.name || l.property?.address_line_1 || 'Property';
                            return (
                              <option key={l.id} value={l.id}>
                                {propTitle} {tenantName ? `(${tenantName})` : ''} • ${l.rent_amount} ({l.rent_frequency || 'monthly'})
                              </option>
                            );
                          })}
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <span className={cn(
                      'text-xs font-bold transition-colors',
                      invoiceType === 'lease' ? 'text-[#008F83]' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                    )}>
                      {invoiceType === 'lease' ? '✓ Selected Category' : 'Click to select'}
                    </span>
                    <div className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center transition-all',
                      invoiceType === 'lease'
                        ? 'bg-[#008F83] text-white shadow-xs'
                        : 'border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-transparent'
                    )}>
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Multi-month recurring bulk generator callout */}
              {onOpenBulkModal && (
                <div className="max-w-3xl mx-auto p-4 rounded-2xl bg-[#008F83]/5 border border-[#008F83]/20 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#008F83]/10 text-[#008F83] flex items-center justify-center shrink-0 border border-[#008F83]/20">
                      <CalendarRange className="w-5 h-5" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white">Need to create multiple months at once?</h5>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Generate 1 to 24 months of scheduled invoices in a single bulk batch with automated due dates.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onClose();
                      onOpenBulkModal();
                    }}
                    className="text-xs font-bold border-[#008F83]/30 text-[#008F83] hover:bg-[#008F83]/10 shrink-0 whitespace-nowrap"
                  >
                    Bulk Multi-Month Generator <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════
              STEP 1: INVOICE INFORMATION & LINE ITEMS
             ═══════════════════════════════════════════════════════ */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Category Segmented Switcher */}
              <div className="space-y-1.5">
                <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Billing Category
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setInvoiceType('standalone')}
                    className={cn(
                      'h-11 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-150 border flex items-center justify-center gap-2',
                      invoiceType === 'standalone'
                        ? 'bg-[#008F83] text-white border-transparent shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#008F83]/40'
                    )}
                  >
                    <User className="w-4 h-4" />
                    Independent Client
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvoiceType('lease')}
                    className={cn(
                      'h-11 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-150 border flex items-center justify-center gap-2',
                      invoiceType === 'lease'
                        ? 'bg-[#008F83] text-white border-transparent shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#008F83]/40'
                    )}
                  >
                    <Building2 className="w-4 h-4" />
                    Tenancy Linked
                  </button>
                </div>
              </div>

              {/* Tenancy Context (if Lease-Linked) */}
              {invoiceType === 'lease' && (
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-4 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#008F83]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Target Tenancy & Lease Linkage
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                      label="Select Active Lease *"
                      value={selectedLeaseId}
                      onChange={(e) => handleLeaseSelect(e.target.value)}
                      className="bg-white dark:bg-slate-900"
                    >
                      <option value="">-- Choose active lease ({leases.length} available) --</option>
                      {leases.map((l) => {
                        const tenantRel = l.lease_tenants?.[0] || l.tenants?.[0];
                        const t = tenantRel?.tenant || tenantRel;
                        const tenantName = t ? `${t.first_name || ''} ${t.last_name || ''}`.trim() : '';
                        return (
                          <option key={l.id} value={l.id}>
                            {l.property?.name || 'Property'} {tenantName ? `(${tenantName})` : ''} • ${l.rent_amount} ({l.rent_frequency || 'monthly'})
                          </option>
                        );
                      })}
                    </Select>
                    <Select
                      label="Linked Property"
                      value={selectedPropertyId}
                      onChange={(e) => setSelectedPropertyId(e.target.value)}
                      className="bg-white dark:bg-slate-900"
                    >
                      <option value="">-- None (Standalone) --</option>
                      {properties.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name || p.address_line_1}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              )}

              {/* Recipient Details */}
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <User className="w-4 h-4 text-[#008F83]" />
                  Recipient (Bill To)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Recipient Name *"
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="e.g. John Smith / Acme Corp"
                    className="bg-white dark:bg-slate-900"
                  />
                  <Input
                    label="Recipient Email"
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="john.smith@tenant.com"
                    className="bg-white dark:bg-slate-900"
                  />
                  <Input
                    label="Recipient Phone"
                    type="text"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    placeholder="+61 400 000 000"
                    className="bg-white dark:bg-slate-900"
                  />
                  <Input
                    label="Billing Address"
                    type="text"
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    placeholder="Unit 12, 45 Oxford Street, Bondi Junction NSW 2022"
                    className="bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              {/* Schedule, Dates & Terms */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#008F83]" />
                    Invoice Dates & Currency
                  </span>
                  <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Timezone: <span className="font-semibold text-slate-700 dark:text-slate-300">Australia (AEST/AEDT)</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Invoice Number *"
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="bg-white dark:bg-slate-900 font-mono font-bold"
                  />
                  <Select
                    label="Billing Currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="bg-white dark:bg-slate-900 font-medium"
                  >
                    {Object.values(SUPPORTED_CURRENCIES).map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} — {c.name} ({c.symbol})
                      </option>
                    ))}
                  </Select>
                  <Input
                    label="Issue Date (AU) *"
                    type="date"
                    value={issueDate}
                    onChange={(e) => {
                      const newIssueDate = e.target.value;
                      setIssueDate(newIssueDate);
                      if (dueDate && newIssueDate > dueDate) {
                        setDueDate(newIssueDate);
                      }
                    }}
                    className="bg-white dark:bg-slate-900"
                  />
                  <Input
                    label="Due Date (AU) *"
                    type="date"
                    min={issueDate}
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="bg-white dark:bg-slate-900"
                  />
                </div>

                {/* Quick Payment Terms Pills */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Quick Terms:</span>
                  {[
                    { label: 'Net 7 Days', days: 7 },
                    { label: 'Net 14 Days', days: 14 },
                    { label: 'Net 30 Days', days: 30 },
                  ].map((term) => (
                    <button
                      key={term.days}
                      type="button"
                      onClick={() => handleSetTerms(term.days)}
                      className={cn(
                        'px-3 py-1 rounded-xl text-xs font-semibold border transition-all duration-150',
                        paymentTermsDays === term.days
                          ? 'bg-[#008F83] text-white border-[#008F83] shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#008F83]/40'
                      )}
                    >
                      {term.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Line Items Table */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#008F83]" />
                    Line Items
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#008F83]" /> Add Item
                  </button>
                </div>

                <div className="border border-slate-200 dark:border-slate-700/80 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wider">
                        <th className="p-3">Description</th>
                        <th className="p-3 w-20 text-center">Qty</th>
                        <th className="p-3 w-28 text-right">Unit Rate</th>
                        <th className="p-3 w-20 text-center">GST %</th>
                        <th className="p-3 w-28 text-right">Total</th>
                        <th className="p-3 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                      {items.map((item, idx) => {
                        const lineBase = Math.max(0, (item.quantity || 0) * (item.unitPrice || 0) - (item.discount || 0));
                        const lineTotal = lineBase * (1 + (item.taxRate || 0) / 100);
                        return (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="p-2.5">
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                                placeholder="Service description or item details..."
                                className="w-full h-10 px-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#008F83] focus:bg-white dark:focus:bg-slate-800 transition-colors"
                              />
                            </td>
                            <td className="p-2.5">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                                className="w-full h-10 px-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white text-center font-mono focus:outline-none focus:border-[#008F83] focus:bg-white dark:focus:bg-slate-800 transition-colors"
                              />
                            </td>
                            <td className="p-2.5">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.unitPrice}
                                onChange={(e) => handleItemChange(idx, 'unitPrice', Number(e.target.value))}
                                className="w-full h-10 px-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white text-right font-mono focus:outline-none focus:border-[#008F83] focus:bg-white dark:focus:bg-slate-800 transition-colors"
                              />
                            </td>
                            <td className="p-2.5">
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                max="100"
                                value={item.taxRate}
                                onChange={(e) => handleItemChange(idx, 'taxRate', Number(e.target.value))}
                                className="w-full h-10 px-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white text-center font-mono focus:outline-none focus:border-[#008F83] focus:bg-white dark:focus:bg-slate-800 transition-colors"
                              />
                            </td>
                            <td className="p-2.5 text-right font-bold text-slate-900 dark:text-white font-mono text-xs sm:text-sm">
                              {formatCurrency(lineTotal, currency)}
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                disabled={items.length <= 1}
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors disabled:opacity-20 disabled:pointer-events-none"
                                title="Remove line item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Calculation Summary Box */}
                <div className="flex justify-end pt-1">
                  <div className="w-full sm:w-72 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-500 dark:text-slate-400">
                      <span>Subtotal:</span>
                      <span className="text-slate-900 dark:text-white font-mono font-semibold">{formatCurrency(subtotal, currency)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500 dark:text-slate-400">
                      <span>Estimated Tax (GST):</span>
                      <span className="text-slate-900 dark:text-white font-mono font-semibold">{formatCurrency(taxTotal, currency)}</span>
                    </div>
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between items-center text-sm font-bold">
                      <span className="text-slate-900 dark:text-white">Invoice Total:</span>
                      <span className="text-[#008F83] font-mono text-base font-extrabold">{formatCurrency(grandTotal, currency)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes & Payment Remittance */}
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                  Terms & Payment Instructions
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Textarea
                    label="Special Terms / Notes (Publicly visible)"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Payment is due within 14 days of invoice date. Thank you for your business."
                    className="bg-white dark:bg-slate-900"
                  />
                  <Textarea
                    label="Payment Remittance Instructions"
                    rows={2}
                    value={paymentInstructions}
                    onChange={(e) => setPaymentInstructions(e.target.value)}
                    placeholder="e.g. Bank Transfer: BSB 012-345 | Account 6789 0123 (Property Ledge Trust)..."
                    className="bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              {/* Optional Collapsible Issuer Details */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditingIssuer(!isEditingIssuer)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#008F83]" />
                  <span>{isEditingIssuer ? 'Hide Issuer Profile Details' : 'Configure Issuer Business Profile (ABN & Identity)'}</span>
                  {isEditingIssuer ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                {isEditingIssuer && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-3 animate-in fade-in">
                    <Input
                      label="Business Name"
                      type="text"
                      placeholder="e.g. Property Ledge Management"
                      value={issuerName}
                      onChange={(e) => setIssuerName(e.target.value)}
                      className="bg-white dark:bg-slate-900 text-xs"
                    />
                    <Input
                      label="Business Email"
                      type="email"
                      placeholder="e.g. billing@example.com.au"
                      value={issuerEmail}
                      onChange={(e) => setIssuerEmail(e.target.value)}
                      className="bg-white dark:bg-slate-900 text-xs"
                    />
                    <Input
                      label="ABN / Tax ID"
                      type="text"
                      placeholder="e.g. ABN 51 824 753 556"
                      value={issuerTaxId}
                      onChange={(e) => setIssuerTaxId(e.target.value)}
                      className="bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════
              STEP 2: LIVE PREVIEW & DOWNLOAD / SEND
             ═══════════════════════════════════════════════════════ */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Step 3 — Review Live Invoice Preview</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Rendered using template <span className="font-bold text-[#008F83]">{selectedTemplate.name}</span>.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Change Template:</span>
                  <select
                    value={selectedTemplate.id}
                    onChange={(e) => {
                      const val = e.target.value;
                      const customMatch = customTemplates.find((ct) => ct.id === val);
                      if (customMatch) {
                        handleSelectCustomTemplate(customMatch);
                      } else {
                        setSelectedTemplate(getPredefinedTemplateById(val));
                      }
                    }}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <optgroup label="Canonical Presets">
                      {PREDEFINED_INVOICE_TEMPLATES.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.badge})
                        </option>
                      ))}
                    </optgroup>
                    {customTemplates.length > 0 && (
                      <optgroup label="Custom Blueprints">
                        {customTemplates.map((ct) => (
                          <option key={ct.id} value={ct.id}>
                            {ct.name} (Custom)
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  <button
                    type="button"
                    onClick={() => setIsTemplateBuilderOpen(true)}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold border border-[#008F83]/30 bg-[#008F83]/10 hover:bg-[#008F83]/20 text-[#008F83] flex items-center gap-1 transition-all cursor-pointer"
                    title="Create Custom Blueprint"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Blueprint</span>
                  </button>
                  <Link
                    href="/dashboard/invoices/templates"
                    className="px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-1 transition-all"
                    title="View & Edit All Templates"
                  >
                    <LayoutTemplate className="w-3.5 h-3.5 text-[#008F83]" />
                    <span>Templates</span>
                  </Link>
                </div>
              </div>

              {/* Test Email Sandbox Bar */}
              <div className="bg-[#008F83]/5 border border-[#008F83]/20 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#008F83]/15 text-[#008F83] flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      Send Test Email
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-[#008F83]/15 text-[#008F83] rounded-md">
                        Sandbox Safe
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Deliver a full preview with dynamic calculations to your test inbox before issuing.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    value={testRecipient}
                    onChange={(e) => setTestRecipient(e.target.value)}
                    placeholder="Enter test recipient email..."
                    className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#008F83] w-56"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSendTestEmail}
                    disabled={isSendingTest}
                    className="h-8 text-xs font-bold text-[#008F83] border-[#008F83]/30 hover:bg-[#008F83]/10"
                  >
                    {isSendingTest ? 'Sending...' : 'Send Test Email'}
                  </Button>
                </div>
              </div>

              {testSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{testSuccess}</span>
                </div>
              )}

              {/* Live A4 Renderer */}
              <LiveInvoiceRenderer
                data={{
                  invoiceNumber,
                  issueDate,
                  dueDate,
                  currency,
                  customerName: recipientName || 'Valued Recipient',
                  customerEmail: recipientEmail,
                  customerAddress: recipientAddress,
                  issuerName,
                  issuerEmail,
                  issuerPhone,
                  issuerAddress,
                  issuerTaxId,
                  items,
                  notes,
                  paymentInstructions,
                  layoutStyle: selectedTemplate.layoutStyle,
                  brandColor: selectedTemplate.brandColor,
                  accentColor: selectedTemplate.accentColor,
                  status: 'draft',
                }}
              />
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════
            FOOTER ACTIONS (Standardized Reference UI)
           ═══════════════════════════════════════════════════════ */}
        <div className="pt-5 mt-auto border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div>
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                disabled={loading}
                className="h-11 px-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs sm:text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-[#008F83]/30 disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="h-11 px-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-xs sm:text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#008F83]/30 disabled:opacity-50"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {step === 0 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="h-11 px-6 rounded-xl bg-[#008F83] text-white font-semibold text-xs sm:text-sm hover:bg-[#008F83]/90 shadow-xs transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#008F83]/30"
              >
                Continue to Invoice Details <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {step === 1 && (
              <>
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={loading}
                  className="h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs sm:text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#008F83]/30 disabled:opacity-50"
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (validateStep2()) setStep(2);
                  }}
                  className="h-11 px-6 rounded-xl bg-[#008F83] text-white font-semibold text-xs sm:text-sm hover:bg-[#008F83]/90 shadow-xs transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#008F83]/30"
                >
                  Preview Document <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={loading}
                  className="h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs sm:text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#008F83]/30 disabled:opacity-50"
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={handleIssueAndDownload}
                  disabled={loading}
                  className="h-11 px-6 rounded-xl bg-[#008F83] text-white font-semibold text-xs sm:text-sm hover:bg-[#008F83]/90 shadow-xs transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#008F83]/30 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" /> Issue & Download PDF
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Embedded Custom Template / Blueprint Builder Modal */}
      <InvoiceTemplateModal
        isOpen={isTemplateBuilderOpen}
        onClose={() => setIsTemplateBuilderOpen(false)}
        onSuccess={() => {
          setIsTemplateBuilderOpen(false);
          fetchInvoiceTemplatesAction().then((cTemplates: InvoiceTemplateDTO[]) => {
            if (Array.isArray(cTemplates)) {
              setCustomTemplates(cTemplates);
            }
          });
        }}
      />
    </div>
  );
}
