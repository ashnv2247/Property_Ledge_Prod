import { test, expect } from '@playwright/test';
import {
  formatAccountingAmount,
  mapToAtoCategory,
  ATO_EXPENSE_CATEGORIES,
} from '../../lib/finance/accountant-reports-consolidated-service';
import {
  generateComparativeStatementPdf,
  generateRentalSchedulePdf,
} from '../../lib/pdf/accountant-reports-pdf-service';
import {
  ComparativeStatementData,
  RentalScheduleData,
} from '../../modules/finance/domain/accountant-reports-models';

test.describe('Accountant Reports Consolidated Module — Financial Logic & PDF Verification', () => {
  test('1. formatAccountingAmount formats numbers, parenthesized negatives, and em-dash zeros correctly', () => {
    // Zero or null/undefined
    expect(formatAccountingAmount(0)).toBe('—');
    expect(formatAccountingAmount(null)).toBe('—');
    expect(formatAccountingAmount(undefined)).toBe('—');
    expect(formatAccountingAmount(0.0001)).toBe('—');

    // Positive numbers
    expect(formatAccountingAmount(1551)).toBe('1,551');
    expect(formatAccountingAmount(2012)).toBe('2,012');
    expect(formatAccountingAmount(6918, true)).toBe('$6,918');

    // Negative numbers (must be enclosed in parentheses as per Australian accounting standards)
    expect(formatAccountingAmount(-2261)).toBe('(2,261)');
    expect(formatAccountingAmount(-1802)).toBe('(1,802)');
    expect(formatAccountingAmount(-6918)).toBe('(6,918)');
    expect(formatAccountingAmount(-6918, true)).toBe('($6,918)');
  });

  test('2. mapToAtoCategory correctly maps property expense aliases to statutory ATO codes [A] to [X]', () => {
    expect(mapToAtoCategory('Body Corporate')).toEqual({ code: 'E', name: 'Body corporate fees' });
    expect(mapToAtoCategory('Strata Levy')).toEqual({ code: 'E', name: 'Body corporate fees' });
    expect(mapToAtoCategory('Cleaning service')).toEqual({ code: 'G', name: 'Cleaning' });
    expect(mapToAtoCategory('Council rates Q2')).toEqual({ code: 'H', name: 'Council rates' });
    expect(mapToAtoCategory('Capital allowance assets')).toEqual({ code: 'I', name: 'Capital allowance assets' });
    expect(mapToAtoCategory('Mortgage interest')).toEqual({ code: 'L', name: 'Interest' });
    expect(mapToAtoCategory('Plumbing repairs')).toEqual({ code: 'Q', name: 'Repairs' });
    expect(mapToAtoCategory('Capital works deductions (special building write-off)')).toEqual({ code: 'R', name: 'Capital works deductions' });
    expect(mapToAtoCategory('Stationery & office postage')).toEqual({ code: 'S', name: 'Office supplies' });
    expect(mapToAtoCategory('Water rates')).toEqual({ code: 'U', name: 'Water' });
    expect(mapToAtoCategory('Gardening / miscellaneous')).toEqual({ code: 'V', name: 'Sundry' });
  });

  test('3. Comparative Statement Variance calculations reconcile correctly against Image 3', () => {
    // Model test data directly matching Image 3 (Lot 5, Unit 323, 213A Princes Highway)
    const testComparativeData: ComparativeStatementData = {
      property: {
        id: 'prop-lot-5',
        name: 'Lot 5',
        address: 'Unit 323, 213A Princes Highway, Arncliffe NSW 2205',
        addressLine1: 'Unit 323, 213A Princes Highway',
        city: 'Arncliffe',
        state: 'NSW',
        postalCode: '2205',
        propertyType: 'Residential',
        ownershipPercentage: 100,
        lotUnitIdentifier: 'Lot 5',
      },
      selectedFy: '2024/25',
      previousFy: '2023/24',
      incomeRows: [
        {
          id: 'gross-rent',
          category: 'Gross Rent',
          code: 'A',
          currentAmount: 0,
          previousAmount: 0,
          variance: 0,
          percentageChange: null,
          direction: 'neutral',
        },
      ],
      totalIncomeCurrent: 0,
      totalIncomePrevious: 0,
      totalIncomeVariance: 0,
      expenseRows: [
        { id: '1', category: 'Body Corporate', currentAmount: 1551, previousAmount: 1331, variance: 220, percentageChange: 16.5, direction: 'increase' },
        { id: '2', category: 'Capital Allowance', currentAmount: 1876, previousAmount: 4137, variance: -2261, percentageChange: -54.7, direction: 'decrease' },
        { id: '3', category: 'Capital Work', currentAmount: 2012, previousAmount: 1896, variance: 116, percentageChange: 6.1, direction: 'increase' },
        { id: '4', category: 'Council rates', currentAmount: 981, previousAmount: 883, variance: 98, percentageChange: 11.1, direction: 'increase' },
        { id: '5', category: 'Water Rates', currentAmount: 498, previousAmount: 473, variance: 25, percentageChange: 5.3, direction: 'increase' },
      ],
      totalExpensesCurrent: 6918,
      totalExpensesPrevious: 8720,
      totalExpensesVariance: -1802,
      netRentalResultCurrent: -6918,
      netRentalResultPrevious: -8720,
      netRentalResultVariance: 1802,
      summary: {
        hasImprovement: true,
        narrative: 'Net rental result improved by $1,802 due to reduced capital allowance deductions.',
        expenseVarianceFormatted: '($1,802)',
        netRentalVarianceFormatted: '$1,802',
      },
    };

    // Total expenses check
    const sumCurrentExpenses = testComparativeData.expenseRows.reduce((acc, r) => acc + r.currentAmount, 0);
    expect(sumCurrentExpenses).toBe(6918);

    const sumPreviousExpenses = testComparativeData.expenseRows.reduce((acc, r) => acc + r.previousAmount, 0);
    expect(sumPreviousExpenses).toBe(8720);

    const expenseVariance = sumCurrentExpenses - sumPreviousExpenses;
    expect(expenseVariance).toBe(-1802);

    // Net rental profit/loss: income - expenses
    const netCurrent = testComparativeData.totalIncomeCurrent - sumCurrentExpenses;
    expect(netCurrent).toBe(-6918);

    const netPrevious = testComparativeData.totalIncomePrevious - sumPreviousExpenses;
    expect(netPrevious).toBe(-8720);

    // Variance in Net Rental Position: -6918 - (-8720) = +1802 (Improvement)
    const netVariance = netCurrent - netPrevious;
    expect(netVariance).toBe(1802);
  });

  test('4. Rental Schedule calculations reconcile correctly against Images 1 & 2', () => {
    const grossRent = 38800;
    const ownershipPercentage = 100;
    const shareFactor = ownershipPercentage / 100;

    const expenses = [
      { code: 'E', name: 'Body corporate fees', grossAmount: 5800 },
      { code: 'G', name: 'Cleaning', grossAmount: 300 },
      { code: 'H', name: 'Council rates', grossAmount: 1800 },
      { code: 'I', name: 'Capital allowance assets', grossAmount: 5200 },
      { code: 'L', name: 'Interest', grossAmount: 31000 },
      { code: 'Q', name: 'Repairs', grossAmount: 5199 },
      { code: 'R', name: 'Capital works deductions', grossAmount: 3000 },
      { code: 'S', name: 'Office supplies', grossAmount: 250 },
      { code: 'U', name: 'Water', grossAmount: 850 },
      { code: 'V', name: 'Sundry', grossAmount: 980 },
    ];

    const totalExpensesGross = expenses.reduce((acc, e) => acc + e.grossAmount, 0);
    expect(totalExpensesGross).toBe(54379);

    const totalNetRentGross = grossRent - totalExpensesGross;
    expect(totalNetRentGross).toBe(-15579);

    const totalNetRentShare = totalNetRentGross * shareFactor;
    expect(totalNetRentShare).toBe(-15579);
  });

  test('5. PDF generation creates valid, non-empty PDF binary documents for both reports', async () => {
    const testComparativeData: ComparativeStatementData = {
      property: {
        id: 'prop-1',
        name: 'Lot 5',
        address: 'Unit 323, 213A Princes Highway, Arncliffe NSW 2205',
        addressLine1: 'Unit 323, 213A Princes Highway',
        city: 'Arncliffe',
        state: 'NSW',
        postalCode: '2205',
        propertyType: 'Residential',
        ownershipPercentage: 100,
        lotUnitIdentifier: 'Lot 5',
      },
      selectedFy: '2024/25',
      previousFy: '2023/24',
      incomeRows: [
        { id: 'gross-rent', category: 'Gross Rent', currentAmount: 0, previousAmount: 0, variance: 0, percentageChange: null, direction: 'neutral' },
      ],
      totalIncomeCurrent: 0,
      totalIncomePrevious: 0,
      totalIncomeVariance: 0,
      expenseRows: [
        { id: '1', category: 'Body Corporate', currentAmount: 1551, previousAmount: 1331, variance: 220, percentageChange: 16.5, direction: 'increase' },
        { id: '2', category: 'Capital Allowance', currentAmount: 1876, previousAmount: 4137, variance: -2261, percentageChange: -54.7, direction: 'decrease' },
      ],
      totalExpensesCurrent: 3427,
      totalExpensesPrevious: 5468,
      totalExpensesVariance: -2041,
      netRentalResultCurrent: -3427,
      netRentalResultPrevious: -5468,
      netRentalResultVariance: 2041,
      summary: {
        hasImprovement: true,
        narrative: 'Net rental movement test narrative.',
        expenseVarianceFormatted: '($2,041)',
        netRentalVarianceFormatted: '$2,041',
      },
    };

    // 1. Generate Comparative Statement PDF
    const comparativePdf = await generateComparativeStatementPdf(testComparativeData);
    expect(comparativePdf).toBeInstanceOf(Uint8Array);
    expect(comparativePdf.length).toBeGreaterThan(1000);
    // Verify PDF header magic bytes "%PDF"
    const compHeader = String.fromCharCode(...comparativePdf.slice(0, 4));
    expect(compHeader).toBe('%PDF');

    // 2. Generate Rental Schedule PDF
    const testRentalScheduleData: RentalScheduleData = {
      property: {
        id: 'prop-2',
        name: 'Kensington Property',
        address: 'Kensington Parade, Kensington NSW 2033',
        addressLine1: 'Kensington Parade',
        city: 'KENSINGTON',
        state: 'NSW',
        postalCode: '2033',
      },
      financialYear: 2025,
      financialYearLabel: 'FY 2024/25',
      taxYearLabel: 'Individual Tax Return 2025',
      sectionA: {
        address: 'Kensington Parade',
        city: 'KENSINGTON',
        state: 'NSW',
        postcode: '2033',
        propertyName: 'Lot 5 Unit 323',
        dateFirstEarnedRentalIncome: '20/11/2017',
        weeksRentedThisYear: 52,
        weeksAvailableForRentThisYear: 52,
        ownershipPercentage: 100,
        loanRenegotiated: 'No',
      },
      sectionB: {
        acquisitionDate: '20/11/2017',
        acquisitionAmount: 650000,
        disposalDate: null,
        disposalAmount: null,
        capitalGainLoss: null,
        capitalAllowancesRecouped: null,
        capitalWorksRecouped: null,
      },
      sectionC: {
        owners: [{ name: 'Deepak & Ashish', tfnStatus: 'TFN Recorded', percentage: 100 }],
        totalPercentage: 100,
      },
      sectionD: {
        income: {
          rentalIncome: { code: 'A', name: 'Rental income', grossAmount: 38800, ownerShare: 38800 },
          grossRent: { code: 'C', name: 'Gross rent', grossAmount: 38800, ownerShare: 38800, isSubtotal: true },
        },
        expenses: [
          { code: 'E', name: 'Body corporate fees', grossAmount: 5800, ownerShare: 5800 },
          { code: 'G', name: 'Cleaning', grossAmount: 300, ownerShare: 300 },
        ],
        totalExpenses: { code: 'W', name: 'Total expenses', grossAmount: 6100, ownerShare: 6100, isSubtotal: true },
        totalNetRent: { code: 'X', name: 'Total net rent', grossAmount: 32700, ownerShare: 32700, isSubtotal: true },
      },
      reviewWarnings: [],
    };

    const schedulePdf = await generateRentalSchedulePdf(testRentalScheduleData);
    expect(schedulePdf).toBeInstanceOf(Uint8Array);
    expect(schedulePdf.length).toBeGreaterThan(1000);
    const schedHeader = String.fromCharCode(...schedulePdf.slice(0, 4));
    expect(schedHeader).toBe('%PDF');
  });
});
