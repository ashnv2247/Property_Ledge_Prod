'use server';

import { getCurrentUser } from '@/lib/auth/queries';
import { resolveWorkspaceContext } from '@/lib/workspace/context';
import {
  AccountantReportFilters,
  accountantReportFilterSchema,
} from '@/modules/finance/domain/accountant-report-types';
import {
  getAccountantExpenseReportData,
} from '@/lib/finance/accountant-report-service';
import { AccountantExpenseReportPdfGenerator } from '@/lib/pdf/accountant-expense-report-pdf';

async function getAuthContext() {
  const [user, context] = await Promise.all([
    getCurrentUser(),
    resolveWorkspaceContext(),
  ]);

  if (!user || !context) {
    throw new Error('Unauthorized or no active workspace');
  }

  return { user, context };
}

/**
 * Fetch structured preview data for the Accountant Expense Report
 */
export async function fetchAccountantReportDataAction(filters: AccountantReportFilters = {}) {
  try {
    const { user, context } = await getAuthContext();
    const validatedFilters = accountantReportFilterSchema.parse(filters);

    const data = await getAccountantExpenseReportData(validatedFilters, {
      workspaceId: context.workspaceId,
      workspaceName: context.workspaceName,
      userName: user.email || 'PropertyLedge User',
      userId: user.id,
    });

    return {
      success: true,
      data,
    };
  } catch (err: any) {
    console.error('[ACCOUNTANT_REPORT_ACTION_ERROR]', err);
    return {
      success: false,
      error: err.message || 'Failed to generate accountant report data',
    };
  }
}

/**
 * Generates the complete, self-contained accountant-ready PDF
 */
export async function generateAccountantReportPdfAction(filters: AccountantReportFilters = {}) {
  try {
    const { user, context } = await getAuthContext();
    const validatedFilters = accountantReportFilterSchema.parse(filters);

    // 1. Get normalized report data
    const data = await getAccountantExpenseReportData(validatedFilters, {
      workspaceId: context.workspaceId,
      workspaceName: context.workspaceName,
      userName: user.email || 'PropertyLedge User',
      userId: user.id,
    });

    // 2. Generate self-contained PDF audit pack
    const pdfBytes = await AccountantExpenseReportPdfGenerator.generate(data);

    // 3. Build sanitized, professional filename
    const cleanPropName = (data.metadata.propertyName || 'Portfolio')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 30);
    const cleanPeriod = (filters.period || (filters.financialYear ? `FY${filters.financialYear}` : 'Period'))
      .replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `PropertyLedge_Accountant_Expense_Report_${cleanPropName}_${cleanPeriod}.pdf`;

    const base64Pdf = Buffer.from(pdfBytes).toString('base64');

    return {
      success: true,
      filename,
      base64Data: `data:application/pdf;base64,${base64Pdf}`,
      summary: data.summary,
      metadata: data.metadata,
    };
  } catch (err: any) {
    console.error('[ACCOUNTANT_REPORT_PDF_ACTION_ERROR]', err);
    return {
      success: false,
      error: err.message || 'Failed to generate accountant report PDF',
    };
  }
}
