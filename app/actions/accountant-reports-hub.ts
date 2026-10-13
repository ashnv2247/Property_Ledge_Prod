'use server';

import { getCurrentUser } from '@/lib/auth/queries';
import { resolveWorkspaceContext } from '@/lib/workspace/context';
import { createClient } from '@/lib/supabase/server';
import {
  FinanceReportFilters,
} from '@/modules/finance/domain/reporting-types';
import {
  calculateBasWorksheet,
  resolveBasDateRange,
} from '@/modules/finance/domain/bas-calculations';
import {
  getIncomeReport,
  getExpenseReport,
  getTransactionDetailReport,
  getRentReconciliationReport,
  getGstReport,
} from '@/lib/finance/reporting-service';
import {
  getAccountantExpenseReportData,
} from '@/lib/finance/accountant-report-service';
import {
  parseFinancialYear,
  getCurrentFinancialYearNumber,
} from '@/lib/finance/financial-year';
import { BasPeriod } from '@/modules/finance/domain/types';

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

export interface AccountantHubFilters {
  financialYear: number;
  period: 'FY' | 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'custom';
  propertyId?: string;
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Server action to fetch comprehensive BAS calculation worksheet for the accountant
 */
export async function fetchAccountantBasSummaryAction(filters: AccountantHubFilters) {
  try {
    const { context } = await getAuthContext();
    const supabase = await createClient();

    const fy = filters.financialYear || getCurrentFinancialYearNumber();
    const period = (filters.period === 'custom' ? 'FY' : filters.period) as BasPeriod;

    // Fetch properties for workspace
    const { data: propertiesData } = await supabase
      .from('properties')
      .select('id, name')
      .eq('workspace_id', context.workspaceId);
    const properties = propertiesData || [];

    // Fetch transactions
    let query = supabase
      .from('transactions')
      .select(`
        id,
        amount,
        transaction_type,
        transaction_category_id,
        transaction_date,
        description,
        status,
        property_id,
        gst_inclusive,
        gst_amount,
        tax_classification_id,
        category:categories(
          id,
          name,
          category_group:category_groups(id, name),
          default_tax_classification:tax_classifications!categories_default_tax_classification_id_fkey(
            id,
            name,
            bas_code,
            description
          )
        ),
        tax_classification:tax_classifications!transactions_tax_classification_id_fkey(
          id,
          name,
          bas_code,
          description
        )
      `)
      .eq('workspace_id', context.workspaceId)
      .eq('status', 'completed');

    if (filters.propertyId && filters.propertyId !== 'all') {
      query = query.eq('property_id', filters.propertyId);
    }

    const { data: txData, error: txErr } = await query;
    if (txErr) throw txErr;

    const transactions = (txData || []) as any[];

    // Calculate BAS worksheet using canonical Australian calculation engine
    const worksheet = calculateBasWorksheet(transactions, properties, {
      year: fy,
      period,
      propertyId: filters.propertyId === 'all' ? undefined : filters.propertyId,
    });

    return {
      success: true,
      data: worksheet,
    };
  } catch (err: any) {
    console.error('[ACCOUNTANT_BAS_ACTION_ERROR]', err);
    return {
      success: false,
      error: err.message || 'Failed to compute BAS worksheet',
    };
  }
}

/**
 * Server action to fetch comprehensive accountant reports hub data
 */
export async function fetchAccountantReportsHubDataAction(
  reportType: 'bas' | 'income-expense' | 'ledger' | 'receipts-expenses' | 'reconciliation',
  filters: AccountantHubFilters
) {
  try {
    const { user, context } = await getAuthContext();

    const fy = filters.financialYear || getCurrentFinancialYearNumber();
    const basPeriod = (filters.period === 'custom' ? 'FY' : filters.period) as BasPeriod;
    const dateRange = resolveBasDateRange(fy, basPeriod);

    const reportFilters: FinanceReportFilters = {
      workspaceId: context.workspaceId,
      financialYear: fy,
      propertyId: filters.propertyId === 'all' ? undefined : filters.propertyId,
      categoryId: filters.categoryId === 'all' ? undefined : filters.categoryId,
      dateFrom: filters.period === 'custom' && filters.dateFrom ? filters.dateFrom : dateRange.startDate,
      dateTo: filters.period === 'custom' && filters.dateTo ? filters.dateTo : dateRange.endDate,
    };

    switch (reportType) {
      case 'bas': {
        const basRes = await fetchAccountantBasSummaryAction(filters);
        return basRes;
      }
      case 'income-expense': {
        const [income, expenses] = await Promise.all([
          getIncomeReport(reportFilters),
          getExpenseReport(reportFilters),
        ]);
        const totalIncome = income.kpis?.totalIncome ?? (income as any).totalIncome ?? 0;
        const totalExpenses = expenses.kpis?.totalExpenses ?? (expenses as any).totalExpenses ?? 0;
        return {
          success: true,
          data: {
            income: {
              ...income,
              totalIncome,
            },
            expenses: {
              ...expenses,
              totalExpenses,
            },
            totalIncome,
            totalExpenses,
            netResult: Math.round((totalIncome - totalExpenses) * 100) / 100,
          },
        };
      }
      case 'ledger': {
        const txDetail = await getTransactionDetailReport(reportFilters);
        return {
          success: true,
          data: txDetail,
        };
      }
      case 'receipts-expenses': {
        const expensePack = await getAccountantExpenseReportData(
          {
            propertyId: reportFilters.propertyId || undefined,
            financialYear: fy,
            period: filters.period,
            dateFrom: reportFilters.dateFrom,
            dateTo: reportFilters.dateTo,
          },
          {
            workspaceId: context.workspaceId,
            workspaceName: context.workspaceName,
            userName: user.email || 'PropertyLedge User',
            userId: user.id,
          }
        );
        return {
          success: true,
          data: {
            ...expensePack,
            summary: {
              ...expensePack.summary,
              totalExpensesAmount: expensePack.summary.totalExpenses,
              totalExpensesCount: expensePack.summary.totalExpenseCount,
              receiptsCount: expensePack.summary.evidenceAttachedCount,
            },
          },
        };
      }
      case 'reconciliation': {
        const rentRec = await getRentReconciliationReport(reportFilters);
        return {
          success: true,
          data: {
            ...rentRec,
            totalExpectedRent: rentRec.kpis?.totalExpected ?? 0,
            totalReceivedRent: rentRec.kpis?.totalReceived ?? 0,
            totalOutstandingRent: rentRec.kpis?.totalOutstanding ?? 0,
            collectionRate: rentRec.kpis?.collectionRate ?? 100,
          },
        };
      }
      default:
        throw new Error(`Unsupported accountant report type: ${reportType}`);
    }
  } catch (err: any) {
    console.error('[ACCOUNTANT_REPORTS_HUB_ACTION_ERROR]', err);
    return {
      success: false,
      error: err.message || 'Failed to fetch accountant report data',
    };
  }
}
