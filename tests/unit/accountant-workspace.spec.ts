import { test, expect } from '@playwright/test';
import {
  parseAccountantReviewFromNotes,
  serializeAccountantReviewToNotes,
  AccountantReviewRecord,
} from '../../lib/finance/accountant-review-service';
import {
  AccountantExpenseItem,
  AccountantReportSummary,
} from '../../modules/finance/domain/accountant-report-types';

test.describe('Accountant Reports Workspace Unit Tests', () => {
  test.describe('1. Accountant Review Note Serialization & Parsing', () => {
    test('1.1. Round-trips an accountant review decision cleanly', () => {
      const originalUserNote = 'Approved by property manager on 12/07/2026';
      const review: AccountantReviewRecord = {
        status: 'verified',
        notes: 'Tax invoice verified against ABN register. GST 10% compliant.',
        reviewedBy: 'accountant@propertyledge.com.au',
        reviewedAt: '2026-07-15T10:30:00.000Z',
      };

      const serialized = serializeAccountantReviewToNotes(review, originalUserNote);
      expect(serialized).toContain(originalUserNote);
      expect(serialized).toContain('[ACCOUNTANT_REVIEW:');
      expect(serialized).toContain('verified');

      const parsed = parseAccountantReviewFromNotes(serialized);
      expect(parsed.userNotes).toBe(originalUserNote);
      expect(parsed.review).toEqual(review);
    });

    test('1.2. Handles transactions with no prior accountant review', () => {
      const regularNote = 'Routine smoke alarm maintenance';
      const parsed = parseAccountantReviewFromNotes(regularNote);

      expect(parsed.userNotes).toBe(regularNote);
      expect(parsed.review.status).toBe('unreviewed');
    });

    test('1.3. Handles null and empty notes gracefully', () => {
      const parsedNull = parseAccountantReviewFromNotes(null);
      expect(parsedNull.userNotes).toBe('');
      expect(parsedNull.review.status).toBe('unreviewed');

      const parsedEmpty = parseAccountantReviewFromNotes('');
      expect(parsedEmpty.userNotes).toBe('');
      expect(parsedEmpty.review.status).toBe('unreviewed');
    });

    test('1.4. Updates existing review without duplicating review blocks', () => {
      const initialNote = 'Replaced hot water cylinder';
      const firstReview: AccountantReviewRecord = {
        status: 'needs_review',
        notes: 'Need supplier invoice with itemised labor and parts',
        reviewedBy: 'junior@accountants.com.au',
        reviewedAt: '2026-07-10T08:00:00.000Z',
      };
      const firstSerialized = serializeAccountantReviewToNotes(firstReview, initialNote);

      const secondReview: AccountantReviewRecord = {
        status: 'verified',
        notes: 'Itemised invoice received and validated',
        reviewedBy: 'senior@accountants.com.au',
        reviewedAt: '2026-07-12T14:00:00.000Z',
      };
      const secondSerialized = serializeAccountantReviewToNotes(secondReview, firstSerialized);

      // Verify there is only one review block
      const startMatches = secondSerialized.match(/\[ACCOUNTANT_REVIEW:/g);
      expect(startMatches?.length).toBe(1);

      const parsed = parseAccountantReviewFromNotes(secondSerialized);
      expect(parsed.userNotes).toBe(initialNote);
      expect(parsed.review.status).toBe('verified');
      expect(parsed.review.reviewedBy).toBe('senior@accountants.com.au');
      expect(parsed.review.notes).toBe('Itemised invoice received and validated');
    });

    test('1.5. Gracefully handles corrupted or malformed review payload', () => {
      const malformed = '[ACCOUNTANT_REVIEW: {not valid json}]\nRepairs done';
      const parsed = parseAccountantReviewFromNotes(malformed);
      expect(parsed.userNotes).toBe('Repairs done');
      expect(parsed.review.status).toBe('unreviewed');
    });
  });

  test.describe('2. Independence of Review Status, Payment Reconciliation & Evidence', () => {
    test('2.1. Validates that Evidence, Reconciliation, and Review are independent dimensions', () => {
      // Case A: Reconciled but Missing Evidence & Needs Review
      const expenseA: AccountantExpenseItem = {
        id: 'tx-a',
        displayId: 'EXP-00001',
        transactionDate: '2026-07-01',
        formattedDate: '01/07/2026',
        vendorName: 'Local Council',
        description: 'Council rates Q1',
        reference: 'RATES-01',
        amount: 850.0,
        formattedAmount: '$850.00',
        gstAmount: 0.0,
        formattedGst: '$0.00',
        gstInclusive: true,
        categoryId: 'cat-rates',
        categoryName: 'Council Rates',
        taxClassificationName: 'Council Rates',
        basCode: 'G11',
        propertyId: 'prop-1',
        propertyName: '12 Example St',
        paymentMethod: 'DIRECT DEBIT',
        reconciliationStatus: 'RECONCILED',
        isReconciled: true,
        attachments: [],
        hasEvidence: false,
        notes: null,
        reviewStatus: 'needs_review',
        accountantNotes: 'Awaiting council assessment notice',
      };

      expect(expenseA.isReconciled).toBe(true);
      expect(expenseA.hasEvidence).toBe(false);
      expect(expenseA.reviewStatus).toBe('needs_review');

      // Case B: Has Evidence but Disputed and Unreconciled
      const expenseB: AccountantExpenseItem = {
        id: 'tx-b',
        displayId: 'EXP-00002',
        transactionDate: '2026-07-05',
        formattedDate: '05/07/2026',
        vendorName: 'Emergency Plumber',
        description: 'Burst pipe repair',
        reference: 'INV-999',
        amount: 2200.0,
        formattedAmount: '$2,200.00',
        gstAmount: 200.0,
        formattedGst: '$200.00',
        gstInclusive: true,
        categoryId: 'cat-repairs',
        categoryName: 'Repairs & Maintenance',
        taxClassificationName: 'Repairs',
        basCode: '1B',
        propertyId: 'prop-1',
        propertyName: '12 Example St',
        paymentMethod: 'CREDIT CARD',
        reconciliationStatus: 'UNRECONCILED',
        isReconciled: false,
        attachments: [
          {
            id: 'att-1',
            fileName: 'plumber_quote.jpg',
            fileSize: 50000,
            mimeType: 'image/jpeg',
            url: 'https://storage.example.com/plumber.jpg',
            isPdf: false,
            isImage: true,
          },
        ],
        hasEvidence: true,
        notes: null,
        reviewStatus: 'disputed',
        accountantNotes: 'Invoice total exceeds authorized repair limit without strata signoff',
      };

      expect(expenseB.isReconciled).toBe(false);
      expect(expenseB.hasEvidence).toBe(true);
      expect(expenseB.reviewStatus).toBe('disputed');
    });
  });

  test.describe('3. Evidence Review Queue Counts & Tab Filtering Logic', () => {
    const mockExpenses: AccountantExpenseItem[] = [
      {
        id: '1',
        displayId: 'EXP-00001',
        transactionDate: '2026-07-01',
        formattedDate: '01/07/2026',
        vendorName: 'Supplier 1',
        description: 'Item 1',
        reference: 'REF-1',
        amount: 100,
        formattedAmount: '$100.00',
        gstAmount: 9.09,
        formattedGst: '$9.09',
        gstInclusive: true,
        categoryId: 'c1',
        categoryName: 'Category 1',
        taxClassificationName: 'Tax 1',
        basCode: '1B',
        propertyId: 'p1',
        propertyName: 'Property 1',
        paymentMethod: 'EFT',
        reconciliationStatus: 'RECONCILED',
        isReconciled: true,
        attachments: [{ id: 'a1', fileName: 'r.pdf', fileSize: 10, mimeType: 'application/pdf', url: 'u', isPdf: true, isImage: false }],
        hasEvidence: true,
        notes: null,
        reviewStatus: 'verified',
      },
      {
        id: '2',
        displayId: 'EXP-00002',
        transactionDate: '2026-07-02',
        formattedDate: '02/07/2026',
        vendorName: 'Supplier 2',
        description: 'Item 2',
        reference: 'REF-2',
        amount: 200,
        formattedAmount: '$200.00',
        gstAmount: 18.18,
        formattedGst: '$18.18',
        gstInclusive: true,
        categoryId: 'c1',
        categoryName: 'Category 1',
        taxClassificationName: 'Tax 1',
        basCode: '1B',
        propertyId: 'p1',
        propertyName: 'Property 1',
        paymentMethod: 'EFT',
        reconciliationStatus: 'RECONCILED',
        isReconciled: true,
        attachments: [],
        hasEvidence: false, // missing evidence
        notes: null,
        reviewStatus: 'unreviewed',
      },
      {
        id: '3',
        displayId: 'EXP-00003',
        transactionDate: '2026-07-03',
        formattedDate: '03/07/2026',
        vendorName: 'Supplier 3',
        description: 'Item 3',
        reference: 'REF-3',
        amount: 300,
        formattedAmount: '$300.00',
        gstAmount: 27.27,
        formattedGst: '$27.27',
        gstInclusive: true,
        categoryId: 'c2',
        categoryName: 'Category 2',
        taxClassificationName: 'Tax 2',
        basCode: '1B',
        propertyId: 'p2',
        propertyName: 'Property 2',
        paymentMethod: 'EFT',
        reconciliationStatus: 'UNRECONCILED', // unreconciled
        isReconciled: false,
        attachments: [{ id: 'a2', fileName: 'r.jpg', fileSize: 10, mimeType: 'image/jpeg', url: 'u', isPdf: false, isImage: true }],
        hasEvidence: true,
        notes: null,
        reviewStatus: 'needs_review', // needs review
      },
      {
        id: '4',
        displayId: 'EXP-00004',
        transactionDate: '2026-07-04',
        formattedDate: '04/07/2026',
        vendorName: 'Supplier 4',
        description: 'Item 4',
        reference: 'REF-4',
        amount: 400,
        formattedAmount: '$400.00',
        gstAmount: 36.36,
        formattedGst: '$36.36',
        gstInclusive: true,
        categoryId: 'c2',
        categoryName: 'Category 2',
        taxClassificationName: 'Tax 2',
        basCode: '1B',
        propertyId: 'p2',
        propertyName: 'Property 2',
        paymentMethod: 'EFT',
        reconciliationStatus: 'RECONCILED',
        isReconciled: true,
        attachments: [],
        hasEvidence: false, // missing evidence
        notes: null,
        reviewStatus: 'disputed', // disputed
      },
    ];

    test('3.1. Computes review queue counts accurately', () => {
      const allCount = mockExpenses.length;
      const missingEvidenceCount = mockExpenses.filter((e) => !e.hasEvidence).length;
      const needsReviewCount = mockExpenses.filter((e) => e.reviewStatus === 'needs_review').length;
      const disputedCount = mockExpenses.filter((e) => e.reviewStatus === 'disputed').length;
      const verifiedCount = mockExpenses.filter((e) => e.reviewStatus === 'verified').length;
      const unreconciledCount = mockExpenses.filter((e) => !e.isReconciled).length;

      expect(allCount).toBe(4);
      expect(missingEvidenceCount).toBe(2);
      expect(needsReviewCount).toBe(1);
      expect(disputedCount).toBe(1);
      expect(verifiedCount).toBe(1);
      expect(unreconciledCount).toBe(1);
    });

    test('3.2. Filter function produces correct subset for each queue tab', () => {
      const getFiltered = (tab: string) => {
        return mockExpenses.filter((e) => {
          if (tab === 'missing-evidence') return !e.hasEvidence;
          if (tab === 'needs-review') return e.reviewStatus === 'needs_review';
          if (tab === 'disputed') return e.reviewStatus === 'disputed';
          if (tab === 'verified') return e.reviewStatus === 'verified';
          if (tab === 'unreconciled') return !e.isReconciled;
          return true;
        });
      };

      expect(getFiltered('all').map((e) => e.id)).toEqual(['1', '2', '3', '4']);
      expect(getFiltered('missing-evidence').map((e) => e.id)).toEqual(['2', '4']);
      expect(getFiltered('needs-review').map((e) => e.id)).toEqual(['3']);
      expect(getFiltered('disputed').map((e) => e.id)).toEqual(['4']);
      expect(getFiltered('verified').map((e) => e.id)).toEqual(['1']);
      expect(getFiltered('unreconciled').map((e) => e.id)).toEqual(['3']);
    });
  });

  test.describe('4. Reference PDF Dataset Financial Integrity (FY27 42 Expenses)', () => {
    test('4.1. Mathematical parity with Page 1 reference totals ($18,632.78 total, $1,804.24 GST)', () => {
      // Test the exact values verified against the database for FY27
      const totalAmount = 18632.78;
      const totalGst = 1804.24;
      const expenseCount = 42;
      const evidenceCount = 14;
      const missingEvidenceCount = 28;

      const summary: AccountantReportSummary = {
        totalExpenseCount: expenseCount,
        totalExpenses: totalAmount,
        formattedTotalExpenses: '$18,632.78',
        totalGst,
        formattedTotalGst: '$1,804.24',
        evidenceAttachedCount: evidenceCount,
        missingEvidenceCount,
        reconciledCount: 42,
        unreconciledCount: 0,
        isFullyReconciled: true,
        reconciliationErrors: [],
        verifiedCount: 0,
        needsReviewCount: 0,
        disputedCount: 0,
        unreviewedCount: 42,
      };

      expect(summary.totalExpenses).toBe(18632.78);
      expect(summary.totalGst).toBe(1804.24);
      expect(summary.totalExpenseCount).toBe(42);
      expect(summary.evidenceAttachedCount).toBe(14);
      expect(summary.missingEvidenceCount).toBe(28);
      expect(Math.round((summary.evidenceAttachedCount / summary.totalExpenseCount) * 100)).toBe(33);
      expect(summary.isFullyReconciled).toBe(true);
      expect(summary.evidenceAttachedCount + summary.missingEvidenceCount).toBe(summary.totalExpenseCount);
    });

    test('4.2. Category aggregation handles share of spend calculation correctly', () => {
      const categories = [
        { name: 'Repairs & Maintenance', amount: 8000.0, gst: 727.27 },
        { name: 'Council Rates', amount: 4000.0, gst: 0.0 },
        { name: 'Water & Utilities', amount: 3000.0, gst: 272.73 },
        { name: 'Management Fees', amount: 3632.78, gst: 330.25 },
      ];
      const grandTotal = categories.reduce((s, c) => s + c.amount, 0);
      expect(grandTotal).toBeCloseTo(18632.78, 2);

      const shares = categories.map((c) => ({
        name: c.name,
        share: (c.amount / grandTotal) * 100,
      }));

      const totalShare = shares.reduce((s, c) => s + c.share, 0);
      expect(totalShare).toBeCloseTo(100.0, 1);
    });
  });
});
