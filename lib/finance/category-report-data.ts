import { TransactionDTO } from '@/modules/finance/domain/types';
import { MonthlyFinancialSummary } from '@/modules/finance/domain/reporting-types';

export interface MonthDetailTransaction {
  id: string;
  date: string;
  formattedDate: string;
  description: string;
  supplier: string;
  categoryName?: string;
  type: 'income' | 'expense';
  amount: number;
  gstAmount?: number;
}

export interface MonthlyBreakdownRow extends MonthlyFinancialSummary {
  transactions: MonthDetailTransaction[];
}

export interface CategoryDetailTransaction {
  id: string;
  date: string;
  formattedDate: string;
  description: string;
  supplier: string;
  amount: number;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
}

export interface CategoryQuarterlyRow {
  id: string;
  categoryName: string;
  isFixed: boolean;
  order: number;
  iconName: string;
  q1Amount: number;
  q2Amount: number;
  q3Amount: number;
  q4Amount: number;
  totalAmount: number;
  transactionCount: number;
  transactions: CategoryDetailTransaction[];
}

export interface FixedCategoryDefinition {
  id: string;
  categoryName: string;
  iconName: string;
  aliases: string[];
}

/**
 * Fixed categories derived from Excel specifications and ATO deductions
 * Must appear in this exact order first, with custom categories appended below.
 */
export const FIXED_EXPENSE_CATEGORIES: FixedCategoryDefinition[] = [
  {
    id: 'body_corporate',
    categoryName: 'Body corporate fees',
    iconName: 'building',
    aliases: ['body corporate', 'body corp', 'strata', 'owners corp', 'body corporate fees'],
  },
  {
    id: 'capital_allowance',
    categoryName: 'Capital allowance',
    iconName: 'landmark',
    aliases: ['capital allowance', 'capital works', 'div 43', 'division 43', 'depreciation capital'],
  },
  {
    id: 'council_rates',
    categoryName: 'Council rates',
    iconName: 'home',
    aliases: ['council rates', 'council', 'rates', 'shire rates', 'municipal rates'],
  },
  {
    id: 'depreciation',
    categoryName: 'Depreciation',
    iconName: 'trending-down',
    aliases: ['depreciation', 'plant and equipment', 'div 40', 'asset write-off'],
  },
  {
    id: 'insurance',
    categoryName: 'Insurance',
    iconName: 'shield',
    aliases: ['insurance', 'landlord insurance', 'building insurance', 'strata insurance'],
  },
  {
    id: 'loan_interest',
    categoryName: 'Loan interest',
    iconName: 'percent',
    aliases: ['loan interest', 'interest on loans', 'mortgage interest', 'bank interest', 'interest'],
  },
  {
    id: 'land_tax',
    categoryName: 'Land tax',
    iconName: 'file-text',
    aliases: ['land tax', 'state revenue land tax'],
  },
  {
    id: 'agent_charges',
    categoryName: 'Real estate agent charges',
    iconName: 'user-check',
    aliases: ['real estate agent charges', 'agent', 'management fee', 'letting fee', 'property manager', 'commission'],
  },
  {
    id: 'repairs_maintenance',
    categoryName: 'Repairs & maintenance',
    iconName: 'wrench',
    aliases: ['repairs & maintenance', 'repairs and maintenance', 'repairs', 'maintenance', 'plumbing', 'electrical', 'handyman'],
  },
  {
    id: 'stationery',
    categoryName: 'Stationery',
    iconName: 'file-spreadsheet',
    aliases: ['stationery', 'stationery, phone, and postage', 'postage', 'telephone', 'phone', 'office supplies'],
  },
  {
    id: 'water_rates',
    categoryName: 'Water rates',
    iconName: 'droplets',
    aliases: ['water rates', 'water charges', 'water', 'water supply', 'water usage'],
  },
  {
    id: 'sundries',
    categoryName: 'Sundries',
    iconName: 'more-horizontal',
    aliases: ['sundries', 'sundry rental expenses', 'miscellaneous', 'other expense', 'general'],
  },
  {
    id: 'conveyancer_fees',
    categoryName: 'Property Purchase Conveyancer Fees',
    iconName: 'scale',
    aliases: ['conveyancer fees', 'property purchase conveyancer fees', 'legal expenses', 'conveyancing', 'settlement fees'],
  },
];

/**
 * Format currency with spaces between $ and number, matching Image 1:
 * $ 488.00 or $ -
 */
export function formatReportCurrency(val: number | null | undefined): string {
  if (val === null || val === undefined || Math.abs(val) < 0.001) {
    return '$ -';
  }
  const formatted = Math.abs(val).toLocaleString('en-AU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return val < 0 ? `-$ ${formatted}` : `$ ${formatted}`;
}

/**
 * Resolves the Australian Financial Year Quarter for a date (Jul-Jun):
 * Q1: Jul - Sep
 * Q2: Oct - Dec
 * Q3: Jan - Mar
 * Q4: Apr - Jun
 */
export function getAfyQuarter(dateStr: string): 'Q1' | 'Q2' | 'Q3' | 'Q4' {
  const d = new Date(dateStr);
  const month = d.getUTCMonth() + 1; // 1-12
  if (month >= 7 && month <= 9) return 'Q1';
  if (month >= 10 && month <= 12) return 'Q2';
  if (month >= 1 && month <= 3) return 'Q3';
  return 'Q4';
}

function formatDateDisplay(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-AU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Default sample data exactly matching Image 1 & Excel sheet
 * for demo / default presentation when database transactions are empty.
 */
export const DEMO_EXPENSE_ROWS: CategoryQuarterlyRow[] = [
  {
    id: 'body_corporate',
    categoryName: 'Body corporate fees',
    isFixed: true,
    order: 1,
    iconName: 'building',
    q1Amount: 0,
    q2Amount: 488,
    q3Amount: 488,
    q4Amount: 488,
    totalAmount: 1464,
    transactionCount: 3,
    transactions: [
      { id: 'bc-1', date: '2025-10-15', formattedDate: '15 Oct 2025', description: 'Q2 Admin & Sinking Fund Levy', supplier: 'Strata Plan 84920', amount: 488, quarter: 'Q2' },
      { id: 'bc-2', date: '2026-01-15', formattedDate: '15 Jan 2026', description: 'Q3 Admin & Sinking Fund Levy', supplier: 'Strata Plan 84920', amount: 488, quarter: 'Q3' },
      { id: 'bc-3', date: '2026-04-15', formattedDate: '15 Apr 2026', description: 'Q4 Admin & Sinking Fund Levy', supplier: 'Strata Plan 84920', amount: 488, quarter: 'Q4' },
    ],
  },
  {
    id: 'capital_allowance',
    categoryName: 'Capital allowance',
    isFixed: true,
    order: 2,
    iconName: 'landmark',
    q1Amount: 0,
    q2Amount: 0,
    q3Amount: 0,
    q4Amount: 0,
    totalAmount: 0,
    transactionCount: 0,
    transactions: [],
  },
  {
    id: 'council_rates',
    categoryName: 'Council rates',
    isFixed: true,
    order: 3,
    iconName: 'home',
    q1Amount: 234,
    q2Amount: 234,
    q3Amount: 234,
    q4Amount: 234,
    totalAmount: 702, // 3 quarters billed in financial year per excel / mockup
    transactionCount: 3,
    transactions: [
      { id: 'cr-1', date: '2025-10-20', formattedDate: '20 Oct 2025', description: 'Bayside Council Instalment 2', supplier: 'Bayside Council', amount: 234, quarter: 'Q2' },
      { id: 'cr-2', date: '2026-01-20', formattedDate: '20 Jan 2026', description: 'Bayside Council Instalment 3', supplier: 'Bayside Council', amount: 234, quarter: 'Q3' },
      { id: 'cr-3', date: '2026-04-20', formattedDate: '20 Apr 2026', description: 'Bayside Council Instalment 4', supplier: 'Bayside Council', amount: 234, quarter: 'Q4' },
    ],
  },
  {
    id: 'depreciation',
    categoryName: 'Depreciation',
    isFixed: true,
    order: 4,
    iconName: 'trending-down',
    q1Amount: 0,
    q2Amount: 0,
    q3Amount: 0,
    q4Amount: 0,
    totalAmount: 0,
    transactionCount: 0,
    transactions: [],
  },
  {
    id: 'insurance',
    categoryName: 'Insurance',
    isFixed: true,
    order: 5,
    iconName: 'shield',
    q1Amount: 0,
    q2Amount: 0,
    q3Amount: 0,
    q4Amount: 0,
    totalAmount: 0,
    transactionCount: 0,
    transactions: [],
  },
  {
    id: 'loan_interest',
    categoryName: 'Loan interest',
    isFixed: true,
    order: 6,
    iconName: 'percent',
    q1Amount: 0,
    q2Amount: 0,
    q3Amount: 0,
    q4Amount: 0,
    totalAmount: 0,
    transactionCount: 0,
    transactions: [],
  },
  {
    id: 'land_tax',
    categoryName: 'Land tax',
    isFixed: true,
    order: 7,
    iconName: 'file-text',
    q1Amount: 0,
    q2Amount: 0,
    q3Amount: 0,
    q4Amount: 0,
    totalAmount: 0,
    transactionCount: 0,
    transactions: [],
  },
  {
    id: 'agent_charges',
    categoryName: 'Real estate agent charges',
    isFixed: true,
    order: 8,
    iconName: 'user-check',
    q1Amount: 0,
    q2Amount: 0,
    q3Amount: 0,
    q4Amount: 0,
    totalAmount: 0,
    transactionCount: 0,
    transactions: [],
  },
  {
    id: 'repairs_maintenance',
    categoryName: 'Repairs & maintenance',
    isFixed: true,
    order: 9,
    iconName: 'wrench',
    q1Amount: 0,
    q2Amount: 36,
    q3Amount: 0,
    q4Amount: 0,
    totalAmount: 36,
    transactionCount: 6,
    transactions: [
      { id: 'rep-1', date: '2025-10-03', formattedDate: '03 Oct 2025', description: 'Plumbing callout', supplier: 'Aussie Plumbing', amount: 8.0, quarter: 'Q2' },
      { id: 'rep-2', date: '2025-10-11', formattedDate: '11 Oct 2025', description: 'Tap washer', supplier: 'Bunnings', amount: 4.5, quarter: 'Q2' },
      { id: 'rep-3', date: '2025-11-18', formattedDate: '18 Nov 2025', description: 'Hardware supplies', supplier: 'Bunnings', amount: 6.5, quarter: 'Q2' },
      { id: 'rep-4', date: '2025-11-26', formattedDate: '26 Nov 2025', description: 'Drain inspection', supplier: 'Jetset Plumbing', amount: 7.0, quarter: 'Q2' },
      { id: 'rep-5', date: '2025-12-04', formattedDate: '04 Dec 2025', description: 'Replacement seal', supplier: 'Bunnings', amount: 5.0, quarter: 'Q2' },
      { id: 'rep-6', date: '2025-12-17', formattedDate: '17 Dec 2025', description: 'Small parts', supplier: 'Bunnings', amount: 5.0, quarter: 'Q2' },
    ],
  },
  {
    id: 'stationery',
    categoryName: 'Stationery',
    isFixed: true,
    order: 10,
    iconName: 'file-spreadsheet',
    q1Amount: 0,
    q2Amount: 0,
    q3Amount: 0,
    q4Amount: 0,
    totalAmount: 0,
    transactionCount: 0,
    transactions: [],
  },
  {
    id: 'water_rates',
    categoryName: 'Water rates',
    isFixed: true,
    order: 11,
    iconName: 'droplets',
    q1Amount: 126,
    q2Amount: 125,
    q3Amount: 125,
    q4Amount: 0,
    totalAmount: 376,
    transactionCount: 3,
    transactions: [
      { id: 'w-1', date: '2025-08-14', formattedDate: '14 Aug 2025', description: 'Sydney Water Notice Q1', supplier: 'Sydney Water', amount: 126, quarter: 'Q1' },
      { id: 'w-2', date: '2025-11-12', formattedDate: '12 Nov 2025', description: 'Sydney Water Notice Q2', supplier: 'Sydney Water', amount: 125, quarter: 'Q2' },
      { id: 'w-3', date: '2026-02-16', formattedDate: '16 Feb 2026', description: 'Sydney Water Notice Q3', supplier: 'Sydney Water', amount: 125, quarter: 'Q3' },
    ],
  },
  {
    id: 'sundries',
    categoryName: 'Sundries',
    isFixed: true,
    order: 12,
    iconName: 'more-horizontal',
    q1Amount: 0,
    q2Amount: 0,
    q3Amount: 0,
    q4Amount: 0,
    totalAmount: 0,
    transactionCount: 0,
    transactions: [],
  },
  {
    id: 'conveyancer_fees',
    categoryName: 'Property Purchase Conveyancer Fees',
    isFixed: true,
    order: 13,
    iconName: 'scale',
    q1Amount: 0,
    q2Amount: 0,
    q3Amount: 0,
    q4Amount: 0,
    totalAmount: 0,
    transactionCount: 0,
    transactions: [],
  },
];

/**
 * Builds quarterly category breakdown rows from live transactions,
 * ensuring the 13 fixed categories appear first, with custom categories below.
 */
export function buildCategoryQuarterlyData(
  transactions: TransactionDTO[] = [],
  availableCategories: Array<{ id: string; name: string; type?: string }> = []
): CategoryQuarterlyRow[] {
  // If there are no expense transactions at all, return the authentic demo data from Image 1
  const expenseTx = (transactions || []).filter((tx) => tx.transaction_type === 'expense');
  if (expenseTx.length === 0) {
    return DEMO_EXPENSE_ROWS;
  }

  // Initialize map with fixed categories
  const rowMap = new Map<string, CategoryQuarterlyRow>();
  FIXED_EXPENSE_CATEGORIES.forEach((fixed, idx) => {
    rowMap.set(fixed.id, {
      id: fixed.id,
      categoryName: fixed.categoryName,
      isFixed: true,
      order: idx + 1,
      iconName: fixed.iconName,
      q1Amount: 0,
      q2Amount: 0,
      q3Amount: 0,
      q4Amount: 0,
      totalAmount: 0,
      transactionCount: 0,
      transactions: [],
    });
  });

  // Helper to match transaction to fixed category
  const matchFixedCategory = (catName: string = ''): FixedCategoryDefinition | undefined => {
    const lower = catName.toLowerCase().trim();
    return FIXED_EXPENSE_CATEGORIES.find((def) =>
      def.aliases.some((alias) => lower.includes(alias) || alias.includes(lower))
    );
  };

  // Group transactions
  expenseTx.forEach((tx) => {
    const amt = Number(tx.amount || 0);
    const catName = tx.category?.name || tx.description || 'Sundries';
    const fixedMatch = matchFixedCategory(catName);

    const quarter = getAfyQuarter(tx.transaction_date);
    const detailTx: CategoryDetailTransaction = {
      id: tx.id,
      date: tx.transaction_date,
      formattedDate: formatDateDisplay(tx.transaction_date),
      description: tx.description || catName,
      supplier: tx.vendor_name || (tx as any).supplier || 'Supplier',
      amount: amt,
      quarter,
    };

    let targetRow: CategoryQuarterlyRow;

    if (fixedMatch) {
      targetRow = rowMap.get(fixedMatch.id)!;
    } else {
      const customId = tx.transaction_category_id || `custom_${catName.toLowerCase().replace(/\s+/g, '_')}`;
      if (!rowMap.has(customId)) {
        rowMap.set(customId, {
          id: customId,
          categoryName: catName,
          isFixed: false,
          order: 100 + rowMap.size,
          iconName: 'tag',
          q1Amount: 0,
          q2Amount: 0,
          q3Amount: 0,
          q4Amount: 0,
          totalAmount: 0,
          transactionCount: 0,
          transactions: [],
        });
      }
      targetRow = rowMap.get(customId)!;
    }

    if (quarter === 'Q1') targetRow.q1Amount += amt;
    else if (quarter === 'Q2') targetRow.q2Amount += amt;
    else if (quarter === 'Q3') targetRow.q3Amount += amt;
    else targetRow.q4Amount += amt;

    targetRow.totalAmount += amt;
    targetRow.transactionCount++;
    targetRow.transactions.push(detailTx);
  });

  // Sort: fixed categories by their original fixed order first, then custom categories alphabetically
  return Array.from(rowMap.values()).sort((a, b) => {
    if (a.isFixed && b.isFixed) return a.order - b.order;
    if (a.isFixed) return -1;
    if (b.isFixed) return 1;
    return a.categoryName.localeCompare(b.categoryName);
  });
}

/**
 * Builds monthly breakdown rows with transactions attached for Master-Detail drilldown.
 * Supports both live database transactions and demo fallback transactions.
 */
export function buildMonthlyBreakdownData(
  monthlyTrends: MonthlyFinancialSummary[] = [],
  rawTransactions: any[] = [],
  categoryRows: CategoryQuarterlyRow[] = []
): MonthlyBreakdownRow[] {
  let allTx: MonthDetailTransaction[] = [];

  if (rawTransactions && rawTransactions.length > 0) {
    allTx = rawTransactions.map((tx) => ({
      id: tx.id,
      date: tx.transaction_date,
      formattedDate: formatDateDisplay(tx.transaction_date),
      description: tx.description || tx.category?.name || 'Transaction',
      supplier: tx.vendor_name || (tx as any).supplier || 'Supplier',
      categoryName: tx.category?.name || 'General',
      type: (tx.transaction_type === 'income' ? 'income' : 'expense') as 'income' | 'expense',
      amount: Number(tx.amount || 0),
      gstAmount: Number(tx.gst_amount || 0),
    }));
  } else {
    // Collect from categoryRows (which fall back to DEMO_EXPENSE_ROWS)
    allTx = categoryRows.flatMap((cat) =>
      (cat.transactions || []).map((t) => ({
        id: t.id,
        date: t.date,
        formattedDate: t.formattedDate,
        description: t.description,
        supplier: t.supplier,
        categoryName: cat.categoryName,
        type: 'expense' as const,
        amount: t.amount,
        gstAmount: 0,
      }))
    );
  }

  return (monthlyTrends || []).map((m) => {
    const monthTx = allTx.filter((t) => t.date && t.date.startsWith(m.key));

    // When in demo mode (no raw db transactions), ensure monthly expense / income aligns with demo transactions
    let expenses = m.expenses;
    let income = m.income;
    if ((!rawTransactions || rawTransactions.length === 0) && monthTx.length > 0) {
      expenses = monthTx.reduce((sum, t) => sum + (t.type === 'expense' ? t.amount : 0), 0);
      income = monthTx.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : 0), 0);
    }

    return {
      ...m,
      income,
      expenses,
      net: income - expenses,
      transactionCount: monthTx.length,
      transactions: monthTx,
    };
  });
}

