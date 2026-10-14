import React from 'react';
import { AccountantReportPage } from '@/components/properties/accountant-report/AccountantReportPage';

export default async function PropertyAccountantReportRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AccountantReportPage propertyId={id} />;
}
