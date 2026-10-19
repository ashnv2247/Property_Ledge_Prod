'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Home,
  CalendarCheck,
  DollarSign,
  FileText,
  ShieldCheck,
  Check,
  Clock,
  AlertTriangle,
  Play,
  Pause,
  StopCircle,
  Save,
  Loader2,
  Calendar,
  CheckCircle2,
  ArrowLeft,
  ChevronDown,
  Building,
  User,
  Sparkles,
  History,
  Info,
} from 'lucide-react';
import type {
  AutopilotConfig,
  AutopilotActivityConfig,
  AutopilotExecutionRecord,
} from '@/types/autopilot';
import {
  updateAutopilotActivitiesAction,
  pauseAutopilotAction,
  resumeAutopilotAction,
  stopAutopilotAction,
  makeActivityLiveAction,
} from '@/app/actions/autopilot';
import { AutopilotConfirmationModal, type AutopilotConfirmationType } from './AutopilotConfirmationModal';
import { usePropertyContextOptional, type UserPropertyAccess } from '@/components/property/PropertyContext';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface TeamMemberOption {
  id: string;
  name: string;
  role: string;
}

interface PropertyAutopilotDetailViewProps {
  config: AutopilotConfig;
  executions?: AutopilotExecutionRecord[];
  allConfigs?: AutopilotConfig[];
  teamMembers?: TeamMemberOption[];
  onBackToAll?: () => void;
  onRefresh?: () => void;
}

export function PropertyAutopilotDetailView({
  config,
  executions = [],
  allConfigs = [],
  teamMembers = [],
  onBackToAll,
  onRefresh,
}: PropertyAutopilotDetailViewProps) {
  const router = useRouter();
  const propertyContext = usePropertyContextOptional();

  const [activeTab, setActiveTab] = useState<'activities' | 'overview' | 'history' | 'lifecycle'>('activities');
  const [activityConfigs, setActivityConfigs] = useState<AutopilotActivityConfig[]>(config.activityConfigs || []);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Modal confirmation state
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: AutopilotConfirmationType;
    propertyId: string;
    propertyName: string;
  }>({
    isOpen: false,
    type: 'pause',
    propertyId: config.propertyId,
    propertyName: config.propertyName,
  });

  useEffect(() => {
    setActivityConfigs(config.activityConfigs || []);
  }, [config]);

  const handleToggleActivity = (id: string) => {
    setActivityConfigs((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isEnabled: !a.isEnabled } : a))
    );
  };

  const handleUpdateField = (id: string, updates: Partial<AutopilotActivityConfig>) => {
    setActivityConfigs((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
  };

  const handleSaveActivities = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setActionFeedback(null);
    try {
      const payload = {
        autopilotId: config.id,
        activities: activityConfigs.map((a) => ({
          id: a.id.startsWith('cfg-') ? undefined : a.id,
          activityTypeId: a.activityTypeId,
          title: a.title,
          description: a.description,
          isEnabled: a.isEnabled,
          frequency: a.frequency,
          interval: a.interval,
          nextDueDate: a.nextDueDate,
          reminderDaysBefore: a.reminderDaysBefore,
          followupFrequencyDays: a.followupFrequencyDays,
          maxFollowups: a.maxFollowups,
          assignedTo: a.responsiblePersonId || undefined,
        })),
      };

      const res = await updateAutopilotActivitiesAction(payload);
      if (!res.success) throw new Error(res.error || 'Failed to save configuration');

      setSaveSuccess(true);
      setActionFeedback('Schedule and activity settings updated successfully.');
      if (onRefresh) onRefresh();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setActionFeedback(err.message || 'Error updating configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTriggerLifecycle = (type: AutopilotConfirmationType) => {
    setModalState({
      isOpen: true,
      type,
      propertyId: config.propertyId,
      propertyName: config.propertyName,
    });
  };

  const handleConfirmLifecycleAction = async () => {
    try {
      if (modalState.type === 'pause') {
        await pauseAutopilotAction(config.propertyId);
        setActionFeedback(`Autopilot paused for ${config.propertyName}`);
      } else if (modalState.type === 'resume') {
        await resumeAutopilotAction(config.propertyId);
        setActionFeedback(`Autopilot resumed for ${config.propertyName}`);
      } else if (modalState.type === 'stop') {
        await stopAutopilotAction(config.propertyId);
        setActionFeedback(`Autopilot stopped for ${config.propertyName}`);
      } else if (modalState.type === 'initialize') {
        for (const act of activityConfigs) {
          if (act.id && !act.id.startsWith('cfg-')) {
            await makeActivityLiveAction(act.id);
          }
        }
        setActionFeedback(`Autopilot activities are now Live for ${config.propertyName}`);
      }
      setModalState((prev) => ({ ...prev, isOpen: false }));
      if (onRefresh) onRefresh();
      router.refresh();
    } catch (err: any) {
      setActionFeedback(err.message || 'Action failed');
    }
  };

  const handlePropertySwitch = (targetPropId: string) => {
    if (!targetPropId) return;
    if (targetPropId === 'all') {
      if (propertyContext) {
        propertyContext.setSelectedProperty(null);
      }
      if (onBackToAll) {
        onBackToAll();
      } else {
        router.push('/dashboard/autopilot/manage');
      }
      return;
    }

    if (propertyContext && propertyContext.availableProperties) {
      const match = propertyContext.availableProperties.find((p) => p.propertyId === targetPropId);
      if (match) {
        propertyContext.setSelectedProperty(match);
      }
    }
    router.push(`/dashboard/autopilot/manage/${targetPropId}`);
  };

  const renderActivityIcon = (typeId: string) => {
    switch (typeId) {
      case 'inspection':
        return <CalendarCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      case 'rent_review':
        return <DollarSign className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
      case 'insurance_renewal':
        return <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case 'lease_expiry':
      default:
        return <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
    }
  };

  const isActive = config.status === 'active';
  const isPaused = config.status === 'paused';
  const isDraft = config.status === 'draft';
  const isStopped = config.status === 'stopped';

  return (
    <div className="h-full w-full min-h-0 flex-1 overflow-y-auto overscroll-contain pb-32">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Navigation & Context Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (propertyContext) propertyContext.setSelectedProperty(null);
                if (onBackToAll) onBackToAll();
                else router.push('/dashboard/autopilot/manage');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              All Properties
            </button>
            <span className="text-slate-400 dark:text-slate-600 text-sm">/</span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Manage Property Autopilot
            </span>
          </div>

          {/* Quick Property Selector */}
          {allConfigs.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Switch Property:</span>
              <select
                aria-label="Switch property"
                value={config.propertyId}
                onChange={(e) => handlePropertySwitch(e.target.value)}
                className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#008F83]"
              >
                {allConfigs.map((c) => (
                  <option key={c.propertyId} value={c.propertyId}>
                    {c.propertyName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Feedback Alert */}
        {actionFeedback && (
          <div
            className={cn(
              'p-4 rounded-xl text-xs font-medium flex items-center justify-between',
              saveSuccess
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
            )}
          >
            <span>{actionFeedback}</span>
            <button
              type="button"
              onClick={() => setActionFeedback(null)}
              className="text-xs font-bold underline ml-4 hover:opacity-80"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Property Hero Banner */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-100 dark:border-teal-900 flex items-center justify-center text-[#008F83] dark:text-[#32D5C4] shrink-0">
              <Home className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {config.propertyName}
                </h1>
                <span
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-bold capitalize tracking-wide',
                    isActive && 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
                    isPaused && 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
                    isDraft && 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800',
                    isStopped && 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                  )}
                >
                  {config.status === 'not_initialized' ? 'Draft' : config.status}
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {config.propertyAddress || 'No address specified'}
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1">
                <span>Tenant: <strong className="text-slate-700 dark:text-slate-200">{config.tenantName || 'Vacant'}</strong></span>
                <span>•</span>
                <span>Lease: <strong className="text-slate-700 dark:text-slate-200">{config.leaseStartDate ? `${config.leaseStartDate} – ${config.leaseEndDate || 'Ongoing'}` : 'None'}</strong></span>
                <span>•</span>
                <span>Activities: <strong className="text-slate-700 dark:text-slate-200">{activityConfigs.length} configured</strong></span>
              </div>
            </div>
          </div>

          {/* Lifecycle Quick Actions */}
          <div className="flex flex-wrap items-center gap-3">
            {isDraft && (
              <Button
                variant="primary"
                onClick={() => handleTriggerLifecycle('initialize')}
                className="bg-[#008F83] hover:bg-[#00746a] text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-xs inline-flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Make Live
              </Button>
            )}
            {isActive && (
              <Button
                variant="outline"
                onClick={() => handleTriggerLifecycle('pause')}
                className="border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-xs font-semibold px-4 py-2 rounded-xl inline-flex items-center gap-2"
              >
                <Pause className="w-4 h-4" />
                Pause Autopilot
              </Button>
            )}
            {isPaused && (
              <Button
                variant="primary"
                onClick={() => handleTriggerLifecycle('resume')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-xl inline-flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Resume Autopilot
              </Button>
            )}
            <Link
              href={`/dashboard/autopilot/create?propertyId=${config.propertyId}`}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
            >
              Configure Drafts
            </Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-8 text-sm font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('activities')}
            className={cn(
              'pb-3 border-b-2 transition-colors cursor-pointer',
              activeTab === 'activities'
                ? 'border-[#008F83] text-[#008F83] dark:text-[#32D5C4]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            )}
          >
            Activities & Schedules ({activityConfigs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={cn(
              'pb-3 border-b-2 transition-colors cursor-pointer',
              activeTab === 'overview'
                ? 'border-[#008F83] text-[#008F83] dark:text-[#32D5C4]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            )}
          >
            Property Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={cn(
              'pb-3 border-b-2 transition-colors cursor-pointer',
              activeTab === 'history'
                ? 'border-[#008F83] text-[#008F83] dark:text-[#32D5C4]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            )}
          >
            Execution History & Journal
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('lifecycle')}
            className={cn(
              'pb-3 border-b-2 transition-colors cursor-pointer',
              activeTab === 'lifecycle'
                ? 'border-[#008F83] text-[#008F83] dark:text-[#32D5C4]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            )}
          >
            Lifecycle Controls
          </button>
        </div>

        {/* Tab 1: Activities Configuration */}
        {activeTab === 'activities' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Property Activity Schedules
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Configure recurrence frequencies, due dates, reminder timing, and responsible persons.
                </p>
              </div>

              <Button
                variant="primary"
                onClick={handleSaveActivities}
                disabled={isSaving}
                className="bg-[#008F83] hover:bg-[#00746a] text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-xs inline-flex items-center gap-2 self-start sm:self-auto"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving Changes...
                  </>
                ) : saveSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    Changes Saved!
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Schedule Changes
                  </>
                )}
              </Button>
            </div>

            {activityConfigs.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">No activities configured</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  No automated activities have been set up for this property yet. Generate suggested activities in Draft status to get started.
                </p>
                <Link
                  href={`/dashboard/autopilot/create?propertyId=${config.propertyId}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#008F83] text-white hover:bg-[#00746a] transition-colors"
                >
                  Generate Suggested Activities
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5">
                {activityConfigs.map((act) => (
                  <div
                    key={act.id}
                    className={cn(
                      'p-6 rounded-2xl border transition-all duration-200 bg-white dark:bg-slate-900 shadow-xs space-y-5',
                      act.isEnabled
                        ? 'border-slate-200 dark:border-slate-800'
                        : 'border-slate-100 dark:border-slate-800/60 opacity-75 bg-slate-50/50 dark:bg-slate-900/50'
                    )}
                  >
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60">
                          {renderActivityIcon(act.activityTypeId)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2.5">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                              {act.title}
                            </h3>
                            <span
                              className={cn(
                                'px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider',
                                act.isEnabled
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              )}
                            >
                              {act.isEnabled ? 'Live / Active' : 'Draft / Off'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {act.description || 'Predefined property management activity workflow.'}
                          </p>
                        </div>
                      </div>

                      {/* Enable/Disable Toggle Switch */}
                      <button
                        type="button"
                        role="switch"
                        aria-label={`Toggle ${act.title}`}
                        aria-checked={act.isEnabled}
                        onClick={() => handleToggleActivity(act.id)}
                        className={cn(
                          'w-11 h-6 rounded-full transition-colors relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#008F83] focus:ring-offset-2 shrink-0',
                          act.isEnabled ? 'bg-[#008F83]' : 'bg-slate-300 dark:bg-slate-700'
                        )}
                      >
                        <span
                          className={cn(
                            'block w-4 h-4 rounded-full bg-white transition-transform absolute top-1',
                            act.isEnabled ? 'left-6' : 'left-1'
                          )}
                        />
                      </button>
                    </div>

                    {/* Configuration Form Controls */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                      {/* Recurrence Frequency */}
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                          Recurrence Frequency
                        </label>
                        <select
                          value={act.frequency}
                          onChange={(e) =>
                            handleUpdateField(act.id, {
                              frequency: e.target.value as any,
                            })
                          }
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#008F83]"
                        >
                          <option value="once">Once (No Recurrence)</option>
                          <option value="monthly">Every month</option>
                          <option value="quarterly">Every 3 months</option>
                          <option value="semiannual">Every 6 months</option>
                          <option value="annual">Annual (Every 12 months)</option>
                        </select>
                      </div>

                      {/* Next Scheduled Due Date */}
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                          Next Due Date
                        </label>
                        <input
                          type="date"
                          value={act.nextDueDate || ''}
                          onChange={(e) => handleUpdateField(act.id, { nextDueDate: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#008F83]"
                        />
                      </div>

                      {/* Reminder Timing */}
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                          Advance Reminder
                        </label>
                        <select
                          value={act.reminderDaysBefore || 14}
                          onChange={(e) =>
                            handleUpdateField(act.id, {
                              reminderDaysBefore: Number(e.target.value),
                            })
                          }
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#008F83]"
                        >
                          <option value={7}>7 days before</option>
                          <option value={14}>14 days before</option>
                          <option value={30}>30 days before</option>
                          <option value={60}>60 days before</option>
                          <option value={90}>90 days before</option>
                        </select>
                      </div>

                      {/* Responsible Person */}
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                          Responsible Person
                        </label>
                        <select
                          value={act.responsiblePersonId || ''}
                          onChange={(e) =>
                            handleUpdateField(act.id, {
                              responsiblePersonId: e.target.value || null,
                            })
                          }
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#008F83]"
                        >
                          <option value="">Default (Workspace Owner)</option>
                          {teamMembers.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.role})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Overview */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Tenancy & Lease Details
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Primary Tenant</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {config.tenantName || 'No active tenant'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Lease Term</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {config.leaseStartDate
                      ? `${config.leaseStartDate} – ${config.leaseEndDate || 'Ongoing'}`
                      : 'No active lease'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Lease Type</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {config.leaseType || 'Standard Residential'}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500">Autopilot Status</span>
                  <span className="font-bold capitalize text-[#008F83] dark:text-[#32D5C4]">
                    {config.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Automation Summary
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Live Workflows</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {config.activeActivitiesCount} active
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Draft Workflows</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {config.draftActivitiesCount || 0} pending review
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Next Scheduled Activity</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {config.nextScheduledActivityName || 'None scheduled'}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500">Next Due Date</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {config.nextScheduledDueDate || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Execution History & Journal */}
        {activeTab === 'history' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Activity History & Journal Feed
            </h3>
            <p className="text-xs text-slate-500">
              Chronological log of activities, completions, and workflow transitions for this property.
            </p>

            {executions.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                No recent execution logs found for this property.
              </div>
            ) : (
              <div className="space-y-3 divide-y divide-slate-100 dark:divide-slate-800">
                {executions.map((e) => (
                  <div key={e.id} className="pt-3 first:pt-0 flex items-start justify-between gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {e.summary || e.executionType}
                      </span>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span>{new Date(e.startedAt).toLocaleString()}</span>
                        <span>•</span>
                        <span className="capitalize">{e.status}</span>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                        e.status === 'success' && 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400',
                        e.status === 'failed' && 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400',
                        e.status === 'requires_attention' && 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                      )}
                    >
                      {e.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Lifecycle Controls */}
        {activeTab === 'lifecycle' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Lifecycle State Management
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Control the operational state of property automations. Pausing halts active reminders while preserving your configuration.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Make Live Card */}
              <div className="p-5 rounded-2xl border border-teal-200 dark:border-teal-900/60 bg-teal-50/40 dark:bg-teal-950/20 space-y-3 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#008F83]" />
                    Make Live
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Validates all configured draft activities and activates them into the live workflow engine.
                  </p>
                </div>
                <Button
                  variant="primary"
                  onClick={() => handleTriggerLifecycle('initialize')}
                  className="bg-[#008F83] hover:bg-[#00746a] text-white text-xs font-semibold py-2 w-full rounded-xl"
                >
                  Activate All
                </Button>
              </div>

              {/* Pause Card */}
              <div className="p-5 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 space-y-3 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Pause className="w-4 h-4 text-amber-600" />
                    Pause Autopilot
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Temporarily holds future reminders, scheduled jobs, and follow-ups. Existing records remain intact.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => handleTriggerLifecycle('pause')}
                  disabled={!isActive}
                  className="border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/40 text-xs font-semibold py-2 w-full rounded-xl"
                >
                  Pause
                </Button>
              </div>

              {/* Stop Card */}
              <div className="p-5 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 space-y-3 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <StopCircle className="w-4 h-4 text-rose-600" />
                    Stop Autopilot
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Deactivates automations for this property and resets active workflows back to draft.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => handleTriggerLifecycle('stop')}
                  disabled={isStopped}
                  className="border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-xs font-semibold py-2 w-full rounded-xl"
                >
                  Stop
                </Button>
              </div>
            </div>
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
      />
    </div>
  );
}
