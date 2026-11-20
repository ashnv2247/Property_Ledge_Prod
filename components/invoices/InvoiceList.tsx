'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  DollarSign,
  RefreshCw,
  ArrowUpDown,
  AlertCircle,
  Eye,
  CheckCircle2,
  Clock,
  LayoutGrid,
  List,
  Building,
  User,
  ArrowUpRight,
  MoreHorizontal,
  CreditCard,
  Ban,
  Trash2,
  Edit3,
  LayoutTemplate,
  CalendarRange,
  MailClock,
  Calendar,
  Sparkles,
  FolderTree,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { ColDef } from 'ag-grid-community';
import { Button, useToast, ConfirmDialog } from '@/components/admin/ui';
import { AdminDataGrid, QuickFilterBar, QuickFilterOption, BulkAction } from '@/components/admin/data-grid';
import { ListPage, ListPageGrid } from '@/components/workspace';
import { HoverCardGrid, HoverEffectCardItem } from '@/components/ui/card-hover-effect';
import { PersonIdentity, DiceBearIcon } from '@/components/ui/avatar';
import { InvoiceDTO, CreateInvoiceDTO, UpdateInvoiceDTO } from '@/modules/invoices';
import { formatCurrency } from '@/modules/invoices/domain/value-objects/currency';
import {
  fetchInvoicesAction,
  fetchInvoiceByIdAction,
  createInvoiceAction,
  updateInvoiceAction,
  issueInvoiceAction,
  recordInvoicePaymentAction,
  cancelInvoiceAction,
  deleteDraftInvoiceAction,
  deleteInvoiceAction,
  getInvoiceDownloadUrlAction,
  sendInvoiceEmailAction,
} from '@/app/actions/invoices';
import dynamic from 'next/dynamic';
import { formatAuDisplayDate, formatAuDisplayDateTime } from '@/lib/format/australian-time';
import { cn } from '@/lib/utils';

const CreateInvoiceModal = dynamic(
  () => import('./CreateInvoiceModal').then((mod) => mod.CreateInvoiceModal),
  { ssr: false }
);
const InvoiceDetailModal = dynamic(
  () => import('./InvoiceDetailModal').then((mod) => mod.InvoiceDetailModal),
  { ssr: false }
);
const ScheduleEmailModal = dynamic(
  () => import('./ScheduleEmailModal').then((mod) => mod.ScheduleEmailModal),
  { ssr: false }
);
const ScheduleIndividualEmailModal = dynamic(
  () => import('./ScheduleIndividualEmailModal').then((mod) => mod.ScheduleIndividualEmailModal),
  { ssr: false }
);

import { useEntityCacheStore } from '@/lib/stores/useEntityCacheStore';
import { useWorkspaceStore } from '@/lib/stores/useWorkspaceStore';
import { usePropertyContext } from '@/components/property/PropertyContext';
import { usePersistentEntityQuery } from '@/lib/hooks/usePersistentEntityQuery';

export function InvoiceList({ initialInvoices }: { initialInvoices?: InvoiceDTO[] } = {}) {
  const router = useRouter();
  const { selectedProperty, availableProperties } = usePropertyContext();
  const activePropertyId = selectedProperty?.propertyId ?? null;
  const { toast } = useToast();
  const {
    data: invoices = [],
    isLoading: loading,
    isRefreshing,
    lastRefreshedAt,
    mutate: refreshInvoices,
    setData: setInvoices,
  } = usePersistentEntityQuery<InvoiceDTO[]>({
    entity: 'invoices',
    initialData: initialInvoices,
    freshnessTier: 'normal',
    fetcher: async () => {
      const res = await fetchInvoicesAction({
        limit: 150,
      });
      return (res.items || []) as InvoiceDTO[];
    },
  });

  const loadInvoices = useCallback(async (_isManualRefresh = false) => {
    await refreshInvoices();
  }, [refreshInvoices]);

  const [statusFilter, setStatusFilter] = useState('all');
  const [includeIndependent, setIncludeIndependent] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  type InvoiceGroupMode = 'scheduled' | 'none';
  const [groupMode, setGroupMode] = useState<InvoiceGroupMode>('scheduled');
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
  const [hasInitializedExpanded, setHasInitializedExpanded] = useState(false);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isScheduleEmailOpen, setIsScheduleEmailOpen] = useState(false);
  const [invoiceToSchedule, setInvoiceToSchedule] = useState<InvoiceDTO | null>(null);
  const [individualEmailInvoices, setIndividualEmailInvoices] = useState<InvoiceDTO[]>([]);
  const [invoiceToEdit, setInvoiceToEdit] = useState<InvoiceDTO | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDTO | null>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<InvoiceDTO | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const propertyMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of availableProperties) {
      map.set(p.propertyId, p.propertyName);
    }
    return map;
  }, [availableProperties]);

  const independentCount = useMemo(() => {
    return invoices.filter((inv) => !inv.propertyId).length;
  }, [invoices]);

  const filterOptions = useMemo<QuickFilterOption[]>(
    () => [
      { label: 'All', value: 'all' },
      { label: 'Draft', value: 'draft' },
      { label: 'Issued', value: 'issued' },
      { label: 'Partially Paid', value: 'partially_paid' },
      { label: 'Paid', value: 'paid' },
      { label: 'Overdue', value: 'overdue' },
      { label: 'Cancelled', value: 'cancelled' },
    ],
    []
  );

  // Filter invoices strictly by active property dropdown context, with independent leases/invoices option
  const scopedInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (activePropertyId) {
        const isForProperty = inv.propertyId === activePropertyId;
        const isIndependent = !inv.propertyId;
        return isForProperty || (includeIndependent && isIndependent);
      }
      return true;
    });
  }, [invoices, activePropertyId, includeIndependent]);

  const displayedInvoices = useMemo(() => {
    const list =
      statusFilter === 'all'
        ? scopedInvoices
        : scopedInvoices.filter((inv) => inv.status === statusFilter);

    return [...list].sort((a, b) => {
      const t1 = a.issueDate ? new Date(a.issueDate).getTime() : 0;
      const t2 = b.issueDate ? new Date(b.issueDate).getTime() : 0;
      if (t1 !== t2) return t1 - t2;
      return (a.invoiceNumber || '').localeCompare(b.invoiceNumber || '');
    });
  }, [scopedInvoices, statusFilter]);

  // KPIs strictly reflecting current property context and filters with transparent calculation derivations
  const stats = useMemo(() => {
    let totalOutstanding = 0;
    let totalInvoiced = 0;
    let overdueCount = 0;
    let overdueAmount = 0;
    let paidCount = 0;
    let activeCount = 0;

    for (const inv of scopedInvoices) {
      if (inv.status !== 'cancelled' && inv.status !== 'void') {
        activeCount++;
        totalInvoiced += inv.total;
        totalOutstanding += inv.balance;
      }
      const isPastDue = inv.balance > 0 && (inv.status === 'overdue' || new Date(inv.dueDate) < new Date());
      if (isPastDue) {
        overdueCount++;
        overdueAmount += inv.balance;
      }
      if (inv.status === 'paid' || (inv.balance === 0 && inv.total > 0)) {
        paidCount++;
      }
    }

    const totalCollected = Math.max(0, totalInvoiced - totalOutstanding);
    const collectionRate = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0;

    return {
      totalOutstanding,
      totalInvoiced,
      totalCollected,
      overdueCount,
      overdueAmount,
      paidCount,
      activeCount,
      totalCount: scopedInvoices.length,
      collectionRate,
    };
  }, [scopedInvoices]);

  // Actions
  const handleViewInvoice = async (invoice: InvoiceDTO) => {
    setSelectedInvoice(invoice);
    const detailedInvoice = await fetchInvoiceByIdAction(invoice.id);
    if (detailedInvoice) {
      setSelectedInvoice((current) => current?.id === invoice.id ? detailedInvoice : current);
    }
  };

  const handleEditInvoice = async (invoice: InvoiceDTO) => {
    const detailedInvoice = await fetchInvoiceByIdAction(invoice.id);
    setInvoiceToEdit(detailedInvoice || invoice);
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = async (
    dto: CreateInvoiceDTO,
    issueImmediately = false,
    emailOptions?: { subject?: string; customMessage?: string; driveFolderUrl?: string },
    downloadImmediately = false
  ) => {
    const res = await createInvoiceAction(dto);
    if (!res.success || !res.invoice) {
      throw new Error(res.error || 'Failed to create invoice');
    }

    if (issueImmediately) {
      if (emailOptions) {
        try {
          await sendInvoiceEmailAction(
            res.invoice.id,
            emailOptions.customMessage,
            emailOptions.driveFolderUrl,
            emailOptions.subject
          );
        } catch (emailErr: any) {
          console.warn('[InvoiceList] Email send warning:', emailErr);
        }
      }

      if (downloadImmediately) {
        try {
          await handleDownload(res.invoice.id, 'pdf');
        } catch (downloadErr: any) {
          console.warn('[InvoiceList] PDF download warning:', downloadErr);
        }
      }
    }

    toast({
      title: 'Invoice Created',
      description: `Invoice ${res.invoice.invoiceNumber} created ${issueImmediately ? 'and issued ' : ''}successfully.${downloadImmediately ? ' Downloading PDF...' : ''}`,
    });
    loadInvoices();
  };

  const handleIssueExisting = async (
    id: string,
    dto: UpdateInvoiceDTO,
    emailOptions?: { subject?: string; customMessage?: string; driveFolderUrl?: string },
    downloadImmediately = false
  ) => {
    const updateRes = await updateInvoiceAction(id, { ...dto, status: 'draft' });
    if (!updateRes.success) throw new Error(updateRes.error || 'Failed to save draft changes');

    const issueRes = await issueInvoiceAction(id);
    if (!issueRes.success) throw new Error(issueRes.error || 'Failed to issue invoice');

    if (emailOptions) {
      const emailRes = await sendInvoiceEmailAction(
        id,
        emailOptions.customMessage,
        emailOptions.driveFolderUrl,
        emailOptions.subject
      );
      if (!emailRes.success) throw new Error(emailRes.error || 'Invoice issued, but email delivery failed');
    }
    if (downloadImmediately) await handleDownload(id, 'pdf');

    toast({ title: 'Invoice Issued', description: `Invoice ${issueRes.invoice?.invoiceNumber || ''} was updated and issued without creating a duplicate.` });
    setInvoiceToEdit(null);
    await loadInvoices();
  };

  const handleUpdateSubmit = async (id: string, dto: UpdateInvoiceDTO) => {
    const res = await updateInvoiceAction(id, dto);
    if (!res.success || !res.invoice) {
      throw new Error(res.error || 'Failed to update invoice');
    }

    toast({
      title: 'Invoice Updated',
      description: `Invoice ${res.invoice.invoiceNumber} updated successfully.`,
    });
    setInvoiceToEdit(null);
    loadInvoices();
  };

  const handleIssue = async (id: string) => {
    const res = await issueInvoiceAction(id);
    if (!res.success) {
      toast({ title: 'Issue Failed', description: res.error, variant: 'destructive' });
      return;
    }
    toast({ title: 'Invoice Issued', description: 'Status updated to Issued.' });
    loadInvoices();
    if (selectedInvoice && selectedInvoice.id === id) {
      setSelectedInvoice(res.invoice || null);
    }
  };

  const handleRecordPayment = async (id: string, amount: number, method: string, reference?: string) => {
    const res = await recordInvoicePaymentAction(id, amount, method, reference);
    if (!res.success) {
      toast({ title: 'Payment Failed', description: res.error, variant: 'destructive' });
      return;
    }
    toast({ title: 'Payment Recorded', description: 'Invoice balance updated.' });
    loadInvoices();
    if (selectedInvoice && selectedInvoice.id === id) {
      setSelectedInvoice(res.invoice || null);
    }
  };

  const handleCancel = async (id: string, reason: string) => {
    const res = await cancelInvoiceAction(id, reason);
    if (!res.success) {
      toast({ title: 'Cancellation Failed', description: res.error, variant: 'destructive' });
      return;
    }
    toast({ title: 'Invoice Cancelled', description: 'Invoice marked as cancelled.' });
    loadInvoices();
    if (selectedInvoice && selectedInvoice.id === id) {
      setSelectedInvoice(res.invoice || null);
    }
  };

  const handleDeleteDraft = async (id: string) => {
    const res = await deleteDraftInvoiceAction(id);
    if (!res.success) {
      toast({ title: 'Delete Failed', description: res.error, variant: 'destructive' });
      return;
    }
    toast({ title: 'Draft Deleted', description: 'Draft invoice removed.' });
    setSelectedInvoice(null);
    loadInvoices();
  };

  const handleDeleteInvoice = async (id: string) => {
    setIsDeleting(true);
    try {
      const res = await deleteInvoiceAction(id);
      if (!res.success) {
        toast({ title: 'Delete Failed', description: res.error, variant: 'destructive' });
        return;
      }
      toast({ title: 'Invoice Deleted', description: 'Invoice permanently removed.' });
      if (selectedInvoice && selectedInvoice.id === id) {
        setSelectedInvoice(null);
      }
      setInvoiceToDelete(null);
      loadInvoices();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDeleteInvoices = async (selectedRows: InvoiceDTO[]) => {
    if (!selectedRows || selectedRows.length === 0) return;
    const realInvoices = selectedRows.filter((inv) => !(inv as any).isBatchHeader);
    if (realInvoices.length === 0) return;
    setIsDeleting(true);
    try {
      let successCount = 0;
      let failCount = 0;

      for (const inv of realInvoices) {
        const res = await deleteInvoiceAction(inv.id);
        if (res.success) {
          successCount++;
        } else {
          failCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: 'Bulk Delete Completed',
          description: `Successfully deleted ${successCount} invoice(s)${failCount > 0 ? `, ${failCount} failed` : ''}.`,
        });
      } else {
        toast({
          title: 'Bulk Delete Failed',
          description: 'Failed to delete selected invoices.',
          variant: 'destructive',
        });
      }
      loadInvoices();
    } finally {
      setIsDeleting(false);
    }
  };

  const bulkActions = useMemo<BulkAction[]>(
    () => [
      {
        label: 'Schedule Individual Email',
        icon: <MailClock className="w-3.5 h-3.5 text-[#008F83]" />,
        onClick: (selectedRows: InvoiceDTO[]) => {
          const valid = (selectedRows || []).filter((inv) => !(inv as any).isBatchHeader);
          if (valid.length === 0) return;
          if (valid.length > 20) {
            toast({ title: 'Too many invoices selected', description: 'Schedule up to 20 invoices at once.', variant: 'destructive' });
            return;
          }
          setIndividualEmailInvoices(valid);
        },
      },
      {
        label: 'Issue Selected Invoices',
        onClick: async (selectedRows: InvoiceDTO[]) => {
          const drafts = (selectedRows || []).filter((inv) => !(inv as any).isBatchHeader && inv.status === 'draft');
          if (drafts.length === 0) {
            toast({
              title: 'No Draft Invoices Selected',
              description: 'Only draft invoices can be issued.',
              variant: 'destructive',
            });
            return;
          }
          let count = 0;
          for (const inv of drafts) {
            const res = await issueInvoiceAction(inv.id);
            if (res.success) count++;
          }
          toast({
            title: 'Invoices Issued',
            description: `Successfully issued ${count} draft invoice(s).`,
          });
          loadInvoices();
        },
      },
    ],
    []
  );

  const handleDownload = async (id: string, format: 'pdf' | 'docx') => {
    try {
      const targetUrl = format === 'pdf' ? `/api/invoices/${id}/pdf?download=1` : `/api/invoices/${id}/docx`;
      const response = await fetch(targetUrl, {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || `Failed to generate ${format.toUpperCase()} document`);
      }

      const contentType = response.headers.get('content-type') || '';
      const expectedContentType = format === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      if (!contentType.toLowerCase().includes(expectedContentType)) {
        throw new Error(`The server returned an invalid ${format.toUpperCase()} document`);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const disposition = response.headers.get('content-disposition') || '';
      const filenameMatch = disposition.match(/filename="?([^";]+)"?/i);

      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filenameMatch?.[1] || `Invoice-${id}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);

      toast({
        title: 'Invoice Downloaded',
        description: `Your ${format.toUpperCase()} invoice document has been generated and downloaded.`,
      });
    } catch (err: any) {
      toast({
        title: 'Download Error',
        description: err?.message || 'Failed to download invoice document',
        variant: 'destructive',
      });
    }
  };

  const handleSendEmail = async (id: string, customMessage?: string, driveFolderUrl?: string) => {
    const res = await sendInvoiceEmailAction(id, customMessage, driveFolderUrl);
    if (!res.success) {
      toast({ title: 'Email Failed', description: res.error, variant: 'destructive' });
      return;
    }
    toast({ title: 'Email Sent', description: 'Invoice delivered via email.' });
    loadInvoices();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'partially_paid':
        return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20';
      case 'issued':
      case 'viewed':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'overdue':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      case 'cancelled':
      case 'void':
        return 'bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-500/20';
      case 'draft':
      default:
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    }
  };

  // Helper to determine if an invoice was bulk generated / part of a recurring schedule
  const isScheduledBulkInvoice = useCallback((data: InvoiceDTO): boolean => {
    if (!data) return false;
    if (data.automationId) return true;
    const s = data.snapshot as any;
    if (s?.isBulkGenerated || s?.isScheduled || s?.bulkBatchId) return true;
    if (data.notes?.toLowerCase().includes('scheduled invoice')) return true;
    if ((data as any).description?.toLowerCase().includes('rent invoice month')) return true;
    if (data.billingPeriodStart && data.billingPeriodEnd) {
      if (
        data.items?.some(
          (i) =>
            i.description?.includes(' — ') ||
            i.description?.toLowerCase().includes('monthly') ||
            i.description?.toLowerCase().includes('rent')
        )
      ) {
        return true;
      }
    }
    return false;
  }, []);

  interface ScheduledBatchGroup {
    batchKey: string;
    batchLabel: string;
    invoices: InvoiceDTO[];
    total: number;
    balance: number;
    propertyId?: string | null;
    customerName?: string | null;
    customerEmail?: string | null;
    tenantId?: string | null;
    earliestIssueDate?: string | null;
    latestDueDate?: string | null;
  }

  // Pure Community Grouping: ONLY scheduled bulk-generated invoices are grouped!
  const scheduledBatches = useMemo<ScheduledBatchGroup[]>(() => {
    const batchesMap = new Map<string, ScheduledBatchGroup>();

    for (const inv of displayedInvoices) {
      if (!isScheduledBulkInvoice(inv)) continue;
      const s = inv.snapshot as any;
      const propName = inv.propertyId ? propertyMap.get(inv.propertyId) || 'Linked Property' : '';
      const recipientName = inv.recipient?.name || inv.customerName || '';

      let key = '';
      let label = '';

      if (s?.bulkBatchId) {
        key = `batch-${s.bulkBatchId}`;
        label = s.bulkBatchLabel || (propName ? `${propName} · Scheduled Rent` : 'Scheduled Multi-Month Rent');
      } else if (inv.automationId) {
        key = `auto-${inv.automationId}`;
        label = `Automated Rent Schedule · ${propName || recipientName || 'Monthly'}`;
      } else if (inv.propertyId) {
        key = `prop-sched-${inv.propertyId}-${inv.tenantId || recipientName || 'tenant'}`;
        label = recipientName ? `${propName} · ${recipientName}` : `${propName} · Scheduled Rent`;
      } else {
        key = `sched-${recipientName || 'bulk'}`;
        label = recipientName ? `Scheduled Series · ${recipientName}` : 'Scheduled Multi-Month Rent';
      }

      let group = batchesMap.get(key);
      if (!group) {
        group = {
          batchKey: key,
          batchLabel: label,
          invoices: [],
          total: 0,
          balance: 0,
          propertyId: inv.propertyId,
          customerName: recipientName,
          customerEmail: inv.recipient?.email || inv.customerEmail,
          tenantId: inv.tenantId,
          earliestIssueDate: inv.issueDate,
          latestDueDate: inv.dueDate,
        };
        batchesMap.set(key, group);
      }
      group.invoices.push(inv);
      group.total += inv.total;
      group.balance += inv.balance;
    }

    return Array.from(batchesMap.values());
  }, [displayedInvoices, isScheduledBulkInvoice, propertyMap]);

  // Batch toggling controls for pure AG Grid Community hierarchical expandable batches
  const toggleBatch = useCallback((batchKey: string) => {
    setExpandedBatches((prev) => {
      const next = new Set(prev);
      if (next.has(batchKey)) {
        next.delete(batchKey);
      } else {
        next.add(batchKey);
      }
      return next;
    });
  }, []);

  const expandAllBatches = useCallback(() => {
    const allKeys = new Set<string>();
    for (const batch of scheduledBatches) {
      allKeys.add(batch.batchKey);
    }
    setExpandedBatches(allKeys);
  }, [scheduledBatches]);

  const collapseAllBatches = useCallback(() => {
    setExpandedBatches(new Set());
  }, []);

  // Expand batches by default on first discovery
  useEffect(() => {
    if (scheduledBatches.length > 0 && !hasInitializedExpanded) {
      setExpandedBatches(new Set(scheduledBatches.map((b) => b.batchKey)));
      setHasInitializedExpanded(true);
    }
  }, [scheduledBatches, hasInitializedExpanded]);

  // Construct pure Community row data: expandable batches followed by standalone invoices
  const gridRowData = useMemo(() => {
    if (groupMode === 'none') {
      return displayedInvoices.map((inv) => ({
        ...inv,
        isBatchHeader: false,
        isBatchChild: false,
      }));
    }

    const rows: any[] = [];
    const processedInvoices = new Set<string>();

    for (const batch of scheduledBatches) {
      const isExpanded = expandedBatches.has(batch.batchKey);
      rows.push({
        isBatchHeader: true,
        isBatchChild: false,
        id: `batch-${batch.batchKey}`,
        invoiceNumber: batch.batchLabel,
        batchKey: batch.batchKey,
        batchTitle: batch.batchLabel,
        batchCount: batch.invoices.length,
        invoices: batch.invoices,
        total: batch.total,
        balance: batch.balance,
        propertyId: batch.propertyId,
        customerName: batch.customerName,
        customerEmail: batch.customerEmail,
        tenantId: batch.tenantId,
        recipient: { name: batch.customerName, email: batch.customerEmail },
        issueDate: batch.earliestIssueDate,
        dueDate: batch.latestDueDate,
        status: 'scheduled_batch',
        isExpanded,
      });

      for (const inv of batch.invoices) {
        processedInvoices.add(inv.id);
        if (isExpanded) {
          rows.push({
            ...inv,
            isBatchHeader: false,
            isBatchChild: true,
            batchKey: batch.batchKey,
          });
        }
      }
    }

    // Add standalone / non-bulk invoices as root rows
    for (const inv of displayedInvoices) {
      if (!processedInvoices.has(inv.id)) {
        rows.push({
          ...inv,
          isBatchHeader: false,
          isBatchChild: false,
        });
      }
    }

    return rows;
  }, [groupMode, displayedInvoices, scheduledBatches, expandedBatches]);

  // AG Grid Free Community columns definition with spacious widths to eliminate header truncation
  const agGridColumns: ColDef[] = useMemo(
    () => [
      {
        headerName: 'Invoice # / Scheduled Batch',
        field: 'invoiceNumber',
        width: 280,
        minWidth: 260,
        cellRenderer: (params: any) => {
          const row = params.data;
          if (!row) return null;

          if (row.isBatchHeader) {
            const isExp = row.isExpanded;
            return (
              <div
                className="flex items-center gap-2 py-1 select-none cursor-pointer w-full group"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleBatch(row.batchKey);
                }}
              >
                <button
                  type="button"
                  className="w-5 h-5 rounded hover:bg-[#008F83]/15 flex items-center justify-center text-slate-500 hover:text-[#008F83] transition-colors shrink-0"
                  aria-label={isExp ? 'Collapse batch' : 'Expand batch'}
                >
                  {isExp ? (
                    <ChevronDown className="w-4 h-4 text-[#008F83]" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#008F83]" />
                  )}
                </button>
                <div className="w-6 h-6 rounded-md bg-[#008F83]/10 text-[#008F83] border border-[#008F83]/20 flex items-center justify-center shrink-0">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-bold text-xs text-admin-foreground truncate" title={row.batchTitle}>
                    {row.batchTitle}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#008F83]/10 text-[#008F83] border border-[#008F83]/20 shrink-0">
                    {row.batchCount} mo
                  </span>
                </div>
              </div>
            );
          }

          if (row.isBatchChild) {
            return (
              <div className="flex items-center gap-2 py-1 pl-6">
                <span className="w-2 h-2 border-l-2 border-b-2 border-slate-300 dark:border-slate-600 rounded-bl shrink-0 -ml-3" />
                <div className="w-6 h-6 rounded-md bg-admin-primary/10 text-admin-primary flex items-center justify-center shrink-0">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <span className="font-mono font-bold text-admin-foreground text-xs">{row.invoiceNumber}</span>
                <span className="text-[9.5px] font-semibold px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                  Monthly
                </span>
              </div>
            );
          }

          // Standalone root invoice
          return (
            <div className="flex items-center gap-2 py-1">
              <div className="w-6 h-6 rounded-md bg-admin-primary/10 text-admin-primary flex items-center justify-center shrink-0">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <span className="font-mono font-bold text-admin-foreground text-xs">{row.invoiceNumber}</span>
            </div>
          );
        },
      },
      {
        headerName: 'Recipient / Bill To',
        flex: 1.3,
        minWidth: 200,
        valueGetter: (p) => p.data?.recipient?.name || p.data?.customerName || 'Customer',
        cellRenderer: (params: any) => {
          const row = params.data;
          if (!row) return null;
          const name = row.recipient?.name || row.customerName || 'Customer';
          const email = row.recipient?.email || row.customerEmail || undefined;
          return (
            <PersonIdentity
              seed={row.tenantId || email || name}
              name={name}
              subtitle={email}
              size="sm"
            />
          );
        },
      },
      {
        headerName: 'Property / Context',
        flex: 1,
        minWidth: 190,
        cellRenderer: (params: any) => {
          const row = params.data;
          if (!row) return null;
          const propName = row.propertyId ? propertyMap.get(row.propertyId) : null;
          if (propName) {
            return (
              <div className="flex items-center gap-1.5 py-1 min-w-0">
                <Building className="w-3.5 h-3.5 text-admin-primary shrink-0" />
                <span className="text-xs text-admin-foreground font-semibold truncate" title={propName}>
                  {propName}
                </span>
              </div>
            );
          }
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              <User className="w-3 h-3 text-slate-400" /> Independent
            </span>
          );
        },
      },
      {
        headerName: 'Issue Date',
        field: 'issueDate',
        width: 140,
        minWidth: 130,
        sort: 'asc',
        comparator: (d1: string, d2: string) => {
          const t1 = d1 ? new Date(d1).getTime() : 0;
          const t2 = d2 ? new Date(d2).getTime() : 0;
          return t1 - t2;
        },
        cellRenderer: (params: any) => {
          const row = params.data;
          if (!row) return null;
          if (row.isBatchHeader) {
            return (
              <span className="text-xs text-admin-muted font-bold">
                {row.issueDate ? formatAuDisplayDate(row.issueDate) : '—'}
              </span>
            );
          }
          return (
            <span className="text-xs text-admin-muted font-medium">
              {formatAuDisplayDate(row.issueDate)}
            </span>
          );
        },
      },
      {
        headerName: 'Due Date',
        field: 'dueDate',
        width: 140,
        minWidth: 130,
        comparator: (d1: string, d2: string) => {
          const t1 = d1 ? new Date(d1).getTime() : 0;
          const t2 = d2 ? new Date(d2).getTime() : 0;
          return t1 - t2;
        },
        cellRenderer: (params: any) => {
          const row = params.data;
          if (!row) return null;
          if (row.isBatchHeader) {
            return (
              <span className="text-xs text-admin-foreground font-bold">
                {row.dueDate ? formatAuDisplayDate(row.dueDate) : '—'}
              </span>
            );
          }
          const isOverdue = row.status === 'overdue' || (row.balance > 0 && new Date(row.dueDate) < new Date());
          return (
            <span className={cn('text-xs font-medium', isOverdue && row.balance > 0 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-admin-foreground')}>
              {formatAuDisplayDate(row.dueDate)}
            </span>
          );
        },
      },
      {
        headerName: 'Total Amount',
        field: 'total',
        width: 155,
        minWidth: 145,
        cellRenderer: (params: any) => {
          const row = params.data;
          if (!row) return null;
          if (row.isBatchHeader) {
            return (
              <div className="flex items-center gap-1 py-1 font-black text-xs text-admin-primary">
                <span>{formatCurrency(row.total)}</span>
                <span className="text-[10px] font-normal opacity-70">(batch total)</span>
              </div>
            );
          }
          return (
            <span className="font-bold text-admin-foreground text-xs">
              {formatCurrency(row.total, row.currency)}
            </span>
          );
        },
      },
      {
        headerName: 'Balance Due',
        field: 'balance',
        width: 155,
        minWidth: 145,
        cellRenderer: (params: any) => {
          const row = params.data;
          if (!row) return null;
          if (row.isBatchHeader) {
            return (
              <div className={cn('flex items-center gap-1 py-1 font-black text-xs', row.balance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400')}>
                <span>{formatCurrency(row.balance)}</span>
                <span className="text-[10px] font-normal opacity-70">(balance)</span>
              </div>
            );
          }
          return (
            <span className={cn('font-bold text-xs', row.balance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400')}>
              {formatCurrency(row.balance, row.currency)}
            </span>
          );
        },
      },
      {
        headerName: 'Status',
        field: 'status',
        width: 135,
        minWidth: 125,
        cellRenderer: (params: any) => {
          const row = params.data;
          if (!row) return null;
          if (row.isBatchHeader) {
            return (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#008F83]/10 text-[#008F83] border border-[#008F83]/20">
                Scheduled Batch
              </span>
            );
          }
          const status = row.status;
          return (
            <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border capitalize', getStatusBadge(status))}>
              {status ? status.replace('_', ' ') : 'Draft'}
            </span>
          );
        },
      },
      {
        headerName: 'Actions',
        colId: 'actions',
        width: 180,
        minWidth: 170,
        pinned: 'right',
        sortable: false,
        filter: false,
        cellRenderer: (params: any) => {
          const row = params.data;
          if (!row) return null;
          if (row.isBatchHeader) {
            return (
              <div className="flex items-center gap-1.5 py-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleBatch(row.batchKey);
                  }}
                  className="px-2.5 py-1 text-xs font-bold text-[#008F83] hover:bg-[#008F83]/10 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  {row.isExpanded ? (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" /> Collapse
                    </>
                  ) : (
                    <>
                      <ChevronRight className="w-3.5 h-3.5" /> Expand
                    </>
                  )}
                </button>
              </div>
            );
          }

          const canEdit = row.status !== 'paid' && row.status !== 'cancelled' && row.status !== 'void';
          return (
            <div className="flex items-center gap-1 py-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  void handleViewInvoice(row);
                }}
                className="px-2 py-1 text-admin-primary hover:bg-admin-primary/10 rounded transition-colors inline-flex items-center gap-1 font-bold text-xs"
                title="View Invoice"
              >
                <Eye className="w-3.5 h-3.5" /> View
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setInvoiceToSchedule(row);
                  setIsScheduleEmailOpen(true);
                }}
                className="p-1 text-admin-muted hover:text-[#008F83] hover:bg-[#008F83]/10 rounded transition-colors"
                title="Bulk Generate"
              >
                <CalendarRange className="w-3.5 h-3.5 text-[#008F83]" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIndividualEmailInvoices([row]);
                }}
                className="p-1 text-admin-muted hover:text-[#008F83] hover:bg-[#008F83]/10 rounded transition-colors"
                title="Schedule Individual Email"
              >
                <MailClock className="w-3.5 h-3.5 text-[#008F83]" />
              </button>
              {canEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleEditInvoice(row);
                  }}
                  className="p-1 text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-subtle rounded transition-colors"
                  title="Edit Invoice"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload(row.id, 'pdf');
                }}
                className="p-1 text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-subtle rounded transition-colors"
                title="Download PDF"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setInvoiceToDelete(row);
                }}
                className="p-1 text-admin-muted hover:text-rose-500 hover:bg-rose-500/10 rounded transition-colors"
                title="Delete Invoice"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        },
      },
    ],
    [propertyMap, toggleBatch]
  );

  return (
    <ListPage
      title="Invoices & Billing"
      description={
        selectedProperty
          ? `Showing invoices for ${selectedProperty.propertyName}.`
          : 'Manage customer billing, automated recurring rent invoices, PDF documents, and payment tracking.'
      }
      breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Invoices' }]}
      actions={
        <div className="flex items-center gap-2">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-admin-surface-subtle border border-admin-border p-0.5 rounded-xl">
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'p-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5',
                viewMode === 'table'
                  ? 'bg-admin-surface text-admin-foreground shadow-xs'
                  : 'text-admin-muted hover:text-admin-foreground'
              )}
              title="Table View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5',
                viewMode === 'grid'
                  ? 'bg-admin-surface text-admin-foreground shadow-xs'
                  : 'text-admin-muted hover:text-admin-foreground'
              )}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>

          <Link href="/dashboard/invoices/schedule-email">
            <Button
              variant="outline"
              size="sm"
              className="font-bold border-admin-border hover:bg-admin-surface-subtle text-admin-foreground text-xs flex items-center gap-1.5"
            >
              <CalendarRange className="w-3.5 h-3.5 text-[#008F83]" />
              Bulk Generate
            </Button>
          </Link>

          <Link href="/dashboard/invoices/templates">
            <Button
              variant="outline"
              size="sm"
              className="font-bold border-admin-border hover:bg-admin-surface-subtle text-admin-foreground text-xs flex items-center gap-1.5"
            >
              <LayoutTemplate className="w-3.5 h-3.5 text-[#008F83]" />
              Templates
            </Button>
          </Link>

          <Button
            onClick={() => {
              setInvoiceToEdit(null);
              setIsCreateOpen(true);
            }}
            size="sm"
            className="font-bold shadow-xs bg-admin-primary hover:bg-admin-primary/90 text-white text-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Invoice
          </Button>
        </div>
      }
      summary={
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Outstanding Balance */}
          <div className="bg-admin-surface border border-admin-border rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                <Clock className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-admin-muted uppercase tracking-wider">Outstanding Balance</p>
                <h3 className="text-lg font-black text-admin-foreground truncate mt-0.5">
                  {loading ? (
                    <span className="inline-block h-5 w-20 rounded skeleton-shimmer align-middle" />
                  ) : (
                    formatCurrency(stats.totalOutstanding, 'AUD')
                  )}
                </h3>
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-admin-border/60 text-[10.5px] text-slate-500 dark:text-slate-400 leading-snug">
              <span className="font-semibold text-amber-600 dark:text-amber-400">Calculation: </span>
              <span>Total Invoiced ({formatCurrency(stats.totalInvoiced, 'AUD')}) − Collected ({formatCurrency(stats.totalCollected, 'AUD')})</span>
            </div>
          </div>

          {/* 2. Total Invoiced */}
          <div className="bg-admin-surface border border-admin-border rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
                <DollarSign className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-admin-muted uppercase tracking-wider">Total Invoiced</p>
                <h3 className="text-lg font-black text-admin-foreground truncate mt-0.5">
                  {loading ? (
                    <span className="inline-block h-5 w-20 rounded skeleton-shimmer align-middle" />
                  ) : (
                    formatCurrency(stats.totalInvoiced, 'AUD')
                  )}
                </h3>
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-admin-border/60 text-[10.5px] text-slate-500 dark:text-slate-400 leading-snug">
              <span className="font-semibold text-blue-600 dark:text-blue-400">Calculation: </span>
              <span>Σ Line items + GST across {stats.activeCount} active invoices (excl. void/cancelled)</span>
            </div>
          </div>

          {/* 3. Paid Invoices */}
          <div className="bg-admin-surface border border-admin-border rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-admin-muted uppercase tracking-wider">Paid Invoices</p>
                <h3 className="text-lg font-black text-emerald-600 dark:text-emerald-400 truncate mt-0.5">
                  {loading ? (
                    <span className="inline-block h-5 w-12 rounded skeleton-shimmer align-middle" />
                  ) : (
                    stats.paidCount
                  )}
                </h3>
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-admin-border/60 text-[10.5px] text-slate-500 dark:text-slate-400 leading-snug">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Calculation: </span>
              <span>{stats.paidCount} of {stats.activeCount} invoices settled with $0 balance ({stats.collectionRate}% collected)</span>
            </div>
          </div>

          {/* 4. Overdue Invoices */}
          <div className="bg-admin-surface border border-admin-border rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/20">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-admin-muted uppercase tracking-wider">Overdue Invoices</p>
                <h3 className="text-lg font-black text-rose-600 dark:text-rose-400 truncate mt-0.5">
                  {loading ? (
                    <span className="inline-block h-5 w-12 rounded skeleton-shimmer align-middle" />
                  ) : (
                    stats.overdueCount
                  )}
                </h3>
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-admin-border/60 text-[10.5px] text-slate-500 dark:text-slate-400 leading-snug">
              <span className="font-semibold text-rose-600 dark:text-rose-400">Calculation: </span>
              <span>Invoices with Due Date &lt; Today &amp; balance &gt; $0 ({formatCurrency(stats.overdueAmount, 'AUD')} past due)</span>
            </div>
          </div>
        </div>
      }
    >
      <div className="flex-1 flex flex-col min-h-0 h-full space-y-4">
        {!loading && displayedInvoices.length === 0 && statusFilter === 'all' ? (
          <div className="py-20 px-6 text-center bg-admin-surface rounded-2xl border border-admin-border shadow-xs flex-1 flex flex-col items-center justify-center min-h-[300px]">
            <div className="w-14 h-14 bg-admin-surface-subtle rounded-full flex items-center justify-center mx-auto mb-4 text-admin-muted border border-admin-border">
              <FileText className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black text-admin-foreground mb-1">
              {selectedProperty ? `No invoices for ${selectedProperty.propertyName}` : 'No invoices yet'}
            </h3>
            <p className="text-xs text-admin-muted max-w-sm mx-auto mb-5 font-medium">
              {selectedProperty
                ? 'Create an invoice for this property, or toggle "Include Independent Leases" to see unlinked billing.'
                : 'Create your first standalone invoice or manage automated invoices through the Automations tab.'}
            </p>
            <div className="flex items-center gap-2">
              <Button onClick={() => setIsCreateOpen(true)} className="font-bold">
                <Plus className="w-4 h-4 mr-1.5" /> Create Invoice
              </Button>
            </div>
          </div>
        ) : viewMode === 'table' ? (
          <ListPageGrid>
            <AdminDataGrid
              gridId="invoices-grid"
              rowData={gridRowData}
              columnDefs={agGridColumns}
              loading={loading}
              onRefresh={() => loadInvoices(true)}
              isRefreshing={isRefreshing}
              lastRefreshedAt={lastRefreshedAt}
              labelSingular="invoice"
              labelPlural="invoices"
              enableSelection={true}
              onDeleteSelected={handleBulkDeleteInvoices}
              bulkActions={bulkActions}
              onRowClick={(row: any) => {
                if (row?.isBatchHeader) {
                  toggleBatch(row.batchKey);
                  return;
                }
                void handleViewInvoice(row);
              }}
              getRowId={(p) => p.data.id}
              enableColumnChooser
              enableExport
              exportFilename="invoices-export"
              searchPlaceholder="Search invoices by number or customer..."
              leftToolbarContent={
                <QuickFilterBar
                  options={filterOptions}
                  activeValue={statusFilter}
                  onChange={(val) => setStatusFilter(val as string)}
                />
              }
              searchExtraContent={
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Scheduled Batches vs Flat View Toggle */}
                  <div className="flex items-center p-0.5 rounded-xl bg-admin-surface-subtle border border-admin-border text-xs">
                    <button
                      type="button"
                      onClick={() => setGroupMode('scheduled')}
                      className={cn(
                        'px-2.5 py-1 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer',
                        groupMode === 'scheduled'
                          ? 'bg-[#008F83] text-white shadow-2xs'
                          : 'text-admin-muted hover:text-admin-foreground hover:bg-admin-surface'
                      )}
                      title="Group bulk-generated scheduled invoices"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Scheduled Batches</span>
                      {scheduledBatches.length > 0 && (
                        <span
                          className={cn(
                            'text-[10px] px-1.5 py-0.2 rounded-full font-black',
                            groupMode === 'scheduled' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          )}
                        >
                          {scheduledBatches.length}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setGroupMode('none')}
                      className={cn(
                        'px-2.5 py-1 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer',
                        groupMode === 'none'
                          ? 'bg-[#008F83] text-white shadow-2xs'
                          : 'text-admin-muted hover:text-admin-foreground hover:bg-admin-surface'
                      )}
                      title="Flat list of all invoices"
                    >
                      <List className="w-3.5 h-3.5" />
                      <span>Flat View</span>
                    </button>
                  </div>

                  {/* Expand / Collapse All buttons when in scheduled mode and batches exist */}
                  {groupMode === 'scheduled' && scheduledBatches.length > 0 && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={expandAllBatches}
                        className="px-2 py-1 rounded-lg border border-admin-border bg-admin-surface hover:bg-admin-surface-subtle text-[11px] font-bold text-admin-muted hover:text-[#008F83] transition-colors cursor-pointer"
                        title="Expand all scheduled batches"
                      >
                        Expand All
                      </button>
                      <button
                        type="button"
                        onClick={collapseAllBatches}
                        className="px-2 py-1 rounded-lg border border-admin-border bg-admin-surface hover:bg-admin-surface-subtle text-[11px] font-bold text-admin-muted hover:text-admin-foreground transition-colors cursor-pointer"
                        title="Collapse all scheduled batches"
                      >
                        Collapse All
                      </button>
                    </div>
                  )}

                  <div className="h-4 w-px bg-admin-border hidden sm:block" />

                  {/* Include Independent Leases Checkbox */}
                  <label
                    className={cn(
                      'flex items-center gap-2 cursor-pointer select-none text-xs font-semibold px-2.5 py-1.5 rounded-xl border transition-all shadow-2xs',
                      includeIndependent
                        ? 'bg-[#008F83]/10 border-[#008F83]/30 text-[#008F83]'
                        : 'bg-admin-surface border-admin-border text-admin-foreground hover:bg-admin-surface-subtle'
                    )}
                    title="Toggle independent / standalone invoices without a linked property"
                  >
                    <input
                      type="checkbox"
                      checked={includeIndependent}
                      onChange={(e) => setIncludeIndependent(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-[#008F83] focus:ring-[#008F83] accent-[#008F83] cursor-pointer"
                    />
                    <span className="whitespace-nowrap">Include Independent Leases</span>
                    {independentCount > 0 && (
                      <span
                        className={cn(
                          'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                          includeIndependent ? 'bg-[#008F83] text-white' : 'bg-admin-surface-subtle text-admin-muted'
                        )}
                      >
                        {independentCount}
                      </span>
                    )}
                  </label>
                </div>
              }
              gridOptions={{
                getRowClass: (params) => {
                  if (params.data?.isBatchHeader) return 'ag-row-batch-header';
                  if (params.data?.isBatchChild) return 'ag-row-batch-child';
                  return '';
                },
              }}
              isRowSelectable={(node) => !(node.data as any)?.isBatchHeader}
              disablePagination={true}
            />
          </ListPageGrid>
        ) : loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto flex-1 p-1">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-admin-surface border border-admin-border rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-4 skeleton-shimmer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="h-4 rounded skeleton-shimmer w-28" />
                    <div className="h-3 rounded skeleton-shimmer w-36" />
                  </div>
                  <div className="h-5 w-16 rounded skeleton-shimmer" />
                </div>
                <div className="h-px w-full bg-admin-border/60" />
                <div className="space-y-2 flex-1">
                  <div className="h-3 rounded skeleton-shimmer w-24" />
                  <div className="h-5 rounded skeleton-shimmer w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 space-y-3">
            {/* Grid View Controls */}
            <div className="flex items-center justify-between gap-3 flex-wrap bg-admin-surface p-2.5 rounded-2xl border border-admin-border shadow-xs">
              <QuickFilterBar
                options={filterOptions}
                activeValue={statusFilter}
                onChange={(val) => setStatusFilter(val as string)}
              />

              <label
                className={cn(
                  'flex items-center gap-2 cursor-pointer select-none text-xs font-semibold px-2.5 py-1.5 rounded-xl border transition-all shadow-2xs',
                  includeIndependent
                    ? 'bg-[#008F83]/10 border-[#008F83]/30 text-[#008F83]'
                    : 'bg-admin-surface border-admin-border text-admin-foreground hover:bg-admin-surface-subtle'
                )}
                title="Toggle independent / standalone invoices without a linked property"
              >
                <input
                  type="checkbox"
                  checked={includeIndependent}
                  onChange={(e) => setIncludeIndependent(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-[#008F83] focus:ring-[#008F83] accent-[#008F83] cursor-pointer"
                />
                <span className="whitespace-nowrap">Include Independent Leases</span>
                {independentCount > 0 && (
                  <span
                    className={cn(
                      'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                      includeIndependent ? 'bg-[#008F83] text-white' : 'bg-admin-surface-subtle text-admin-muted'
                    )}
                  >
                    {independentCount}
                  </span>
                )}
              </label>
            </div>

            <HoverCardGrid className="overflow-y-auto flex-1 p-1">
              {displayedInvoices.map((inv) => {
                const name = inv.recipient?.name || inv.customerName || 'Customer';
                const email = inv.recipient?.email || inv.customerEmail || '';
                const isOverdue = inv.status === 'overdue' || (inv.balance > 0 && new Date(inv.dueDate) < new Date());
                const propName = inv.propertyId ? propertyMap.get(inv.propertyId) : null;

                return (
                  <HoverEffectCardItem
                    key={inv.id}
                    onClick={() => setSelectedInvoice(inv)}
                    className="group/card cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-admin-primary/10 text-admin-primary flex items-center justify-center shrink-0 border border-admin-primary/20">
                          <FileText className="w-5 h-5 text-admin-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-sm text-admin-foreground line-clamp-1 group-hover/card:text-admin-primary transition-colors font-mono">
                            {inv.invoiceNumber}
                          </h4>
                          <p className="text-xs text-admin-muted truncate font-sans">{name}</p>
                        </div>
                      </div>

                      <span className={cn('px-2 py-0.5 rounded-md text-[10.5px] font-bold border capitalize shrink-0', getStatusBadge(inv.status))}>
                        {inv.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="h-px w-full bg-admin-border/60 my-3" />

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-[10.5px] text-admin-muted font-medium">Context / Property</p>
                        <p className="font-semibold text-admin-foreground mt-0.5 truncate text-xs">
                          {propName || 'Independent'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10.5px] text-admin-muted font-medium">Balance Due</p>
                        <p className={cn('font-bold mt-0.5', inv.balance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400')}>
                          {formatCurrency(inv.balance, inv.currency)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10.5px] text-admin-muted font-medium">Total Amount</p>
                        <p className="font-bold text-admin-foreground mt-0.5">{formatCurrency(inv.total, inv.currency)}</p>
                      </div>
                      <div>
                        <p className="text-[10.5px] text-admin-muted font-medium">Due Date</p>
                        <p className={cn('mt-0.5', isOverdue && inv.balance > 0 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-admin-foreground')}>
                          {formatAuDisplayDate(inv.dueDate)}
                        </p>
                      </div>
                    </div>

                    <div className="h-px w-full bg-admin-border/60 my-3" />

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-admin-muted truncate">{email}</span>
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {inv.status !== 'paid' && inv.status !== 'cancelled' && inv.status !== 'void' && (
                          <button
                            onClick={() => {
                              setInvoiceToEdit(inv);
                              setIsCreateOpen(true);
                            }}
                            className="p-1.5 text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-subtle rounded-md transition-colors"
                            title="Edit Invoice"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setInvoiceToSchedule(inv);
                            setIsScheduleEmailOpen(true);
                          }}
                          className="p-1.5 text-admin-muted hover:text-[#008F83] hover:bg-[#008F83]/10 rounded-md transition-colors"
                          title="Bulk Generate"
                        >
                          <CalendarRange className="w-3.5 h-3.5 text-[#008F83]" />
                        </button>
                        <button
                          onClick={() => setIndividualEmailInvoices([inv])}
                          className="p-1.5 text-admin-muted hover:text-[#008F83] hover:bg-[#008F83]/10 rounded-md transition-colors"
                          title="Schedule Individual Email"
                        >
                          <MailClock className="w-3.5 h-3.5 text-[#008F83]" />
                        </button>
                        <button
                          onClick={() => handleDownload(inv.id, 'pdf')}
                          className="p-1.5 text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-subtle rounded-md transition-colors"
                          title="Download PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setInvoiceToDelete(inv)}
                          className="p-1.5 text-admin-muted hover:text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors"
                          title="Delete Invoice"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="px-2.5 py-1 text-xs font-bold text-admin-primary hover:bg-admin-primary/10 rounded-md transition-colors inline-flex items-center gap-1"
                        >
                          View <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </HoverEffectCardItem>
                );
              })}
            </HoverCardGrid>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isCreateOpen && (
        <CreateInvoiceModal
          isOpen={isCreateOpen}
          onClose={() => {
            setIsCreateOpen(false);
            setInvoiceToEdit(null);
          }}
          onSubmit={handleCreateSubmit}
          invoiceToEdit={invoiceToEdit}
          onUpdate={handleUpdateSubmit}
          onIssueExisting={handleIssueExisting}
          initialPropertyId={activePropertyId || undefined}
        />
      )}

      {/* Schedule Email Recurring Invoice Modal */}
      {isScheduleEmailOpen && (
        <ScheduleEmailModal
          isOpen={isScheduleEmailOpen}
          onClose={() => {
            setIsScheduleEmailOpen(false);
            setInvoiceToSchedule(null);
          }}
          selectedInvoice={invoiceToSchedule}
          availableInvoices={displayedInvoices}
          onSuccess={() => {
            loadInvoices();
          }}
        />
      )}

      {individualEmailInvoices.length > 0 && (
        <ScheduleIndividualEmailModal
          isOpen
          invoices={individualEmailInvoices}
          onClose={() => setIndividualEmailInvoices([])}
          onSuccess={() => loadInvoices()}
        />
      )}

      {/* Detail Modal */}
      {selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onIssue={handleIssue}
          onRecordPayment={handleRecordPayment}
          onCancel={handleCancel}
          onDeleteDraft={handleDeleteDraft}
          onDelete={handleDeleteInvoice}
          onDownload={handleDownload}
          onSendEmail={handleSendEmail}
          onEdit={(inv) => {
            setSelectedInvoice(null);
            setInvoiceToEdit(inv);
            setIsCreateOpen(true);
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!invoiceToDelete}
        onClose={() => setInvoiceToDelete(null)}
        onConfirm={async () => {
          if (!invoiceToDelete) return;
          await handleDeleteInvoice(invoiceToDelete.id);
        }}
        title="Delete Invoice?"
        description={`Are you sure you want to permanently delete invoice ${invoiceToDelete?.invoiceNumber}? All line items and generated documents will also be removed.`}
        confirmLabel="Delete Invoice"
        variant="danger"
        loading={isDeleting}
      />
    </ListPage>
  );
}
