import { expect, test } from '@playwright/test';
import { getActiveNavHref, isNavActive } from '../../components/shell/AppShell';

const invoiceItems = [
  { href: '/dashboard/invoices' },
  { href: '/dashboard/invoices/schedule-email' },
  { href: '/dashboard/condition-reports' },
];

test('selects only the most specific matching sidebar route', () => {
  expect(
    getActiveNavHref(
      '/dashboard/invoices/schedule-email',
      '',
      invoiceItems,
      '/dashboard'
    )
  ).toBe('/dashboard/invoices/schedule-email');
});

test('keeps the invoices overview active for other invoice child pages', () => {
  expect(
    getActiveNavHref('/dashboard/invoices/templates', '', invoiceItems, '/dashboard')
  ).toBe('/dashboard/invoices');
});

test('does not treat a similarly prefixed route as a child route', () => {
  expect(
    isNavActive('/dashboard/invoices-archive', '', '/dashboard/invoices', '/dashboard')
  ).toBe(false);
});
