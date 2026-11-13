import React from 'react';
import { ScheduleEmailHistoryClientView } from '@/components/invoices/ScheduleEmailHistoryClientView';
import {
  fetchInvoiceSchedulesAction,
  fetchInvoiceScheduleStatsAction,
} from '@/app/actions/invoice-schedules';

export const metadata = {
  title: 'Schedule Email Activity & Logs | PropertyLedge',
  description: 'Track recurring invoice schedules, bulk-generated monthly billing, and email delivery activities.',
};

export default async function ScheduleEmailPage() {
  const [schedulesData, stats] = await Promise.all([
    fetchInvoiceSchedulesAction({ limit: 100 }),
    fetchInvoiceScheduleStatsAction(),
  ]);

  return (
    <ScheduleEmailHistoryClientView
      initialSchedules={schedulesData.items || []}
      initialStats={stats}
    />
  );
}

