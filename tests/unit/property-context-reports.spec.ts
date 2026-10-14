import { test, expect } from '@playwright/test';
import { buildCacheKey } from '@/lib/stores/useEntityCacheStore';
import { resolveFilterDateRange } from '@/lib/finance/reporting-service';
import { calculateBasWorksheet } from '@/modules/finance/domain/bas-calculations';

test.describe('Property Context Integration in Reports Test Suite', () => {
  const WORKSPACE_ID = 'ws-test-123';
  const PROP_A = 'prop-alpha-1';
  const PROP_B = 'prop-beta-2';

  test.describe('1. SWR Entity Cache Key Partitioning per Property Context', () => {
    test('1.1 Generates distinct, isolated cache keys for each property and "all"', () => {
      // Condition reports entity
      const keyAll = buildCacheKey('condition_reports', WORKSPACE_ID, null);
      const keyPropA = buildCacheKey('condition_reports', WORKSPACE_ID, PROP_A);
      const keyPropB = buildCacheKey('condition_reports', WORKSPACE_ID, PROP_B);

      expect(keyAll).toBe(`condition_reports:${WORKSPACE_ID}:all`);
      expect(keyPropA).toBe(`condition_reports:${WORKSPACE_ID}:${PROP_A}`);
      expect(keyPropB).toBe(`condition_reports:${WORKSPACE_ID}:${PROP_B}`);

      expect(keyPropA).not.toBe(keyPropB);
      expect(keyPropA).not.toBe(keyAll);
    });

    test('1.2 Accountant Reports Hub partitions cache keys by property context', () => {
      const hubKeyAll = buildCacheKey('accountant_reports_hub', WORKSPACE_ID, 'all');
      const hubKeyPropA = buildCacheKey('accountant_reports_hub', WORKSPACE_ID, PROP_A);

      expect(hubKeyAll).toBe(`accountant_reports_hub:${WORKSPACE_ID}:all`);
      expect(hubKeyPropA).toBe(`accountant_reports_hub:${WORKSPACE_ID}:${PROP_A}`);
      expect(hubKeyPropA).not.toBe(hubKeyAll);
    });

    test('1.3 Extra key qualifiers (like FY) combine correctly with property context', () => {
      const fy26KeyPropA = buildCacheKey('accountant_reports_hub', WORKSPACE_ID, PROP_A, 'fy:2026');
      const fy27KeyPropA = buildCacheKey('accountant_reports_hub', WORKSPACE_ID, PROP_A, 'fy:2027');
      const fy26KeyPropB = buildCacheKey('accountant_reports_hub', WORKSPACE_ID, PROP_B, 'fy:2026');

      expect(fy26KeyPropA).toBe(`accountant_reports_hub:${WORKSPACE_ID}:${PROP_A}:fy:2026`);
      expect(fy27KeyPropA).toBe(`accountant_reports_hub:${WORKSPACE_ID}:${PROP_A}:fy:2027`);
      expect(fy26KeyPropB).toBe(`accountant_reports_hub:${WORKSPACE_ID}:${PROP_B}:fy:2026`);

      expect(fy26KeyPropA).not.toBe(fy27KeyPropA);
      expect(fy26KeyPropA).not.toBe(fy26KeyPropB);
    });
  });

  test.describe('2. Navigation and Query Param Preservation across Reports Tabs', () => {
    test('2.1 Appends propertyId query param to all Financial Reports nav links when active', () => {
      const selectedPropertyId: string = PROP_A;

      const tabs = [
        { id: 'overview', href: '/dashboard/reports?tab=overview' },
        { id: 'income-expense', href: '/dashboard/reports?tab=income-expense' },
        { id: 'financial-years', href: '/dashboard/financial-years' },
        { id: 'accountant-reports', href: '/dashboard/accountant-reports' },
        { id: 'bas', href: '/dashboard/bas' },
      ];

      const scopedTabs = tabs.map((tab) => {
        const url = new URL(tab.href, 'https://propertyledge.app');
        if (selectedPropertyId && selectedPropertyId !== 'all') {
          url.searchParams.set('propertyId', selectedPropertyId);
        }
        return { id: tab.id, fullUrl: url.pathname + url.search };
      });

      expect(scopedTabs.find((t) => t.id === 'overview')?.fullUrl).toBe(
        '/dashboard/reports?tab=overview&propertyId=prop-alpha-1'
      );
      expect(scopedTabs.find((t) => t.id === 'financial-years')?.fullUrl).toBe(
        '/dashboard/financial-years?propertyId=prop-alpha-1'
      );
      expect(scopedTabs.find((t) => t.id === 'accountant-reports')?.fullUrl).toBe(
        '/dashboard/accountant-reports?propertyId=prop-alpha-1'
      );
      expect(scopedTabs.find((t) => t.id === 'bas')?.fullUrl).toBe(
        '/dashboard/bas?propertyId=prop-alpha-1'
      );
    });

    test('2.2 Omits propertyId query param when "all" properties is selected', () => {
      const selectedPropertyId = 'all';

      const tabs = [
        { id: 'financial-years', href: '/dashboard/financial-years' },
        { id: 'accountant-reports', href: '/dashboard/accountant-reports' },
      ];

      const scopedTabs = tabs.map((tab) => {
        const url = new URL(tab.href, 'https://propertyledge.app');
        if (selectedPropertyId && selectedPropertyId !== 'all') {
          url.searchParams.set('propertyId', selectedPropertyId);
        }
        return { id: tab.id, fullUrl: url.pathname + url.search };
      });

      expect(scopedTabs.find((t) => t.id === 'financial-years')?.fullUrl).toBe(
        '/dashboard/financial-years'
      );
      expect(scopedTabs.find((t) => t.id === 'accountant-reports')?.fullUrl).toBe(
        '/dashboard/accountant-reports'
      );
    });
  });

  test.describe('3. Report Service & BAS Statement Property Scoping', () => {
    test('3.1 resolveFilterDateRange maintains FY boundaries when propertyId is present', () => {
      const filterWithProp = {
        financialYear: '2026',
        propertyId: PROP_A,
      };

      const range = resolveFilterDateRange(filterWithProp);
      expect(range.start).toBe('2025-07-01');
      expect(range.end).toBe('2026-06-30');
    });

    test('3.2 BAS worksheet isolates GST calculations for scoped property transactions', () => {
      const allTransactions: any[] = [
        {
          id: 'tx-1',
          property_id: PROP_A,
          status: 'completed',
          transaction_date: '2025-08-10',
          transaction_type: 'income',
          amount: 2200,
          gst_amount: 200,
          gst_inclusive: true,
          description: 'Commercial Lease Property A',
        },
        {
          id: 'tx-2',
          property_id: PROP_A,
          status: 'completed',
          transaction_date: '2025-08-15',
          transaction_type: 'expense',
          amount: 550,
          gst_amount: 50,
          gst_inclusive: true,
          description: 'Repairs Property A',
        },
        {
          id: 'tx-3',
          property_id: PROP_B,
          status: 'completed',
          transaction_date: '2025-08-20',
          transaction_type: 'income',
          amount: 10000,
          gst_amount: 1000,
          gst_inclusive: true,
          description: 'Commercial Lease Property B',
        },
      ];

      const properties = [
        { id: PROP_A, name: 'Property Alpha', gst_enabled: true },
        { id: PROP_B, name: 'Property Beta', gst_enabled: true },
      ];

      // Scoped to Property A
      const worksheetPropA = calculateBasWorksheet(
        allTransactions,
        properties,
        { year: 2026, period: 'Q1', propertyId: PROP_A }
      );

      // G1: Total Sales for Prop A = 2200 (ignoring Prop B's 10000)
      expect(worksheetPropA.totals.totalSales).toBe(2200);
      // 1A: GST on sales = 200
      expect(worksheetPropA.totals.gstOnSales).toBe(200);
      // 1B: GST on purchases = 50
      expect(worksheetPropA.totals.gstOnExpenses).toBe(50);
      // Net GST position: 200 - 50 = 150
      expect(worksheetPropA.totals.netGstPosition).toBe(150);
      expect(worksheetPropA.propertyName).toBe('Property Alpha');
    });
  });
});
