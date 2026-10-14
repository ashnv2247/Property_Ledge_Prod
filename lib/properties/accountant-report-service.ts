import { createClient } from '@/lib/supabase/server';
import {
  getCurrentFinancialYearNumber,
  getFinancialYearRange,
  getFinancialYearLabel,
  parseFinancialYear,
} from '@/lib/finance/financial-year';
import { formatCurrency } from '@/lib/format/currency';
import {
  PropertyAccountantReportPayload,
  FinancialSummary,
  PropertyPerformance,
  PropertyExpenseItem,
  ATODeductionCategoryItem,
  YearOverYearComparison,
  ComparisonLineItem,
} from '@/modules/properties/domain/accountant-report-types';

const STANDARD_ATO_DEDUCTIONS = [
  'Advertising for tenants',
  'Body corporate fees and charges',
  'Borrowing expenses',
  'Cleaning',
  'Council rates',
  'Capital works (G10)',
  'Gardening and lawn mowing',
  'Insurance',
  'Interest on loans',
  'Land tax',
  'Legal expenses',
  'Pest control',
  'Property agent fees and commissions',
  'Repairs and maintenance',
  'Stationery, phone, and postage',
  'Water charges',
  'Sundry rental expenses',
];

function normalizeCategoryName(rawCategory: string = ''): string {
  const lower = rawCategory.toLowerCase();
  if (lower.includes('advertis')) return 'Advertising for tenants';
  if (lower.includes('body corp') || lower.includes('strata')) return 'Body corporate fees and charges';
  if (lower.includes('borrow')) return 'Borrowing expenses';
  if (lower.includes('clean')) return 'Cleaning';
  if (lower.includes('council') || lower.includes('rates')) return 'Council rates';
  if (lower.includes('capital') || lower.includes('g10')) return 'Capital works (G10)';
  if (lower.includes('garden') || lower.includes('lawn')) return 'Gardening and lawn mowing';
  if (lower.includes('insurance')) return 'Insurance';
  if (lower.includes('interest')) return 'Interest on loans';
  if (lower.includes('land tax')) return 'Land tax';
  if (lower.includes('legal')) return 'Legal expenses';
  if (lower.includes('pest')) return 'Pest control';
  if (lower.includes('agent') || lower.includes('commission') || lower.includes('management fee')) return 'Property agent fees and commissions';
  if (lower.includes('repair') || lower.includes('maintenance')) return 'Repairs and maintenance';
  if (lower.includes('phone') || lower.includes('postage') || lower.includes('stationery')) return 'Stationery, phone, and postage';
  if (lower.includes('water') || lower.includes('utility') || lower.includes('utilities')) return 'Water charges';
  return 'Sundry rental expenses';
}

export async function getPropertyAccountantReportData(
  propertyId: string,
  financialYearInput?: string | number | null
): Promise<PropertyAccountantReportPayload | null> {
  const currentFyNumber = getCurrentFinancialYearNumber();
  const selectedFyNumber = financialYearInput
    ? parseFinancialYear(financialYearInput)
    : currentFyNumber;
  const previousFyNumber = selectedFyNumber - 1;

  const currentFyRange = getFinancialYearRange(selectedFyNumber);
  const previousFyRange = getFinancialYearRange(previousFyNumber);

  const supabase = await createClient();

  // 1. Fetch Property details
  const { data: propData, error: propError } = await supabase
    .from('properties')
    .select('id, name, address_line_1, city, state, postal_code, property_type, purchase_price')
    .eq('id', propertyId)
    .single();

  const property = propData as Record<string, any> | null;

  if (propError || !property) {
    console.error('Property not found for accountant report:', propError);
    return null;
  }

  const rawVal = Number(property.purchase_price);
  const propertyValue = rawVal > 0 ? rawVal : 650000; // Default baseline $650,000 per prompt spec if not set
  const propertyAddress = `${property.address_line_1 || property.name}, ${property.city || ''} ${property.state || ''} ${property.postal_code || ''}`.trim();

  // 2. Fetch Selected FY transactions
  const { data: currentTxs, error: curTxError } = await supabase
    .from('transactions')
    .select(`
      id,
      amount,
      transaction_date,
      transaction_type,
      description,
      vendor_name,
      notes,
      status,
      receipt_url,
      category:categories(name)
    `)
    .eq('property_id', propertyId)
    .eq('status', 'completed')
    .gte('transaction_date', currentFyRange.start)
    .lte('transaction_date', currentFyRange.end)
    .order('transaction_date', { ascending: false });

  if (curTxError) {
    console.error('Error fetching current FY transactions:', curTxError);
  }

  // 3. Fetch Previous FY transactions (for YoY comparisons)
  const { data: previousTxs, error: prevTxError } = await supabase
    .from('transactions')
    .select(`
      id,
      amount,
      transaction_date,
      transaction_type,
      description,
      vendor_name,
      notes,
      status,
      category:categories(name)
    `)
    .eq('property_id', propertyId)
    .eq('status', 'completed')
    .gte('transaction_date', previousFyRange.start)
    .lte('transaction_date', previousFyRange.end);

  if (prevTxError) {
    console.error('Error fetching previous FY transactions:', prevTxError);
  }

  const curTransactions = (currentTxs || []) as Array<Record<string, any>>;
  const prevTransactions = (previousTxs || []) as Array<Record<string, any>>;

  // Group Income & Expenses
  const currentIncome = curTransactions
    .filter((t) => t.transaction_type === 'income')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const currentExpenses = curTransactions
    .filter((t) => t.transaction_type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const prevIncome = prevTransactions
    .filter((t) => t.transaction_type === 'income')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const prevExpenses = prevTransactions
    .filter((t) => t.transaction_type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  // Exact formulas specified by user:
  // Card 1: Gross Rental Yield = (Annual Gross Rent / Property Value) * 100
  const grossYield = propertyValue > 0 ? Number(((currentIncome / propertyValue) * 100).toFixed(2)) : 0;

  // Card 2: Net Rental Yield = ((Annual Gross Rent - Total Expenses) / Property Value) * 100
  const netCashPosition = currentIncome - currentExpenses;
  const netYield = propertyValue > 0 ? Number(((netCashPosition / propertyValue) * 100).toFixed(2)) : 0;

  // Card 4: Expense Ratio = (Total Expenses / Annual Gross Rent) * 100
  const expenseRatio = currentIncome > 0 ? Number(((currentExpenses / currentIncome) * 100).toFixed(2)) : 0;

  const summary: FinancialSummary = {
    grossRent: currentIncome,
    totalExpenses: currentExpenses,
    netCashPosition,
    grossYield,
    netYield,
    expenseRatio,
  };

  const performance: PropertyPerformance = {
    propertyValue,
    grossRent: currentIncome,
    totalExpenses: currentExpenses,
    grossYield,
    netYield,
    netCashPosition,
    expenseRatio,
  };

  // Map individual expense line items
  const expenseItems: PropertyExpenseItem[] = curTransactions
    .filter((t) => t.transaction_type === 'expense')
    .map((t) => {
      const catName = (t.category as { name?: string })?.name || 'Operating Expense';
      const isVerified = Boolean(t.notes?.includes('[VERIFIED]'));
      const d = new Date(t.transaction_date);
      const formattedDate = !isNaN(d.getTime())
        ? d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })
        : t.transaction_date;

      return {
        id: t.id,
        name: t.description || t.vendor_name || catName,
        date: t.transaction_date,
        formattedDate,
        amount: Number(t.amount || 0),
        formattedAmount: formatCurrency(Number(t.amount || 0)),
        categoryName: catName,
        receiptUrl: t.receipt_url || null,
        isVerified,
        notes: t.notes || null,
      };
    });

  // Aggregate Deductions by ATO Categories for Current and Previous FY
  const curDeductionMap = new Map<string, number>();
  for (const t of curTransactions) {
    if (t.transaction_type === 'expense') {
      const rawCat = (t.category as { name?: string })?.name || t.description || '';
      const mapped = normalizeCategoryName(rawCat);
      curDeductionMap.set(mapped, (curDeductionMap.get(mapped) || 0) + Number(t.amount || 0));
    }
  }

  const prevDeductionMap = new Map<string, number>();
  for (const t of prevTransactions) {
    if (t.transaction_type === 'expense') {
      const rawCat = (t.category as { name?: string })?.name || t.description || '';
      const mapped = normalizeCategoryName(rawCat);
      prevDeductionMap.set(mapped, (prevDeductionMap.get(mapped) || 0) + Number(t.amount || 0));
    }
  }

  // Build ATO Deductions List (keep empty fields as null/— as instructed)
  const deductions: ATODeductionCategoryItem[] = STANDARD_ATO_DEDUCTIONS.map((name) => {
    const val = curDeductionMap.get(name);
    return {
      name,
      amount: val !== undefined && val > 0 ? val : null,
    };
  });

  // Build Year-Over-Year comparison line items
  const yoyItems: ComparisonLineItem[] = [];

  // 1. Gross Rental Income comparison
  const incomeDiff = currentIncome - prevIncome;
  const incomePct = prevIncome > 0 ? Number(((incomeDiff / prevIncome) * 100).toFixed(1)) : null;
  yoyItems.push({
    category: 'Gross Rental Income',
    selectedFyAmount: currentIncome,
    previousFyAmount: prevIncome,
    difference: incomeDiff,
    percentageChange: incomePct,
    direction: incomeDiff > 0 ? 'increase' : incomeDiff < 0 ? 'decrease' : 'neutral',
  });

  // 2. Deduction categories comparison
  for (const catName of STANDARD_ATO_DEDUCTIONS) {
    const curVal = curDeductionMap.get(catName) || 0;
    const prevVal = prevDeductionMap.get(catName) || 0;
    if (curVal === 0 && prevVal === 0) continue; // Skip totally blank categories in comparison table for cleanliness

    const diff = curVal - prevVal;
    const pct = prevVal > 0 ? Number(((diff / prevVal) * 100).toFixed(1)) : null;
    yoyItems.push({
      category: catName,
      selectedFyAmount: curVal,
      previousFyAmount: prevVal,
      difference: diff,
      percentageChange: pct,
      direction: diff > 0 ? 'increase' : diff < 0 ? 'decrease' : 'neutral',
    });
  }

  // 3. Total Expenses comparison
  const expDiff = currentExpenses - prevExpenses;
  const expPct = prevExpenses > 0 ? Number(((expDiff / prevExpenses) * 100).toFixed(1)) : null;
  yoyItems.push({
    category: 'Total Expenses (Deductions)',
    selectedFyAmount: currentExpenses,
    previousFyAmount: prevExpenses,
    difference: expDiff,
    percentageChange: expPct,
    direction: expDiff > 0 ? 'increase' : expDiff < 0 ? 'decrease' : 'neutral',
  });

  // 4. Net Position comparison
  const prevNet = prevIncome - prevExpenses;
  const netDiff = netCashPosition - prevNet;
  const netPct = prevNet !== 0 ? Number(((netDiff / Math.abs(prevNet)) * 100).toFixed(1)) : null;
  yoyItems.push({
    category: 'Net Rental Position',
    selectedFyAmount: netCashPosition,
    previousFyAmount: prevNet,
    difference: netDiff,
    percentageChange: netPct,
    direction: netDiff > 0 ? 'increase' : netDiff < 0 ? 'decrease' : 'neutral',
  });

  const selectedFyLabel = getFinancialYearLabel(selectedFyNumber);
  const previousFyLabel = getFinancialYearLabel(previousFyNumber);

  const yoyComparison: YearOverYearComparison = {
    selectedFy: selectedFyLabel,
    previousFy: previousFyLabel,
    items: yoyItems,
    totalIncomeCurrent: currentIncome,
    totalIncomePrevious: prevIncome,
    totalExpensesCurrent: currentExpenses,
    totalExpensesPrevious: prevExpenses,
    netPositionCurrent: netCashPosition,
    netPositionPrevious: prevNet,
  };

  const atoForm = {
    propertyAddress,
    financialYearLabel: selectedFyLabel,
    firstYearRented: null, // Placeholder '—'
    ownershipPercentage: 100,
    rentalIncome: {
      grossRent: currentIncome,
      otherRentalIncome: null,
      totalGrossRentalIncome: currentIncome,
    },
    deductions,
    totalDeductions: currentExpenses,
    netRentalIncome: netCashPosition,
    expenses: expenseItems,
  };

  return {
    property: {
      id: property.id,
      name: property.name,
      address: propertyAddress,
      propertyValue,
      propertyType: property.property_type || 'Residential',
    },
    financialYear: selectedFyNumber,
    financialYearLabel: selectedFyLabel,
    previousFinancialYearLabel: previousFyLabel,
    summary,
    performance,
    atoForm,
    yoyComparison,
  };
}

export async function toggleExpenseVerificationAction(
  expenseId: string,
  verified: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: existing, error: fetchErr } = await supabase
      .from('transactions')
      .select('notes')
      .eq('id', expenseId)
      .single();

    if (fetchErr || !existing) {
      return { success: false, error: 'Transaction not found' };
    }

    let notes = (existing as { notes?: string | null })?.notes || '';
    if (verified) {
      if (!notes.includes('[VERIFIED]')) {
        notes = notes ? `${notes} [VERIFIED]` : '[VERIFIED]';
      }
    } else {
      notes = notes.replace(/\[VERIFIED\]/g, '').trim();
    }

    const { error: updateErr } = await supabase
      .from('transactions')
      .update({ notes } as never)
      .eq('id', expenseId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to toggle verification' };
  }
}
