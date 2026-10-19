import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/queries';
import { fetchAutopilotConfigsAction, fetchAutopilotDashboardAction } from '@/app/actions/autopilot';
import { fetchWorkspaceTeamMembersAction } from '@/app/actions/activities';
import { AutopilotManageView } from '@/components/autopilot/AutopilotManageView';

export const metadata = {
  title: 'Manage Autopilots | PropertyLedge',
  description: 'View and control your property automations, update schedules, and manage their lifecycle.',
};

export default async function AutopilotManagePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const [configsRes, dashboardRes, teamRes] = await Promise.all([
    fetchAutopilotConfigsAction(),
    fetchAutopilotDashboardAction(),
    fetchWorkspaceTeamMembersAction(),
  ]);

  const configs = configsRes.data || [];
  const executions = dashboardRes.data?.recentActivity || [];
  const teamMembers = teamRes.data || [{ id: user.id, name: 'You', role: 'owner' }];

  return (
    <AutopilotManageView
      initialConfigs={configs}
      executions={executions}
      teamMembers={teamMembers}
    />
  );
}
