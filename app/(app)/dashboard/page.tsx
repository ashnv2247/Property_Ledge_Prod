import React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser, getUserProfile } from '@/lib/auth/queries';
import { getSubscription } from '@/lib/subscriptions/queries';
import { getLatestPaymentForAccount } from '@/lib/billing/service';
import { DashboardOverview } from '@/components/dashboard/overview/DashboardOverview';
import { getSetupProgress } from '@/lib/dashboard/setupProgress';
import { fetchDashboardDataAction } from '@/app/actions/dashboard';

export const metadata: Metadata = {
  title: 'Dashboard | PropertyLedge',
  description: 'Property management dashboard overview',
};

export const revalidate = 0;

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [profile, setupProgress, dashboardData, subscription, latestPayment] = await Promise.all([
    getUserProfile(user.id),
    getSetupProgress(user.id),
    fetchDashboardDataAction().catch(() => null),
    getSubscription(user.id).catch(() => null),
    getLatestPaymentForAccount(user.id).catch(() => null),
  ]);

  const userName = profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';

  return (
    <DashboardOverview
      userName={userName}
      setupProgress={setupProgress}
      initialDashboardData={dashboardData}
      subscription={subscription}
      latestPayment={latestPayment}
    />
  );
}
