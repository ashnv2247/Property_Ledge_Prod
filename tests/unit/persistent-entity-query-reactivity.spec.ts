import { test, expect } from '@playwright/test';
import {
  useEntityCacheStore,
  buildCacheKey,
  fetchWithDeduplication,
  isDataFresh,
  FRESHNESS_THRESHOLDS,
  getCachedEntry,
} from '@/lib/stores/useEntityCacheStore';

test.describe('Entity Cache Store & Deduplication Architecture Suite', () => {
  test.beforeEach(() => {
    useEntityCacheStore.getState().invalidateAll();
  });

  test('1. Deduplicates concurrent in-flight fetches for identical cache key', async () => {
    let callCount = 0;
    const slowFetcher = async () => {
      callCount++;
      await new Promise((r) => setTimeout(r, 20));
      return [{ id: 'tx-1', amount: 100 }];
    };

    const key = buildCacheKey('finance', 'ws-abc', 'prop-1');

    // Launch two parallel calls concurrently
    const [res1, res2] = await Promise.all([
      fetchWithDeduplication(key, slowFetcher),
      fetchWithDeduplication(key, slowFetcher),
    ]);

    expect(res1).toEqual([{ id: 'tx-1', amount: 100 }]);
    expect(res2).toEqual([{ id: 'tx-1', amount: 100 }]);
    expect(callCount).toBe(1); // Exact deduplication: fetcher called exactly once
  });

  test('2. Reactive cacheMap stores keyed data with workspace isolation', () => {
    const key1 = buildCacheKey('finance', 'ws-alpha', 'prop-1');
    const key2 = buildCacheKey('finance', 'ws-beta', 'prop-1');

    useEntityCacheStore.getState().setKeyedData(key1, [{ id: '1' }], 'ws-alpha', 'prop-1');
    useEntityCacheStore.getState().setKeyedData(key2, [{ id: '2' }], 'ws-beta', 'prop-1');

    const entry1 = getCachedEntry(key1);
    const entry2 = getCachedEntry(key2);

    expect(entry1?.data).toEqual([{ id: '1' }]);
    expect(entry1?.workspaceId).toBe('ws-alpha');

    expect(entry2?.data).toEqual([{ id: '2' }]);
    expect(entry2?.workspaceId).toBe('ws-beta');
  });

  test('3. Keyed refreshing and error states update without blowing away existing data', () => {
    const key = buildCacheKey('properties', 'ws-alpha', 'all');
    useEntityCacheStore.getState().setKeyedData(key, [{ id: 'p1', name: 'Estate' }], 'ws-alpha', 'all');

    // Set refreshing state
    useEntityCacheStore.getState().setKeyedRefreshing(key, true);
    let entry = getCachedEntry(key);
    expect(entry?.isRefreshing).toBe(true);
    expect(entry?.data).toEqual([{ id: 'p1', name: 'Estate' }]); // Data preserved!

    // Set error state on failure
    useEntityCacheStore.getState().setKeyedError(key, 'Network timeout');
    entry = getCachedEntry(key);
    expect(entry?.isRefreshing).toBe(false);
    expect(entry?.error).toBe('Network timeout');
    expect(entry?.data).toEqual([{ id: 'p1', name: 'Estate' }]); // Existing data remains intact for UI
  });

  test('4. Freshness evaluation respects live vs normal vs stable thresholds', () => {
    const now = Date.now();
    const freshEntry = { fetchedAt: now - 2000 }; // 2s old
    const staleLiveEntry = { fetchedAt: now - 6000 }; // 6s old

    // Live tier (5s)
    expect(isDataFresh(freshEntry, FRESHNESS_THRESHOLDS.live)).toBe(true);
    expect(isDataFresh(staleLiveEntry, FRESHNESS_THRESHOLDS.live)).toBe(false);

    // Normal tier (60s)
    expect(isDataFresh(staleLiveEntry, FRESHNESS_THRESHOLDS.normal)).toBe(true);
  });

  test('5. Targeted key prefix invalidation evicts only matching workspace entities', () => {
    const keyA = buildCacheKey('finance', 'ws-1', 'prop-1');
    const keyB = buildCacheKey('finance', 'ws-1', 'prop-2');
    const keyC = buildCacheKey('finance', 'ws-2', 'prop-1');

    useEntityCacheStore.getState().setKeyedData(keyA, [1], 'ws-1', 'prop-1');
    useEntityCacheStore.getState().setKeyedData(keyB, [2], 'ws-1', 'prop-2');
    useEntityCacheStore.getState().setKeyedData(keyC, [3], 'ws-2', 'prop-1');

    // Invalidate workspace ws-1 finance
    useEntityCacheStore.getState().invalidateKeyPrefix('finance:ws-1');

    expect(getCachedEntry(keyA)).toBeUndefined();
    expect(getCachedEntry(keyB)).toBeUndefined();
    expect(getCachedEntry(keyC)?.data).toEqual([3]); // ws-2 untouched
  });
});
