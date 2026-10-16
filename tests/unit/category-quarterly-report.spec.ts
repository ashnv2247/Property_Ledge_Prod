import { test, expect } from '@playwright/test';
import {
  FIXED_EXPENSE_CATEGORIES,
  buildCategoryQuarterlyData,
  formatReportCurrency,
  getAfyQuarter,
  DEMO_EXPENSE_ROWS,
} from '@/lib/finance/category-report-data';
import { TransactionDTO } from '@/modules/finance/domain/types';

test.describe('Financial Report Category Breakdown & AG Grid Logic Unit Tests', () => {
  test('1. Validates the 13 fixed categories from Excel specifications in exact order', () => {
    expect(FIXED_EXPENSE_CATEGORIES).toHaveLength(13);

    const expectedNames = [
      'Body corporate fees',
      'Capital allowance',
      'Council rates',
      'Depreciation',
      'Insurance',
      'Loan interest',
      'Land tax',
      'Real estate agent charges',
      'Repairs & maintenance',
      'Stationery',
      'Water rates',
      'Sundries',
      'Property Purchase Conveyancer Fees',
    ];

    FIXED_EXPENSE_CATEGORIES.forEach((cat, idx) => {
      expect(cat.categoryName).toBe(expectedNames[idx]);
    });
  });

  test('2. Resolves Australian Financial Year quarters correctly (Jul-Jun AFY cycle)', () => {
    // Q1: Jul - Sep
    expect(getAfyQuarter('2025-07-01')).toBe('Q1');
    expect(getAfyQuarter('2025-08-15')).toBe('Q1');
    expect(getAfyQuarter('2025-09-30')).toBe('Q1');

    // Q2: Oct - Dec
    expect(getAfyQuarter('2025-10-01')).toBe('Q2');
    expect(getAfyQuarter('2025-11-20')).toBe('Q2');
    expect(getAfyQuarter('2025-12-31')).toBe('Q2');

    // Q3: Jan - Mar
    expect(getAfyQuarter('2026-01-01')).toBe('Q3');
    expect(getAfyQuarter('2026-02-14')).toBe('Q3');
    expect(getAfyQuarter('2026-03-31')).toBe('Q3');

    // Q4: Apr - Jun
    expect(getAfyQuarter('2026-04-01')).toBe('Q4');
    expect(getAfyQuarter('2026-05-10')).toBe('Q4');
    expect(getAfyQuarter('2026-06-30')).toBe('Q4');
  });

  test('3. Currency formatter outputs "$ -" for zero and matches Image 1 spacing "$ 488.00"', () => {
    expect(formatReportCurrency(0)).toBe('$ -');
    expect(formatReportCurrency(null)).toBe('$ -');
    expect(formatReportCurrency(undefined)).toBe('$ -');
    expect(formatReportCurrency(488)).toBe('$ 488.00');
    expect(formatReportCurrency(1464)).toBe('$ 1,464.00');
    expect(formatReportCurrency(36)).toBe('$ 36.00');
    expect(formatReportCurrency(2542)).toBe('$ 2,542.00');
  });

  test('4. Falls back to authentic Image 1 & Excel demo data when no transactions exist', () => {
    const rows = buildCategoryQuarterlyData([]);
    expect(rows).toHaveLength(13);

    // Verify first row is Body corporate fees
    expect(rows[0].categoryName).toBe('Body corporate fees');
    expect(rows[0].totalAmount).toBe(1464);
    expect(rows[0].q2Amount).toBe(488);
    expect(rows[0].q3Amount).toBe(488);
    expect(rows[0].q4Amount).toBe(488);

    // Verify Council rates row
    const council = rows.find((r) => r.categoryName === 'Council rates');
    expect(council).toBeDefined();
    expect(council?.totalAmount).toBe(702);

    // Verify Repairs & maintenance has 6 transactions totaling $36
    const repairs = rows.find((r) => r.categoryName === 'Repairs & maintenance');
    expect(repairs).toBeDefined();
    expect(repairs?.totalAmount).toBe(36);
    expect(repairs?.transactions).toHaveLength(6);
    expect(repairs?.transactions[0].description).toBe('Plumbing callout');
    expect(repairs?.transactions[0].amount).toBe(8.0);
    expect(repairs?.transactions[1].description).toBe('Tap washer');
    expect(repairs?.transactions[1].amount).toBe(4.5);
  });

  test('5. Groups live transactions into fixed categories and preserves order', () => {
    const sampleTx: Partial<TransactionDTO>[] = [
      {
        id: 'tx-1',
        amount: 350,
        transaction_type: 'expense',
        transaction_date: '2025-10-15',
        description: 'Quarterly Strata Levy',
        vendor_name: 'Strata Corp',
        category: { id: 'cat-1', name: 'Strata / Body Corporate', transaction_type: 'expense', is_active: true } as any,
      },
      {
        id: 'tx-2',
        amount: 150,
        transaction_type: 'expense',
        transaction_date: '2025-08-10',
        description: 'Fix leaking pipe',
        vendor_name: 'Plumber Joe',
        category: { id: 'cat-2', name: 'Repairs & Maintenance', transaction_type: 'expense', is_active: true } as any,
      },
      {
        id: 'tx-3',
        amount: 80,
        transaction_type: 'expense',
        transaction_date: '2026-02-05',
        description: 'Custom Gardening Expense',
        vendor_name: 'Green Lawn',
        category: { id: 'cat-3', name: 'Landscaping & Tree Lopping', transaction_type: 'expense', is_active: true } as any,
      },
    ];

    const rows = buildCategoryQuarterlyData(sampleTx as TransactionDTO[]);

    // 13 fixed categories + 1 custom category = 14 rows
    expect(rows.length).toBeGreaterThanOrEqual(14);

    // 13 fixed categories are first
    for (let i = 0; i < 13; i++) {
      expect(rows[i].isFixed).toBe(true);
    }

    // Custom category is placed below fixed categories
    const customRow = rows[rows.length - 1];
    expect(customRow.isFixed).toBe(false);
    expect(customRow.categoryName).toBe('Landscaping & Tree Lopping');
    expect(customRow.q3Amount).toBe(80);

    // Check Body Corporate received $350 in Q2
    const bc = rows.find((r) => r.id === 'body_corporate');
    expect(bc?.q2Amount).toBe(350);
    expect(bc?.totalAmount).toBe(350);

    // Check Repairs received $150 in Q1
    const rep = rows.find((r) => r.id === 'repairs_maintenance');
    expect(rep?.q1Amount).toBe(150);
    expect(rep?.totalAmount).toBe(150);
  });
});
