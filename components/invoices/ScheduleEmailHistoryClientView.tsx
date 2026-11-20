'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  CalendarRange,
  Mail,
  Send,
  Clock,
  AlertCircle,
  CheckCircle2,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Building,
  User,
  ArrowRight,
  Play,
  Pause,
  Ban,
  Layers,
  FileText,
  RotateCw,
  Plus,
} from 'lucide-react';
import { ColDef } from 'ag-grid-community';
import { Button, useToast } from '@/components/admin/ui';
import { AdminDataGrid, QuickFilterBar, QuickFilterOption } from '@/components/admin/data-grid';
import { ListPage, ListPageGrid } from '@/components/workspace';
import { PersonIdentity } from '@/components/ui/avatar';
import {
  InvoiceEmailScheduleDTO,
  ScheduleEmailStatsDTO,
} from '@/modules/invoices/domain/entities/invoice-schedule';
import {
  fetchInvoiceSchedulesAction,
  fetchInvoiceScheduleStatsAction,
  fetchInvoiceScheduleDetailsAction,
  triggerProcessDueSchedulesAction,
} from '@/app/actions/invoice-schedules';
import dynamic from 'next/dynamic';
import { formatAuDisplayDate } from '@/lib/format/australian-time';
import { cn } from '@/lib/utils';

const ScheduleEmailDetailDrawer = dynamic(
  () => import('./ScheduleEmailDetailDrawer').then((mod) => mod.ScheduleEmailDetailDrawer),
  { ssr: false }
);

interface ScheduleEmailHistoryClientViewProps {
  initialSchedules: InvoiceEmailScheduleDTO[];
  initialStats: ScheduleEmailStatsDTO;
}

export function ScheduleEmailHistoryClientView({
  initialSchedules,
  initialStats,
}: ScheduleEmailHistoryClientViewProps) {
  const { toast } = useToast();

  const [schedules, setSchedules] = useState<InvoiceEmailScheduleDTO[]>(initialSchedules);
  const [stats, setStats] = useState<ScheduleEmailStatsDTO>(initialStats);
  const [loading, setLoading] = useState(false);
  const [isProcessingDue, setIsProcessingDue] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [modeFilter, setModeFilter] = useState('all');

  // Drawer detail state
  const [selectedSchedule, setSelectedSchedule] = useState<InvoiceEmailScheduleDTO | null>(null);
  const [scheduleInvoices, setScheduleInvoices] = useState<any[]>([]);
  const [scheduleEmailJobs, setScheduleEmailJobs] = useState<any[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const filterOptions = useMemo<QuickFilterOption[]>(
    () => [
      { label: 'All', value: 'all' },
      { label: 'Active', value: 'active' },
      { label: 'Completed', value: 'completed' },
      { label: 'Paused', value: 'paused' },
      { label: 'Cancelled', value: 'cancelled' },
      { label: 'Failed', value: 'failed' },
    ],
    []
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [schedRes, statsRes] = await Promise.all([
        fetchInvoiceSchedulesAction(),
        fetchInvoiceScheduleStatsAction(),
      ]);
      setSchedules(schedRes.items || []);
      setStats(statsRes);
    } catch (e: any) {
      console.error('Error loading schedule email history:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleOpenDetails = async (schedule: InvoiceEmailScheduleDTO) => {
    setSelectedSchedule(schedule);
    setIsDrawerOpen(true);
    try {
      const res = await fetchInvoiceScheduleDetailsAction(schedule.id);
      if (res.success && res.data) {
        setSelectedSchedule(res.data.schedule);
        setScheduleInvoices(res.data.invoices || []);
        setScheduleEmailJobs(res.data.emailJobs || []);
      }
    } catch (err: any) {
      toast({ title: 'Error', description: 'Failed to load schedule details', variant: 'destructive' });
    }
  };

  const handleRefreshDrawer = useCallback(async () => {
    await loadData();
    if (selectedSchedule?.id) {
      try {
        const res = await fetchInvoiceScheduleDetailsAction(selectedSchedule.id);
        if (res.success && res.data) {
          setSelectedSchedule(res.data.schedule);
          setScheduleInvoices(res.data.invoices || []);
          setScheduleEmailJobs(res.data.emailJobs || []);
        }
      } catch (err) {
        console.error('Failed to refresh drawer schedule details:', err);
      }
    }
  }, [loadData, selectedSchedule?.id]);

  const handleTriggerDueProcessing = async () => {
    setIsProcessingDue(true);
    try {
      const res = await triggerProcessDueSchedulesAction();
      if (!res.success) {
        throw new Error(res.error || 'Failed to process due schedules');
      }
      toast({
        title: 'Background Process Complete',
        description: `Processed ${res.processed || 0} due jobs (${res.succeeded || 0} succeeded, ${res.failed || 0} failed).`,
      });
      await loadData();
      if (selectedSchedule) {
        await handleOpenDetails(selectedSchedule);
      }
    } catch (err: any) {
      toast({ title: 'Processing Failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsProcessingDue(false);
    }
  };

  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (modeFilter !== 'all' && s.emailMode !== modeFilter) return false;
      return true;
    });
  }, [schedules, statusFilter, modeFilter]);

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

  // AG Grid Column Definitions
  const columns: ColDef[] = useMemo(
    () => [
      {
        headerName: 'Schedule ID',
        field: 'id',
        width: 140,
        cellRenderer: (params: any) => {
          const s = params.data as InvoiceEmailScheduleDTO;
          if (!s) return null;
          return (
            <div className="flex items-center gap-2 py-1">
              <div className="w-6 h-6 rounded-md bg-[#008F83]/10 text-[#008F83] flex items-center justify-center shrink-0">
                <CalendarRange className="w-3.5 h-3.5" />
              </div>
              <span className="font-mono font-bold text-admin-foreground text-xs">
                SCH-{s.id.slice(0, 6).toUpperCase()}
              </span>
            </div>
          );
        },
      },
      {
        headerName: 'Source Invoice',
        field: 'sourceInvoiceNumber',
        width: 150,
        cellRenderer: (params: any) => {
          const s = params.data as InvoiceEmailScheduleDTO;
          if (!s) return null;
          return (
            <span className="font-mono font-bold text-xs text-admin-foreground">
              {s.sourceInvoiceNumber || '—'}
            </span>
          );
        },
      },
      {
        headerName: 'Tenant / Recipient',
        flex: 1.5,
        minWidth: 200,
        cellRenderer: (params: any) => {
          const s = params.data as InvoiceEmailScheduleDTO;
          if (!s) return null;
          return (
            <PersonIdentity
              seed={s.tenantId || s.recipientEmail || s.recipientName}
              name={s.recipientName}
              subtitle={s.recipientEmail}
              size="sm"
            />
          );
        },
      },
      {
        headerName: 'Property',
        field: 'propertyName',
        width: 170,
        cellRenderer: (params: any) => {
          const s = params.data as InvoiceEmailScheduleDTO;
          if (!s) return null;
          if (s.propertyName) {
            return (
              <div className="flex items-center gap-1.5 py-1 min-w-0">
                <Building className="w-3.5 h-3.5 text-admin-primary shrink-0" />
                <span className="text-xs text-admin-foreground font-semibold truncate" title={s.propertyName}>
                  {s.propertyName}
                </span>
              </div>
            );
          }
          return (
            <span className="text-xs text-admin-muted font-medium">Independent</span>
          );
        },
      },
      {
        headerName: 'Billing Period',
        width: 180,
        cellRenderer: (params: any) => {
          const s = params.data as InvoiceEmailScheduleDTO;
          if (!s) return null;
          return (
            <span className="text-xs text-admin-foreground font-medium">
              {s.billingStartMonth} to {s.billingEndMonth}
            </span>
          );
        },
      },
      {
        headerName: 'Invoices',
        field: 'invoicesGeneratedCount',
        width: 110,
        cellRenderer: (params: any) => {
          const s = params.data as InvoiceEmailScheduleDTO;
          if (!s) return null;
          return (
            <span className="font-heading font-bold text-xs text-admin-foreground">
              {s.invoicesGeneratedCount} generated
            </span>
          );
        },
      },
      {
        headerName: 'Email Mode',
        field: 'emailMode',
        width: 130,
        cellRenderer: (params: any) => {
          const s = params.data as InvoiceEmailScheduleDTO;
          if (!s) return null;
          const isAuto = s.emailMode === 'automatic';
          return (
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold border capitalize',
                isAuto
                  ? 'bg-[#008F83]/10 text-[#008F83] border-[#008F83]/20'
                  : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
              )}
            >
              {isAuto ? <Send className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
              {s.emailMode}
            </span>
          );
        },
      },
      {
        headerName: 'Created At',
        field: 'createdAt',
        width: 130,
        cellRenderer: (params: any) => {
          const s = params.data as InvoiceEmailScheduleDTO;
          if (!s) return null;
          return (
            <span className="text-xs text-admin-muted font-medium">
              {formatAuDisplayDate(s.createdAt)}
            </span>
          );
        },
      },
      {
        headerName: 'Status',
        field: 'status',
        width: 120,
        cellRenderer: (params: any) => {
          const s = params.data as InvoiceEmailScheduleDTO;
          if (!s) return null;
          return (
            <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-bold border uppercase', getStatusBadge(s.status))}>
              {s.status}
            </span>
          );
        },
      },
      {
        headerName: 'Actions',
        colId: 'actions',
        width: 120,
        pinned: 'right',
        sortable: false,
        filter: false,
        cellRenderer: (params: any) => {
          const s = params.data as InvoiceEmailScheduleDTO;
          if (!s) return null;
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenDetails(s);
              }}
              className="px-2.5 py-1 text-xs font-bold text-[#008F83] hover:bg-[#008F83]/10 rounded-md transition-colors inline-flex items-center gap-1"
            >
              <Eye className="w-3.5 h-3.5" /> Details
            </button>
          );
        },
      },
    ],
    []
  );

  return (
    <ListPage
      title="Schedule Email"
      description="Track scheduled invoices, recurring generation rules, and email delivery activity."
      breadcrumb={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Invoices', href: '/dashboard/invoices' },
        { label: 'Schedule Email' },
      ]}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTriggerDueProcessing}
            disabled={isProcessingDue}
            className="font-bold border-admin-border text-admin-foreground text-xs flex items-center gap-1.5"
            title="Scan and send any due scheduled email deliveries immediately"
          >
            <RotateCw className={cn('w-3.5 h-3.5 text-[#008F83]', isProcessingDue && 'animate-spin')} />
            {isProcessingDue ? 'Processing...' : 'Run Due Deliveries'}
          </Button>

          <Link href="/dashboard/invoices">
            <Button
              variant="outline"
              size="sm"
              className="font-bold border-admin-border text-admin-foreground text-xs flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-admin-primary" />
              Invoices List
            </Button>
          </Link>
        </div>
      }
      summary={
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Card 1: Total Schedules */}
          <div className="bg-admin-surface border border-admin-border rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#008F83]/10 text-[#008F83] flex items-center justify-center shrink-0 border border-[#008F83]/20">
                <CalendarRange className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-admin-muted uppercase tracking-wider">Total Schedules</p>
                <h3 className="text-lg font-black text-admin-foreground truncate mt-0.5">
                  {stats.totalSchedules}
                </h3>
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-admin-border/60 text-[10.5px] text-slate-500">
              Active recurring schedules
            </div>
          </div>

          {/* Card 2: Invoices Generated */}
          <div className="bg-admin-surface border border-admin-border rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 border border-blue-500/20">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-admin-muted uppercase tracking-wider">Generated Invoices</p>
                <h3 className="text-lg font-black text-admin-foreground truncate mt-0.5">
                  {stats.totalInvoicesGenerated}
                </h3>
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-admin-border/60 text-[10.5px] text-slate-500">
              Total independent billing records
            </div>
          </div>

          {/* Card 3: Emails Sent */}
          <div className="bg-admin-surface border border-admin-border rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-admin-muted uppercase tracking-wider">Emails Sent</p>
                <h3 className="text-lg font-black text-emerald-600 truncate mt-0.5">
                  {stats.emailsSent}
                </h3>
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-admin-border/60 text-[10.5px] text-slate-500">
              Successfully delivered to tenants
            </div>
          </div>

          {/* Card 4: Emails Pending */}
          <div className="bg-admin-surface border border-admin-border rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center shrink-0 border border-cyan-500/20">
                <Clock className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-admin-muted uppercase tracking-wider">Emails Pending</p>
                <h3 className="text-lg font-black text-cyan-600 truncate mt-0.5">
                  {stats.emailsPending}
                </h3>
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-admin-border/60 text-[10.5px] text-slate-500">
              Scheduled for future dates
            </div>
          </div>

          {/* Card 5: Emails Failed */}
          <div className="bg-admin-surface border border-admin-border rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0 border border-rose-500/20">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-admin-muted uppercase tracking-wider">Emails Failed</p>
                <h3 className="text-lg font-black text-rose-600 truncate mt-0.5">
                  {stats.emailsFailed}
                </h3>
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-admin-border/60 text-[10.5px] text-slate-500">
              Requires review or retry
            </div>
          </div>
        </div>
      }
    >
      <div className="flex-1 flex flex-col min-h-0 h-full space-y-4">
        {schedules.length === 0 && !loading ? (
          <div className="py-20 px-6 text-center bg-admin-surface rounded-2xl border border-admin-border shadow-xs flex-1 flex flex-col items-center justify-center min-h-[320px]">
            <div className="w-14 h-14 bg-admin-surface-subtle rounded-full flex items-center justify-center mx-auto mb-4 text-admin-muted border border-admin-border">
              <CalendarRange className="w-7 h-7 text-[#008F83]" />
            </div>
            <h3 className="text-lg font-black text-admin-foreground mb-1">
              No Recurring Schedules Yet
            </h3>
            <p className="text-xs text-admin-muted max-w-md mx-auto mb-5 font-medium leading-relaxed">
              To create an automated recurring invoice schedule, navigate to the Invoices page, select an invoice,
              and click <strong className="text-admin-foreground">Schedule Email</strong>.
            </p>
            <Link href="/dashboard/invoices">
              <Button className="font-bold text-xs bg-[#008F83] text-white">
                <FileText className="w-4 h-4 mr-1.5" /> Go to Invoices
              </Button>
            </Link>
          </div>
        ) : (
          <ListPageGrid>
            <AdminDataGrid
              gridId="schedule-email-grid"
              rowData={filteredSchedules}
              columnDefs={columns}
              loading={loading}
              onRefresh={loadData}
              labelSingular="schedule"
              labelPlural="schedules"
              enableSelection={false}
              onRowClick={(row) => handleOpenDetails(row)}
              getRowId={(p) => p.data.id}
              enableColumnChooser
              enableExport
              exportFilename="schedule-email-history"
              searchPlaceholder="Search schedules by recipient, email or invoice..."
              leftToolbarContent={
                <div className="flex items-center gap-3 flex-wrap">
                  <QuickFilterBar
                    options={filterOptions}
                    activeValue={statusFilter}
                    onChange={(val) => setStatusFilter(val as string)}
                  />

                  <div className="h-4 w-px bg-admin-border hidden sm:block" />

                  {/* Email Mode Filter */}
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-admin-muted font-medium">Mode:</span>
                    <select
                      value={modeFilter}
                      onChange={(e) => setModeFilter(e.target.value)}
                      className="px-2 py-1 rounded-lg bg-admin-surface border border-admin-border text-xs font-semibold text-admin-foreground"
                    >
                      <option value="all">All Modes</option>
                      <option value="automatic">Automatic</option>
                      <option value="manual">Manual</option>
                    </select>
                  </div>
                </div>
              }
              disablePagination={false}
              defaultPageSize={10}
            />
          </ListPageGrid>
        )}
      </div>

      {/* Schedule Detail Side Drawer */}
      {isDrawerOpen && (
        <ScheduleEmailDetailDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          schedule={selectedSchedule}
          generatedInvoices={scheduleInvoices}
          emailJobs={scheduleEmailJobs}
          onRefresh={handleRefreshDrawer}
        />
      )}
    </ListPage>
  );
}
