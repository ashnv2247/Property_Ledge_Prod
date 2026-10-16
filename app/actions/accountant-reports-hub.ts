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

/**
 * Fetch Comparative Statement data comparing two financial years
 */
export async function fetchComparativeStatementAction(
  propertyId?: string,
  financialYear?: number
) {
  try {
    await getAuthContext();
    const { getComparativeStatementData } = await import(
      '@/lib/finance/accountant-reports-consolidated-service'
    );
    const data = await getComparativeStatementData(propertyId, financialYear);
    return {
      success: true,
      data,
    };
  } catch (err: any) {
    console.error('[FETCH_COMPARATIVE_STATEMENT_ACTION_ERROR]', err);
    return {
      success: false,
      error: err.message || 'Failed to load comparative statement',
    };
  }
}

/**
 * Fetch Australian ATO Rental Schedule data for a property
 */
export async function fetchRentalScheduleAction(
  propertyId?: string,
  financialYear?: number
) {
  try {
    await getAuthContext();
    const { getRentalScheduleData } = await import(
      '@/lib/finance/accountant-reports-consolidated-service'
    );
    const data = await getRentalScheduleData(propertyId, financialYear);
    return {
      success: true,
      data,
    };
  } catch (err: any) {
    console.error('[FETCH_RENTAL_SCHEDULE_ACTION_ERROR]', err);
    return {
      success: false,
      error: err.message || 'Failed to load rental schedule',
    };
  }
}

/**
 * Generates and returns base64 PDF for Comparative Statement or Rental Schedule
 */
export async function generateAccountantReportPdfExportAction(
  reportType: 'comparative' | 'schedule',
  propertyId?: string,
  financialYear?: number
) {
  try {
    await getAuthContext();
    const {
      getComparativeStatementData,
      getRentalScheduleData,
    } = await import('@/lib/finance/accountant-reports-consolidated-service');
    const {
      generateComparativeStatementPdf,
      generateRentalSchedulePdf,
    } = await import('@/lib/pdf/accountant-reports-pdf-service');

    if (reportType === 'comparative') {
      const data = await getComparativeStatementData(propertyId, financialYear);
      const pdfBytes = await generateComparativeStatementPdf(data);
      const base64 = Buffer.from(pdfBytes).toString('base64');
      const filename = `Comparative_Statement_${data.property.name || 'Property'}_${data.selectedFy.replace('/', '-')}.pdf`;
      return {
        success: true,
        filename,
        base64Data: `data:application/pdf;base64,${base64}`,
      };
    } else {
      const data = await getRentalScheduleData(propertyId, financialYear);
      const pdfBytes = await generateRentalSchedulePdf(data);
      const base64 = Buffer.from(pdfBytes).toString('base64');
      const filename = `Rental_Schedule_${data.property.name || 'Property'}_FY${data.financialYear}.pdf`;
      return {
        success: true,
        filename,
        base64Data: `data:application/pdf;base64,${base64}`,
      };
    }
  } catch (err: any) {
    console.error('[GENERATE_ACCOUNTANT_REPORT_PDF_ERROR]', err);
    return {
      success: false,
      error: err.message || 'Failed to generate report PDF',
    };
  }
}

/**
 * Generates and returns CSV string for Comparative Statement or Rental Schedule
 */
export async function exportAccountantReportCsvExportAction(
  reportType: 'comparative' | 'schedule',
  propertyId?: string,
  financialYear?: number
) {
  try {
    await getAuthContext();
    const {
      getComparativeStatementData,
      getRentalScheduleData,
    } = await import('@/lib/finance/accountant-reports-consolidated-service');

    if (reportType === 'comparative') {
      const data = await getComparativeStatementData(propertyId, financialYear);
      let csv = `COMPARATIVE STATEMENT\n`;
      csv += `Property,"${data.property.addressLine1}, ${data.property.city} ${data.property.state} ${data.property.postalCode}"\n`;
      csv += `Ownership,"${data.property.ownershipPercentage}%"\n`;
      csv += `Reporting Periods,"${data.selectedFy} vs ${data.previousFy}"\n\n`;
      csv += `Category,${data.selectedFy},${data.previousFy},Variance\n`;
      csv += `INCOME\n`;
      data.incomeRows.forEach((row) => {
        csv += `"${row.category}",${row.currentAmount},${row.previousAmount},${row.variance}\n`;
      });
      csv += `LESS: EXPENSES\n`;
      data.expenseRows.forEach((row) => {
        csv += `"${row.category}",${row.currentAmount},${row.previousAmount},${row.variance}\n`;
      });
      csv += `Total Expenses,${data.totalExpensesCurrent},${data.totalExpensesPrevious},${data.totalExpensesVariance}\n`;
      csv += `NET RENTAL PROPERTY PROFIT/(LOSS),${data.netRentalResultCurrent},${data.netRentalResultPrevious},${data.netRentalResultVariance}\n`;

      const filename = `Comparative_Statement_${data.property.name || 'Property'}_${data.selectedFy.replace('/', '-')}.csv`;
      return {
        success: true,
        filename,
        csvContent: csv,
      };
    } else {
      const data = await getRentalScheduleData(propertyId, financialYear);
      let csv = `AUSTRALIAN TAXATION OFFICE - INDIVIDUAL TAX RETURN RENTAL SCHEDULE (ITEM 21)\n`;
      csv += `Property,"${data.sectionA.address}, ${data.sectionA.city} ${data.sectionA.state} ${data.sectionA.postcode}"\n`;
      csv += `Tax Year,"${data.taxYearLabel}"\n`;
      csv += `Financial Year,"${data.financialYearLabel}"\n\n`;

      csv += `SECTION A: PROPERTY DETAILS\n`;
      csv += `Name of property,"${data.sectionA.propertyName}"\n`;
      csv += `Date property first earned rental income,"${data.sectionA.dateFirstEarnedRentalIncome}"\n`;
      csv += `Weeks rented this year,${data.sectionA.weeksRentedThisYear}\n`;
      csv += `Weeks available for rent,${data.sectionA.weeksAvailableForRentThisYear}\n`;
      csv += `Entity ownership percentage,${data.sectionA.ownershipPercentage}%\n`;
      csv += `Loan renegotiated,"${data.sectionA.loanRenegotiated}"\n\n`;

      csv += `SECTION D: INCOME AND EXPENSES\n`;
      csv += `Code,Category / Item,Gross Amount,Owner Share\n`;
      csv += `A,"${data.sectionD.income.rentalIncome.name}",${data.sectionD.income.rentalIncome.grossAmount || 0},${data.sectionD.income.rentalIncome.ownerShare || 0}\n`;
      csv += `C,"${data.sectionD.income.grossRent.name}",${data.sectionD.income.grossRent.grossAmount || 0},${data.sectionD.income.grossRent.ownerShare || 0}\n`;
      data.sectionD.expenses.forEach((exp) => {
        csv += `${exp.code},"${exp.name}",${exp.grossAmount || 0},${exp.ownerShare || 0}\n`;
      });
      csv += `W,"${data.sectionD.totalExpenses.name}",${data.sectionD.totalExpenses.grossAmount || 0},${data.sectionD.totalExpenses.ownerShare || 0}\n`;
      csv += `X,"${data.sectionD.totalNetRent.name}",${data.sectionD.totalNetRent.grossAmount || 0},${data.sectionD.totalNetRent.ownerShare || 0}\n`;

      const filename = `Rental_Schedule_${data.property.name || 'Property'}_FY${data.financialYear}.csv`;
      return {
        success: true,
        filename,
        csvContent: csv,
      };
    }
  } catch (err: any) {
    console.error('[EXPORT_ACCOUNTANT_REPORT_CSV_ERROR]', err);
    return {
      success: false,
      error: err.message || 'Failed to export CSV',
    };
  }
}

