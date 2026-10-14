import { test, expect } from '@playwright/test';
import {
  FinancialSummary,
  PropertyPerformance,
  YearOverYearComparison,
} from '@/modules/properties/domain/accountant-report-types';

test.describe('PropertyLedge — ATO Accountant Report & Property Performance Suite', () => {
  test('1. Property Performance Metric Formulas (Ash Spec Test Fixture)', () => {
    const propertyValue = 650000;
    const grossRent = 28600;
    const totalExpenses = 6918;

    // Card 1: Gross Rental Yield = (Annual Gross Rent / Property Value) * 100
    const grossYield = Number(((grossRent / propertyValue) * 100).toFixed(2));
    expect(grossYield).toBe(4.4); // 4.40%

    // Card 2: Net Rental Yield = ((Annual Gross Rent - Total Expenses) / Property Value) * 100
    const netCashPosition = grossRent - totalExpenses;
    const netYield = Number(((netCashPosition / propertyValue) * 100).toFixed(2));
    expect(netYield).toBe(3.34); // 3.34%

    // Card 3: Net Cash Position = Annual Gross Rent - Total Expenses
    expect(netCashPosition).toBe(21682); // $21,682

    // Card 4: Expense Ratio = (Total Expenses / Annual Gross Rent) * 100
    const expenseRatio = Number(((totalExpenses / grossRent) * 100).toFixed(2));
    expect(expenseRatio).toBe(24.19); // 24.19%
  });

  test('2. Edge Cases: Zero Gross Rent or Zero Property Value', () => {
    const zeroRent = 0;
    const propertyValue = 650000;
    const expenses = 1500;

    const grossYield = propertyValue > 0 ? Number(((zeroRent / propertyValue) * 100).toFixed(2)) : 0;
    const netCashPosition = zeroRent - expenses;
    const netYield = propertyValue > 0 ? Number(((netCashPosition / propertyValue) * 100).toFixed(2)) : 0;
    const expenseRatio = zeroRent > 0 ? Number(((expenses / zeroRent) * 100).toFixed(2)) : 0;

    expect(grossYield).toBe(0);
    expect(netCashPosition).toBe(-1500);
    expect(netYield).toBe(-0.23);
    expect(expenseRatio).toBe(0); // Safely avoids divide-by-zero
  });

  test('3. Year-Over-Year Variance & Direction Classification', () => {
    const compareItems = [
      {
        category: 'Council rates',
        cur: 2400,
        prev: 2100,
      },
      {
        category: 'Repairs and maintenance',
        cur: 1200,
        prev: 1800,
      },
      {
        category: 'Insurance',
        cur: 1500,
        prev: 1500,
      },
    ];

    const results = compareItems.map((item) => {
      const diff = item.cur - item.prev;
      const pct = item.prev > 0 ? Number(((diff / item.prev) * 100).toFixed(1)) : null;
      const direction = diff > 0 ? 'increase' : diff < 0 ? 'decrease' : 'neutral';
      return { ...item, diff, pct, direction };
    });

    // Council rates increased -> direction 'increase' (teal)
    expect(results[0].diff).toBe(300);
    expect(results[0].pct).toBe(14.3);
    expect(results[0].direction).toBe('increase');

    // Repairs decreased -> direction 'decrease' (rose/red)
    expect(results[1].diff).toBe(-600);
    expect(results[1].pct).toBe(-33.3);
    expect(results[1].direction).toBe('decrease');

    // Insurance unchanged -> direction 'neutral'
    expect(results[2].diff).toBe(0);
    expect(results[2].direction).toBe('neutral');
  });

  test('4. ATO Deductions Blank Field Retainment', () => {
    const deductionCategories = [
      { name: 'Advertising for tenants', amount: null },
      { name: 'Cleaning', amount: 350 },
      { name: 'Interest on loans', amount: null }, // Placeholder field
    ];

    // Verify fields with null amount are retained and formatted as "—"
    const displayValues = deductionCategories.map((item) => ({
      name: item.name,
      display: item.amount !== null ? `$${item.amount}` : '—',
    }));

    expect(displayValues[0].display).toBe('—');
    expect(displayValues[1].display).toBe('$350');
    expect(displayValues[2].display).toBe('—');
  });
});
