import { test, expect } from '@playwright/test';
import { ServerMemoryCache } from '@/lib/cache/server-cache';
import {
  useEntityCacheStore,
  buildCacheKey,
  fetchWithDeduplication,
} from '@/lib/stores/useEntityCacheStore';

test.describe('PropertyLedge — Complete Performance & SWR Optimization Suite', () => {
  test.beforeEach(() => {
    useEntityCacheStore.getState().invalidateAll();
  });

  test('1. Canonical Cache Key Scoping: Workspace-wide vs Property-scoped', () => {
    // Workspace-wide entities must default property dimension to 'all'
    const propKeyGlobal = buildCacheKey('properties', 'ws_100', 'all');
    const invoiceKeyGlobal = buildCacheKey('invoices', 'ws_100', 'all');
    const catKeyGlobal = buildCacheKey('categories', 'ws_100', 'all');

    expect(propKeyGlobal).toBe('properties:ws_100:all');
    expect(invoiceKeyGlobal).toBe('invoices:ws_100:all');
    expect(catKeyGlobal).toBe('categories:ws_100:all');

    // Property-scoped entities correctly preserve property-level separation
    const transKeyProp = buildCacheKey('transactions', 'ws_100', 'prop_999');
    const leaseKeyProp = buildCacheKey('leases', 'ws_100', 'prop_999');

    expect(transKeyProp).toBe('transactions:ws_100:prop_999');
    expect(leaseKeyProp).toBe('leases:ws_100:prop_999');
  });

  test('2. Server Cache Multi-Tenant Isolation for Workspace Context & Properties', () => {
    const cache = new ServerMemoryCache();

    // Cache context for User A in Workspace 1
    cache.set('workspace:ws_1:user:usr_a:context', {
      workspaceId: 'ws_1',
      userId: 'usr_a',
      role: 'owner',
      permissions: ['*'],
    }, 60_000);

    // Cache context for User B in Workspace 2
    cache.set('workspace:ws_2:user:usr_b:context', {
      workspaceId: 'ws_2',
      userId: 'usr_b',
      role: 'manager',
      permissions: ['properties.view'],
    }, 60_000);

    // Cache properties catalog for Workspace 1
    cache.set('workspace:ws_1:dashboard_properties', [
      { id: 'prop_1', address: '123 Collins St, Melbourne' },
      { id: 'prop_2', address: '456 George St, Sydney' },
    ], 60_000);

    // Assert strict isolation
    const userAContext = cache.get<any>('workspace:ws_1:user:usr_a:context');
    expect(userAContext).toBeDefined();
    expect(userAContext.role).toBe('owner');

    const userBContext = cache.get<any>('workspace:ws_2:user:usr_b:context');
    expect(userBContext).toBeDefined();
    expect(userBContext.role).toBe('manager');

    // Cross-tenant queries return undefined
    expect(cache.get('workspace:ws_1:user:usr_b:context')).toBeUndefined();
    expect(cache.get('workspace:ws_2:user:usr_a:context')).toBeUndefined();

    // Invalidate Workspace 1 only
    cache.invalidateWorkspace('ws_1');

    // Workspace 1 entries must be evicted
    expect(cache.get('workspace:ws_1:user:usr_a:context')).toBeUndefined();
    expect(cache.get('workspace:ws_1:dashboard_properties')).toBeUndefined();

    // Workspace 2 entries remain completely intact
    expect(cache.get('workspace:ws_2:user:usr_b:context')).toBeDefined();
    expect(cache.get<any>('workspace:ws_2:user:usr_b:context').role).toBe('manager');
  });

  test('3. Deduplication: Concurrent identical requests execute only once', async () => {
    let executionCount = 0;
    const expensiveFetcher = async () => {
      executionCount++;
      await new Promise((resolve) => setTimeout(resolve, 30));
      return { totalGrossYield: 5.4, netRental: 85000 };
    };

    const results = await Promise.all([
      fetchWithDeduplication('kpi:ws_1:fy_overview', expensiveFetcher),
      fetchWithDeduplication('kpi:ws_1:fy_overview', expensiveFetcher),
      fetchWithDeduplication('kpi:ws_1:fy_overview', expensiveFetcher),
      fetchWithDeduplication('kpi:ws_1:fy_overview', expensiveFetcher),
    ]);

    // All callers receive the exact result
    for (const res of results) {
      expect(res).toEqual({ totalGrossYield: 5.4, netRental: 85000 });
    }

    // The fetcher function was only executed once
    expect(executionCount).toBe(1);
  });

  test('4. Australian Financial Year date boundary validation', () => {
    // Australian Financial Year starts 1 July and ends 30 June
    const isWithinAustralianFY = (dateStr: string, fyStartYear: number): boolean => {
      const d = new Date(dateStr);
      const fyStart = new Date(`${fyStartYear}-07-01T00:00:00Z`);
      const fyEnd = new Date(`${fyStartYear + 1}-06-30T23:59:59Z`);
      return d >= fyStart && d <= fyEnd;
    };

    // FY 2024-2025: 1 July 2024 to 30 June 2025
    expect(isWithinAustralianFY('2024-07-01T10:00:00Z', 2024)).toBe(true);
    expect(isWithinAustralianFY('2024-12-31T23:59:59Z', 2024)).toBe(true);
    expect(isWithinAustralianFY('2025-06-30T22:00:00Z', 2024)).toBe(true);

    // Outside FY 2024-2025
    expect(isWithinAustralianFY('2024-06-30T23:59:59Z', 2024)).toBe(false);
    expect(isWithinAustralianFY('2025-07-01T00:00:00Z', 2024)).toBe(false);
  });
});
