import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/queries';
import { fetchAutopilotConfigsAction, fetchAutopilotDashboardAction } from '@/app/actions/autopilot';
import { fetchWorkspaceTeamMembersAction } from '@/app/actions/activities';
import { PropertyAutopilotDetailView } from '@/components/autopilot/PropertyAutopilotDetailView';

export const metadata = {
  title: 'Manage Property Autopilot | PropertyLedge',
  description: 'Configure and monitor automated activities, schedules, and lifecycle for this property.',
};

interface PropertyAutopilotPageProps {
  params: Promise<{ propertyId: string }>;
}

export default async function PropertyAutopilotPage({ params }: PropertyAutopilotPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const { propertyId } = await params;
  const [configsRes, dashboardRes, teamRes] = await Promise.all([
    fetchAutopilotConfigsAction(),
    fetchAutopilotDashboardAction({ propertyId }),
    fetchWorkspaceTeamMembersAction(),
  ]);

  const configs = configsRes.data || [];
  const executions = dashboardRes.data?.recentActivity || [];
  const teamMembers = teamRes.data || [{ id: user.id, name: 'You', role: 'owner' }];

  const config = configs.find((c) => c.propertyId === propertyId);

  if (!config) {
    redirect('/dashboard/autopilot/manage');
  }

  return (
    <PropertyAutopilotDetailView
      config={config}
      executions={executions}
      allConfigs={configs}
      teamMembers={teamMembers}
    />
  );
}
