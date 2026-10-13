import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { AccountantReportsView } from '@/components/finance/accountant-reports/AccountantReportsView';
import { fetchReportFilterOptionsAction } from '@/app/actions/reports';
import { getCurrentFinancialYearNumber } from '@/lib/finance/financial-year';

export const metadata: Metadata = {
  title: 'Accountant Reports | PropertyLedge',
  description: 'Statutory Australian BAS statements, verified expense audit packs, and accountant-ready financial reports for Australian property investors and property managers.',
};

export default async function AccountantReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    fy?: string;
    propertyId?: string;
  }>;
}) {
  const params = await searchParams;
  let properties: Array<{ id: string; name: string }> = [];

  try {
    const filterOptions = await fetchReportFilterOptionsAction();
    properties = filterOptions.properties || [];
  } catch (err) {
    console.error('Failed to pre-fetch accountant filter options on server:', err);
  }

  const initialFY = params?.fy ? parseInt(params.fy, 10) : getCurrentFinancialYearNumber();

  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading Accountant Reports...</div>}>
      <AccountantReportsView
        initialProperties={properties}
        initialFinancialYear={initialFY}
      />
    </Suspense>
  );
}
