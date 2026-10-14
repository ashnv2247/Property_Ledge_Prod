export interface FinancialSummary {
  grossRent: number;
  totalExpenses: number;
  netCashPosition: number;
  grossYield: number; // percentage, e.g. 4.40
  netYield: number;   // percentage, e.g. 3.34
  expenseRatio: number; // percentage, e.g. 24.19
}

export interface PropertyPerformance {
  propertyValue: number;
  grossRent: number;
  totalExpenses: number;
  grossYield: number; // (Annual Gross Rent / Property Value) * 100
  netYield: number;   // ((Annual Gross Rent - Total Expenses) / Property Value) * 100
  netCashPosition: number; // Annual Gross Rent - Total Expenses
  expenseRatio: number; // (Total Expenses / Annual Gross Rent) * 100
}

export interface PropertyExpenseItem {
  id: string;
  name: string;
  date: string;
  formattedDate: string;
  amount: number;
  formattedAmount: string;
  categoryName: string;
  receiptUrl: string | null;
  isVerified: boolean;
  notes?: string | null;
}

export interface ComparisonLineItem {
  category: string;
  selectedFyAmount: number;
  previousFyAmount: number;
  difference: number;
  percentageChange: number | null;
  direction: 'increase' | 'decrease' | 'neutral';
}

export interface YearOverYearComparison {
  selectedFy: string;
  previousFy: string;
  items: ComparisonLineItem[];
  totalIncomeCurrent: number;
  totalIncomePrevious: number;
  totalExpensesCurrent: number;
  totalExpensesPrevious: number;
  netPositionCurrent: number;
  netPositionPrevious: number;
}

export interface ATODeductionCategoryItem {
  name: string;
  amount: number | null; // null if not present, rendered as "—"
  code?: string;
}

export interface ATOFormData {
  propertyAddress: string;
  financialYearLabel: string;
  firstYearRented: string | null; // Placeholder "—" if not set
  ownershipPercentage: number;
  rentalIncome: {
    grossRent: number;
    otherRentalIncome: number | null;
    totalGrossRentalIncome: number;
  };
  deductions: ATODeductionCategoryItem[];
  totalDeductions: number;
  netRentalIncome: number;
  expenses: PropertyExpenseItem[];
}

export interface PropertyAccountantReportPayload {
  property: {
    id: string;
    name: string;
    address: string;
    propertyValue: number;
    propertyType: string;
  };
  financialYear: number;
  financialYearLabel: string;
  previousFinancialYearLabel: string;
  summary: FinancialSummary;
  performance: PropertyPerformance;
  atoForm: ATOFormData;
  yoyComparison: YearOverYearComparison;
}
