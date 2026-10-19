import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/queries';
import { fetchEligiblePropertiesForAutopilotAction } from '@/app/actions/autopilot';
import { fetchWorkspaceTeamMembersAction } from '@/app/actions/activities';
import { AutopilotCreateView } from '@/components/autopilot/AutopilotCreateView';

export const metadata = {
  title: 'Configure Property Activities | PropertyLedge',
  description: 'Review suggested property activities, configure due dates, responsible persons, and recurrence before making activities Live.',
};

interface AutopilotCreatePageProps {
  searchParams: Promise<{ propertyId?: string }>;
}

export default async function AutopilotCreatePage({ searchParams }: AutopilotCreatePageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const { propertyId } = await searchParams;
  const [propRes, teamRes] = await Promise.all([
    fetchEligiblePropertiesForAutopilotAction(),
    fetchWorkspaceTeamMembersAction(),
  ]);

  const properties = propRes.data || [];
  const teamMembers = teamRes.data || [{ id: user.id, name: 'You', role: 'owner' }];

  return (
    <AutopilotCreateView
      properties={properties}
      preselectedPropertyId={propertyId}
      teamMembers={teamMembers}
      currentUserId={user.id}
    />
  );
}
