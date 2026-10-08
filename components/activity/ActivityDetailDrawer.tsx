'use client';

import React, { useState, useEffect } from 'react';
import { format, parseISO, isValid } from 'date-fns';
import {
  X,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Home,
  MessageSquare,
  History,
  Send,
  Trash2,
  Archive,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  FileText,
  FileCheck2,
  Wrench,
  UserCheck,
  CheckSquare,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { formatRecurrenceLabel } from '@/lib/activity/recurrence';
import type {
  ActivityDetailData,
  OccurrenceStatus,
  ActivityComment,
} from '@/types/activity';

interface ActivityDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  data: ActivityDetailData | null;
  isLoading?: boolean;
  teamMembers: Array<{ id: string; name: string; avatarUrl?: string | null; role: string }>;
  onStatusChange: (occurrenceId: string, newStatus: OccurrenceStatus) => Promise<void>;
  onAssigneeChange: (occurrenceId: string, assignedTo: string | null) => Promise<void>;
  onDueDateChange: (occurrenceId: string, newDueDate: string) => Promise<void>;
  onAddComment: (activityId: string, commentText: string, occurrenceId?: string | null) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  onCompleteClick: (data: ActivityDetailData) => void;
  onArchiveClick: (activityId: string) => Promise<void>;
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  inspection: Home,
  rent_review: TrendingUp,
  lease_expiry: FileText,
  insurance_renewal: ShieldCheck,
  lease_renewal: FileCheck2,
  repair: Wrench,
  maintenance: Wrench,
  tenant_issue: UserCheck,
  other: CheckSquare,
};

export function ActivityDetailDrawer({
  isOpen,
  onClose,
  data,
  isLoading,
  teamMembers,
  onStatusChange,
  onAssigneeChange,
  onDueDateChange,
  onAddComment,
  onDeleteComment,
  onCompleteClick,
  onArchiveClick,
}: ActivityDetailDrawerProps) {
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'journal'>('details');

  if (!isOpen) return null;

  const currentOcc = data?.currentOccurrence;
  const activity = data?.activity;
  const isCompleted = currentOcc?.status === 'completed';

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !activity) return;

    try {
      setIsSubmittingComment(true);
      await onAddComment(activity.id, commentText.trim(), currentOcc?.id);
      setCommentText('');
    } catch (error) {
      console.error('Failed to post comment:', error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const Icon = activity ? TYPE_ICONS[activity.activityTypeId] || CheckSquare : CheckSquare;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-surface dark:bg-[#0B1320] border border-border dark:border-[#1E2D4A] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border dark:border-[#1E2D4A] bg-surface-subtle dark:bg-[#0E1626] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#008F83]/15 border border-[#008F83]/30 flex items-center justify-center text-[#008F83] dark:text-[#32D5C4] shrink-0">
              <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted dark:text-slate-400 block">
                {data?.activityType.name || 'Activity Form'}
              </span>
              <h2 className="text-sm font-bold text-foreground dark:text-white truncate">
                {activity?.title || 'Loading...'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activity && (
              <button
                type="button"
                onClick={() => onArchiveClick(activity.id)}
                className="p-1.5 rounded-lg text-muted hover:text-foreground dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Archive activity"
                aria-label="Archive activity"
              >
                <Archive className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted hover:text-foreground dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Close modal"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Property Context Banner */}
        {data && (
          <div className="px-6 py-2.5 bg-slate-50 dark:bg-[#0A111F] border-b border-border/80 dark:border-[#1E2D4A]/80 flex items-center justify-between text-xs text-muted dark:text-slate-400 shrink-0">
            <div className="flex items-center gap-2 truncate">
              <Home className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="font-semibold text-foreground dark:text-slate-200 truncate">
                {data.property.name}
              </span>
              {data.property.addressLine1 && (
                <span className="truncate opacity-75">· {data.property.addressLine1}</span>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {Boolean(
                activity?.metadata?.auto_created ||
                activity?.metadata?.is_system_generated ||
                activity?.leaseId ||
                activity?.title?.toLowerCase().includes('lease') ||
                activity?.title?.toLowerCase().includes('inspection') ||
                activity?.title?.toLowerCase().includes('defect') ||
                activity?.title?.toLowerCase().includes('audit') ||
                activity?.title?.toLowerCase().includes('rent review')
              ) && (
                <span
                  title="Created automatically via Autopilot trigger"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-[#008F83]/10 text-[#008F83] dark:text-[#32D5C4] border border-[#008F83]/25 shrink-0"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Auto Created</span>
                </span>
              )}

              {activity?.isRecurring && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
                  <RotateCw className="w-3 h-3" />
                  {formatRecurrenceLabel(activity.recurrenceFrequency, activity.recurrenceInterval)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-border/60 dark:border-[#1E2D4A]/60 bg-surface dark:bg-[#080E1A] shrink-0 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={cn(
              'px-3 py-2 font-semibold border-b-2 transition-all cursor-pointer',
              activeTab === 'details'
                ? 'border-[#008F83] text-[#008F83] dark:text-[#32D5C4]'
                : 'border-transparent text-muted dark:text-slate-400 hover:text-foreground dark:hover:text-white'
            )}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('comments')}
            className={cn(
              'px-3 py-2 font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5',
              activeTab === 'comments'
                ? 'border-[#008F83] text-[#008F83] dark:text-[#32D5C4]'
                : 'border-transparent text-muted dark:text-slate-400 hover:text-foreground dark:hover:text-white'
            )}
          >
            <span>Comments</span>
            {data && data.comments.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {data.comments.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('journal')}
            className={cn(
              'px-3 py-2 font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5',
              activeTab === 'journal'
                ? 'border-[#008F83] text-[#008F83] dark:text-[#32D5C4]'
                : 'border-transparent text-muted dark:text-slate-400 hover:text-foreground dark:hover:text-white'
            )}
          >
            <History className="w-3.5 h-3.5" />
            <span>Activity Journal</span>
          </button>
        </div>

        {/* Scrollable Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading && !data && (
            <div className="flex items-center justify-center py-20 text-xs text-muted dark:text-slate-500">
              Loading activity details...
            </div>
          )}

          {data && activeTab === 'details' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Status Section */}
              <div className="p-4 rounded-xl bg-surface-subtle dark:bg-[#0E1626] border border-border dark:border-[#1E2D4A] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground dark:text-slate-300">
                    Status & Accountability
                  </span>
                  <div>
                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Completed {currentOcc?.completedAt && `on ${format(parseISO(currentOcc.completedAt), 'dd MMM yyyy')}`}
                      </span>
                    ) : currentOcc && (
                      <select
                        value={currentOcc.status}
                        onChange={(e) => onStatusChange(currentOcc.id, e.target.value as OccurrenceStatus)}
                        className="bg-surface dark:bg-[#080D1A] border border-border dark:border-[#1E2D4A] rounded-lg px-2.5 py-1 text-xs font-semibold text-foreground dark:text-slate-200 focus:outline-none focus:border-[#008F83]"
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="delayed">Delayed</option>
                        <option value="completed">Completed</option>
                      </select>
                    )}
                  </div>
                </div>

                {isCompleted && data.daysLate > 0 && (
                  <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                    ⚠ Completed {data.daysLate} {data.daysLate === 1 ? 'day' : 'days'} after scheduled due date.
                  </div>
                )}
                {isCompleted && currentOcc?.completionNotes && (
                  <div className="text-xs text-muted dark:text-slate-300 bg-surface dark:bg-[#080D1A] p-2.5 rounded-lg border border-border/60 dark:border-[#1E2D4A]/60">
                    <span className="font-semibold block text-[11px] text-muted dark:text-slate-400 mb-0.5">Completion Notes:</span>
                    {currentOcc.completionNotes}
                  </div>
                )}
              </div>

              {/* Core Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Due Date Field */}
                <div className="p-3.5 rounded-xl bg-surface-subtle dark:bg-[#0E1626] border border-border dark:border-[#1E2D4A] space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted dark:text-slate-400 block">
                    Due Date
                  </span>
                  {currentOcc && (
                    <input
                      type="date"
                      value={currentOcc.dueDate}
                      disabled={isCompleted}
                      onChange={(e) => onDueDateChange(currentOcc.id, e.target.value)}
                      className="w-full bg-surface dark:bg-[#080D1A] border border-border dark:border-[#1E2D4A] rounded-lg px-2.5 py-1.5 text-xs font-semibold text-foreground dark:text-slate-100 disabled:opacity-60"
                    />
                  )}
                  {data.daysOverdue > 0 && !isCompleted && (
                    <span className="text-[11px] font-semibold text-rose-500 block">
                      ⚠ {data.daysOverdue} days overdue
                    </span>
                  )}
                </div>

                {/* Responsible Person Field */}
                <div className="p-3.5 rounded-xl bg-surface-subtle dark:bg-[#0E1626] border border-border dark:border-[#1E2D4A] space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted dark:text-slate-400 block">
                    Responsible Person
                  </span>
                  {currentOcc && (
                    <select
                      value={currentOcc.assignedTo || ''}
                      disabled={isCompleted}
                      onChange={(e) => onAssigneeChange(currentOcc.id, e.target.value || null)}
                      className="w-full bg-surface dark:bg-[#080D1A] border border-border dark:border-[#1E2D4A] rounded-lg px-2.5 py-1.5 text-xs font-semibold text-foreground dark:text-slate-100 disabled:opacity-60"
                    >
                      <option value="">Unassigned</option>
                      {teamMembers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.role})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Description Field */}
              <div className="p-4 rounded-xl bg-surface-subtle dark:bg-[#0E1626] border border-border dark:border-[#1E2D4A] space-y-2">
                <span className="text-xs font-semibold text-foreground dark:text-slate-300 block">
                  Description & Context
                </span>
                <p className="text-xs text-muted dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {activity?.description || 'No description provided for this activity.'}
                </p>
              </div>

              {/* Occurrence History (if recurring) */}
              {activity?.isRecurring && data.occurrences.length > 1 && (
                <div className="p-4 rounded-xl bg-surface-subtle dark:bg-[#0E1626] border border-border dark:border-[#1E2D4A] space-y-3">
                  <span className="text-xs font-semibold text-foreground dark:text-slate-300 block">
                    All Occurrences ({data.occurrences.length})
                  </span>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {data.occurrences.map((occ) => (
                      <div
                        key={occ.id}
                        className={cn(
                          'flex items-center justify-between p-2 rounded-lg text-xs border',
                          occ.id === currentOcc?.id
                            ? 'bg-[#008F83]/10 border-[#008F83]/30 text-foreground dark:text-white font-semibold'
                            : 'bg-surface dark:bg-[#080D1A] border-border/60 dark:border-[#1E2D4A]/60 text-muted dark:text-slate-400'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span>#{occ.sequenceNumber}</span>
                          <span>Due {format(parseISO(occ.dueDate), 'dd MMM yyyy')}</span>
                        </div>
                        <span className="capitalize">{occ.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Comments Tab */}
          {data && activeTab === 'comments' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="space-y-3">
                {data.comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-3.5 rounded-xl bg-surface-subtle dark:bg-[#0E1626] border border-border dark:border-[#1E2D4A] space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-[#008F83]/15 text-[#008F83] dark:text-[#32D5C4] border border-[#008F83]/30 flex items-center justify-center text-[10px] font-bold uppercase">
                          {comment.userName?.charAt(0) || 'U'}
                        </div>
                        <span className="text-xs font-bold text-foreground dark:text-slate-200">
                          {comment.userName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10.5px] text-muted dark:text-slate-400">
                        <span>{format(parseISO(comment.createdAt), 'dd MMM · HH:mm')}</span>
                        <button
                          type="button"
                          onClick={() => onDeleteComment(comment.id)}
                          className="text-muted hover:text-rose-500 transition-colors"
                          title="Delete comment"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-foreground/90 dark:text-slate-300 leading-relaxed pl-7">
                      {comment.comment}
                    </p>
                  </div>
                ))}

                {data.comments.length === 0 && (
                  <div className="py-12 text-center text-xs text-muted dark:text-slate-500">
                    No comments yet. Start the conversation below.
                  </div>
                )}
              </div>

              {/* Comment Input Box */}
              <form onSubmit={handleCommentSubmit} className="space-y-2 pt-2">
                <textarea
                  rows={3}
                  required
                  placeholder="Add a comment or update for this activity instance..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="w-full bg-surface dark:bg-[#080D1A] border border-border dark:border-[#1E2D4A] rounded-xl px-3.5 py-2.5 text-xs text-foreground dark:text-slate-100 placeholder:text-muted dark:placeholder:text-slate-500 focus:outline-none focus:border-[#008F83] resize-none"
                />
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    variant="default"
                    size="sm"
                    loading={isSubmittingComment}
                    className="bg-[#008F83] hover:bg-[#007A70] text-white font-semibold"
                  >
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    Comment
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Activity Journal Tab */}
          {data && activeTab === 'journal' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/80 dark:before:bg-[#1E2D4A]">
                {data.journal.map((event) => (
                  <div key={event.id} className="relative text-xs">
                    {/* Event Dot */}
                    <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-surface dark:bg-[#0B1320] border-2 border-[#008F83] flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#008F83]" />
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground dark:text-slate-200 capitalize">
                          {event.eventType.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] text-muted dark:text-slate-400">
                          {format(parseISO(event.createdAt), 'dd MMM yyyy · HH:mm')}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted dark:text-slate-400">
                        Actor: <strong className="text-foreground dark:text-slate-300">{event.actorName}</strong>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {data && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border dark:border-[#1E2D4A] bg-surface-subtle dark:bg-[#0B1320] shrink-0">
            <div>
              {!isCompleted ? (
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={() => onCompleteClick(data)}
                  className="bg-[#008F83] hover:bg-[#007A70] text-white font-semibold flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Mark Complete
                </Button>
              ) : (
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Activity Instance Completed
                </span>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
