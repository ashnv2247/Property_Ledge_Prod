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
  const effectiveWorkspaceId = workspaceId || storeWorkspaceId;
  const propertyContext = usePropertyContextOptional();
  const WORKSPACE_WIDE_ENTITIES = new Set([
    'properties',
    'categories',
    'tax_classifications',
    'automations',
    'invoices',
    'financial-years-overview',
  ]);

  const isWorkspaceWide = WORKSPACE_WIDE_ENTITIES.has(entity);
  const effectivePropertyId =
    propertyId !== undefined
      ? (propertyId ?? null)
      : isWorkspaceWide
        ? 'all'
        : (propertyContext?.selectedProperty?.propertyId ?? null);

  const cacheKey = buildCacheKey(entity, effectiveWorkspaceId, effectivePropertyId, extraKey);

  // Reactive subscription to this specific cache entry from the entity cache store
  const cachedEntry = useEntityCacheStore((s) => s.cacheMap[cacheKey] as CachedData<T> | undefined);

  // Synchronously read existing cache helper
  const readCurrentCache = useCallback((): CachedData<T> | undefined => {
    return useEntityCacheStore.getState().cacheMap[cacheKey] as CachedData<T> | undefined;
  }, [cacheKey]);

  // Determine initial usable data
  const fallbackEmpty = (Array.isArray(initialData) ? [] : null) as unknown as T;
  const initialUsable: T = (cachedEntry?.data ?? initialData ?? fallbackEmpty) as T;

  // If server provided initialData but store doesn't have it yet, hydrate store once
  useEffect(() => {
    if (!useEntityCacheStore.getState().cacheMap[cacheKey] && initialData) {
      useEntityCacheStore
        .getState()
        .setKeyedData(cacheKey, initialData, effectiveWorkspaceId, effectivePropertyId);
    }
  }, [cacheKey, initialData, effectiveWorkspaceId, effectivePropertyId]);

  const [data, setData] = useState<T>(() => initialUsable);
  const [isLoading, setIsLoading] = useState<boolean>(() => !initialUsable && enabled);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(() => {
    if (cachedEntry?.fetchedAt) return new Date(cachedEntry.fetchedAt);
    if (initialData) return new Date();
    return null;
  });
  const [error, setError] = useState<string | null>(() => cachedEntry?.error ?? null);

  const dataRef = useRef<T>(data);
  dataRef.current = data;

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

  // Reactively sync state whenever this specific cache entry changes in the store
  useEffect(() => {
    if (!cachedEntry) return;

    if (cachedEntry.data !== undefined) {
      setData(cachedEntry.data);
      setIsLoading(false);
    }
    if (cachedEntry.isRefreshing !== undefined) {
      setIsRefreshing(cachedEntry.isRefreshing);
    }
    if (cachedEntry.fetchedAt) {
      setLastRefreshedAt(new Date(cachedEntry.fetchedAt));
    }
    setError(cachedEntry.error ?? null);
  }, [cachedEntry]);

  const executeFetch = useCallback(
    async (isManual = false) => {
      if (!enabled) return;
      if (typeof window !== 'undefined' && !navigator.onLine) return;

      const requestId = ++latestRequestIdRef.current;
      const currentEntry = readCurrentCache();
      const hasCurrentUsable = Boolean(currentEntry?.data ?? dataRef.current);
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
    [cacheKey, enabled, freshnessTier, effectiveWorkspaceId, effectivePropertyId, readCurrentCache]
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
  }, [cacheKey, enabled, executeFetch, readCurrentCache, initialData]);

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
