import React from 'react';
import { getCurrentUser } from '@/lib/auth/queries';
import { redirect } from 'next/navigation';
import {
  fetchActivitiesAction,
  fetchActivityTypesAction,
  fetchWorkspaceTeamMembersAction,
  checkActivityPermissions,
} from '@/app/actions/activities';
import { resolveWorkspaceContext } from '@/lib/workspace/context';
import { ActivityClientView } from '@/components/activity/ActivityClientView';

export const metadata = {
  title: 'Activities & Autopilot | Property Ledge',
  description: 'Track property activities, accountability, due dates, and automated recurrence.',
};

export default async function ActivityPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const context = await resolveWorkspaceContext();
  const workspaceId = context?.workspaceId;

  let canViewAllActivities = true;
  if (workspaceId) {
    const permResult = await checkActivityPermissions(workspaceId, user.id);
    canViewAllActivities = permResult.canViewAll;
  }

  const initialAssignedTo = canViewAllActivities ? 'all' : user.id;

  const [activitiesRes, activityTypes, teamMembersRes] = await Promise.all([
    fetchActivitiesAction({ assignedTo: initialAssignedTo }),
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

  const teamMembers = teamMembersRes.data || [{ id: user.id, name: 'You', role: 'owner' }];

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      <ActivityClientView
        initialItems={initialItems}
        initialStats={initialStats}
        activityTypes={activityTypes}
        teamMembers={teamMembers}
        currentUserId={user.id}
        initialAssignedTo={initialAssignedTo}
        canViewAllActivities={canViewAllActivities}
      />
    </div>
  );
}
