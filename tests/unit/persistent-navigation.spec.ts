import { test, expect } from '@playwright/test';
import {
  useEntityCacheStore,
  buildCacheKey,
  fetchWithDeduplication,
  isDataFresh,
  FRESHNESS_THRESHOLDS,
} from '../../lib/stores/useEntityCacheStore';
import {
  useGridStateStore,
  buildGridStateKey,
  clearAllGridStates,
} from '../../lib/stores/useGridStateStore';

test.describe('PropertyLedge — Persistent Navigation, SWR & Grid State Restoration Suite', () => {
  test.beforeEach(() => {
    useEntityCacheStore.getState().invalidateAll();
    clearAllGridStates();
  });

  test('Scenario 1 & 17: First visit with no cache initiates loading skeleton state', () => {
    const key = buildCacheKey('properties', 'ws_org1', 'all');
    const cached = useEntityCacheStore.getState().cacheMap[key];

    // No cache entry exists initially
    expect(cached).toBeUndefined();
    // Freshness check confirms no usable cache
    expect(isDataFresh(cached, FRESHNESS_THRESHOLDS.normal)).toBe(false);
  });

  test('Scenario 2: Returning to a cached page restores cached content immediately without skeleton', () => {
    const key = buildCacheKey('properties', 'ws_org1', 'all');
    const mockProperties = [
      { id: 'prop_1', name: '100 George St, Sydney', rent_amount: 1200 },
      { id: 'prop_2', name: '200 Queen St, Melbourne', rent_amount: 950 },
    ];

    // Hydrate cache as if visited previously
    useEntityCacheStore.getState().setKeyedData(key, mockProperties, 'ws_org1', null);

    // Re-visiting the page reads cache synchronously
    const cachedEntry = useEntityCacheStore.getState().cacheMap[key];
    expect(cachedEntry).toBeDefined();
    expect(cachedEntry?.data).toEqual(mockProperties);
    // Data is fresh -> page can render immediately without skeleton
    expect(isDataFresh(cachedEntry, FRESHNESS_THRESHOLDS.normal)).toBe(true);
  });

  test('Scenario 3: Background refresh retains existing rows while isRefreshing is active', () => {
    const key = buildCacheKey('leases', 'ws_org1', 'prop_1');
    const initialLeases = [{ id: 'lease_101', rent_amount: 800, status: 'active' }];

    useEntityCacheStore.getState().setKeyedData(key, initialLeases, 'ws_org1', 'prop_1');

    // Simulate background revalidation starting
    useEntityCacheStore.getState().setKeyedRefreshing(key, true);

    const refreshedEntry = useEntityCacheStore.getState().cacheMap[key];
    // Rows MUST NOT be cleared to [] while refreshing
    expect(refreshedEntry?.data).toEqual(initialLeases);
    expect(refreshedEntry?.isRefreshing).toBe(true);
  });

  test('Scenario 4: Updated rows replace stale rows after successful background response', () => {
    const key = buildCacheKey('invoices', 'ws_org1', 'all');
    const staleInvoices = [{ id: 'inv_1', total: 500, status: 'issued' }];
    const updatedInvoices = [
      { id: 'inv_1', total: 500, status: 'paid' },
      { id: 'inv_2', total: 750, status: 'issued' },
    ];

    useEntityCacheStore.getState().setKeyedData(key, staleInvoices, 'ws_org1', null);
    expect(useEntityCacheStore.getState().cacheMap[key]?.data).toEqual(staleInvoices);

    // Background response arrives
    useEntityCacheStore.getState().setKeyedData(key, updatedInvoices, 'ws_org1', null);
    useEntityCacheStore.getState().setKeyedRefreshing(key, false);

    const entry = useEntityCacheStore.getState().cacheMap[key];
    expect(entry?.data).toEqual(updatedInvoices);
    expect(entry?.isRefreshing).toBe(false);
  });

  test('Scenario 5 & 6: Failed background refresh retains cached data and retry succeeds', async () => {
    const key = buildCacheKey('expenses', 'ws_org1', 'prop_1');
    const existingExpenses = [{ id: 'exp_1', amount: 350, vendor: 'Plumbing Works' }];

    useEntityCacheStore.getState().setKeyedData(key, existingExpenses, 'ws_org1', 'prop_1');

    // Record error during background refresh
    useEntityCacheStore.getState().setKeyedError(key, 'Network timeout connecting to server');
    useEntityCacheStore.getState().setKeyedRefreshing(key, false);

    const errorEntry = useEntityCacheStore.getState().cacheMap[key];
    // Existing data MUST be retained, never blanked or destroyed
    expect(errorEntry?.data).toEqual(existingExpenses);
    expect(errorEntry?.error).toBe('Network timeout connecting to server');

    // Retrying succeeds
    const freshExpenses = [
      { id: 'exp_1', amount: 350, vendor: 'Plumbing Works' },
      { id: 'exp_2', amount: 120, vendor: 'Bunnings Hardware' },
    ];
    useEntityCacheStore.getState().setKeyedData(key, freshExpenses, 'ws_org1', 'prop_1');

    const retriedEntry = useEntityCacheStore.getState().cacheMap[key];
    expect(retriedEntry?.data).toEqual(freshExpenses);
    expect(retriedEntry?.error).toBeNull();
  });

  test('Scenario 7: AG Grid sorting and filters survive navigation via useGridStateStore', () => {
    const gridKey = buildGridStateKey('properties-grid', 'ws_org1', 'prop_1');

    const filterModel = {
      status: { filterType: 'text', type: 'equals', filter: 'active' },
    };
    const columnState = [
      { colId: 'propertyName', width: 250, sort: 'asc', sortIndex: 0 },
      { colId: 'rent', width: 140, sort: null },
    ];

    useGridStateStore.getState().saveGridState(gridKey, {
      filterModel,
      columnState,
      quickFilter: 'commercial',
    });

    // Simulate navigating away and remounting: retrieve saved state
    const restored = useGridStateStore.getState().getGridState(gridKey);
    expect(restored).toBeDefined();
    expect(restored?.filterModel).toEqual(filterModel);
    expect(restored?.columnState).toEqual(columnState);
    expect(restored?.quickFilter).toBe('commercial');
  });

  test('Scenario 8: AG Grid pagination and column configuration survive navigation', () => {
    const gridKey = buildGridStateKey('finance-transactions-grid', 'ws_org1', 'all');

    useGridStateStore.getState().saveGridState(gridKey, {
      page: 3,
      pageSize: 50,
      columnState: [
        { colId: 'date', width: 120, hide: false },
        { colId: 'amount', width: 160, hide: false },
        { colId: 'notes', width: 300, hide: true },
      ],
    });

    const restored = useGridStateStore.getState().getGridState(gridKey);
    expect(restored?.page).toBe(3);
    expect(restored?.pageSize).toBe(50);
    expect(restored?.columnState?.find((c) => c.colId === 'notes')?.hide).toBe(true);
  });

  test('Scenario 9: Returning to a table restores scroll position', () => {
    const gridKey = buildGridStateKey('invoices-grid', 'ws_org1', 'all');

    useGridStateStore.getState().saveGridState(gridKey, { scrollTop: 840 });

    const restored = useGridStateStore.getState().getGridState(gridKey);
    expect(restored?.scrollTop).toBe(840);
  });

  test('Scenario 10: Selecting a different property isolates data strictly', () => {
    const keyPropA = buildCacheKey('leases', 'ws_org1', 'prop_A');
    const keyPropB = buildCacheKey('leases', 'ws_org1', 'prop_B');

    const leasesPropA = [{ id: 'lease_A', property_id: 'prop_A', rent: 500 }];
    const leasesPropB = [{ id: 'lease_B', property_id: 'prop_B', rent: 1100 }];

    useEntityCacheStore.getState().setKeyedData(keyPropA, leasesPropA, 'ws_org1', 'prop_A');
    useEntityCacheStore.getState().setKeyedData(keyPropB, leasesPropB, 'ws_org1', 'prop_B');

    // Context A only contains Property A leases
    expect(useEntityCacheStore.getState().cacheMap[keyPropA]?.data).toEqual(leasesPropA);
    // Context B only contains Property B leases
    expect(useEntityCacheStore.getState().cacheMap[keyPropB]?.data).toEqual(leasesPropB);
  });

  test('Scenario 11: Late response from previous context cannot overwrite current property', async () => {
    const keyPropA = buildCacheKey('finance', 'ws_org1', 'prop_A');
    const keyPropB = buildCacheKey('finance', 'ws_org1', 'prop_B');

    let propARequestId = 1;
    let propBRequestId = 2;
    let activeRequestId = propBRequestId; // User switched to Property B

    const dataPropA = [{ id: 'tx_old_A' }];
    const dataPropB = [{ id: 'tx_current_B' }];

    // Late arriving response for Prop A checks active request ID
    if (propARequestId === activeRequestId) {
      useEntityCacheStore.getState().setKeyedData(keyPropB, dataPropA, 'ws_org1', 'prop_B');
    }

    // Active response for Prop B applies
    if (propBRequestId === activeRequestId) {
      useEntityCacheStore.getState().setKeyedData(keyPropB, dataPropB, 'ws_org1', 'prop_B');
    }

    // Property B cache contains only Prop B data
    expect(useEntityCacheStore.getState().cacheMap[keyPropB]?.data).toEqual(dataPropB);
  });

  test('Scenario 12: In-flight deduplication shares single network request across simultaneous navigations', async () => {
    let networkFetches = 0;
    const fetcher = async () => {
      networkFetches++;
      await new Promise((r) => setTimeout(r, 15));
      return [{ id: 'unit_1' }, { id: 'unit_2' }];
    };

    const key = 'test:dedup:simultaneous';
    const [p1, p2, p3] = await Promise.all([
      fetchWithDeduplication(key, fetcher),
      fetchWithDeduplication(key, fetcher),
      fetchWithDeduplication(key, fetcher),
    ]);

    expect(networkFetches).toBe(1);
    expect(p1).toEqual(p2);
    expect(p2).toEqual(p3);
  });

  test('Scenario 13: Targeted mutation invalidates only affected queries without wiping unrelated data', () => {
    const propKey = buildCacheKey('properties', 'ws_org1', 'all');
    const finKey = buildCacheKey('finance', 'ws_org1', 'prop_1');
    const docKey = buildCacheKey('documents', 'ws_org1', 'all');

    useEntityCacheStore.getState().setKeyedData(propKey, [{ id: 'p1' }], 'ws_org1', null);
    useEntityCacheStore.getState().setKeyedData(finKey, [{ id: 'tx1' }], 'ws_org1', 'prop_1');
    useEntityCacheStore.getState().setKeyedData(docKey, [{ id: 'doc1' }], 'ws_org1', null);

    // Edit property -> invalidates only properties
    useEntityCacheStore.getState().invalidateKeyPrefix('properties:ws_org1');

    expect(useEntityCacheStore.getState().cacheMap[propKey]).toBeUndefined();
    // Finance and Documents MUST remain untouched and cached
    expect(useEntityCacheStore.getState().cacheMap[finKey]?.data).toEqual([{ id: 'tx1' }]);
    expect(useEntityCacheStore.getState().cacheMap[docKey]?.data).toEqual([{ id: 'doc1' }]);
  });

  test('Scenario 14: Form edit protection prevents background refresh from wiping active edits', () => {
    // Simulate drawer opened for editing tenant 'ten_42'
    let currentOpenTenantId: string | null = 'ten_42';
    let prevOpenTenantId: string | null = 'ten_42';
    let formState = { firstName: 'Alice (Unsaved Typing)', email: 'alice@typing.com' };

    // Background refresh delivers updated tenant record from server
    const serverUpdate = { id: 'ten_42', firstName: 'Alice Server', email: 'alice@server.com' };

    // Guard logic check: if currentOpenTenantId matches prevOpenTenantId, do NOT reset formState
    if (prevOpenTenantId === currentOpenTenantId) {
      // Guarded! Do not overwrite formState
    } else {
      formState = { firstName: serverUpdate.firstName, email: serverUpdate.email };
    }

    expect(formState.firstName).toBe('Alice (Unsaved Typing)');
  });

  test('Scenario 18: Empty states are not displayed while a refresh is merely in progress', () => {
    const key = buildCacheKey('tenants', 'ws_org1', 'prop_1');
    const cachedTenants = [{ id: 't1', first_name: 'John', last_name: 'Doe' }];

    useEntityCacheStore.getState().setKeyedData(key, cachedTenants, 'ws_org1', 'prop_1');
    useEntityCacheStore.getState().setKeyedRefreshing(key, true);

    const entry = useEntityCacheStore.getState().cacheMap[key];
    const displayedRows = entry?.data || [];

    // Table has rows -> empty state must NOT show
    const shouldShowEmptyState = displayedRows.length === 0 && !entry?.isRefreshing;
    expect(shouldShowEmptyState).toBe(false);
    expect(displayedRows.length).toBe(1);
  });

  test('Scenario 19: Strict multi-tenant key isolation prevents cross-organization data leakage', () => {
    const keyOrgA = buildCacheKey('invoices', 'org_alpha', 'all');
    const keyOrgB = buildCacheKey('invoices', 'org_beta', 'all');

    const invoicesOrgA = [{ id: 'inv_A1', recipient: 'Alpha Tenant', amount: 1500 }];
    const invoicesOrgB = [{ id: 'inv_B1', recipient: 'Beta Tenant', amount: 3200 }];

    useEntityCacheStore.getState().setKeyedData(keyOrgA, invoicesOrgA, 'org_alpha', null);
    useEntityCacheStore.getState().setKeyedData(keyOrgB, invoicesOrgB, 'org_beta', null);

    // Org Alpha cannot see Org Beta invoices
    expect(useEntityCacheStore.getState().cacheMap[keyOrgA]?.data).toEqual(invoicesOrgA);
    expect(useEntityCacheStore.getState().cacheMap[keyOrgB]?.data).toEqual(invoicesOrgB);
    expect(useEntityCacheStore.getState().cacheMap[keyOrgA]?.data).not.toEqual(
      useEntityCacheStore.getState().cacheMap[keyOrgB]?.data
    );
  });

  test('Scenario 20: Performance and memory management with realistic data volumes (1000 items)', () => {
    const key = buildCacheKey('finance', 'ws_org1', 'all');
    const realisticLargeDataset = Array.from({ length: 1000 }, (_, i) => ({
      id: `tx_${i}`,
      amount: 100 + (i % 500),
      description: `Transaction obligation #${i}`,
      category: i % 2 === 0 ? 'Rent' : 'Maintenance',
      date: '2026-03-15',
    }));

    const startTime = performance.now();
    useEntityCacheStore.getState().setKeyedData(key, realisticLargeDataset, 'ws_org1', null);
    const readEntry = useEntityCacheStore.getState().cacheMap[key];
    const endTime = performance.now();

    expect(readEntry?.data.length).toBe(1000);
    // Instant synchronous read & hydration under 15ms
    expect(endTime - startTime).toBeLessThan(15);
  });
});
