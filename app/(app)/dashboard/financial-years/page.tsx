import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { FinancialYearsView } from '@/components/finance/financial-years/FinancialYearsView';
import { fetchFinancialYearsOverviewAction } from '@/app/actions/financial-years';

export const metadata: Metadata = {
  title: 'Financial Years | PropertyLedge',
  description: 'Manage Australian financial reporting periods (01 July – 30 June), review active and closed accounting years, and track portfolio ledger volume.',
};

export default async function FinancialYearsPage({
  searchParams,
}: {
  searchParams: Promise<{ propertyId?: string }>;
}) {
  const params = await searchParams;
  let initialData = null;

  try {
    const res = await fetchFinancialYearsOverviewAction(params?.propertyId);
    if (res.success && res.data) {
      initialData = res.data;
    }
  } catch (err) {
    console.error('Failed to pre-fetch financial years on server:', err);
  }

  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading Financial Years...</div>}>
      <FinancialYearsView initialData={initialData} />
    </Suspense>
  );
}
