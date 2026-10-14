export function formatCurrency(amount: number): string {
  const safe = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(safe);
}

export function formatCurrencyNoDecimals(amount: number): string {
  const safe = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: safe % 1 === 0 ? 0 : 2,
  }).format(safe);
}

export function formatCompactCurrency(amount: number): string {
  const safe = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  if (Math.abs(safe) >= 1_000_000) {
    const formatted = (safe / 1_000_000).toFixed(2).replace(/\.00$/, '');
    return `$${formatted}M`;
  }
  return formatCurrencyNoDecimals(safe);
}
