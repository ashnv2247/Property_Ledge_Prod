'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchActivitiesAction,
  fetchActivityDetailAction,
  createActivityAction,
  updateOccurrenceStatusAction,
  updateOccurrenceAssignmentAction,
  updateOccurrenceDueDateAction,
  completeOccurrenceAction,
  addActivityCommentAction,
  deleteActivityCommentAction,
  archiveActivityAction,
  activateSuggestedActivityAction,
  dismissSuggestedActivityAction,
} from '@/app/actions/activities';
import { ActivityHeader } from '@/components/activity/ActivityHeader';
import { ActivityStatsStrip } from '@/components/activity/ActivityStatsStrip';
import { ActivityFilterBar } from '@/components/activity/ActivityFilterBar';
import { ActivityBoard } from '@/components/activity/ActivityBoard';
import { ActivityList } from '@/components/activity/ActivityList';
import { ActivityCalendar } from '@/components/activity/ActivityCalendar';
import { ActivityMyView } from '@/components/activity/ActivityMyView';
import { ActivityReviewQueue } from '@/components/activity/ActivityReviewQueue';
import { ActivityDetailDrawer } from '@/components/activity/ActivityDetailDrawer';
import { ActivityCompleteModal } from '@/components/activity/ActivityCompleteModal';
import { ActivityCreateModal } from '@/components/activity/ActivityCreateModal';
import { usePropertyContext } from '@/components/property/PropertyContext';
import type {
  ActivityBoardItem,
  ActivityDetailData,
  ActivityStats,
  ActivityFilters,
  CreateActivityInput,
  OccurrenceStatus,
  ActivityType,
} from '@/types/activity';

interface ActivityClientViewProps {
  pageTitle?: string;
  pageSubtitle?: string;
  badgeText?: string;
  newButtonText?: string;
  initialItems: ActivityBoardItem[];
  initialStats: ActivityStats;
  activityTypes: ActivityType[];
  teamMembers: Array<{ id: string; name: string; avatarUrl?: string | null; role: string }>;
  currentUserId?: string;
  initialAssignedTo?: string;
  canViewAllActivities?: boolean;
  isTasksOnly?: boolean;
  allowCreate?: boolean;
}

export function ActivityClientView({
  pageTitle,
  pageSubtitle,
  badgeText,
  newButtonText,
  initialItems,
  initialStats,
  activityTypes,
  teamMembers,
  currentUserId,
  initialAssignedTo,
  canViewAllActivities = true,
  isTasksOnly = false,
  allowCreate = true,
}: ActivityClientViewProps) {
  const { selectedProperty } = usePropertyContext();

  const [items, setItems] = useState<ActivityBoardItem[]>(initialItems);
  const [stats, setStats] = useState<ActivityStats>(initialStats);
  const [isLoading, setIsLoading] = useState(false);

  const [filters, setFilters] = useState<ActivityFilters>({
    propertyId: selectedProperty ? selectedProperty.propertyId : 'all',
    assignedTo: initialAssignedTo || (canViewAllActivities ? 'all' : (currentUserId || 'all')),
    activityTypeId: 'all',
    status: 'all',
    searchQuery: '',
    viewMode: 'board',
  });

  // Drawer & Modals State
  const [selectedItem, setSelectedItem] = useState<ActivityBoardItem | null>(null);
  const [detailData, setDetailData] = useState<ActivityDetailData | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createInitialDueDate, setCreateInitialDueDate] = useState<string | undefined>();

  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [completeTarget, setCompleteTarget] = useState<ActivityBoardItem | null>(null);

  // Sync property context changes
  useEffect(() => {
    if (selectedProperty) {
      setFilters((prev) => ({ ...prev, propertyId: selectedProperty.propertyId }));
    } else {
      setFilters((prev) => ({ ...prev, propertyId: 'all' }));
    }
  }, [selectedProperty]);

  // Load activities when filters change
  const loadActivities = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetchActivitiesAction(filters);
      if (res.success && res.data) {
        setItems(res.data);
        if (res.stats) setStats(res.stats);
      }
    } catch (err) {
      console.error('Failed to load activities:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  // Load detail data on card click
  const handleCardClick = async (item: ActivityBoardItem) => {
    setSelectedItem(item);
    setIsDetailLoading(true);
    try {
      const res = await fetchActivityDetailAction(item.activityId, item.id);
      if (res.success && res.data) {
        setDetailData(res.data);
      }
    } catch (err) {
      console.error('Failed to load detail data:', err);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleCloseDrawer = () => {
    setSelectedItem(null);
    setDetailData(null);
  };

  // Status Change Mutation
  const handleStatusChange = async (occurrenceId: string, newStatus: OccurrenceStatus) => {
    // Optimistic update
    setItems((prev) =>
      prev.map((item) =>
        item.id === occurrenceId ? { ...item, status: newStatus } : item
      )
    );

    if (detailData && detailData.currentOccurrence.id === occurrenceId) {
      setDetailData({
        ...detailData,
        currentOccurrence: {
          ...detailData.currentOccurrence,
          status: newStatus,
        },
      });
    }

    try {
      await updateOccurrenceStatusAction(occurrenceId, newStatus);
      await loadActivities();
    } catch (err) {
      console.error('Failed to update status:', err);
      await loadActivities();
    }
  };

  // Assignee Change Mutation
  const handleAssigneeChange = async (occurrenceId: string, assignedTo: string | null) => {
    const member = teamMembers.find((m) => m.id === assignedTo);
    setItems((prev) =>
      prev.map((item) =>
        item.id === occurrenceId
          ? {
              ...item,
              assignedTo,
              assignedToName: member?.name || 'Unassigned',
              assignedToAvatarUrl: member?.avatarUrl,
            }
          : item
      )
    );

    if (detailData && detailData.currentOccurrence.id === occurrenceId) {
      setDetailData({
        ...detailData,
        currentOccurrence: {
          ...detailData.currentOccurrence,
          assignedTo,
        },
        assignedUser: member
          ? { id: member.id, name: member.name, avatarUrl: member.avatarUrl }
          : null,
      });
    }

    try {
      await updateOccurrenceAssignmentAction(occurrenceId, assignedTo);
      await loadActivities();
    } catch (err) {
      console.error('Failed to update assignee:', err);
      await loadActivities();
    }
  };

  // Due Date Change Mutation
  const handleDueDateChange = async (occurrenceId: string, newDueDate: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === occurrenceId ? { ...item, dueDate: newDueDate } : item
      )
    );

    if (detailData && detailData.currentOccurrence.id === occurrenceId) {
      setDetailData({
        ...detailData,
        currentOccurrence: {
          ...detailData.currentOccurrence,
          dueDate: newDueDate,
        },
      });
    }

    try {
      await updateOccurrenceDueDateAction(occurrenceId, newDueDate);
      await loadActivities();
    } catch (err) {
      console.error('Failed to update due date:', err);
      await loadActivities();
    }
  };

  // Comments Mutation
  const handleAddComment = async (
    activityId: string,
    commentText: string,
    occurrenceId?: string | null
  ) => {
    const res = await addActivityCommentAction(activityId, commentText, occurrenceId);
    if (res.success && res.comment && detailData) {
      setDetailData({
        ...detailData,
        comments: [...detailData.comments, res.comment],
      });
      // Increment comment count on board
      setItems((prev) =>
        prev.map((i) =>
          i.activityId === activityId ? { ...i, commentCount: i.commentCount + 1 } : i
        )
      );
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (detailData) {
      setDetailData({
        ...detailData,
        comments: detailData.comments.filter((c) => c.id !== commentId),
      });
    }
    await deleteActivityCommentAction(commentId);
  };

  // Completion Flow
  const handleOpenCompleteModal = (item: ActivityBoardItem | ActivityDetailData) => {
    if ('activity' in item) {
      // It is ActivityDetailData
      const bItem = items.find((i) => i.id === item.currentOccurrence.id) || {
        id: item.currentOccurrence.id,
        activityId: item.activity.id,
        title: item.activity.title,
        dueDate: item.currentOccurrence.dueDate,
        status: item.currentOccurrence.status,
        isRecurring: item.activity.isRecurring,
        recurrenceFrequency: item.activity.recurrenceFrequency,
        recurrenceInterval: item.activity.recurrenceInterval,
      } as ActivityBoardItem;
      setCompleteTarget(bItem);
    } else {
      setCompleteTarget(item);
    }
    setIsCompleteModalOpen(true);
  };

  const handleConfirmComplete = async (completionDate: string, completionNotes: string) => {
    if (!completeTarget) return;

    try {
      await completeOccurrenceAction({
        occurrenceId: completeTarget.id,
        completionDate,
        completionNotes,
      });
      setIsCompleteModalOpen(false);
      setCompleteTarget(null);
      if (selectedItem?.id === completeTarget.id) {
        handleCloseDrawer();
      }
      await loadActivities();
    } catch (err) {
      console.error('Failed to complete activity:', err);
    }
  };

  // Creation Flow
  const handleCreateActivity = async (input: CreateActivityInput) => {
    const res = await createActivityAction(input);
    if (res.success) {
      setIsCreateModalOpen(false);
      await loadActivities();
    }
  };

  // Archive Flow
  const handleArchiveActivity = async (activityId: string) => {
    await archiveActivityAction(activityId);
    handleCloseDrawer();
    await loadActivities();
  };

  // Autopilot Draft Actions
  const handleActivateDraft = async (item: ActivityBoardItem) => {
    await activateSuggestedActivityAction(item.activityId, item.dueDate, item.assignedTo || undefined);
    await loadActivities();
  };

  const handleDismissDraft = async (item: ActivityBoardItem) => {
    await dismissSuggestedActivityAction(item.activityId);
    await loadActivities();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <ActivityHeader
        title={pageTitle}
        subtitle={pageSubtitle}
        badgeText={badgeText}
        newButtonText={newButtonText}
        hideViewSelector={isTasksOnly}
        hideNewButton={!allowCreate}
        currentView={filters.viewMode}
        onViewChange={(viewMode) => setFilters((prev) => ({ ...prev, viewMode }))}
        draftCount={stats.draftCount}
        onNewActivityClick={
          allowCreate
            ? () => {
                setCreateInitialDueDate(undefined);
                setIsCreateModalOpen(true);
              }
            : undefined
        }
      />

      {/* KPI Stats Bar */}
      <ActivityStatsStrip
        stats={stats}
        onFilterClick={(status) => {
          if (status === 'overdue') {
            setFilters((prev) => ({ ...prev, status: 'open' }));
          } else {
            setFilters((prev) => ({ ...prev, status }));
          }
        }}
      />

      {/* Compact Filters */}
      <ActivityFilterBar
        filters={filters}
        onChange={setFilters}
        teamMembers={teamMembers}
        activityTypes={activityTypes}
        canViewAllActivities={!isTasksOnly && canViewAllActivities}
      />

      {/* Main Views Container */}
      <div>
        {(isTasksOnly || filters.viewMode === 'board') && (
          <ActivityBoard
            items={items}
            onCardClick={handleCardClick}
            onCompleteClick={handleOpenCompleteModal}
            onArchiveClick={(item) => handleArchiveActivity(item.activityId)}
            onStatusChange={handleStatusChange}
            onNewActivityClick={allowCreate ? () => setIsCreateModalOpen(true) : undefined}
            allowCreate={allowCreate}
          />
        )}

        {!isTasksOnly && filters.viewMode === 'list' && (
          <ActivityList
            items={items}
            onCardClick={handleCardClick}
            onCompleteClick={handleOpenCompleteModal}
            onArchiveClick={(item) => handleArchiveActivity(item.activityId)}
          />
        )}

        {!isTasksOnly && filters.viewMode === 'calendar' && (
          <ActivityCalendar
            items={items}
            onCardClick={handleCardClick}
            onNewActivityOnDate={(dateStr) => {
              setCreateInitialDueDate(dateStr);
              setIsCreateModalOpen(true);
            }}
          />
        )}

        {!isTasksOnly && filters.viewMode === 'my' && (
          <ActivityMyView
            items={items}
            onCardClick={handleCardClick}
            onCompleteClick={handleOpenCompleteModal}
            onArchiveClick={(item) => handleArchiveActivity(item.activityId)}
          />
        )}

        {!isTasksOnly && filters.viewMode === 'review' && (
          <ActivityReviewQueue
            draftItems={items.filter((i) => i.lifecycleStatus === 'draft')}
            onActivate={handleActivateDraft}
            onDismiss={handleDismissDraft}
            onReviewClick={handleCardClick}
          />
        )}
      </div>

      {/* Activity Detail Drawer */}
      <ActivityDetailDrawer
        isOpen={Boolean(selectedItem)}
        onClose={handleCloseDrawer}
        data={detailData}
        isLoading={isDetailLoading}
        teamMembers={teamMembers}
        onStatusChange={handleStatusChange}
        onAssigneeChange={handleAssigneeChange}
        onDueDateChange={handleDueDateChange}
        onAddComment={handleAddComment}
        onDeleteComment={handleDeleteComment}
        onCompleteClick={handleOpenCompleteModal}
        onArchiveClick={handleArchiveActivity}
      />

      {/* Complete Modal */}
      <ActivityCompleteModal
        isOpen={isCompleteModalOpen}
        onClose={() => {
          setIsCompleteModalOpen(false);
          setCompleteTarget(null);
        }}
        item={completeTarget}
        activityTitle={completeTarget?.title}
        isRecurring={completeTarget?.isRecurring}
        recurrenceFrequency={completeTarget?.recurrenceFrequency}
        recurrenceInterval={completeTarget?.recurrenceInterval}
        onConfirm={handleConfirmComplete}
      />

      {/* Create Modal */}
      <ActivityCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        teamMembers={teamMembers}
        activityTypes={activityTypes}
        initialDueDate={createInitialDueDate}
        onSuccess={handleCreateActivity}
      />
    </div>
  );
}
