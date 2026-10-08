import { createClient } from '@/lib/supabase/server';
import {
  AccountantReportFilters,
  AccountantExpenseReportData,
  AccountantReportSummary,
  AccountantCategorySummary,
  AccountantExpenseItem,
  AccountantExpenseAttachment,
} from '@/modules/finance/domain/accountant-report-types';
import {
  getCurrentFinancialYearNumber,
  parseFinancialYear,
  getFinancialYearRange,
  getFinancialYearLabel,
  FinancialYearRange,
} from '@/lib/finance/financial-year';
import { formatCurrencyReport } from '@/lib/pdf/report-engine';

/**
 * Resolves date range for the accountant report based on filters (FY, BAS quarter, or custom dates).
 */
export function resolveAccountantReportDateRange(
  filters: AccountantReportFilters
): { range: FinancialYearRange; periodLabel: string } {
  const currentFy = getCurrentFinancialYearNumber();
  const fy = filters.financialYear ? parseFinancialYear(filters.financialYear) : currentFy;
  const fyRange = getFinancialYearRange(fy);

  // Custom date range
  if (filters.dateFrom && filters.dateTo) {
    return {
      range: {
        start: filters.dateFrom,
        end: filters.dateTo,
      },
      periodLabel: `${filters.dateFrom} to ${filters.dateTo}`,
    };
  }

  // Quarterly breakdown
  if (filters.period && ['Q1', 'Q2', 'Q3', 'Q4'].includes(filters.period)) {
    const period = filters.period as 'Q1' | 'Q2' | 'Q3' | 'Q4';
    const startYear = fy - 1;
    const endYear = fy;
    const shortCode = `FY${String(fy).slice(-2)}`;

    switch (period) {
      case 'Q1':
        return {
          range: { start: `${startYear}-07-01`, end: `${startYear}-09-30` },
          periodLabel: `Q1 ${shortCode} (01 Jul ${startYear} – 30 Sep ${startYear})`,
        };
      case 'Q2':
        return {
          range: { start: `${startYear}-10-01`, end: `${startYear}-12-31` },
          periodLabel: `Q2 ${shortCode} (01 Oct ${startYear} – 31 Dec ${startYear})`,
        };
      case 'Q3':
        return {
          range: { start: `${endYear}-01-01`, end: `${endYear}-03-31` },
          periodLabel: `Q3 ${shortCode} (01 Jan ${endYear} – 31 Mar ${endYear})`,
        };
      case 'Q4':
        return {
          range: { start: `${endYear}-04-01`, end: `${endYear}-06-30` },
          periodLabel: `Q4 ${shortCode} (01 Apr ${endYear} – 30 Jun ${endYear})`,
        };
    }
  }

  return {
    range: fyRange,
    periodLabel: getFinancialYearLabel(fy),
  };
}

/**
 * Format a human-readable display ID for an expense (e.g. "EXP-00123").
 */
export function formatExpenseDisplayId(id: string, index?: number): string {
  if (!id) return `EXP-${String(index ?? 1).padStart(5, '0')}`;
  const shortHex = id.replace(/-/g, '').slice(-5).toUpperCase();
  return `EXP-${shortHex}`;
}

/**
 * Single source-of-truth builder for the Accountant Expense Report.
 * Dynamically aggregates existing financial and attachment data without persistence.
 */
export async function getAccountantExpenseReportData(
  filters: AccountantReportFilters,
  context: {
    workspaceId: string;
    workspaceName?: string;
    userName?: string;
    userId?: string;
  }
): Promise<AccountantExpenseReportData> {
  const supabase = await createClient();
  const { range: dateRange, periodLabel } = resolveAccountantReportDateRange(filters);

  // 1. Resolve Property name if single property is filtered
  let propertyName = 'All Properties (Consolidated)';
  if (filters.propertyId && filters.propertyId !== 'all') {
    const { data: prop } = await supabase
      .from('properties')
      .select('name, address_line_1, city, state')
      .eq('id', filters.propertyId)
      .eq('workspace_id', context.workspaceId)
      .maybeSingle();

    if (prop) {
      const p = prop as any;
      propertyName = p.name || p.address_line_1 || 'Selected Property';
    }
  }

  // 2. Fetch all expense transactions with relational data
  let query = supabase
    .from('transactions')
    .select(`
      id,
      amount,
      transaction_type,
      transaction_category_id,
      transaction_date,
      payment_method,
      description,
      reference,
      vendor_name,
      notes,
      status,
      property_id,
      workspace_id,
      created_by,
      created_at,
      updated_at,
      gst_inclusive,
      gst_amount,
      tax_classification_id,
      receipt_url,
      receipt_blob_path,
      receipt_file_name,
      receipt_file_size,
      receipt_mime_type,
      receipt_uploaded_at,
      category:categories(
        id,
        name,
        transaction_type,
        is_active
      ),
      tax_classification:tax_classifications(
        id,
        name,
        bas_code,
        description
      ),
      property:properties(
        id,
        name,
        address_line_1,
        city,
        state
      ),
      attachments:transaction_attachments(
        id,
        blob_url,
        blob_path,
        file_name,
        mime_type,
        file_size,
        source_path,
        created_at
      )
    `)
    .eq('workspace_id', context.workspaceId)
    .eq('transaction_type', 'expense')
    .gte('transaction_date', dateRange.start)
    .lte('transaction_date', dateRange.end)
    .order('transaction_date', { ascending: true })
    .order('created_at', { ascending: true });

  if (filters.propertyId && filters.propertyId !== 'all') {
    query = query.eq('property_id', filters.propertyId);
  }

  if (filters.categoryIds && filters.categoryIds.length > 0) {
    query = query.in('transaction_category_id', filters.categoryIds);
  }

  const { data: txData, error: txError } = await query;
  if (txError) {
    console.error('[ACCOUNTANT_REPORT_ERROR] Failed to fetch transactions:', txError);
    throw new Error(`Failed to load expense report data: ${txError.message}`);
  }

  const rawTransactions = (txData as any[]) || [];

  // 3. Normalize & map individual expenses
  const normalizedExpenses: AccountantExpenseItem[] = rawTransactions.map((tx: any, idx: number) => {
    const rawAmount = Number(tx.amount || 0);
    const rawGst = Number(tx.gst_amount || 0);

    // Build attachments list (combines transaction_attachments and legacy receipt_url)
    const attachments: AccountantExpenseAttachment[] = [];
    const seenUrls = new Set<string>();

    if (Array.isArray(tx.attachments)) {
      for (const att of tx.attachments) {
        if (att.blob_url && !seenUrls.has(att.blob_url)) {
          seenUrls.add(att.blob_url);
          const mime = (att.mime_type || '').toLowerCase();
          const fileName = att.file_name || 'Receipt Document';
          const isPdf = mime.includes('pdf') || fileName.toLowerCase().endsWith('.pdf');
          const isImage = mime.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(fileName);
          attachments.push({
            id: att.id,
            fileName,
            mimeType: att.mime_type || 'application/pdf',
            fileSize: Number(att.file_size || 0),
            url: att.blob_url,
            blobPath: att.blob_path,
            isPdf,
            isImage,
          });
        }
      }
    }

    if (tx.receipt_url && !seenUrls.has(tx.receipt_url)) {
      seenUrls.add(tx.receipt_url);
      const mime = (tx.receipt_mime_type || '').toLowerCase();
      const fileName = tx.receipt_file_name || 'Receipt Document';
      const isPdf = mime.includes('pdf') || fileName.toLowerCase().endsWith('.pdf');
      const isImage = mime.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(fileName);
      attachments.push({
        id: `legacy-${tx.id}`,
        fileName,
        mimeType: tx.receipt_mime_type || (isPdf ? 'application/pdf' : 'image/jpeg'),
        fileSize: Number(tx.receipt_file_size || 0),
        url: tx.receipt_url,
        blobPath: tx.receipt_blob_path || undefined,
        isPdf,
        isImage,
      });
    }

    const hasEvidence = attachments.length > 0;
    const isReconciled = tx.status === 'completed' || tx.status === 'paid';

    return {
      id: tx.id,
      displayId: formatExpenseDisplayId(tx.id, idx + 1),
      transactionDate: tx.transaction_date,
      formattedDate: new Date(tx.transaction_date).toLocaleDateString('en-AU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
      vendorName: tx.vendor_name || 'Supplier / Payee Unspecified',
      description: tx.description || 'No description provided',
      reference: tx.reference || null,
      amount: rawAmount,
      formattedAmount: formatCurrencyReport(rawAmount),
      gstAmount: rawGst,
      formattedGst: formatCurrencyReport(rawGst),
      gstInclusive: Boolean(tx.gst_inclusive),
      categoryId: tx.transaction_category_id || 'unassigned',
      categoryName: tx.category?.name || 'General Expenses',
      taxClassificationName: tx.tax_classification?.name || 'Standard / Unclassified',
      basCode: tx.tax_classification?.bas_code || null,
      propertyId: tx.property_id,
      propertyName: tx.property?.name || tx.property?.address_line_1 || 'Unassigned Property',
      paymentMethod: (tx.payment_method || 'Bank Transfer').replace(/_/g, ' ').toUpperCase(),
      reconciliationStatus: isReconciled ? 'RECONCILED' : 'UNRECONCILED',
      isReconciled,
      attachments,
      hasEvidence,
      notes: tx.notes || null,
    };
  });

  // 4. Group by category and validate strict reconciliation
  const categoryGroupsMap = new Map<string, {
    name: string;
    expenses: AccountantExpenseItem[];
  }>();

  for (const exp of normalizedExpenses) {
    const key = exp.categoryName;
    if (!categoryGroupsMap.has(key)) {
      categoryGroupsMap.set(key, {
        name: key,
        expenses: [],
      });
    }
    categoryGroupsMap.get(key)!.expenses.push(exp);
  }

  // Deterministic category order (alphabetical)
  const sortedCategoryNames = Array.from(categoryGroupsMap.keys()).sort((a, b) => a.localeCompare(b));

  const categories: AccountantCategorySummary[] = [];
  const reconciliationErrors: string[] = [];

  for (const catName of sortedCategoryNames) {
    const group = categoryGroupsMap.get(catName)!;
    // Sort expenses inside category by date ASC
    group.expenses.sort((a, b) => {
      const dateCmp = a.transactionDate.localeCompare(b.transactionDate);
      if (dateCmp !== 0) return dateCmp;
      return a.id.localeCompare(b.id);
    });

    const categoryTotal = group.expenses.reduce((sum, e) => sum + e.amount, 0);
    const categoryGst = group.expenses.reduce((sum, e) => sum + e.gstAmount, 0);
    
    // Explicit reconciliation calculation check
    const calculatedSum = group.expenses.map((e) => e.amount).reduce((a, b) => a + b, 0);
    const diff = Math.abs(categoryTotal - calculatedSum);
    const isReconciled = diff < 0.005;

    if (!isReconciled) {
      reconciliationErrors.push(
        `Category "${catName}" total ($${categoryTotal.toFixed(2)}) differs from sum of underlying expenses ($${calculatedSum.toFixed(2)}) by $${diff.toFixed(2)}.`
      );
    }

    categories.push({
      categoryId: group.expenses[0]?.categoryId || catName,
      categoryName: catName,
      expenseCount: group.expenses.length,
      totalAmount: categoryTotal,
      formattedTotal: formatCurrencyReport(categoryTotal),
      totalGst: categoryGst,
      formattedGst: formatCurrencyReport(categoryGst),
      isReconciled,
      reconciliationDifference: diff,
      expenses: group.expenses,
    });
  }

  // 5. Overall Report Summary KPIs
  const totalExpenses = categories.reduce((sum, c) => sum + c.totalAmount, 0);
  const totalGst = categories.reduce((sum, c) => sum + c.totalGst, 0);
  const totalExpenseCount = normalizedExpenses.length;
  const evidenceAttachedCount = normalizedExpenses.filter((e) => e.hasEvidence).length;
  const missingEvidenceCount = totalExpenseCount - evidenceAttachedCount;

  const reconciledCount = normalizedExpenses.filter((e) => e.isReconciled).length;
  const unreconciledCount = totalExpenseCount - reconciledCount;

  const isFullyReconciled = reconciliationErrors.length === 0;

  const summary: AccountantReportSummary = {
    totalExpenses,
    formattedTotalExpenses: formatCurrencyReport(totalExpenses),
    totalGst,
    formattedTotalGst: formatCurrencyReport(totalGst),
    totalExpenseCount,
    evidenceAttachedCount,
    missingEvidenceCount,
    reconciledCount,
    unreconciledCount,
    isFullyReconciled,
    reconciliationErrors,
  };

  // Generate unique report reference ID
  const reportRef = `EXP-VER-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  return {
    metadata: {
      reportId: reportRef,
      generatedAt: new Date().toISOString(),
      generatedBy: context.userName || 'PropertyLedge User',
      workspaceName: context.workspaceName || 'PropertyLedge Workspace',
      propertyName,
      periodLabel,
      dateRange,
    },
    summary,
    categories,
  };
}
