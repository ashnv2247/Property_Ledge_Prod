'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  Calendar,
  DollarSign,
  FileText,
  Home,
  ChevronDown,
  ChevronUp,
  Info,
  Loader2,
  Clock,
  Building,
  AlertCircle,
  Save,
  ShieldCheck,
  User,
  Plus,
  Trash2,
  Sparkles,
} from 'lucide-react';
import {
  fetchPropertyDraftActivitiesAction,
  saveDraftActivitiesAction,
  bulkMakeActivitiesLiveAction,
} from '@/app/actions/autopilot';
import { AutopilotConfirmationModal } from './AutopilotConfirmationModal';
import { Button } from '@/components/ui/Button';
import { usePropertyContextOptional } from '@/components/property/PropertyContext';
import { cn } from '@/lib/utils';
import type { PropertyActivityDraftItem } from '@/types/autopilot';

interface PropertyOption {
  id: string;
  name: string;
  address: string;
  status: string;
  activeLease?: {
    id: string;
    startDate: string;
    endDate?: string | null;
    rentAmount: number;
    rentFrequency: string;
  };
  primaryTenant?: {
    id: string;
    name: string;
    email?: string;
  };
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatarUrl?: string | null;
}

interface AutopilotCreateViewProps {
  properties: PropertyOption[];
  preselectedPropertyId?: string;
  teamMembers?: TeamMember[];
  currentUserId?: string;
}

export function AutopilotCreateView({
  properties,
  preselectedPropertyId,
  teamMembers = [],
  currentUserId,
}: AutopilotCreateViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const propertyContext = usePropertyContextOptional();
  const contextPropId = propertyContext?.selectedProperty?.propertyId;

  // Determine initial selected property
  const initialPropId =
    contextPropId ||
    preselectedPropertyId ||
    searchParams.get('propertyId') ||
    properties[0]?.id ||
    '';

  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(initialPropId);

  // Sync with global property dropdown if changed externally
  useEffect(() => {
    if (contextPropId && properties.some((p) => p.id === contextPropId)) {
      setSelectedPropertyId(contextPropId);
    }
  }, [contextPropId, properties]);

  const handlePropertyChange = (newId: string) => {
    setSelectedPropertyId(newId);
    if (propertyContext?.availableProperties) {
      const match = propertyContext.availableProperties.find((p) => p.propertyId === newId);
      if (match) propertyContext.setSelectedProperty(match);
    }
  };

  const selectedProperty = useMemo(
    () => properties.find((p) => p.id === selectedPropertyId) || properties[0],
    [properties, selectedPropertyId]
  );

  const [activities, setActivities] = useState<PropertyActivityDraftItem[]>([]);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState<boolean>(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);

  // Load drafts whenever selected property changes
  useEffect(() => {
    if (!selectedProperty?.id) return;
    let isMounted = true;
    setIsLoadingDrafts(true);
    setErrorMessage(null);
    setSuccessFeedback(null);

    fetchPropertyDraftActivitiesAction(selectedProperty.id)
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.data) {
          setActivities(res.data);
        } else {
          setErrorMessage(res.error || 'Failed to load property activities');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setErrorMessage(err.message || 'Error loading activities');
      })
      .finally(() => {
        if (isMounted) setIsLoadingDrafts(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedProperty?.id]);

  // Toggle selection
  const handleToggleSelect = (id: string) => {
    setActivities((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isSelected: !a.isSelected } : a))
    );
  };

  // Toggle expand configuration
  const handleToggleExpand = (id: string) => {
    setActivities((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isExpanded: !a.isExpanded } : a))
    );
  };

  // Update activity field
  const handleUpdateActivity = (
    id: string,
    updates: Partial<PropertyActivityDraftItem>
  ) => {
    setActivities((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
  };

  const selectedActivities = activities.filter((a) => a.isSelected);
  const selectedCount = selectedActivities.length;

  // Save configuration as DRAFT without activating
  const handleSaveDraft = async () => {
    if (!selectedProperty) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessFeedback(null);

    try {
      const payload = {
        propertyId: selectedProperty.id,
        activities: activities.map((a) => ({
          id: a.id,
          title: a.title,
          description: a.description,
          dueDate: a.nextDueDate,
          frequency: a.frequency,
          reminderDaysBefore: a.reminderDaysBefore,
          followupFrequencyDays: a.followupFrequencyDays,
          maxFollowups: a.maxFollowups,
          responsiblePersonId: a.responsiblePersonId,
          notes: a.notes,
        })),
      };

      const res = await saveDraftActivitiesAction(payload);
      if (res.success) {
        setSuccessFeedback(
          'Draft configuration saved successfully. These activities remain in Draft and will not execute until explicitly made Live.'
        );
      } else {
        setErrorMessage(res.error || 'Failed to save draft configuration.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Execute explicit Make Live
  const handleMakeLive = async () => {
    if (!selectedProperty) return;
    if (selectedCount === 0) {
      setErrorMessage('Please select at least one activity to make Live.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // 1. First save any current form edits
      await saveDraftActivitiesAction({
        propertyId: selectedProperty.id,
        activities: activities.map((a) => ({
          id: a.id,
          title: a.title,
          description: a.description,
          dueDate: a.nextDueDate,
          frequency: a.frequency,
          reminderDaysBefore: a.reminderDaysBefore,
          followupFrequencyDays: a.followupFrequencyDays,
          maxFollowups: a.maxFollowups,
          responsiblePersonId: a.responsiblePersonId,
          notes: a.notes,
        })),
      });

      // 2. Explicitly Make Live for selected activities
      const actIds = selectedActivities.map((a) => a.id);
      const res = await bulkMakeActivitiesLiveAction(actIds);

      if (res.success) {
        setIsConfirmModalOpen(false);
        router.push('/dashboard/autopilot?activated=true');
      } else {
        setErrorMessage(res.error || 'Failed to make selected activities Live.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to activate activities.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getActivityIcon = (typeId: string) => {
    switch (typeId) {
      case 'inspection':
        return <Home className="w-5 h-5 text-emerald-500" />;
      case 'rent_review':
        return <DollarSign className="w-5 h-5 text-purple-500" />;
      case 'lease_expiry':
        return <FileText className="w-5 h-5 text-amber-500" />;
      case 'insurance_renewal':
        return <ShieldCheck className="w-5 h-5 text-blue-500" />;
      default:
        return <Calendar className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div className="h-full w-full min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 pb-32">
        {/* Header with Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border dark:border-[#1E2D4A] pb-6">
          <div className="space-y-1">
            <Link
              href="/dashboard/autopilot"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-foreground dark:hover:text-white transition-colors mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Autopilot Dashboard
            </Link>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground dark:text-white tracking-tight">
                Configure Property Activities
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <Sparkles className="w-3 h-3" />
                Draft Review
              </span>
            </div>
            <p className="text-sm text-muted dark:text-slate-400">
              Review automatically generated activity drafts from lease and property records. Configure schedules, assignees, and reminders before making activities Live.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveDraft}
              disabled={isSubmitting || isLoadingDrafts}
              className="gap-1.5 text-xs font-semibold cursor-pointer"
            >
              <Save className="w-4 h-4 text-slate-500" />
              Save Draft
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={() => setIsConfirmModalOpen(true)}
              disabled={isSubmitting || isLoadingDrafts || selectedCount === 0}
              className="gap-1.5 text-xs font-semibold bg-[#008F83] hover:bg-[#007A70] text-white cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Make Live ({selectedCount})
            </Button>
          </div>
        </div>

        {/* Feedback Messages */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Unable to proceed</p>
              <p className="text-xs mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {successFeedback && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-sm flex items-start gap-2.5">
            <Check className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Configuration Saved</p>
              <p className="text-xs mt-0.5">{successFeedback}</p>
            </div>
          </div>
        )}

        {/* Property Selector & Details Card */}
        <div className="p-5 rounded-2xl bg-surface dark:bg-[#0E1626] border border-border dark:border-[#1E2D4A] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground dark:text-white uppercase tracking-wider">
                Select Property
              </label>
              <p className="text-xs text-muted dark:text-slate-400">
                Choose the property to view and configure its automated activities.
              </p>
            </div>

            <div className="w-full sm:w-72">
              <select
                value={selectedPropertyId}
                onChange={(e) => handlePropertyChange(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-background dark:bg-[#080E1A] border border-border dark:border-[#1E2D4A] text-sm text-foreground dark:text-white focus:outline-none focus:ring-2 focus:ring-[#008F83] cursor-pointer"
              >
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedProperty && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-border/60 dark:border-[#1E2D4A]/60 text-xs">
              <div className="space-y-0.5">
                <span className="text-muted dark:text-slate-400">Address</span>
                <p className="font-medium text-foreground dark:text-white truncate">
                  {selectedProperty.address || 'Address on record'}
                </p>
              </div>
              <div className="space-y-0.5">
                <span className="text-muted dark:text-slate-400">Active Tenant</span>
                <p className="font-medium text-foreground dark:text-white">
                  {selectedProperty.primaryTenant?.name || 'Vacant / No Tenant'}
                </p>
              </div>
              <div className="space-y-0.5">
                <span className="text-muted dark:text-slate-400">Lease Dates</span>
                <p className="font-medium text-foreground dark:text-white">
                  {selectedProperty.activeLease?.startDate
                    ? `${selectedProperty.activeLease.startDate} to ${selectedProperty.activeLease.endDate || 'Ongoing'}`
                    : 'No lease recorded'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Activities List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground dark:text-white">
                Suggested Activities ({activities.length})
              </h2>
              <p className="text-xs text-muted dark:text-slate-400">
                Derived directly from lease expiration, rental review, and inspection intervals.
              </p>
            </div>

            <span className="text-xs text-muted dark:text-slate-400 font-medium">
              {selectedCount} of {activities.length} selected for Make Live
            </span>
          </div>

          {isLoadingDrafts ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#008F83]" />
              <p className="text-xs text-muted dark:text-slate-400">
                Generating suggested activities from property & lease records...
              </p>
            </div>
          ) : activities.length === 0 ? (
            <div className="py-12 px-4 text-center rounded-2xl bg-surface dark:bg-[#0E1626] border border-border dark:border-[#1E2D4A] space-y-2">
              <Building className="w-8 h-8 mx-auto text-slate-400" />
              <h3 className="text-sm font-semibold text-foreground dark:text-white">
                No draft activities found
              </h3>
              <p className="text-xs text-muted dark:text-slate-400 max-w-sm mx-auto">
                No automated activities are currently queued for this property.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((act) => (
                <div
                  key={act.id}
                  className={cn(
                    'p-4 rounded-2xl border transition-all',
                    act.isSelected
                      ? 'bg-surface dark:bg-[#0E1626] border-[#008F83]/40 shadow-sm'
                      : 'bg-surface/60 dark:bg-[#0B1320] border-border dark:border-[#1E2D4A] opacity-80'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={act.isSelected}
                        onChange={() => handleToggleSelect(act.id)}
                        className="mt-1 h-4 w-4 rounded border-border text-[#008F83] focus:ring-[#008F83] cursor-pointer"
                      />

                      <div className="p-2 rounded-xl bg-background dark:bg-[#131D31] border border-border dark:border-[#1E2D4A] shrink-0">
                        {getActivityIcon(act.typeId)}
                      </div>

                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-bold text-foreground dark:text-white">
                            {act.title}
                          </h4>
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-md text-[10.5px] font-semibold uppercase tracking-wider',
                              act.status === 'active'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            )}
                          >
                            {act.status === 'active' ? 'Live' : 'Draft'}
                          </span>
                          {act.requiresConfiguration && (
                            <span className="px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                              Requires Configuration
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted dark:text-slate-400 line-clamp-1">
                          {act.description}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted dark:text-slate-400 pt-1">
                          <span className="flex items-center gap-1 font-medium text-foreground dark:text-slate-300">
                            <Clock className="w-3.5 h-3.5 text-[#008F83]" />
                            Due: {act.nextDueDate || 'Not set'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {act.frequencyLabel}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            {act.responsiblePersonName}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleExpand(act.id)}
                      className="p-1.5 rounded-lg text-muted hover:text-foreground dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                      title={act.isExpanded ? 'Collapse settings' : 'Expand configuration'}
                    >
                      {act.isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Expanded Configuration Section */}
                  {act.isExpanded && (
                    <div className="mt-4 pt-4 border-t border-border/60 dark:border-[#1E2D4A]/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Due Date */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted dark:text-slate-400">
                          Scheduled Due Date
                        </label>
                        <input
                          type="date"
                          value={act.nextDueDate}
                          onChange={(e) =>
                            handleUpdateActivity(act.id, {
                              nextDueDate: e.target.value,
                              requiresConfiguration: !e.target.value || !act.responsiblePersonId,
                            })
                          }
                          className="w-full h-9 px-3 rounded-xl bg-background dark:bg-[#080E1A] border border-border dark:border-[#1E2D4A] text-xs text-foreground dark:text-white focus:outline-none focus:ring-2 focus:ring-[#008F83]"
                        />
                      </div>

                      {/* Responsible Person */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted dark:text-slate-400">
                          Responsible Person
                        </label>
                        <select
                          value={act.responsiblePersonId || ''}
                          onChange={(e) => {
                            const member = teamMembers.find((m) => m.id === e.target.value);
                            handleUpdateActivity(act.id, {
                              responsiblePersonId: e.target.value || null,
                              responsiblePersonName: member?.name || 'Unassigned',
                              requiresConfiguration: !act.nextDueDate || !e.target.value,
                            });
                          }}
                          className="w-full h-9 px-3 rounded-xl bg-background dark:bg-[#080E1A] border border-border dark:border-[#1E2D4A] text-xs text-foreground dark:text-white focus:outline-none focus:ring-2 focus:ring-[#008F83]"
                        >
                          <option value="">Select Assignee</option>
                          {teamMembers.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.role})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Recurrence */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted dark:text-slate-400">
                          Recurrence Rule
                        </label>
                        <select
                          value={act.frequency}
                          onChange={(e) =>
                            handleUpdateActivity(act.id, {
                              frequency: e.target.value as any,
                            })
                          }
                          className="w-full h-9 px-3 rounded-xl bg-background dark:bg-[#080E1A] border border-border dark:border-[#1E2D4A] text-xs text-foreground dark:text-white focus:outline-none focus:ring-2 focus:ring-[#008F83]"
                        >
                          <option value="once">Once (Non-recurring)</option>
                          <option value="monthly">Monthly</option>
                          <option value="quarterly">Every 3 months (Quarterly)</option>
                          <option value="semiannual">Every 6 months</option>
                          <option value="annual">Annual (Every 1 year)</option>
                        </select>
                      </div>

                      {/* Reminder Timing */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted dark:text-slate-400">
                          Reminder Timing
                        </label>
                        <select
                          value={act.reminderDaysBefore}
                          onChange={(e) =>
                            handleUpdateActivity(act.id, {
                              reminderDaysBefore: Number(e.target.value),
                            })
                          }
                          className="w-full h-9 px-3 rounded-xl bg-background dark:bg-[#080E1A] border border-border dark:border-[#1E2D4A] text-xs text-foreground dark:text-white focus:outline-none focus:ring-2 focus:ring-[#008F83]"
                        >
                          <option value={7}>7 days before due date</option>
                          <option value={14}>14 days before due date</option>
                          <option value={30}>30 days before due date</option>
                          <option value={60}>60 days before due date</option>
                        </select>
                      </div>

                      {/* Follow-up Frequency */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted dark:text-slate-400">
                          Follow-up Frequency
                        </label>
                        <select
                          value={act.followupFrequencyDays}
                          onChange={(e) =>
                            handleUpdateActivity(act.id, {
                              followupFrequencyDays: Number(e.target.value),
                            })
                          }
                          className="w-full h-9 px-3 rounded-xl bg-background dark:bg-[#080E1A] border border-border dark:border-[#1E2D4A] text-xs text-foreground dark:text-white focus:outline-none focus:ring-2 focus:ring-[#008F83]"
                        >
                          <option value={3}>Every 3 days</option>
                          <option value={7}>Every 7 days (Weekly)</option>
                          <option value={14}>Every 14 days</option>
                        </select>
                      </div>

                      {/* Maximum Follow-ups */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted dark:text-slate-400">
                          Max Follow-ups
                        </label>
                        <select
                          value={act.maxFollowups}
                          onChange={(e) =>
                            handleUpdateActivity(act.id, {
                              maxFollowups: Number(e.target.value),
                            })
                          }
                          className="w-full h-9 px-3 rounded-xl bg-background dark:bg-[#080E1A] border border-border dark:border-[#1E2D4A] text-xs text-foreground dark:text-white focus:outline-none focus:ring-2 focus:ring-[#008F83]"
                        >
                          <option value={1}>1 follow-up max</option>
                          <option value={2}>2 follow-ups max</option>
                          <option value={3}>3 follow-ups max</option>
                          <option value={5}>5 follow-ups max</option>
                        </select>
                      </div>

                      {/* Notes / Comments */}
                      <div className="sm:col-span-2 lg:col-span-3 space-y-1">
                        <label className="text-xs font-semibold text-muted dark:text-slate-400">
                          Activity Notes & Instructions
                        </label>
                        <input
                          type="text"
                          value={act.notes || ''}
                          placeholder="Optional notes or instructions for this activity..."
                          onChange={(e) =>
                            handleUpdateActivity(act.id, { notes: e.target.value })
                          }
                          className="w-full h-9 px-3 rounded-xl bg-background dark:bg-[#080E1A] border border-border dark:border-[#1E2D4A] text-xs text-foreground dark:text-white focus:outline-none focus:ring-2 focus:ring-[#008F83]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-border dark:border-[#1E2D4A]">
          <Link
            href="/dashboard/autopilot"
            className="text-xs font-medium text-muted hover:text-foreground dark:hover:text-white transition-colors"
          >
            Cancel
          </Link>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveDraft}
              disabled={isSubmitting || isLoadingDrafts}
              className="gap-1.5 text-xs font-semibold"
            >
              <Save className="w-4 h-4 text-slate-500" />
              Save Draft Configuration
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={() => setIsConfirmModalOpen(true)}
              disabled={isSubmitting || isLoadingDrafts || selectedCount === 0}
              className="gap-1.5 text-xs font-semibold bg-[#008F83] hover:bg-[#007A70] text-white"
            >
              <Check className="w-4 h-4" />
              Make Live ({selectedCount})
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <AutopilotConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleMakeLive}
        type="initialize"
        isLoading={isSubmitting}
        propertyName={selectedProperty?.name || 'Selected Property'}
        activitiesCount={selectedCount}
        activityTitles={selectedActivities.map((a) => a.title)}
      />
    </div>
  );
}
