import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/queries';
import { fetchAutopilotDashboardAction } from '@/app/actions/autopilot';
import { AutopilotDashboardView } from '@/components/autopilot/AutopilotDashboardView';

export const metadata = {
  title: 'Autopilot Dashboard | PropertyLedge',
  description: 'Monitor your automated property activities, track completed work, and manage upcoming tasks across your properties.',
};

export default async function AutopilotDashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const result = await fetchAutopilotDashboardAction();

  const initialData = result.data || {
    stats: {
      activeAutopilotsCount: 0,
      propertiesCoveredCount: 0,
      tasksCompletedCount: 0,
      tasksCompletedPeriodLabel: 'This Month',
      upcomingTasksCount: 0,
      upcomingWindowDays: 7,
      needsAttentionCount: 0,
    },
    autopilotSummaries: [],
    upcomingActivities: [],
    recentActivity: [],
    journalFeed: [],
    needsAttentionItems: [],
    propertiesList: [],
  };

  return <AutopilotDashboardView initialData={initialData} />;
}
