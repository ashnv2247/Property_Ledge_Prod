import React from 'react';
import { redirect } from 'next/navigation';

export default async function PropertyAccountantReportExternalRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/dashboard/properties/${id}/accountant-report`);
}
