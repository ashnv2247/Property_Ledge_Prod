'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  useEntityCacheStore,
  buildCacheKey,
  fetchWithDeduplication,
  isDataFresh,
  FRESHNESS_THRESHOLDS,
  FreshnessTier,
  CachedData,
} from '@/lib/stores/useEntityCacheStore';
import { useWorkspaceStore } from '@/lib/stores/useWorkspaceStore';
import { usePropertyContextOptional } from '@/components/property/PropertyContext';

export interface UsePersistentEntityQueryOptions<T> {
  entity: string;
  workspaceId?: string | null | undefined;
  propertyId?: string | null | undefined;
  extraKey?: string;
  fetcher: (params: { workspaceId: string | null; propertyId: string | null }) => Promise<T>;
  initialData?: T | null;
  freshnessTier?: FreshnessTier;
  enabled?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (err: any) => void;
}

export interface UsePersistentEntityQueryResult<T> {
  data: T;
  setData: React.Dispatch<React.SetStateAction<T>>;
  isLoading: boolean;
  isRefreshing: boolean;
  lastRefreshedAt: Date | null;
  error: string | null;
  cacheKey: string;
  refresh: () => Promise<void>;
  mutate: (newDataOrUpdater?: T | ((prev: T) => T)) => Promise<void> | void;
  invalidate: () => void;
}

export function usePersistentEntityQuery<T>({
  entity,
  workspaceId,
  propertyId,
  extraKey,
  fetcher,
  initialData,
  freshnessTier = 'normal',
  enabled = true,
  onSuccess,
  onError,
}: UsePersistentEntityQueryOptions<T>): UsePersistentEntityQueryResult<T> {
  const storeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const propertyContext = usePropertyContextOptional();
  const effectiveWorkspaceId =
    workspaceId !== undefined ? (workspaceId ?? null) : (storeWorkspaceId ?? null);
  const effectivePropertyId =
    propertyId !== undefined
      ? (propertyId ?? null)
      : (propertyContext?.selectedProperty?.propertyId ?? null);

  const cacheKey = buildCacheKey(entity, effectiveWorkspaceId, effectivePropertyId, extraKey);

  // Synchronously read existing cache
  const readCurrentCache = (): CachedData<T> | undefined => {
    return useEntityCacheStore.getState().cacheMap[cacheKey] as CachedData<T> | undefined;
  };

  // Determine initial usable data
  const initialEntry = readCurrentCache();
  const fallbackEmpty = (Array.isArray(initialData) ? [] : null) as unknown as T;
  const initialUsable: T = (initialEntry?.data ?? initialData ?? fallbackEmpty) as T;

  // If server provided initialData but store doesn't have it yet, hydrate store
  if (!initialEntry && initialData) {
    useEntityCacheStore
      .getState()
      .setKeyedData(cacheKey, initialData, effectiveWorkspaceId, effectivePropertyId);
  }

  const [data, setData] = useState<T>(() => initialUsable);
  const [isLoading, setIsLoading] = useState<boolean>(() => !initialUsable && enabled);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(() => {
    if (initialEntry?.fetchedAt) return new Date(initialEntry.fetchedAt);
    if (initialData) return new Date();
    return null;
  });
  const [error, setError] = useState<string | null>(() => initialEntry?.error ?? null);

  const latestRequestIdRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const executeFetch = useCallback(
    async (isManual = false) => {
      if (!enabled) return;
      if (typeof window !== 'undefined' && !navigator.onLine) return;

      const requestId = ++latestRequestIdRef.current;
      const currentEntry = readCurrentCache();
      const hasCurrentUsable = Boolean(currentEntry?.data ?? data);
      const threshold = FRESHNESS_THRESHOLDS[freshnessTier];

      // Stale-While-Revalidate: If data is already fresh and this is not a manual refresh, do not refetch
      if (!isManual && currentEntry && isDataFresh(currentEntry, threshold)) {
        if (isMountedRef.current) {
          setData(currentEntry.data);
          setIsLoading(false);
          setIsRefreshing(false);
        }
        return;
      }

      if (hasCurrentUsable) {
        // Keep existing data visible! Non-blocking background revalidation
        if (isMountedRef.current) {
          setIsRefreshing(true);
        }
        useEntityCacheStore.getState().setKeyedRefreshing(cacheKey, true);
      } else {
        // First-ever visit with no data: show skeleton
        if (isMountedRef.current) {
          setIsLoading(true);
        }
      }

      try {
        const freshData = await fetchWithDeduplication(cacheKey, () =>
          fetcherRef.current({ workspaceId: effectiveWorkspaceId, propertyId: effectivePropertyId })
        );

        // Guard against race conditions: if request is stale or context changed, discard
        if (requestId !== latestRequestIdRef.current) {
          return;
        }

        if (isMountedRef.current) {
          setData(freshData);
          setLastRefreshedAt(new Date());
          setError(null);
        }

        useEntityCacheStore
          .getState()
          .setKeyedData(cacheKey, freshData, effectiveWorkspaceId, effectivePropertyId);

        onSuccessRef.current?.(freshData);
      } catch (err: any) {
        if (requestId !== latestRequestIdRef.current) return;

        const errMsg = err?.message || 'Failed to fetch data';
        if (isMountedRef.current) {
          setError(errMsg);
        }
        useEntityCacheStore.getState().setKeyedError(cacheKey, errMsg);
        onErrorRef.current?.(err);
      } finally {
        if (requestId === latestRequestIdRef.current && isMountedRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
        useEntityCacheStore.getState().setKeyedRefreshing(cacheKey, false);
      }
    },
    [cacheKey, enabled, freshnessTier, effectiveWorkspaceId, effectivePropertyId, data]
  );

  // Trigger revalidation on mount or when cacheKey / enabled changes
  useEffect(() => {
    // Sync local state if cache already has data for this key
    const entry = readCurrentCache();
    if (entry?.data) {
      setData(entry.data);
      setIsLoading(false);
      if (entry.fetchedAt) setLastRefreshedAt(new Date(entry.fetchedAt));
    } else if (!initialData) {
      setIsLoading(enabled);
    }

    executeFetch(false);
  }, [cacheKey, enabled]);

  const refresh = useCallback(async () => {
    await executeFetch(true);
  }, [executeFetch]);

  const mutate = useCallback(
    async (newDataOrUpdater?: T | ((prev: T) => T)) => {
      if (newDataOrUpdater === undefined) {
        await executeFetch(true);
        return;
      }
      setData((prev) => {
        const updated =
          typeof newDataOrUpdater === 'function'
            ? (newDataOrUpdater as (prev: T) => T)(prev)
            : newDataOrUpdater;

        useEntityCacheStore
          .getState()
          .setKeyedData(cacheKey, updated, effectiveWorkspaceId, effectivePropertyId);

        return updated;
      });
    },
    [cacheKey, effectiveWorkspaceId, effectivePropertyId, executeFetch]
  );

  const invalidate = useCallback(() => {
    useEntityCacheStore.getState().invalidateKeyPrefix(cacheKey);
    executeFetch(true);
  }, [cacheKey, executeFetch]);

  return {
    data,
    setData,
    isLoading,
    isRefreshing,
    lastRefreshedAt,
    error,
    cacheKey,
    refresh,
    mutate,
    invalidate,
  };
}
