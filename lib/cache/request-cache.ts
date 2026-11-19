import { cache } from 'react';
import { ServerMemoryCache } from './server-cache';

// RLS-filtered results must never outlive the request that authorized them.
// React owns this cache's lifetime. Outside an RSC render cache() deliberately
// does not memoize, so callers fall back to fresh reads rather than shared data.
const getRequestCache = cache(() => new ServerMemoryCache());

export const requestCache = {
  get<T>(key: string): T | undefined {
    return getRequestCache().get<T>(key);
  },
  set<T>(key: string, value: T, ttlMs?: number): void {
    getRequestCache().set(key, value, ttlMs);
  },
};
