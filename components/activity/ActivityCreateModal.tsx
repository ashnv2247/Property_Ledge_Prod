'use client';

import React, { useState, useEffect } from 'react';
import { format, addDays, addMonths, parseISO, isValid } from 'date-fns';
import {
  X,
  Plus,
  Home,
  TrendingUp,
  FileText,
  ShieldCheck,
  FileCheck2,
  Wrench,
  UserCheck,
  CheckSquare,
  Calendar,
  User,
  RotateCw,
  Building2,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { calculateNextDueDate, formatRecurrenceLabel } from '@/lib/activity/recurrence';
import { usePropertyContext } from '@/components/property/PropertyContext';
import type {
  ActivityType,
  CreateActivityInput,
  RecurrenceFrequency,
} from '@/types/activity';

interface ActivityCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamMembers: Array<{ id: string; name: string; avatarUrl?: string | null; role: string }>;
  activityTypes: ActivityType[];
  initialPropertyId?: string | null;
  initialDueDate?: string;
  onSuccess: (input: CreateActivityInput) => Promise<void>;
}

const TEMPLATES: Array<{
  id: string;
  typeId: string;
  title: string;
  defaultDescription: string;
  icon: React.ElementType;
  color: string;
  suggestedOffsetMonths?: number;
  suggestedOffsetDays?: number;
  defaultRecurring?: boolean;
  defaultFrequency?: RecurrenceFrequency;
}> = [
  {
    id: 'tmpl-inspection',
    typeId: 'inspection',
    title: 'Routine Property Inspection',
    defaultDescription: 'Routine 6-monthly condition inspection of the premises with tenant.',
    icon: Home,
    color: 'border-indigo-500/30 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10',
    suggestedOffsetMonths: 6,
    defaultRecurring: true,
    defaultFrequency: 'semiannual',
  },
  {
    id: 'tmpl-rent-review',
    typeId: 'rent_review',
    title: 'Annual Rent Review',
    defaultDescription: 'Review current market rental rates against consumer price index and lease agreement.',
    icon: TrendingUp,
    color: 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
    suggestedOffsetMonths: 12,
    defaultRecurring: true,
    defaultFrequency: 'annual',
  },
  {
    id: 'tmpl-lease-expiry',
    typeId: 'lease_expiry',
    title: 'Lease Expiry & Renewal Check',
    defaultDescription: 'Review approaching lease expiry, engage tenant regarding renewal intentions.',
    icon: FileText,
    color: 'border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10',
    suggestedOffsetMonths: 3,
    defaultRecurring: false,
  },
  {
    id: 'tmpl-insurance',
    typeId: 'insurance_renewal',
    title: 'Landlord Insurance Policy Renewal',
    defaultDescription: 'Review landlord and building insurance policy coverage and renew premium.',
    icon: ShieldCheck,
    color: 'border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10',
    suggestedOffsetMonths: 12,
    defaultRecurring: true,
    defaultFrequency: 'annual',
  },
  {
    id: 'tmpl-maintenance',
    typeId: 'maintenance',
    title: 'Smoke Alarm & Compliance Check',
    defaultDescription: 'Annual mandatory smoke alarm safety inspection and battery replacement.',
    icon: Wrench,
    color: 'border-yellow-500/30 text-yellow-600 dark:text-yellow-400 bg-yellow-500/10',
    suggestedOffsetMonths: 12,
    defaultRecurring: true,
    defaultFrequency: 'annual',
  },
  {
    id: 'tmpl-tenant-issue',
    typeId: 'tenant_issue',
    title: 'Tenant Request / Inquiry',
    defaultDescription: 'Follow up on tenant communication and resolve outstanding queries.',
    icon: UserCheck,
    color: 'border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10',
    suggestedOffsetDays: 3,
    defaultRecurring: false,
  },
];

export function ActivityCreateModal({
  isOpen,
  onClose,
  teamMembers,
  activityTypes,
  initialPropertyId,
  initialDueDate,
  onSuccess,
}: ActivityCreateModalProps) {
  const { availableProperties, selectedProperty } = usePropertyContext();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [activityTypeId, setActivityTypeId] = useState('inspection');
  const [propertyId, setPropertyId] = useState('');
  const [dueDate, setDueDate] = useState(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
  const [assignedTo, setAssignedTo] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<RecurrenceFrequency>('monthly');
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize or reset form state when modal opens
  useEffect(() => {
    if (isOpen) {
      const defaultProp =
        initialPropertyId ||
        (selectedProperty ? selectedProperty.propertyId : availableProperties[0]?.propertyId || '');
      setPropertyId(defaultProp);

      if (initialDueDate) {
        setDueDate(initialDueDate);
      } else {
        setDueDate(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
      }

      if (teamMembers.length > 0) {
        setAssignedTo(teamMembers[0].id);
      }
    }
  }, [isOpen, initialPropertyId, initialDueDate, selectedProperty, availableProperties, teamMembers]);

  if (!isOpen) return null;

  const handleApplyTemplate = (tmpl: typeof TEMPLATES[0]) => {
    setTitle(tmpl.title);
    setDescription(tmpl.defaultDescription);
    setActivityTypeId(tmpl.typeId);

    if (tmpl.suggestedOffsetMonths) {
      setDueDate(format(addMonths(new Date(), tmpl.suggestedOffsetMonths), 'yyyy-MM-dd'));
    } else if (tmpl.suggestedOffsetDays) {
      setDueDate(format(addDays(new Date(), tmpl.suggestedOffsetDays), 'yyyy-MM-dd'));
    }

    if (tmpl.defaultRecurring) {
      setIsRecurring(true);
      if (tmpl.defaultFrequency) {
        setRecurrenceFrequency(tmpl.defaultFrequency);
      }
    } else {
      setIsRecurring(false);
    }
  };

  const nextDueDatePreview = isRecurring
    ? calculateNextDueDate(dueDate, recurrenceFrequency, recurrenceInterval)
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !propertyId || !dueDate) return;

    try {
      setIsSubmitting(true);
      await onSuccess({
        title: title.trim(),
        description: description.trim() || undefined,
        activityTypeId,
        propertyId,
        dueDate,
        assignedTo: assignedTo || undefined,
        isRecurring,
        recurrenceFrequency: isRecurring ? recurrenceFrequency : undefined,
        recurrenceInterval: isRecurring ? recurrenceInterval : undefined,
        lifecycleStatus: 'active',
      });
      onClose();
      // Reset
      setTitle('');
      setDescription('');
      setIsRecurring(false);
    } catch (error) {
      console.error('Failed to create activity:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-surface dark:bg-[#0B1320] border border-border dark:border-[#1E293B] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/80 dark:border-[#1E293B]/80 bg-surface-subtle dark:bg-[#0E1726]/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#008F83]/15 border border-[#008F83]/30 flex items-center justify-center text-[#008F83] dark:text-[#32D5C4]">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground dark:text-white">
                New Activity
              </h3>
              <p className="text-xs text-muted dark:text-slate-400">
                Track what needs to happen, who is responsible, and when it is due.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-foreground dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Predefined Activity Templates */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground dark:text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-[#008F83] dark:text-[#32D5C4]" />
              <span>Quick Create from Templates (90% common workflows)</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TEMPLATES.map((tmpl) => {
                const Icon = tmpl.icon;
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleApplyTemplate(tmpl)}
                    className="flex items-center gap-2 p-2.5 rounded-xl border border-border dark:border-[#1E293B] hover:border-[#008F83] dark:hover:border-[#008F83] bg-surface-subtle dark:bg-[#080D1A] hover:bg-teal-500/5 dark:hover:bg-[#008F83]/5 text-left transition-all group cursor-pointer"
                  >
                    <div
                      className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${tmpl.color}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-medium text-foreground dark:text-slate-200 group-hover:text-[#008F83] dark:group-hover:text-[#32D5C4] truncate">
                      {tmpl.title.split(' ')[0]} {tmpl.title.split(' ')[1] || ''}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <form id="create-activity-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Activity Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground dark:text-slate-300">
                Activity Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Routine 6-Month Inspection"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-surface dark:bg-[#080D1A] border border-border dark:border-[#1E2D4A] rounded-xl px-3.5 py-2.5 text-xs text-foreground dark:text-slate-100 placeholder:text-muted dark:placeholder:text-slate-500 focus:outline-none focus:border-[#008F83] focus:ring-2 focus:ring-[#008F83]/15 transition-all"
              />
            </div>

            {/* Grid: Activity Type & Property */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground dark:text-slate-300">
                  Activity Type
                </label>
                <select
                  value={activityTypeId}
                  onChange={(e) => setActivityTypeId(e.target.value)}
                  className="w-full bg-surface dark:bg-[#080D1A] border border-border dark:border-[#1E2D4A] rounded-xl px-3 py-2.5 text-xs text-foreground dark:text-slate-100 focus:outline-none focus:border-[#008F83] transition-all"
                >
                  {activityTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground dark:text-slate-300">
                  Property <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  className="w-full bg-surface dark:bg-[#080D1A] border border-border dark:border-[#1E2D4A] rounded-xl px-3 py-2.5 text-xs text-foreground dark:text-slate-100 focus:outline-none focus:border-[#008F83] transition-all"
                >
                  <option value="" disabled>
                    Select a property...
                  </option>
                  {availableProperties.map((p) => (
                    <option key={p.propertyId} value={p.propertyId}>
                      {p.propertyName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Grid: Due Date & Responsible Person */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground dark:text-slate-300">
                  Due Date <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-surface dark:bg-[#080D1A] border border-border dark:border-[#1E2D4A] rounded-xl px-3.5 py-2.5 text-xs text-foreground dark:text-slate-100 focus:outline-none focus:border-[#008F83] transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground dark:text-slate-300">
                  Responsible Person (Assignee)
                </label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full bg-surface dark:bg-[#080D1A] border border-border dark:border-[#1E2D4A] rounded-xl px-3 py-2.5 text-xs text-foreground dark:text-slate-100 focus:outline-none focus:border-[#008F83] transition-all"
                >
                  <option value="">Unassigned</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground dark:text-slate-300">
                Description / Notes <span className="text-muted dark:text-slate-500 font-normal">(Optional)</span>
              </label>
              <textarea
                rows={2}
                placeholder="Add notes, access instructions, or key reminders..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-surface dark:bg-[#080D1A] border border-border dark:border-[#1E2D4A] rounded-xl px-3.5 py-2 text-xs text-foreground dark:text-slate-100 placeholder:text-muted dark:placeholder:text-slate-500 focus:outline-none focus:border-[#008F83] transition-all resize-none"
              />
            </div>

            {/* Recurring Activity Configuration */}
            <div className="pt-2 border-t border-border/80 dark:border-[#1E293B]/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="repeat-activity-checkbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="w-4 h-4 rounded text-[#008F83] border-border dark:border-[#1E2D4A] focus:ring-[#008F83] cursor-pointer"
                  />
                  <label
                    htmlFor="repeat-activity-checkbox"
                    className="text-xs font-semibold text-foreground dark:text-slate-200 cursor-pointer select-none"
                  >
                    Repeat this activity (Autopilot Schedule)
                  </label>
                </div>

                {isRecurring && (
                  <span className="text-[11px] font-medium text-[#008F83] dark:text-[#32D5C4]">
                    {formatRecurrenceLabel(recurrenceFrequency, recurrenceInterval)}
                  </span>
                )}
              </div>

              {isRecurring && (
                <div className="mt-3 p-3.5 rounded-xl bg-slate-50 dark:bg-[#080D1A] border border-slate-200/80 dark:border-[#1E2D4A]/80 space-y-3 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-muted dark:text-slate-400 block mb-1">
                        Frequency
                      </label>
                      <select
                        value={recurrenceFrequency}
                        onChange={(e) => setRecurrenceFrequency(e.target.value as RecurrenceFrequency)}
                        className="w-full bg-surface dark:bg-[#0B1320] border border-border dark:border-[#1E2D4A] rounded-lg px-2.5 py-1.5 text-xs text-foreground dark:text-slate-200 focus:outline-none focus:border-[#008F83]"
                      >
                        <option value="weekly">Every week</option>
                        <option value="biweekly">Every 2 weeks</option>
                        <option value="monthly">Every month</option>
                        <option value="quarterly">Every 3 months (Quarterly)</option>
                        <option value="semiannual">Every 6 months (Semi-annually)</option>
                        <option value="annual">Every year (Annually)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-muted dark:text-slate-400 block mb-1">
                        Interval (every X frequency)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={recurrenceInterval}
                        onChange={(e) => setRecurrenceInterval(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full bg-surface dark:bg-[#0B1320] border border-border dark:border-[#1E2D4A] rounded-lg px-2.5 py-1.5 text-xs text-foreground dark:text-slate-200 focus:outline-none focus:border-[#008F83]"
                      />
                    </div>
                  </div>

                  {nextDueDatePreview && (
                    <div className="flex items-center gap-2 text-[11px] text-[#008F83] dark:text-[#32D5C4] pt-1">
                      <RotateCw className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Upon completing this instance, the next occurrence will be scheduled for{' '}
                        <strong>{format(parseISO(nextDueDatePreview), 'dd MMM yyyy')}</strong>.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border/80 dark:border-[#1E293B]/80 bg-surface-subtle dark:bg-[#0E1726]/80 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            form="create-activity-form"
            type="submit"
            variant="default"
            size="sm"
            loading={isSubmitting}
            className="bg-[#008F83] hover:bg-[#007A70] text-white font-semibold"
          >
            Create Activity
          </Button>
        </div>
      </div>
    </div>
  );
}
