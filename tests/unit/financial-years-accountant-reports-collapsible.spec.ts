import { test, expect } from '@playwright/test';
import { canAccessNavItem } from '@/lib/auth/permissions';
import {
  getFinancialYear,
  getFinancialYearStart,
  getFinancialYearEnd,
  getCurrentFinancialYearNumber,
  isDateInFinancialYear,
  getFinancialYearMonths,
  getFinancialYears,
  formatFinancialYear,
} from '@/lib/finance/financial-year';
import { resolveAccountantReportDateRange } from '@/lib/finance/accountant-report-service';
import { calculateBasWorksheet, calculateGstPortion } from '@/modules/finance/domain/bas-calculations';
import { useWidgetPreferencesStore } from '@/lib/stores/useWidgetPreferencesStore';

test.describe('PropertyLedge — Financial Years, Accountant Reports & Collapsible Widgets Test Suite', () => {

  // =========================================================================
  // FEATURE 1: DEDICATED FINANCIAL YEARS SECTION
  // =========================================================================
  test.describe('Feature 1: Dedicated Financial Years Section', () => {
    test('1.1. Navigation and RBAC permission checks for financial-years', () => {
      // Owner and Manager with financial permissions can access
      expect(canAccessNavItem('owner', 'financial-years', ['financial.view'])).toBe(true);
      expect(canAccessNavItem('manager', 'financial-years', ['expense.view'])).toBe(true);
      expect(canAccessNavItem('owner', 'financial-years', ['invoice.view'])).toBe(true);

      // Default persona fallback
      expect(canAccessNavItem('owner', 'financial-years')).toBe(true);
      expect(canAccessNavItem('manager', 'financial-years')).toBe(true);

      // Viewer without financial view cannot access
      expect(canAccessNavItem('viewer', 'financial-years', ['property.view'])).toBe(false);
    });

    test('1.2. Statutory Australian Financial Year date boundaries (01 July – 30 June)', () => {
      // FY26: 01 Jul 2025 to 30 Jun 2026
      expect(getFinancialYearStart(2026)).toBe('2025-07-01');
      expect(getFinancialYearEnd(2026)).toBe('2026-06-30');

      // Boundary tests
      expect(isDateInFinancialYear('2025-06-30', 2026)).toBe(false); // belongs to FY25
      expect(isDateInFinancialYear('2025-07-01', 2026)).toBe(true);
      expect(isDateInFinancialYear('2026-06-30', 2026)).toBe(true);
      expect(isDateInFinancialYear('2026-07-01', 2026)).toBe(false); // belongs to FY27

      // Leap year boundary (FY24 had 29 Feb 2024)
      expect(isDateInFinancialYear('2024-02-29', 2024)).toBe(true);
      expect(getFinancialYearEnd(2024)).toBe('2024-06-30');
    });

    test('1.3. Financial Year status derivation logic', () => {
      const currentFY = getCurrentFinancialYearNumber();

      // Current year is active
      const determineStatus = (fy: number) => {
        if (fy === currentFY) return 'active';
        if (fy > currentFY) return 'upcoming';
        return 'closed';
      };

      expect(determineStatus(currentFY)).toBe('active');
      expect(determineStatus(currentFY - 1)).toBe('closed');
      expect(determineStatus(currentFY + 1)).toBe('upcoming');
    });

    test('1.4. 12-Month Australian progression sequence (July through June)', () => {
      const months = getFinancialYearMonths(2026);
      expect(months).toHaveLength(12);

      // First month is July 2025
      expect(months[0].month).toBe(7);
      expect(months[0].year).toBe(2025);
      expect(months[0].label).toBe('July 2025');

      // Final month is June 2026
      expect(months[11].month).toBe(6);
      expect(months[11].year).toBe(2026);
      expect(months[11].label).toBe('June 2026');
    });

    test('1.5. Available financial years generator adheres to countBack and countForward', () => {
      const currentFY = getCurrentFinancialYearNumber();
      const options = getFinancialYears({ countBack: 3, countForward: 1 });

      // 3 back + current + 1 forward = 5 years
      expect(options).toHaveLength(5);
      expect(options[0].year).toBe(currentFY + 1);
      expect(options[options.length - 1].year).toBe(currentFY - 3);
    });

    test('1.6. Global date boundaries spanning multiple financial years have minDate <= maxDate', () => {
      const availableFys = getFinancialYears({ countBack: 5, countForward: 1 });
      const allStarts = availableFys.map((f) => f.range.start).filter(Boolean);
      const allEnds = availableFys.map((f) => f.range.end).filter(Boolean);
      const minDate = allStarts.reduce((min, cur) => (cur < min ? cur : min), allStarts[0]);
      const maxDate = allEnds.reduce((max, cur) => (cur > max ? cur : max), allEnds[0]);

      expect(minDate <= maxDate).toBe(true);
      expect(minDate).toBe('2021-07-01'); // FY22 start
      expect(maxDate).toBe('2028-06-30'); // FY28 end
    });
  });

  // =========================================================================
  // FEATURE 2: DEDICATED ACCOUNTANT REPORTS SECTION
  // =========================================================================
  test.describe('Feature 2: Dedicated Accountant Reports Section', () => {
    test('2.1. Navigation and RBAC permission checks for accountant-reports', () => {
      expect(canAccessNavItem('owner', 'accountant-reports', ['financial.view'])).toBe(true);
      expect(canAccessNavItem('manager', 'accountant-reports', ['expense.view'])).toBe(true);
      expect(canAccessNavItem('owner', 'accountant-reports', ['insights.view'])).toBe(true);
      expect(canAccessNavItem('owner', 'accountant-reports')).toBe(true);
      expect(canAccessNavItem('manager', 'accountant-reports')).toBe(true);
      expect(canAccessNavItem('viewer', 'accountant-reports', ['task.view'])).toBe(false);
    });

    test('2.2. Accountant report date range resolution for FY and quarters', () => {
      // Annual FY27
      const annual = resolveAccountantReportDateRange({ financialYear: 2027, period: 'FY' });
      expect(annual.range.start).toBe('2026-07-01');
      expect(annual.range.end).toBe('2027-06-30');
      expect(annual.periodLabel).toContain('FY27');

      // Q1 (July - September)
      const q1 = resolveAccountantReportDateRange({ financialYear: 2027, period: 'Q1' });
      expect(q1.range.start).toBe('2026-07-01');
      expect(q1.range.end).toBe('2026-09-30');

      // Q2 (October - December)
      const q2 = resolveAccountantReportDateRange({ financialYear: 2027, period: 'Q2' });
      expect(q2.range.start).toBe('2026-10-01');
      expect(q2.range.end).toBe('2026-12-31');

      // Q3 (January - March)
      const q3 = resolveAccountantReportDateRange({ financialYear: 2027, period: 'Q3' });
      expect(q3.range.start).toBe('2027-01-01');
      expect(q3.range.end).toBe('2027-03-31');

      // Q4 (April - June)
      const q4 = resolveAccountantReportDateRange({ financialYear: 2027, period: 'Q4' });
      expect(q4.range.start).toBe('2027-04-01');
      expect(q4.range.end).toBe('2027-06-30');
    });

    test('2.3. Australian GST math: 1/11th extraction and rounding integrity', () => {
      // $110 inclusive of GST -> GST is $10.00
      expect(calculateGstPortion(110, true).gst).toBe(10.0);

      // $55 inclusive -> $5.00
      expect(calculateGstPortion(55, true).gst).toBe(5.0);

      // $100 inclusive -> $9.0909... -> rounded to $9.09
      expect(calculateGstPortion(100, true).gst).toBe(9.09);

      // $0 inclusive -> $0.00
      expect(calculateGstPortion(0, true).gst).toBe(0);
    });

    test('2.4. BAS Worksheet aggregation and ATO label integrity (G1, G10, G11, 1A, 1B, Net GST)', () => {
      const mockTransactions = [
        // Rental income (operating sales G1, GST inclusive)
        {
          id: 'tx-1',
          property_id: 'prop-1',
          transaction_type: 'income',
          amount: 2200, // $200 GST
          gst_inclusive: true,
          status: 'completed',
          transaction_date: '2026-08-15',
        },
        // Maintenance expense (operating purchases G11, GST inclusive)
        {
          id: 'tx-2',
          property_id: 'prop-1',
          transaction_type: 'expense',
          amount: 550, // $50 GST
          gst_inclusive: true,
          status: 'completed',
          transaction_date: '2026-08-20',
        },
        // Capital purchase (capital purchases G10, GST inclusive)
        {
          id: 'tx-3',
          property_id: 'prop-1',
          transaction_type: 'expense',
          amount: 1100, // $100 GST
          gst_inclusive: true,
          status: 'completed',
          transaction_date: '2026-09-01',
          tax_classification: {
            bas_code: 'G10',
          },
        },
      ];

      const mockProperties = [{ id: 'prop-1', name: '100 Collins St' }];

      const bas = calculateBasWorksheet(mockTransactions as any, mockProperties, {
        year: 2027,
        period: 'Q1',
      });

      // Total Sales G1 = 2200
      expect(bas.totals.totalSales).toBe(2200);

      // Capital Purchases G10 = 1100
      expect(bas.totals.capitalExpensesGross).toBe(1100);

      // Non-capital operating purchases G11 = 550
      expect(bas.totals.nonCapitalExpensesGross).toBe(550);

      // 1A GST collected from sales = $200
      expect(bas.totals.gstOnSales).toBe(200);

      // 1B GST paid on purchases (operating $50 + capital $100) = $150
      expect(bas.totals.gstOnExpenses).toBe(150);

      // Net GST position = 1A - 1B = 200 - 150 = 50
      expect(bas.totals.netGstPosition).toBe(50);
    });
  });

  // =========================================================================
  // FEATURE 3: COLLAPSIBLE DASHBOARD WIDGETS
  // =========================================================================
  test.describe('Feature 3: Collapsible Dashboard Widgets', () => {
    test.beforeEach(() => {
      // Clear store state before each test
      useWidgetPreferencesStore.getState().resetAll();
    });

    test('3.1. Default widget state is expanded (isCollapsed: false)', () => {
      const state = useWidgetPreferencesStore.getState();
      expect(state.isCollapsed('dashboard-cashflow-chart')).toBe(false);
      expect(state.isCollapsed('dashboard-top-kpis')).toBe(false);
      expect(state.isCollapsed('dashboard-portfolio-performance')).toBe(false);
    });

    test('3.2. Independent widget collapse toggle', () => {
      const { toggleWidget } = useWidgetPreferencesStore.getState();

      // Toggle cashflow chart
      toggleWidget('dashboard-cashflow-chart');
      expect(useWidgetPreferencesStore.getState().isCollapsed('dashboard-cashflow-chart')).toBe(true);

      // Other widgets remain expanded
      expect(useWidgetPreferencesStore.getState().isCollapsed('dashboard-cashflow-summary')).toBe(false);
      expect(useWidgetPreferencesStore.getState().isCollapsed('dashboard-top-kpis')).toBe(false);

      // Toggle again restores expanded state
      useWidgetPreferencesStore.getState().toggleWidget('dashboard-cashflow-chart');
      expect(useWidgetPreferencesStore.getState().isCollapsed('dashboard-cashflow-chart')).toBe(false);
    });

    test('3.3. Explicit setCollapsed action works idempotently', () => {
      const { setCollapsed } = useWidgetPreferencesStore.getState();

      setCollapsed('dashboard-needs-attention', true);
      expect(useWidgetPreferencesStore.getState().isCollapsed('dashboard-needs-attention')).toBe(true);

      // Repeated call retains collapsed state
      setCollapsed('dashboard-needs-attention', true);
      expect(useWidgetPreferencesStore.getState().isCollapsed('dashboard-needs-attention')).toBe(true);

      // Expand
      setCollapsed('dashboard-needs-attention', false);
      expect(useWidgetPreferencesStore.getState().isCollapsed('dashboard-needs-attention')).toBe(false);
    });

    test('3.4. Batch collapseAll and expandAll operations', () => {
      const widgetIds = [
        'dashboard-top-kpis',
        'dashboard-cashflow-chart',
        'dashboard-portfolio-performance',
      ];

      // Collapse all
      useWidgetPreferencesStore.getState().collapseAll(widgetIds);
      widgetIds.forEach((id) => {
        expect(useWidgetPreferencesStore.getState().isCollapsed(id)).toBe(true);
      });

      // Expand all
      useWidgetPreferencesStore.getState().expandAll(widgetIds);
      widgetIds.forEach((id) => {
        expect(useWidgetPreferencesStore.getState().isCollapsed(id)).toBe(false);
      });
    });

    test('3.5. resetAll clears stored preferences safely', () => {
      useWidgetPreferencesStore.getState().setCollapsed('dashboard-cashflow-chart', true);
      useWidgetPreferencesStore.getState().setCollapsed('dashboard-top-kpis', true);

      expect(useWidgetPreferencesStore.getState().isCollapsed('dashboard-cashflow-chart')).toBe(true);

      useWidgetPreferencesStore.getState().resetAll();

      expect(useWidgetPreferencesStore.getState().isCollapsed('dashboard-cashflow-chart')).toBe(false);
      expect(useWidgetPreferencesStore.getState().isCollapsed('dashboard-top-kpis')).toBe(false);
    });
  });
});
