'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import {
  Rocket,
  Plus,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Clock,
  Play,
  Pause,
  StopCircle,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Check,
  Wrench,
  FileText,
  DollarSign,
  Home,
  CheckSquare,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Users,
  History,
  TrendingUp,
} from 'lucide-react';
import type {
  AutopilotDashboardData,
  AutopilotUpcomingActivityItem,
  AutopilotNeedsAttentionItem,
} from '@/types/autopilot';
import {
  pauseAutopilotAction,
  resumeAutopilotAction,
  makeActivityLiveAction,
  completeAutopilotActivityAction,
} from '@/app/actions/autopilot';
import { ActivityCompleteModal } from '@/components/activity/ActivityCompleteModal';
import { usePropertyContextOptional } from '@/components/property/PropertyContext';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface AutopilotDashboardViewProps {
  initialData: AutopilotDashboardData;
}

export function AutopilotDashboardView({ initialData }: AutopilotDashboardViewProps) {
  const router = useRouter();
  const propertyContext = usePropertyContextOptional();
  const contextPropId = propertyContext?.selectedProperty?.propertyId;

  const [data, setData] = useState<AutopilotDashboardData>(initialData);
  const [selectedPropertyFilter, setSelectedPropertyFilter] = useState<string>(
    contextPropId || 'all'
  );
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [selectedStatusTab, setSelectedStatusTab] = useState<'all' | 'due' | 'overdue' | 'in_progress' | 'completed' | 'drafts' | 'journal' | 'performance'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sync with global property dropdown context
  React.useEffect(() => {
    if (contextPropId) {
      setSelectedPropertyFilter(contextPropId);
    } else {
      setSelectedPropertyFilter('all');
    }
  }, [contextPropId]);

  const handlePropertyFilterChange = (propId: string) => {
    setSelectedPropertyFilter(propId);
    if (!propertyContext) return;
    if (propId === 'all') {
      propertyContext.setSelectedProperty(null);
    } else {
      const match = propertyContext.availableProperties?.find((p) => p.propertyId === propId);
      if (match) propertyContext.setSelectedProperty(match);
    }
  };

  // Complete modal state
  const [completeModalItem, setCompleteModalItem] = useState<AutopilotUpcomingActivityItem | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  // Filter activities
  const filteredActivities = useMemo(() => {
    let list = data.upcomingActivities || [];

    if (selectedPropertyFilter !== 'all') {
      list = list.filter((a) => a.propertyId === selectedPropertyFilter);
    }

    if (selectedTypeFilter !== 'all') {
      list = list.filter((a) => a.activityTypeId === selectedTypeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.propertyName.toLowerCase().includes(q) ||
          (a.assignedToName && a.assignedToName.toLowerCase().includes(q))
      );
    }

    switch (selectedStatusTab) {
      case 'due':
        list = list.filter((a) => a.status !== 'completed' && !a.isOverdue && a.daysUntilDue <= 7 && a.lifecycleStatus === 'active');
        break;
      case 'overdue':
        list = list.filter((a) => a.isOverdue && a.status !== 'completed' && a.lifecycleStatus === 'active');
        break;
      case 'in_progress':
        list = list.filter((a) => a.status === 'in_progress' && a.lifecycleStatus === 'active');
        break;
      case 'completed':
        list = list.filter((a) => a.status === 'completed');
        break;
      case 'drafts':
        list = list.filter((a) => a.lifecycleStatus === 'draft');
        break;
      default:
        // 'all': exclude drafts by default to show active work, unless viewing drafts tab
        list = list.filter((a) => a.lifecycleStatus !== 'draft');
        break;
    }

    return list;
  }, [data.upcomingActivities, selectedPropertyFilter, selectedTypeFilter, selectedStatusTab, searchQuery]);

  // Draft activities pending review
  const draftActivities = useMemo(() => {
    return (data.upcomingActivities || []).filter((a) => a.lifecycleStatus === 'draft');
  }, [data.upcomingActivities]);

  // Handle Make Live directly from dashboard
  const handleMakeLive = async (activityId: string) => {
    try {
      const res = await makeActivityLiveAction(activityId);
      if (res.success) {
        router.refresh();
      }
    } catch (err) {
      console.error('Failed to make live:', err);
    }
  };

  // Handle Complete Activity
  const handleConfirmComplete = async (completionDate: string, notes: string) => {
    if (!completeModalItem) return;
    setIsCompleting(true);
    try {
      const res = await completeAutopilotActivityAction({
        occurrenceId: completeModalItem.id,
        completionDate,
        completionNotes: notes,
      });
      if (res.success) {
        setCompleteModalItem(null);
        router.refresh();
      }
    } catch (err) {
      console.error('Failed to complete activity:', err);
    } finally {
      setIsCompleting(false);
    }
  };

  const stats = data.stats;

  return (
    <div className="h-full w-full min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 pb-32">
        {/* Header & Primary Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border dark:border-[#1E2D4A] pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground dark:text-white tracking-tight">
                Autopilot & Activity Dashboard
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#008F83]/10 text-[#008F83] dark:text-[#32D5C4] border border-[#008F83]/20">
                Activity Engine
              </span>
            </div>
            <p className="text-sm text-muted dark:text-slate-400">
              Live property activities, due dates, automated recurrence, and accountability tracking.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/dashboard/autopilot/create">
              <Button
                type="button"
                variant="default"
                className="gap-2 text-xs font-semibold bg-[#008F83] hover:bg-[#007A70] text-white shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Configure Activities
              </Button>
            </Link>
            <Link href="/dashboard/autopilot/manage">
              <Button
                type="button"
                variant="outline"
                className="gap-2 text-xs font-semibold cursor-pointer"
              >
                Manage Properties
              </Button>
            </Link>
          </div>
        </div>

        {/* Real-time KPI Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Outstanding */}
          <div className="p-4 rounded-2xl bg-surface dark:bg-[#0E1626] border border-border dark:border-[#1E2D4A] space-y-1">
            <span className="text-[11px] font-semibold text-muted dark:text-slate-400 uppercase tracking-wider block">
              Outstanding
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-foreground dark:text-white">
                {stats.totalOutstanding ?? 0}
              </span>
              <span className="text-xs text-muted dark:text-slate-400">Live</span>
            </div>
            <p className="text-[11px] text-muted dark:text-slate-400 truncate">Open / In progress</p>
          </div>

          {/* Overdue */}
          <div className="p-4 rounded-2xl bg-surface dark:bg-[#0E1626] border border-border dark:border-[#1E2D4A] space-y-1">
            <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
              Overdue
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">
                {stats.overdueCount ?? 0}
              </span>
              <span className="text-xs text-rose-500/80">Requires attention</span>
            </div>
            <p className="text-[11px] text-muted dark:text-slate-400 truncate">Past scheduled due date</p>
          </div>

          {/* Completed */}
          <div className="p-4 rounded-2xl bg-surface dark:bg-[#0E1626] border border-border dark:border-[#1E2D4A] space-y-1">
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
              Completed
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-foreground dark:text-white">
                {stats.completedCount ?? 0}
              </span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400">Total</span>
            </div>
            <p className="text-[11px] text-muted dark:text-slate-400 truncate">Activities finished</p>
          </div>

          {/* On Time Rate */}
          <div className="p-4 rounded-2xl bg-surface dark:bg-[#0E1626] border border-border dark:border-[#1E2D4A] space-y-1">
            <span className="text-[11px] font-semibold text-muted dark:text-slate-400 uppercase tracking-wider block">
              On-Time vs Late
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {stats.completedOnTimeCount ?? 0}
              </span>
              <span className="text-xs text-muted dark:text-slate-400">/</span>
              <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
                {stats.completedLateCount ?? 0}
              </span>
            </div>
            <p className="text-[11px] text-muted dark:text-slate-400 truncate">On-time / Late count</p>
          </div>

          {/* Avg Days Late */}
          <div className="p-4 rounded-2xl bg-surface dark:bg-[#0E1626] border border-border dark:border-[#1E2D4A] space-y-1">
            <span className="text-[11px] font-semibold text-muted dark:text-slate-400 uppercase tracking-wider block">
              Avg Days Late
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-foreground dark:text-white">
                {stats.avgDaysLate ?? 0}
              </span>
              <span className="text-xs text-muted dark:text-slate-400">days</span>
            </div>
            <p className="text-[11px] text-muted dark:text-slate-400 truncate">For late activities</p>
          </div>

          {/* Drafts Pending */}
          <div className="p-4 rounded-2xl bg-surface dark:bg-[#0E1626] border border-border dark:border-[#1E2D4A] space-y-1">
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
              Suggested Drafts
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                {stats.draftPendingReviewCount ?? 0}
              </span>
              <span className="text-xs text-amber-500/80">Pending</span>
            </div>
            <p className="text-[11px] text-muted dark:text-slate-400 truncate">Awaiting Make Live</p>
          </div>
        </div>

        {/* Needs Attention Alert Bar */}
        {data.needsAttentionItems && data.needsAttentionItems.length > 0 && (
          <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4" />
                Items Requiring Attention ({data.needsAttentionItems.length})
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              {data.needsAttentionItems.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-surface dark:bg-[#0E1626] border border-border dark:border-[#1E2D4A] space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-foreground dark:text-white truncate">
                      {item.propertyName}
                    </span>
                    <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                      {item.suggestedAction}
                    </span>
                  </div>
                  <p className="text-xs text-muted dark:text-slate-400 line-clamp-1">
                    {item.title}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="p-4 rounded-2xl bg-surface dark:bg-[#0E1626] border border-border dark:border-[#1E2D4A] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Property Filter */}
            <select
              value={selectedPropertyFilter}
              onChange={(e) => handlePropertyFilterChange(e.target.value)}
              className="h-9 px-3 rounded-xl bg-background dark:bg-[#080E1A] border border-border dark:border-[#1E2D4A] text-xs text-foreground dark:text-white focus:outline-none focus:ring-2 focus:ring-[#008F83] cursor-pointer"
            >
              <option value="all">All Properties</option>
              {data.propertiesList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            {/* Activity Type Filter */}
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="h-9 px-3 rounded-xl bg-background dark:bg-[#080E1A] border border-border dark:border-[#1E2D4A] text-xs text-foreground dark:text-white focus:outline-none focus:ring-2 focus:ring-[#008F83] cursor-pointer"
            >
              <option value="all">All Activity Types</option>
              <option value="inspection">Property Inspection</option>
              <option value="rent_review">Rental Review</option>
              <option value="lease_expiry">Lease Expiry</option>
              <option value="insurance_renewal">Insurance Renewal</option>
              <option value="maintenance">Maintenance</option>
              <option value="repair">Repair</option>
              <option value="tenant_issue">Tenant Request</option>
            </select>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search activities or assignees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-background dark:bg-[#080E1A] border border-border dark:border-[#1E2D4A] text-xs text-foreground dark:text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[#008F83]"
            />
          </div>
        </div>

        {/* View Tabs */}
        <div className="space-y-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-border dark:border-[#1E2D4A]">
            {[
              { id: 'all', label: 'All Active' },
              { id: 'due', label: 'Due Soon' },
              { id: 'overdue', label: `Overdue (${stats.overdueCount ?? 0})` },
              { id: 'in_progress', label: 'In Progress' },
              { id: 'completed', label: `Completed (${stats.completedCount ?? 0})` },
              { id: 'drafts', label: `Draft Suggestions (${stats.draftPendingReviewCount ?? 0})` },
              { id: 'journal', label: 'Activity Journal' },
              { id: 'performance', label: 'Assignee Performance' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedStatusTab(tab.id as any)}
                className={cn(
                  'px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer',
                  selectedStatusTab === tab.id
                    ? 'bg-[#008F83] text-white shadow-xs'
                    : 'text-muted dark:text-slate-400 hover:text-foreground dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: Activity Journal Stream */}
          {selectedStatusTab === 'journal' ? (
            <div className="p-6 rounded-2xl bg-surface dark:bg-[#0E1626] border border-border dark:border-[#1E2D4A] space-y-4">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-[#008F83]" />
                <h3 className="text-sm font-bold text-foreground dark:text-white">
                  Chronological Activity Journal
                </h3>
              </div>
              <p className="text-xs text-muted dark:text-slate-400">
                Immutable, auditable log of creation, Make Live activations, status changes, and confirmed completions.
              </p>

              {(!data.journalFeed || data.journalFeed.length === 0) ? (
                <div className="py-12 text-center text-xs text-muted dark:text-slate-400">
                  No activity events recorded yet.
                </div>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border dark:before:bg-[#1E2D4A]">
                  {data.journalFeed.map((event) => (
                    <div key={event.id} className="relative space-y-1">
                      <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-[#008F83] ring-4 ring-background dark:ring-[#0E1626]" />
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-foreground dark:text-white">
                          {event.propertyName}
                        </span>
                        <span className="text-muted dark:text-slate-400">•</span>
                        <span className="text-muted dark:text-slate-400">
                          {format(parseISO(event.createdAt), 'dd MMM yyyy, HH:mm')}
                        </span>
                        <span className="text-muted dark:text-slate-400">•</span>
                        <span className="font-medium text-slate-500 dark:text-slate-300">
                          by {event.actorName}
                        </span>
                      </div>
                      <p className="text-xs text-foreground/90 dark:text-slate-200">
                        {event.summary}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : selectedStatusTab === 'performance' ? (
            /* TAB 2: Assignee Performance */
            <div className="p-6 rounded-2xl bg-surface dark:bg-[#0E1626] border border-border dark:border-[#1E2D4A] space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#008F83]" />
                <h3 className="text-sm font-bold text-foreground dark:text-white">
                  Performance by Responsible Person
                </h3>
              </div>
              <p className="text-xs text-muted dark:text-slate-400">
                Track activity completion rates and overdue counts by assigned team member.
              </p>

              {(!stats.performanceByAssignee || stats.performanceByAssignee.length === 0) ? (
                <div className="py-12 text-center text-xs text-muted dark:text-slate-400">
                  No performance metrics recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border dark:border-[#1E2D4A] text-muted dark:text-slate-400">
                        <th className="py-2.5 font-semibold">Responsible Person</th>
                        <th className="py-2.5 font-semibold">Completed Activities</th>
                        <th className="py-2.5 font-semibold">On-Time Rate</th>
                        <th className="py-2.5 font-semibold">Current Overdue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 dark:divide-[#1E2D4A]/60">
                      {stats.performanceByAssignee.map((item) => (
                        <tr key={item.assigneeId}>
                          <td className="py-3 font-medium text-foreground dark:text-white">
                            {item.assigneeName}
                          </td>
                          <td className="py-3 text-foreground dark:text-slate-200">
                            {item.completedCount}
                          </td>
                          <td className="py-3 font-bold text-emerald-600 dark:text-emerald-400">
                            {item.onTimeRate}%
                          </td>
                          <td className="py-3 font-bold text-rose-600 dark:text-rose-400">
                            {item.overdueCount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* TAB 3: Activities & Occurrences List */
            <div className="space-y-3">
              {filteredActivities.length === 0 ? (
                <div className="py-16 text-center rounded-2xl bg-surface dark:bg-[#0E1626] border border-border dark:border-[#1E2D4A] space-y-2">
                  <Calendar className="w-8 h-8 mx-auto text-slate-400" />
                  <h4 className="text-sm font-semibold text-foreground dark:text-white">
                    No activities found for this filter
                  </h4>
                  <p className="text-xs text-muted dark:text-slate-400 max-w-sm mx-auto">
                    Try adjusting your property or status filter above, or configure new activities.
                  </p>
                </div>
              ) : (
                filteredActivities.map((act) => (
                  <div
                    key={act.id}
                    className="p-4 rounded-2xl bg-surface dark:bg-[#0E1626] border border-border dark:border-[#1E2D4A] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="p-2.5 rounded-xl bg-background dark:bg-[#131D31] border border-border dark:border-[#1E2D4A] shrink-0 mt-0.5">
                        {act.activityTypeId === 'inspection' ? (
                          <Home className="w-4 h-4 text-emerald-500" />
                        ) : act.activityTypeId === 'rent_review' ? (
                          <DollarSign className="w-4 h-4 text-purple-500" />
                        ) : act.activityTypeId === 'lease_expiry' ? (
                          <FileText className="w-4 h-4 text-amber-500" />
                        ) : (
                          <Calendar className="w-4 h-4 text-slate-500" />
                        )}
                      </div>

                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-bold text-foreground dark:text-white">
                            {act.title}
                          </h4>
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-md text-[10.5px] font-semibold uppercase tracking-wider',
                              act.status === 'completed'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : act.isOverdue
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                : act.lifecycleStatus === 'draft'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20'
                            )}
                          >
                            {act.lifecycleStatus === 'draft' ? 'Draft' : act.status.replace(/_/g, ' ')}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted dark:text-slate-400">
                          <span className="font-medium text-foreground/80 dark:text-slate-300">
                            {act.propertyName}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-[#008F83]" />
                            Due: {act.dueDate} ({act.isOverdue ? `${Math.abs(act.daysUntilDue)}d overdue` : `${act.daysUntilDue}d remaining`})
                          </span>
                          <span>•</span>
                          <span>Assigned: {act.assignedToName || 'Unassigned'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {act.lifecycleStatus === 'draft' ? (
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          onClick={() => handleMakeLive(act.activityId)}
                          className="bg-[#008F83] hover:bg-[#007A70] text-white text-xs font-semibold cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5 mr-1" />
                          Make Live
                        </Button>
                      ) : act.status !== 'completed' ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setCompleteModalItem(act)}
                          className="text-xs font-semibold cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                          Complete
                        </Button>
                      ) : (
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          Completed
                        </span>
                      )}

                      <Link href={`/dashboard/autopilot/create?propertyId=${act.propertyId}`}>
                        <Button type="button" variant="ghost" size="sm" className="text-xs cursor-pointer">
                          Configure
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Complete Modal */}
      {completeModalItem && (
        <ActivityCompleteModal
          isOpen={!!completeModalItem}
          onClose={() => setCompleteModalItem(null)}
          item={{
            id: completeModalItem.id,
            activityId: completeModalItem.activityId,
            dueDate: completeModalItem.dueDate,
            status: completeModalItem.status,
          } as any}
          activityTitle={completeModalItem.title}
          isRecurring={completeModalItem.frequency !== 'Once'}
          recurrenceFrequency={completeModalItem.frequency as any}
          onConfirm={handleConfirmComplete}
        />
      )}
    </div>
  );
}
