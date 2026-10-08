import React from 'react';
import { getCurrentUser } from '@/lib/auth/queries';
import { redirect } from 'next/navigation';
import {
  fetchActivitiesAction,
  fetchActivityTypesAction,
  fetchWorkspaceTeamMembersAction,
} from '@/app/actions/activities';
import { ActivityClientView } from '@/components/activity/ActivityClientView';

export const metadata = {
  title: 'Tasks | Property Ledge',
  description: 'View and track your assigned property tasks and action items.',
};

export default async function TasksPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  // Tasks page strictly fetches the current user's assigned tasks
  const [activitiesRes, activityTypes, teamMembersRes] = await Promise.all([
    fetchActivitiesAction({ assignedTo: user.id }),
    fetchActivityTypesAction(),
    fetchWorkspaceTeamMembersAction(),
  ]);

  const initialItems = activitiesRes.data || [];
  const initialStats = activitiesRes.stats || {
    total: 0,
    dueTodayCount: 0,
    dueSoonCount: 0,
    overdueCount: 0,
    inProgressCount: 0,
    upcomingCount: 0,
    completedCount: 0,
    draftCount: 0,
  };

  const teamMembers = teamMembersRes.data || [{ id: user.id, name: 'You', role: 'member' }];

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      <ActivityClientView
        pageTitle="Tasks"
        pageSubtitle="View, prioritize, and action your assigned property tasks."
        initialItems={initialItems}
        initialStats={initialStats}
        activityTypes={activityTypes}
        teamMembers={teamMembers}
        currentUserId={user.id}
        initialAssignedTo={user.id}
        canViewAllActivities={false}
        isTasksOnly={true}
        allowCreate={false}
      />
    </div>
  );
}
