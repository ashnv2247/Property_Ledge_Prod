'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Rocket,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Play,
  Pause,
  StopCircle,
  Clock,
  Home,
  Check,
  ChevronRight,
  MoreVertical,
  SlidersHorizontal,
  ArrowRight,
} from 'lucide-react';
import type {
  AutopilotConfig,
  AutopilotExecutionRecord,
} from '@/types/autopilot';
import {
  pauseAutopilotAction,
  resumeAutopilotAction,
  stopAutopilotAction,
} from '@/app/actions/autopilot';
import { AutopilotConfirmationModal, type AutopilotConfirmationType } from './AutopilotConfirmationModal';
import { PropertyAutopilotDetailView } from './PropertyAutopilotDetailView';
import { usePropertyContextOptional, type UserPropertyAccess } from '@/components/property/PropertyContext';
import { cn } from '@/lib/utils';

interface TeamMemberOption {
  id: string;
  name: string;
  role: string;
}

interface AutopilotManageViewProps {
  initialConfigs: AutopilotConfig[];
  executions: AutopilotExecutionRecord[];
  teamMembers?: TeamMemberOption[];
  preselectedPropertyId?: string;
}

export function AutopilotManageView({
  initialConfigs,
  executions,
  teamMembers = [],
  preselectedPropertyId,
}: AutopilotManageViewProps) {
  const router = useRouter();
  const propertyContext = usePropertyContextOptional();

  const [configs, setConfigs] = useState<AutopilotConfig[]>(initialConfigs);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [explicitSelectedPropertyId, setExplicitSelectedPropertyId] = useState<string | null>(
    preselectedPropertyId || null
  );

  // Sync with global header dropdown property context
  const activePropertyId =
    propertyContext?.selectedProperty?.propertyId || explicitSelectedPropertyId || null;

  // Active property config when a specific property is in context
  const activePropertyConfig = useMemo(() => {
    if (!activePropertyId) return null;
    return configs.find((c) => c.propertyId === activePropertyId) || null;
  }, [configs, activePropertyId]);

  // Modal confirmation state
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: AutopilotConfirmationType;
    propertyId: string;
    propertyName: string;
  }>({
    isOpen: false,
    type: 'pause',
    propertyId: '',
    propertyName: '',
  });

  const [isActionPending, setIsActionPending] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Filtered portfolio list when viewing All Properties
  const filteredConfigs = useMemo(() => {
    let list = configs;
    if (statusFilter !== 'all') {
      list = list.filter((c) => c.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.propertyName.toLowerCase().includes(q) ||
          c.propertyAddress?.toLowerCase().includes(q) ||
          c.tenantName?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [configs, statusFilter, searchQuery]);

  const handleSelectPropertyToManage = (config: AutopilotConfig) => {
    if (propertyContext && propertyContext.availableProperties) {
      const match = propertyContext.availableProperties.find(
        (p) => p.propertyId === config.propertyId
      );
      if (match) {
        propertyContext.setSelectedProperty(match);
      }
    }
    setExplicitSelectedPropertyId(config.propertyId);
  };

  const handleBackToAllProperties = () => {
    if (propertyContext) {
      propertyContext.setSelectedProperty(null);
    }
    setExplicitSelectedPropertyId(null);
  };

  const handleTriggerLifecycle = (
    type: AutopilotConfirmationType,
    propertyId: string,
    propertyName: string
  ) => {
    setModalState({
      isOpen: true,
      type,
      propertyId,
      propertyName,
    });
  };

  const handleConfirmLifecycleAction = async () => {
    setIsActionPending(true);
    try {
      if (modalState.type === 'pause') {
        await pauseAutopilotAction(modalState.propertyId);
        setActionFeedback(`Autopilot paused for ${modalState.propertyName}`);
      } else if (modalState.type === 'resume') {
        await resumeAutopilotAction(modalState.propertyId);
        setActionFeedback(`Autopilot resumed for ${modalState.propertyName}`);
      } else if (modalState.type === 'stop') {
        await stopAutopilotAction(modalState.propertyId);
        setActionFeedback(`Autopilot stopped for ${modalState.propertyName}`);
      }
      setModalState((prev) => ({ ...prev, isOpen: false }));
      router.refresh();
      setTimeout(() => setActionFeedback(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Operation failed');
    } finally {
      setIsActionPending(false);
    }
  };

  // If a property is selected in the header dropdown context, render its dedicated full separate page!
  if (activePropertyConfig) {
    return (
      <PropertyAutopilotDetailView
        config={activePropertyConfig}
        executions={executions.filter((e) => e.propertyId === activePropertyConfig.propertyId)}
        allConfigs={configs}
        teamMembers={teamMembers}
        onBackToAll={handleBackToAllProperties}
        onRefresh={() => router.refresh()}
      />
    );
  }

  // Otherwise, render the All Properties Portfolio Overview table
  return (
    <div className="h-full w-full min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 py-6 font-sans space-y-6 pb-32">
        {/* 1. Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-heading">
              Manage Autopilots
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
              Select a property to configure schedules, review suggested draft activities, and control workflow lifecycle.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/autopilot"
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
            >
              Activity Dashboard
            </Link>
            <Link
              href="/dashboard/autopilot/create"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#008F83] hover:bg-[#007A70] text-white text-xs font-semibold shadow-xs"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Configure Activities</span>
            </Link>
          </div>
        </div>

        {/* Action feedback */}
        {actionFeedback && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-sm flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionFeedback}</span>
          </div>
        )}

        {/* 2. Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by property, address, or tenant..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs sm:text-sm pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#008F83]/30"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto p-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            {[
              { id: 'all', label: 'All' },
              { id: 'active', label: 'Active' },
              { id: 'draft', label: 'Draft' },
              { id: 'paused', label: 'Paused' },
              { id: 'stopped', label: 'Stopped' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer',
                  statusFilter === tab.id
                    ? 'bg-[#008F83] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Management Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
          {filteredConfigs.length === 0 ? (
            <div className="py-16 text-center text-slate-500 dark:text-slate-400">
              <Rocket className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
                No matching Autopilots found
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Try adjusting your search query or filter selection.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">
                    <th className="py-3.5 px-4 sm:px-6">Property</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Activities</th>
                    <th className="py-3.5 px-4">Next Scheduled Run</th>
                    <th className="py-3.5 px-4">Issues</th>
                    <th className="py-3.5 px-4">Last Updated</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredConfigs.map((config) => {
                    const isActive = config.status === 'active';
                    const isPaused = config.status === 'paused';
                    const isStopped = config.status === 'stopped';
                    const isDraft = config.status === 'draft' || config.status === 'not_initialized';

                    return (
                      <tr
                        key={config.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        {/* Property Column */}
                        <td className="py-4 px-4 sm:px-6">
                          <button
                            type="button"
                            onClick={() => handleSelectPropertyToManage(config)}
                            className="text-left flex items-center gap-3 group cursor-pointer"
                          >
                            <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-100 dark:border-teal-900 flex items-center justify-center text-[#008F83] dark:text-[#32D5C4] shrink-0 group-hover:scale-105 transition-transform">
                              <Home className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 max-w-[240px]">
                              <span className="font-bold text-slate-900 dark:text-white block truncate group-hover:text-[#008F83] transition-colors">
                                {config.propertyName}
                              </span>
                              <span className="text-[11px] text-slate-500 truncate block">
                                {config.propertyAddress || 'No address specified'}
                              </span>
                              {config.tenantName && (
                                <span className="text-[10px] text-slate-400 truncate block">
                                  Tenant: {config.tenantName}
                                </span>
                              )}
                            </div>
                          </button>
                        </td>

                        {/* Status Column */}
                        <td className="py-4 px-4">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold capitalize',
                              isActive && 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400',
                              isPaused && 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400',
                              isStopped && 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
                              isDraft && 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400'
                            )}
                          >
                            <span
                              className={cn(
                                'w-1.5 h-1.5 rounded-full',
                                isActive && 'bg-emerald-500 animate-pulse',
                                isPaused && 'bg-amber-500',
                                isStopped && 'bg-slate-400',
                                isDraft && 'bg-blue-400'
                              )}
                            />
                            {config.status === 'not_initialized' ? 'Draft' : config.status}
                          </span>
                        </td>

                        {/* Activities Column */}
                        <td className="py-4 px-4">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                            {config.activeActivitiesCount} active
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {config.activitiesCount} configured
                          </span>
                        </td>

                        {/* Next Scheduled Run */}
                        <td className="py-4 px-4">
                          {config.nextScheduledDueDate ? (
                            <div>
                              <span className="font-bold text-slate-800 dark:text-slate-200 block">
                                {new Date(config.nextScheduledDueDate).toLocaleDateString('en-AU', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                              <span className="text-[11px] text-slate-400 truncate block max-w-[150px]">
                                {config.nextScheduledActivityName}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400">None scheduled</span>
                          )}
                        </td>

                        {/* Issues */}
                        <td className="py-4 px-4">
                          {config.outstandingIssuesCount > 0 ? (
                            <span className="inline-flex items-center gap-1 font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>{config.outstandingIssuesCount} Overdue</span>
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-medium">None</span>
                          )}
                        </td>

                        {/* Last Updated */}
                        <td className="py-4 px-4 text-slate-400">
                          {config.updatedAt
                            ? new Date(config.updatedAt).toLocaleDateString('en-AU')
                            : '—'}
                        </td>

                        {/* Actions Column */}
                        <td className="py-4 px-4 sm:px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleSelectPropertyToManage(config)}
                              className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer inline-flex items-center gap-1.5 text-xs shadow-2xs"
                            >
                              <span>Manage</span>
                              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                            </button>

                            {isActive && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleTriggerLifecycle('pause', config.propertyId, config.propertyName)
                                }
                                className="p-1.5 rounded-xl border border-amber-200 text-amber-700 hover:bg-amber-50 cursor-pointer"
                                title="Pause Autopilot"
                              >
                                <Pause className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {isPaused && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleTriggerLifecycle('resume', config.propertyId, config.propertyName)
                                }
                                className="p-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                                title="Resume Autopilot"
                              >
                                <Play className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Confirmation Modal */}
        <AutopilotConfirmationModal
          isOpen={modalState.isOpen}
          onClose={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
          onConfirm={handleConfirmLifecycleAction}
          type={modalState.type}
          propertyName={modalState.propertyName}
          isLoading={isActionPending}
        />
      </div>
    </div>
  );
}
