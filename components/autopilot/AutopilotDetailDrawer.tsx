'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Rocket,
  Pause,
  Play,
  StopCircle,
  CalendarCheck,
  DollarSign,
  FileText,
  Wrench,
  CheckSquare,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Save,
  Loader2,
  Calendar,
  Home,
  ShieldCheck,
  Check,
} from 'lucide-react';
import type {
  AutopilotConfig,
  AutopilotActivityConfig,
  AutopilotExecutionRecord,
} from '@/types/autopilot';
import { updateAutopilotActivitiesAction } from '@/app/actions/autopilot';
import { AutopilotConfirmationModal, type AutopilotConfirmationType } from './AutopilotConfirmationModal';
import { cn } from '@/lib/utils';

interface AutopilotDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  config: AutopilotConfig | null;
  executions: AutopilotExecutionRecord[];
  onTriggerLifecycle: (type: AutopilotConfirmationType, propertyId: string, propertyName: string) => void;
  onRefresh: () => void;
}

export function AutopilotDetailDrawer({
  isOpen,
  onClose,
  config,
  executions,
  onTriggerLifecycle,
  onRefresh,
}: AutopilotDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'activities' | 'history' | 'lifecycle'>('overview');
  const [activityConfigs, setActivityConfigs] = useState<AutopilotActivityConfig[]>([]);
  const [isSavingActivities, setIsSavingActivities] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (config) {
      setActivityConfigs(config.activityConfigs || []);
    }
  }, [config]);

  if (!isOpen || !config) return null;

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
    setIsSavingActivities(true);
    setSaveSuccess(false);
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
        })),
      };

      const res = await updateAutopilotActivitiesAction(payload);
      if (!res.success) throw new Error(res.error || 'Failed to save activities');

      setSaveSuccess(true);
      onRefresh();
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      alert(err.message || 'Error updating configuration');
    } finally {
      setIsSavingActivities(false);
    }
  };

  const renderActivityIcon = (typeId: string) => {
    switch (typeId) {
      case 'inspection':
        return <CalendarCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'rent_review':
        return <DollarSign className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      case 'lease_expiry':
      default:
        return <FileText className="w-4 h-4 text-orange-600 dark:text-orange-400" />;
    }
  };

  const isActive = config.status === 'active';
  const isPaused = config.status === 'paused';
  const isStopped = config.status === 'stopped';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden font-sans">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
          aria-hidden="true"
        />

        {/* Drawer container */}
        <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-screen max-w-xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col"
          >
            {/* 1. Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <Home className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                    {config.propertyName}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {config.propertyAddress || 'Autopilot Configuration'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-bold capitalize',
                    isActive && 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400',
                    isPaused && 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400',
                    isStopped && 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                  )}
                >
                  {config.status}
                </span>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  aria-label="Close drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 2. Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 gap-6 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={cn(
                  'py-3 border-b-2 transition-colors cursor-pointer',
                  activeTab === 'overview'
                    ? 'border-[#008F83] text-[#008F83] dark:text-[#32D5C4]'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                )}
              >
                Overview
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('activities')}
                className={cn(
                  'py-3 border-b-2 transition-colors cursor-pointer',
                  activeTab === 'activities'
                    ? 'border-[#008F83] text-[#008F83] dark:text-[#32D5C4]'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                )}
              >
                Activities ({activityConfigs.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={cn(
                  'py-3 border-b-2 transition-colors cursor-pointer',
                  activeTab === 'history'
                    ? 'border-[#008F83] text-[#008F83] dark:text-[#32D5C4]'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                )}
              >
                Execution History
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('lifecycle')}
                className={cn(
                  'py-3 border-b-2 transition-colors cursor-pointer',
                  activeTab === 'lifecycle'
                    ? 'border-[#008F83] text-[#008F83] dark:text-[#32D5C4]'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                )}
              >
                Lifecycle Controls
              </button>
            </div>

            {/* 3. Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Tab: Overview */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Property Context Box */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2.5 text-xs">
                    <span className="font-bold text-slate-400 uppercase tracking-wider block">
                      Tenancy & Lease Details
                    </span>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tenant</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {config.tenantName || 'No active tenant'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Lease Term</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {config.leaseStartDate
                          ? `${config.leaseStartDate} – ${config.leaseEndDate || 'Ongoing'}`
                          : 'No active lease'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Lease Type</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {config.leaseType || 'Standard Residential'}
                      </span>
                    </div>
                  </div>

                  {/* Autopilot Health Box */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2.5 text-xs">
                    <span className="font-bold text-slate-400 uppercase tracking-wider block">
                      Automation Status
                    </span>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Activated At</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {config.activatedAt
                          ? new Date(config.activatedAt).toLocaleDateString('en-AU')
                          : 'Not activated yet'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Next Scheduled Run</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {config.nextScheduledDueDate || 'None scheduled'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Active Automations</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {config.activeActivitiesCount} of {config.activitiesCount} activities enabled
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Activities */}
              {activeTab === 'activities' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Configure recurrence intervals and target dates. Changes do not affect the
                      Autopilot lifecycle status.
                    </p>
                  </div>

                  {activityConfigs.map((act) => (
                    <div
                      key={act.id}
                      className={cn(
                        'p-4 rounded-xl border transition-all text-xs space-y-3',
                        act.isEnabled
                          ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                          : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/60 opacity-60'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                            {renderActivityIcon(act.activityTypeId)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">
                              {act.title}
                            </span>
                            <span className="text-[11px] text-slate-500 block">
                              {act.description}
                            </span>
                          </div>
                        </div>

                        {/* Toggle switch */}
                        <button
                          type="button"
                          onClick={() => handleToggleActivity(act.id)}
                          className={cn(
                            'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                            act.isEnabled ? 'bg-[#008F83]' : 'bg-slate-300 dark:bg-slate-700'
                          )}
                          role="switch"
                          aria-checked={act.isEnabled}
                        >
                          <span
                            className={cn(
                              'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out',
                              act.isEnabled ? 'translate-x-4' : 'translate-x-0'
                            )}
                          />
                        </button>
                      </div>

                      {/* Recurrence & Due Date Controls */}
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Frequency
                          </label>
                          <select
                            value={act.frequency}
                            onChange={(e) =>
                              handleUpdateField(act.id, { frequency: e.target.value as any })
                            }
                            disabled={!act.isEnabled}
                            className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#008F83]"
                          >
                            <option value="once">Once</option>
                            <option value="quarterly">Every 3 months</option>
                            <option value="semiannual">Every 6 months</option>
                            <option value="annual">Annual</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Next Due Date
                          </label>
                          <input
                            type="date"
                            value={act.nextDueDate}
                            onChange={(e) =>
                              handleUpdateField(act.id, { nextDueDate: e.target.value })
                            }
                            disabled={!act.isEnabled}
                            className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#008F83]"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Save Activities Button */}
                  <div className="pt-2 flex items-center justify-end gap-3">
                    {saveSuccess && (
                      <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Saved</span>
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleSaveActivities}
                      disabled={isSavingActivities}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#008F83] hover:bg-[#007A70] text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      {isSavingActivities ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span>Save Schedule Changes</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Tab: History */}
              {activeTab === 'history' && (
                <div className="space-y-3">
                  {executions.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-500">
                      No logged execution records for this Autopilot.
                    </div>
                  ) : (
                    executions.map((e) => (
                      <div
                        key={e.id}
                        className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {e.summary}
                          </span>
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                              e.status === 'success' && 'bg-emerald-100 text-emerald-800',
                              e.status === 'failed' && 'bg-rose-100 text-rose-800',
                              e.status === 'requires_attention' && 'bg-amber-100 text-amber-800'
                            )}
                          >
                            {e.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {new Date(e.startedAt).toLocaleString('en-AU')} · Event:{' '}
                          {e.executionType.replace('_', ' ')}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab: Lifecycle Controls */}
              {activeTab === 'lifecycle' && (
                <div className="space-y-5">
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs space-y-4">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                        Autopilot Lifecycle State
                      </h4>
                      <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                        Current status is <span className="font-bold capitalize">{config.status}</span>.
                        Control future automated scheduling without losing past data or pending human tasks.
                      </p>
                    </div>

                    <div className="pt-2 flex flex-col gap-3">
                      {isActive && (
                        <button
                          type="button"
                          onClick={() =>
                            onTriggerLifecycle('pause', config.propertyId, config.propertyName)
                          }
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-bold hover:bg-amber-100 transition-colors cursor-pointer"
                        >
                          <Pause className="w-4 h-4" />
                          <span>Pause Autopilot</span>
                        </button>
                      )}

                      {isPaused && (
                        <button
                          type="button"
                          onClick={() =>
                            onTriggerLifecycle('resume', config.propertyId, config.propertyName)
                          }
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs transition-colors cursor-pointer"
                        >
                          <Play className="w-4 h-4" />
                          <span>Resume Autopilot</span>
                        </button>
                      )}

                      {!isStopped && (
                        <button
                          type="button"
                          onClick={() =>
                            onTriggerLifecycle('stop', config.propertyId, config.propertyName)
                          }
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 font-bold hover:bg-rose-100 transition-colors cursor-pointer"
                        >
                          <StopCircle className="w-4 h-4" />
                          <span>Stop Autopilot</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
