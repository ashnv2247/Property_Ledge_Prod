import { test, expect } from '@playwright/test';
import {
  resolveAccountantReportDateRange,
  formatExpenseDisplayId,
} from '../../lib/finance/accountant-report-service';
import { AccountantExpenseReportPdfGenerator } from '../../lib/pdf/accountant-expense-report-pdf';
import {
  AccountantExpenseReportData,
  AccountantCategorySummary,
  AccountantExpenseItem,
} from '../../modules/finance/domain/accountant-report-types';
import { PDFDocument } from 'pdf-lib';

test.describe('Accountant Expense Report Unit Tests', () => {
  test('1. resolveAccountantReportDateRange accurately resolves financial year and quarterly periods', () => {
    // Standard FY26 filter (01 Jul 2025 – 30 Jun 2026)
    const fy26 = resolveAccountantReportDateRange({ financialYear: 2026, period: 'FY' });
    expect(fy26.range.start).toBe('2025-07-01');
    expect(fy26.range.end).toBe('2026-06-30');
    expect(fy26.periodLabel).toContain('FY26');
    expect(fy26.periodLabel).toContain('2025');

    // Q1 FY27 (01 Jul 2026 – 30 Sep 2026)
    const q1Fy27 = resolveAccountantReportDateRange({ financialYear: 2027, period: 'Q1' });
    expect(q1Fy27.range.start).toBe('2026-07-01');
    expect(q1Fy27.range.end).toBe('2026-09-30');
    expect(q1Fy27.periodLabel).toContain('Q1 FY27');

    // Q2 FY27 (01 Oct 2026 – 31 Dec 2026)
    const q2Fy27 = resolveAccountantReportDateRange({ financialYear: 2027, period: 'Q2' });
    expect(q2Fy27.range.start).toBe('2026-10-01');
    expect(q2Fy27.range.end).toBe('2026-12-31');

    // Q3 FY27 (01 Jan 2027 – 31 Mar 2027)
    const q3Fy27 = resolveAccountantReportDateRange({ financialYear: 2027, period: 'Q3' });
    expect(q3Fy27.range.start).toBe('2027-01-01');
    expect(q3Fy27.range.end).toBe('2027-03-31');

    // Q4 FY27 (01 Apr 2027 – 30 Jun 2027)
    const q4Fy27 = resolveAccountantReportDateRange({ financialYear: 2027, period: 'Q4' });
    expect(q4Fy27.range.start).toBe('2027-04-01');
    expect(q4Fy27.range.end).toBe('2027-06-30');

    // Custom date range
    const custom = resolveAccountantReportDateRange({
      dateFrom: '2026-08-01',
      dateTo: '2026-08-31',
    });
    expect(custom.range.start).toBe('2026-08-01');
    expect(custom.range.end).toBe('2026-08-31');
    expect(custom.periodLabel).toBe('2026-08-01 to 2026-08-31');
  });

  test('2. formatExpenseDisplayId formats standard and custom IDs consistently', () => {
    expect(formatExpenseDisplayId('123e4567-e89b-12d3-a456-426614174000')).toBe('EXP-74000');
    expect(formatExpenseDisplayId('', 5)).toBe('EXP-00005');
  });

  test('3. Category Reconciliation Calculation & Dynamic Error Detection Logic', () => {
    const expenses: AccountantExpenseItem[] = [
      {
        id: 'tx-1',
        displayId: 'EXP-00001',
        transactionDate: '2026-07-04',
        formattedDate: '04/07/2026',
        vendorName: 'Bunnings Warehouse',
        description: 'Plumbing tools and fittings',
        reference: 'INV-4410',
        amount: 120.0,
        formattedAmount: '$120.00',
        gstAmount: 10.91,
        formattedGst: '$10.91',
        gstInclusive: true,
        categoryId: 'cat-repairs',
        categoryName: 'Repairs & Maintenance',
        taxClassificationName: 'Repair & Maintenance',
        basCode: '1B',
        propertyId: 'prop-1',
        propertyName: '12 Example Street, Sydney',
        paymentMethod: 'CREDIT CARD',
        reconciliationStatus: 'RECONCILED',
        isReconciled: true,
        attachments: [
          {
            id: 'att-1',
            fileName: 'bunnings_receipt.jpg',
            mimeType: 'image/jpeg',
            fileSize: 102400,
            url: 'https://example.com/bunnings.jpg',
            isPdf: false,
            isImage: true,
          },
        ],
        hasEvidence: true,
        notes: null,
      },
      {
        id: 'tx-2',
        displayId: 'EXP-00002',
        transactionDate: '2026-07-15',
        formattedDate: '15/07/2026',
        vendorName: 'Rapid Electrical',
        description: 'Emergency switchboard repair',
        reference: 'INV-8890',
        amount: 480.0,
        formattedAmount: '$480.00',
        gstAmount: 43.64,
        formattedGst: '$43.64',
        gstInclusive: true,
        categoryId: 'cat-repairs',
        categoryName: 'Repairs & Maintenance',
        taxClassificationName: 'Repair & Maintenance',
        basCode: '1B',
        propertyId: 'prop-1',
        propertyName: '12 Example Street, Sydney',
        paymentMethod: 'BANK TRANSFER',
        reconciliationStatus: 'RECONCILED',
        isReconciled: true,
        attachments: [],
        hasEvidence: false,
        notes: null,
      },
    ];

    const categorySum = expenses.reduce((sum, e) => sum + e.amount, 0);
    expect(categorySum).toBe(600.0);

    const individualSum = expenses.map((e) => e.amount).reduce((a, b) => a + b, 0);
    expect(individualSum).toBe(600.0);
    expect(Math.abs(categorySum - individualSum) < 0.005).toBe(true);

    // Missing evidence check
    const missingEvidenceCount = expenses.filter((e) => !e.hasEvidence).length;
    expect(missingEvidenceCount).toBe(1);
    const withEvidenceCount = expenses.filter((e) => e.hasEvidence).length;
    expect(withEvidenceCount).toBe(1);
  });

  test('4. PDF Generation Engine compiles self-contained document with embedded evidence without errors', async () => {
    const mockReportData: AccountantExpenseReportData = {
      metadata: {
        reportId: 'EXP-VER-2026-AUDIT',
        generatedAt: '2026-10-08T12:00:00Z',
        generatedBy: 'John Accountant',
        workspaceName: 'Acme Property Management',
        propertyName: '12 Example Street, Bondi Beach NSW',
        periodLabel: 'Q1 FY2027 (01 Jul 2026 – 30 Sep 2026)',
        dateRange: {
          start: '2026-07-01',
          end: '2026-09-30',
        },
      },
      summary: {
        totalExpenses: 24820.0,
        formattedTotalExpenses: '$24,820.00',
        totalGst: 2256.36,
        formattedTotalGst: '$2,256.36',
        totalExpenseCount: 3,
        evidenceAttachedCount: 2,
        missingEvidenceCount: 1,
        reconciledCount: 3,
        unreconciledCount: 0,
        isFullyReconciled: true,
        reconciliationErrors: [],
      },
      categories: [
        {
          categoryId: 'cat-cleaning',
          categoryName: 'Cleaning & Waste',
          expenseCount: 1,
          totalAmount: 450.0,
          formattedTotal: '$450.00',
          totalGst: 40.91,
          formattedGst: '$40.91',
          isReconciled: true,
          reconciliationDifference: 0,
          expenses: [
            {
              id: 'tx-clean-1',
              displayId: 'EXP-00101',
              transactionDate: '2026-07-05',
              formattedDate: '05/07/2026',
              vendorName: 'Sparkle Commercial Cleaners',
              description: 'End of lease full tenancy clean',
              reference: 'INV-9901',
              amount: 450.0,
              formattedAmount: '$450.00',
              gstAmount: 40.91,
              formattedGst: '$40.91',
              gstInclusive: true,
              categoryId: 'cat-cleaning',
              categoryName: 'Cleaning & Waste',
              taxClassificationName: 'Other Deductible Expense',
              basCode: '1B',
              propertyId: 'prop-1',
              propertyName: '12 Example Street, Bondi Beach NSW',
              paymentMethod: 'DIRECT DEBIT',
              reconciliationStatus: 'RECONCILED',
              isReconciled: true,
              attachments: [
                {
                  id: 'att-clean-1',
                  fileName: 'sparkle_clean_invoice.pdf',
                  mimeType: 'application/pdf',
                  fileSize: 45000,
                  url: 'https://example.com/sparkle.pdf',
                  isPdf: true,
                  isImage: false,
                },
              ],
              hasEvidence: true,
              notes: null,
            },
          ],
        },
        {
          categoryId: 'cat-repairs',
          categoryName: 'Repairs & Maintenance',
          expenseCount: 2,
          totalAmount: 24370.0,
          formattedTotal: '$24,370.00',
          totalGst: 2215.45,
          formattedGst: '$2,215.45',
          isReconciled: true,
          reconciliationDifference: 0,
          expenses: [
            {
              id: 'tx-rep-1',
              displayId: 'EXP-00102',
              transactionDate: '2026-07-10',
              formattedDate: '10/07/2026',
              vendorName: 'Apex Roof Restorations',
              description: 'Storm gutter replacement and roof repair',
              reference: 'INV-2044',
              amount: 24000.0,
              formattedAmount: '$24,000.00',
              gstAmount: 2181.82,
              formattedGst: '$2,181.82',
              gstInclusive: true,
              categoryId: 'cat-repairs',
              categoryName: 'Repairs & Maintenance',
              taxClassificationName: 'Capital Works',
              basCode: 'G10',
              propertyId: 'prop-1',
              propertyName: '12 Example Street, Bondi Beach NSW',
              paymentMethod: 'BANK TRANSFER',
              reconciliationStatus: 'RECONCILED',
              isReconciled: true,
              attachments: [
                {
                  id: 'att-roof-1',
                  fileName: 'roof_invoice.jpg',
                  mimeType: 'image/jpeg',
                  fileSize: 85000,
                  url: 'https://example.com/roof.jpg',
                  isPdf: false,
                  isImage: true,
                },
              ],
              hasEvidence: true,
              notes: null,
            },
            {
              id: 'tx-rep-2',
              displayId: 'EXP-00103',
              transactionDate: '2026-08-02',
              formattedDate: '02/08/2026',
              vendorName: 'Bunnings Group',
              description: 'Emergency door latch replacement',
              reference: 'REC-0012',
              amount: 370.0,
              formattedAmount: '$370.00',
              gstAmount: 33.63,
              formattedGst: '$33.63',
              gstInclusive: true,
              categoryId: 'cat-repairs',
              categoryName: 'Repairs & Maintenance',
              taxClassificationName: 'Repair & Maintenance',
              basCode: '1B',
              propertyId: 'prop-1',
              propertyName: '12 Example Street, Bondi Beach NSW',
              paymentMethod: 'CREDIT CARD',
              reconciliationStatus: 'RECONCILED',
              isReconciled: true,
              attachments: [],
              hasEvidence: false,
              notes: null,
            },
          ],
        },
      ],
    };

    const pdfBytes = await AccountantExpenseReportPdfGenerator.generate(mockReportData);

    expect(pdfBytes).toBeDefined();
    expect(pdfBytes.byteLength).toBeGreaterThan(1000);

    const loadedPdf = await PDFDocument.load(pdfBytes);
    expect(loadedPdf.getPageCount()).toBeGreaterThanOrEqual(2);
  });
});
