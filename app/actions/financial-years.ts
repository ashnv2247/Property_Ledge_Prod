'use server';

import { getCurrentUser } from '@/lib/auth/queries';
import { resolveWorkspaceContext } from '@/lib/workspace/context';
import { createClient } from '@/lib/supabase/server';
import {
  getCurrentFinancialYearNumber,
  parseFinancialYear,
  getFinancialYearRange,
  getFinancialYearLabel,
  getFinancialYears,
  getFinancialYearMonths,
  isDateInFinancialYear,
} from '@/lib/finance/financial-year';
import { isIncome, isExpense } from '@/modules/finance/domain/calculations';

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

export interface FinancialYearSummaryItem {
  year: number;
  code: string;
  label: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'closed' | 'upcoming';
  totalIncome: number;
  totalExpenses: number;
  netResult: number;
  transactionCount: number;
  propertiesCount: number;
}

export interface FinancialYearsOverviewData {
  currentFinancialYear: number;
  financialYears: FinancialYearSummaryItem[];
  portfolioStats: {
    totalHistoricalIncome: number;
    totalHistoricalExpenses: number;
    totalHistoricalNet: number;
    totalTransactionsCount: number;
    activePropertiesCount: number;
  };
  properties: Array<{ id: string; name: string; address_line_1?: string }>;
}

export interface FinancialYearMonthlyBreakdown {
  key: string;
  label: string;
  shortLabel: string;
  year: number;
  month: number;
  income: number;
  expenses: number;
  net: number;
  transactionCount: number;
}

export interface FinancialYearPropertyBreakdown {
  propertyId: string;
  propertyName: string;
  income: number;
  expenses: number;
  net: number;
  transactionCount: number;
}

export interface FinancialYearDetailData {
  year: number;
  code: string;
  label: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'closed' | 'upcoming';
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netResult: number;
    gstCollected: number;
    gstPaid: number;
    transactionCount: number;
  };
  monthlyBreakdown: FinancialYearMonthlyBreakdown[];
  propertyBreakdown: FinancialYearPropertyBreakdown[];
  categoryBreakdown: Array<{
    name: string;
    type: 'income' | 'expense';
    amount: number;
    percentage: number;
  }>;
  recentTransactions: Array<{
    id: string;
    date: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    category?: string;
    propertyName?: string;
  }>;
}

/**
 * Server action to fetch overview data for all Australian Financial Years in the workspace.
 */
export async function fetchFinancialYearsOverviewAction(propertyId?: string): Promise<{
  success: boolean;
  data?: FinancialYearsOverviewData;
  error?: string;
}> {
  try {
    const { context } = await getAuthContext();
    const supabase = await createClient();
    const currentFY = getCurrentFinancialYearNumber();

    // 1. Fetch properties for this workspace
    const { data: propertiesData, error: propErr } = await supabase
      .from('properties')
      .select('id, name, address_line_1')
      .eq('workspace_id', context.workspaceId)
      .order('name', { ascending: true });

    if (propErr) throw propErr;
    const properties = propertiesData || [];

    // 2. Fetch completed transactions for this workspace (filtered by property if specified)
    let txQuery = supabase
      .from('transactions')
      .select('id, amount, transaction_type, transaction_date, status, property_id, gst_inclusive, gst_amount')
      .eq('workspace_id', context.workspaceId)
      .eq('status', 'completed');

    if (propertyId && propertyId !== 'all') {
      txQuery = txQuery.eq('property_id', propertyId);
    }

    const { data: transactionsData, error: txErr } = await txQuery;
    if (txErr) throw txErr;
    const transactions = (transactionsData || []) as any[];

    // 3. Generate canonical available financial years (5 years back, 1 year forward)
    const availableFys = getFinancialYears({ countBack: 5, countForward: 1 });

    let totalHistoricalIncome = 0;
    let totalHistoricalExpenses = 0;
    let totalTransactionsCount = transactions.length;

    const fySummaries: FinancialYearSummaryItem[] = availableFys.map((fyOpt) => {
      const yr = fyOpt.year;
      const range = fyOpt.range;

      let status: 'active' | 'closed' | 'upcoming' = 'closed';
      if (yr === currentFY) {
        status = 'active';
      } else if (yr > currentFY) {
        status = 'upcoming';
      }

      // Filter transactions belonging to this FY
      const fyTxList = transactions.filter((tx) =>
        isDateInFinancialYear(tx.transaction_date, yr)
      );

      let income = 0;
      let expenses = 0;
      const activePropSet = new Set<string>();

      for (const tx of fyTxList) {
        const amt = Number(tx.amount) || 0;
        if (isIncome(tx.transaction_type)) {
          income += amt;
          totalHistoricalIncome += amt;
        } else if (isExpense(tx.transaction_type)) {
          expenses += amt;
          totalHistoricalExpenses += amt;
        }
        if (tx.property_id) {
          activePropSet.add(tx.property_id);
        }
      }

      return {
        year: yr,
        code: fyOpt.shortLabel,
        label: fyOpt.label,
        startDate: range.start,
        endDate: range.end,
        status,
        totalIncome: Math.round(income * 100) / 100,
        totalExpenses: Math.round(expenses * 100) / 100,
        netResult: Math.round((income - expenses) * 100) / 100,
        transactionCount: fyTxList.length,
        propertiesCount: activePropSet.size,
      };
    });

    return {
      success: true,
      data: {
        currentFinancialYear: currentFY,
        financialYears: fySummaries,
        portfolioStats: {
          totalHistoricalIncome: Math.round(totalHistoricalIncome * 100) / 100,
          totalHistoricalExpenses: Math.round(totalHistoricalExpenses * 100) / 100,
          totalHistoricalNet: Math.round((totalHistoricalIncome - totalHistoricalExpenses) * 100) / 100,
          totalTransactionsCount,
          activePropertiesCount: properties.length,
        },
        properties,
      },
    };
  } catch (err: any) {
    console.error('[FINANCIAL_YEARS_OVERVIEW_ERROR]', err);
    return {
      success: false,
      error: err.message || 'Failed to fetch financial years overview',
    };
  }
}

/**
 * Server action to fetch deep-dive details for a specific Australian Financial Year.
 */
export async function fetchFinancialYearDetailsAction(
  financialYear: number | string,
  propertyId?: string
): Promise<{
  success: boolean;
  data?: FinancialYearDetailData;
  error?: string;
}> {
  try {
    const { context } = await getAuthContext();
    const supabase = await createClient();

    const yr = parseFinancialYear(financialYear);
    const range = getFinancialYearRange(yr);
    const currentFY = getCurrentFinancialYearNumber();

    let status: 'active' | 'closed' | 'upcoming' = 'closed';
    if (yr === currentFY) {
      status = 'active';
    } else if (yr > currentFY) {
      status = 'upcoming';
    }

    // 1. Fetch transactions within this FY's date range
    let query = supabase
      .from('transactions')
      .select(`
        id,
        amount,
        transaction_type,
        transaction_date,
        description,
        status,
        gst_inclusive,
        gst_amount,
        property_id,
        category:categories(id, name),
        property:properties(id, name)
      `)
      .eq('workspace_id', context.workspaceId)
      .eq('status', 'completed')
      .gte('transaction_date', range.start)
      .lte('transaction_date', range.end)
      .order('transaction_date', { ascending: false });

    if (propertyId && propertyId !== 'all') {
      query = query.eq('property_id', propertyId);
    }

    const { data: transactionsData, error: txErr } = await query;
    if (txErr) throw txErr;
    const transactions = (transactionsData || []) as any[];

    // 2. Compute totals & GST
    let totalIncome = 0;
    let totalExpenses = 0;
    let gstCollected = 0;
    let gstPaid = 0;

    // Monthly breakdown buckets (12 Australian months: July -> June)
    const monthOrder = getFinancialYearMonths(yr);
    const monthlyMap = new Map<string, FinancialYearMonthlyBreakdown>();
    monthOrder.forEach((m) => {
      monthlyMap.set(m.key, {
        key: m.key,
        label: m.label,
        shortLabel: m.shortLabel,
        year: m.year,
        month: m.month,
        income: 0,
        expenses: 0,
        net: 0,
        transactionCount: 0,
      });
    });

    // Property map
    const propMap = new Map<string, FinancialYearPropertyBreakdown>();
    // Category map
    const catMap = new Map<string, { name: string; type: 'income' | 'expense'; amount: number }>();

    for (const tx of transactions) {
      const amt = Number(tx.amount) || 0;
      const isInc = isIncome(tx.transaction_type);
      const isExp = isExpense(tx.transaction_type);

      // GST calculation
      const customGst = tx.gst_amount !== null && tx.gst_amount !== undefined ? Number(tx.gst_amount) : null;
      let txGst = 0;
      if (customGst !== null) {
        txGst = customGst;
      } else if (tx.gst_inclusive) {
        txGst = Math.round((amt - amt / 1.1) * 100) / 100;
      }

      if (isInc) {
        totalIncome += amt;
        gstCollected += txGst;
      } else if (isExp) {
        totalExpenses += amt;
        gstPaid += txGst;
      }

      // Monthly aggregation
      const txMonthKey = tx.transaction_date ? tx.transaction_date.substring(0, 7) : '';
      if (monthlyMap.has(txMonthKey)) {
        const mObj = monthlyMap.get(txMonthKey)!;
        mObj.transactionCount++;
        if (isInc) mObj.income += amt;
        if (isExp) mObj.expenses += amt;
        mObj.net = Math.round((mObj.income - mObj.expenses) * 100) / 100;
      }

      // Property aggregation
      const pId = tx.property_id || 'unassigned';
      const pName = tx.property?.name || 'Unassigned Property';
      if (!propMap.has(pId)) {
        propMap.set(pId, {
          propertyId: pId,
          propertyName: pName,
          income: 0,
          expenses: 0,
          net: 0,
          transactionCount: 0,
        });
      }
      const pObj = propMap.get(pId)!;
      pObj.transactionCount++;
      if (isInc) pObj.income += amt;
      if (isExp) pObj.expenses += amt;
      pObj.net = Math.round((pObj.income - pObj.expenses) * 100) / 100;

      // Category aggregation
      const cName = tx.category?.name || 'General';
      const cType: 'income' | 'expense' = isInc ? 'income' : 'expense';
      const catKey = `${cType}_${cName}`;
      if (!catMap.has(catKey)) {
        catMap.set(catKey, { name: cName, type: cType, amount: 0 });
      }
      catMap.get(catKey)!.amount += amt;
    }

    const netResult = Math.round((totalIncome - totalExpenses) * 100) / 100;

    // Build category breakdowns with percentages
    const categoryBreakdown = Array.from(catMap.values())
      .map((c) => {
        const totalBase = c.type === 'income' ? totalIncome : totalExpenses;
        const percentage = totalBase > 0 ? Math.round((c.amount / totalBase) * 100) : 0;
        return {
          name: c.name,
          type: c.type,
          amount: Math.round(c.amount * 100) / 100,
          percentage,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    const recentTransactions = transactions.slice(0, 15).map((tx) => ({
      id: tx.id,
      date: tx.transaction_date,
      description: tx.description || 'Transaction',
      amount: Number(tx.amount) || 0,
      type: (isIncome(tx.transaction_type) ? 'income' : 'expense') as 'income' | 'expense',
      category: tx.category?.name,
      propertyName: tx.property?.name,
    }));

    return {
      success: true,
      data: {
        year: yr,
        code: `FY${String(yr).slice(-2)}`,
        label: getFinancialYearLabel(yr),
        startDate: range.start,
        endDate: range.end,
        status,
        summary: {
          totalIncome: Math.round(totalIncome * 100) / 100,
          totalExpenses: Math.round(totalExpenses * 100) / 100,
          netResult,
          gstCollected: Math.round(gstCollected * 100) / 100,
          gstPaid: Math.round(gstPaid * 100) / 100,
          transactionCount: transactions.length,
        },
        monthlyBreakdown: Array.from(monthlyMap.values()),
        propertyBreakdown: Array.from(propMap.values()).sort((a, b) => b.income - a.income),
        categoryBreakdown,
        recentTransactions,
      },
    };
  } catch (err: any) {
    console.error('[FINANCIAL_YEAR_DETAILS_ERROR]', err);
    return {
      success: false,
      error: err.message || 'Failed to fetch financial year details',
    };
  }
}

/**
 * Validates Australian Financial Year date boundaries.
 */
export async function validateFinancialYearPeriodAction(
  startDate: string,
  endDate: string
): Promise<{
  isValid: boolean;
  message: string;
  isStandardAuPeriod: boolean;
  suggestedCode?: string;
}> {
  if (!startDate || !endDate) {
    return {
      isValid: false,
      message: 'Both start date and end date are required.',
      isStandardAuPeriod: false,
    };
  }

  if (startDate >= endDate) {
    return {
      isValid: false,
      message: 'Start date must be strictly before end date.',
      isStandardAuPeriod: false,
    };
  }

  // Check Australian standard financial year (01 July -> 30 June next year)
  const isStartJulyFirst = startDate.endsWith('-07-01');
  const isEndJuneThirty = endDate.endsWith('-06-30');

  const startYear = parseInt(startDate.substring(0, 4), 10);
  const endYear = parseInt(endDate.substring(0, 4), 10);

  const isOneYearApart = endYear === startYear + 1;

  if (isStartJulyFirst && isEndJuneThirty && isOneYearApart) {
    return {
      isValid: true,
      isStandardAuPeriod: true,
      suggestedCode: `FY${String(endYear).slice(-2)}`,
      message: `Standard Australian Financial Year FY${String(endYear).slice(-2)} (01 Jul ${startYear} – 30 Jun ${endYear}). Valid and fully compliant with ATO accounting standards.`,
    };
  }

  return {
    isValid: true,
    isStandardAuPeriod: false,
    message: `Custom reporting period (${startDate} to ${endDate}). Note: Standard Australian statutory reporting runs from 01 July to 30 June.`,
  };
}
