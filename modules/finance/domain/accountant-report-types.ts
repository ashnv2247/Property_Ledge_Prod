import { z } from 'zod';

export interface AccountantReportFilters {
  workspaceId?: string;
  propertyId?: string | null;
  period?: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'FY' | 'custom' | string;
  financialYear?: number | string;
  dateFrom?: string;
  dateTo?: string;
  categoryIds?: string[];
}

export interface AccountantExpenseAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  url: string;
  blobPath?: string;
  isPdf: boolean;
  isImage: boolean;
}

export interface AccountantExpenseItem {
  id: string;
  displayId: string; // e.g. "EXP-00123"
  transactionDate: string;
  formattedDate: string;
  vendorName: string;
  description: string;
  reference: string | null;
  amount: number;
  formattedAmount: string;
  gstAmount: number;
  formattedGst: string;
  gstInclusive: boolean;
  categoryId: string;
  categoryName: string;
  taxClassificationName: string;
  basCode: string | null;
  propertyId: string;
  propertyName: string;
  paymentMethod: string;
  reconciliationStatus: 'RECONCILED' | 'UNRECONCILED';
  isReconciled: boolean;
  attachments: AccountantExpenseAttachment[];
  hasEvidence: boolean;
  notes: string | null;
}

export interface AccountantCategorySummary {
  categoryId: string;
  categoryName: string;
  expenseCount: number;
  totalAmount: number;
  formattedTotal: string;
  totalGst: number;
  formattedGst: string;
  isReconciled: boolean;
  reconciliationDifference: number;
  expenses: AccountantExpenseItem[];
}

export interface AccountantReportSummary {
  totalExpenses: number;
  formattedTotalExpenses: string;
  totalGst: number;
  formattedTotalGst: string;
  totalExpenseCount: number;
  evidenceAttachedCount: number;
  missingEvidenceCount: number;
  reconciledCount: number;
  unreconciledCount: number;
  isFullyReconciled: boolean;
  reconciliationErrors: string[];
}

export interface AccountantExpenseReportData {
  metadata: {
    reportId: string;
    generatedAt: string;
    generatedBy: string;
    workspaceName: string;
    propertyName: string;
    periodLabel: string;
    dateRange: {
      start: string;
      end: string;
    };
  };
  summary: AccountantReportSummary;
  categories: AccountantCategorySummary[];
}

export const accountantReportFilterSchema = z.object({
  workspaceId: z.string().optional(),
  propertyId: z.string().nullable().optional(),
  period: z.string().optional(),
  financialYear: z.union([z.number(), z.string()]).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  categoryIds: z.array(z.string()).optional(),
});
