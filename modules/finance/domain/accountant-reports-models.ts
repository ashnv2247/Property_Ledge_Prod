/**
 * Australian Accountant Reports Domain Contracts
 * Supporting:
 * 1. Comparative Statement (Year-over-Year rental financial variance)
 * 2. Rental Schedule (ATO Individual Tax Return rental property schedule)
 */

export type AccountantReportType = 'comparative' | 'schedule';

export interface CategoryLineItem {
  id: string;
  category: string;
  code?: string;
  currentAmount: number;
  previousAmount: number;
  variance: number;
  percentageChange: number | null;
  direction: 'increase' | 'decrease' | 'neutral';
}

export interface ComparativeStatementData {
  property: {
    id: string;
    name: string;
    address: string;
    addressLine1: string;
    city: string;
    state: string;
    postalCode: string;
    propertyType: string;
    ownershipPercentage: number;
    lotUnitIdentifier?: string;
  };
  selectedFy: string;     // e.g. "2024/25"
  previousFy: string;     // e.g. "2023/24"
  incomeRows: CategoryLineItem[];
  totalIncomeCurrent: number;
  totalIncomePrevious: number;
  totalIncomeVariance: number;
  expenseRows: CategoryLineItem[];
  totalExpensesCurrent: number;
  totalExpensesPrevious: number;
  totalExpensesVariance: number;
  netRentalResultCurrent: number;
  netRentalResultPrevious: number;
  netRentalResultVariance: number;
  summary: {
    hasImprovement: boolean;
    narrative: string;
    expenseVarianceFormatted: string;
    netRentalVarianceFormatted: string;
  };
}

export interface RentalScheduleItem {
  code: string;       // ATO Schedule Code, e.g. "A", "C", "E", "G", etc.
  name: string;
  grossAmount: number | null;
  ownerShare: number | null;
  isSubtotal?: boolean;
}

export interface RentalScheduleOwner {
  name: string;
  tfnStatus: string;  // e.g. "TFN Recorded"
  percentage: number; // e.g. 100
}

export interface RentalScheduleData {
  property: {
    id: string;
    name: string;
    address: string;
    addressLine1: string;
    city: string;
    state: string;
    postalCode: string;
  };
  financialYear: number;
  financialYearLabel: string; // e.g. "FY 2024/25"
  taxYearLabel: string;        // e.g. "Individual Tax Return 2025"
  
  // Section A: Property details
  sectionA: {
    address: string;
    city: string;
    state: string;
    postcode: string;
    propertyName: string;
    dateFirstEarnedRentalIncome: string; // e.g. "20/11/2017"
    weeksRentedThisYear: number;         // e.g. 52
    weeksAvailableForRentThisYear: number; // e.g. 52
    ownershipPercentage: number;        // e.g. 100
    loanRenegotiated: 'Yes' | 'No';
  };

  // Section B: Acquisitions and Disposal
  sectionB: {
    acquisitionDate: string | null;
    acquisitionAmount: number | null;
    disposalDate: string | null;
    disposalAmount: number | null;
    capitalGainLoss: number | null;
    capitalAllowancesRecouped: number | null;
    capitalWorksRecouped: number | null;
  };

  // Section C: Owners
  sectionC: {
    owners: RentalScheduleOwner[];
    totalPercentage: number;
  };

  // Section D: Income and Expenses
  sectionD: {
    income: {
      rentalIncome: RentalScheduleItem; // Code [A]
      grossRent: RentalScheduleItem;    // Code [C]
    };
    expenses: RentalScheduleItem[];     // Codes [E], [G], [H], [I], [L], [Q], [R], [S], [U], [V], etc.
    totalExpenses: RentalScheduleItem;  // Code [W]
    totalNetRent: RentalScheduleItem;   // Code [X]
  };

  reviewWarnings: string[];
}
