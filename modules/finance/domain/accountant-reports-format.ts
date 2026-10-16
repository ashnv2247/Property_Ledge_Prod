/**
 * Client-safe Australian Accounting Formatting and ATO Category Mapping Utilities
 */

export const ATO_EXPENSE_CATEGORIES = [
  { code: 'E', name: 'Body corporate fees', aliases: ['body corporate', 'body corp', 'strata', 'owners corp'] },
  { code: 'G', name: 'Cleaning', aliases: ['clean', 'cleaning', 'rubbish', 'waste'] },
  { code: 'U', name: 'Water', aliases: ['water', 'water rates', 'water charges', 'sewerage'] },
  { code: 'H', name: 'Council rates', aliases: ['council rates', 'council', 'shire', 'municipal'] },
  { code: 'I', name: 'Capital allowance assets', aliases: ['capital allowance', 'depreciation on plant', 'div 40', 'plant'] },
  { code: 'L', name: 'Interest', aliases: ['interest', 'mortgage interest', 'loan interest', 'bank interest'] },
  { code: 'Q', name: 'Repairs', aliases: ['repair', 'maintenance', 'plumbing', 'electrical', 'handyman'] },
  { code: 'R', name: 'Capital works deductions', aliases: ['capital work', 'capital works', 'building write-off', 'div 43'] },
  { code: 'S', name: 'Office supplies', aliases: ['stationery', 'phone', 'postage', 'office supplies'] },
  { code: 'V', name: 'Sundry', aliases: ['sundry', 'sundries', 'miscellaneous', 'other', 'pest', 'gardening', 'advertising', 'insurance', 'agent', 'management'] },
];

export function mapToAtoCategory(catName: string = ''): { code: string; name: string } {
  const lower = catName.toLowerCase().trim();
  for (const cat of ATO_EXPENSE_CATEGORIES) {
    if (cat.aliases.some((a) => lower.includes(a) || a.includes(lower))) {
      return { code: cat.code, name: cat.name };
    }
  }
  return { code: 'V', name: 'Sundry' };
}

/**
 * Formats financial amounts into Australian accounting format:
 * - Negative amounts enclosed in parentheses, e.g. (1,802)
 * - Zero amounts formatted as em-dash "—"
 */
export function formatAccountingAmount(val: number | null | undefined, includeSymbol: boolean = false): string {
  if (val === null || val === undefined || Math.abs(val) < 0.001) {
    return '—';
  }
  const formatted = Math.abs(Math.round(val)).toLocaleString('en-AU');
  const symbol = includeSymbol ? '$' : '';
  if (val < 0) {
    return `(${symbol}${formatted})`;
  }
  return `${symbol}${formatted}`;
}
