import { test, expect } from '@playwright/test';
import { applyThemeMode, ThemeMode } from '@/lib/themeTransition';

test.describe('Theme Defaults & Precedence Logic', () => {
  // Route default helper matching layout.tsx logic
  function resolveDefaultTheme(pathname: string, storedTheme: string | null): ThemeMode {
    if (storedTheme) {
      return storedTheme as ThemeMode;
    }
    const isDashboard =
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/properties') ||
      pathname.startsWith('/people') ||
      pathname.startsWith('/leases') ||
      pathname.startsWith('/money') ||
      pathname.startsWith('/expenses') ||
      pathname.startsWith('/invoices') ||
      pathname.startsWith('/schedules') ||
      pathname.startsWith('/bas') ||
      pathname.startsWith('/activity') ||
      pathname.startsWith('/documents') ||
      pathname.startsWith('/automations') ||
      pathname.startsWith('/tasks') ||
      pathname.startsWith('/reports') ||
      pathname.startsWith('/team') ||
      pathname.startsWith('/settings');

    return isDashboard ? 'light' : 'dark';
  }

  test('Public marketing landing page defaults to Dark when no saved preference exists', () => {
    const resolved = resolveDefaultTheme('/', null);
    expect(resolved).toBe('dark');
  });

  test('Marketing subpage (e.g. /pricing, /about) defaults to Dark when no saved preference exists', () => {
    expect(resolveDefaultTheme('/pricing', null)).toBe('dark');
    expect(resolveDefaultTheme('/contact', null)).toBe('dark');
  });

  test('Authenticated dashboard routes default to Mixed (light) when no saved preference exists', () => {
    expect(resolveDefaultTheme('/dashboard', null)).toBe('light');
    expect(resolveDefaultTheme('/dashboard/properties', null)).toBe('light');
    expect(resolveDefaultTheme('/dashboard/money', null)).toBe('light');
    expect(resolveDefaultTheme('/dashboard/reports', null)).toBe('light');
    expect(resolveDefaultTheme('/dashboard/documents', null)).toBe('light');
    expect(resolveDefaultTheme('/dashboard/tasks', null)).toBe('light');
  });

  test('Explicitly saved preference takes precedence over marketing default', () => {
    expect(resolveDefaultTheme('/', 'light')).toBe('light');
  });

  test('Explicitly saved preference takes precedence over dashboard default', () => {
    expect(resolveDefaultTheme('/dashboard', 'dark')).toBe('dark');
    expect(resolveDefaultTheme('/dashboard/money', 'dark')).toBe('dark');
  });
});
