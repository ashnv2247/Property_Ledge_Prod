'use client';

import { useSyncExternalStore, useCallback } from 'react';

const STORAGE_KEY = 'propertyledge_grid_expanded';
const EVENT_NAME = 'propertyledge:grid-expanded-change';

let memoryPreference: boolean | null = null;
const listeners = new Set<() => void>();

function getStoredPreference(fallback: boolean = false): boolean {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === 'true') return true;
    if (raw === 'false') return false;
  } catch {
    // localStorage may not be accessible in some environments
  }
  return fallback;
}

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // ignore errors in listeners
    }
  });
}

/**
 * Set the global grid expanded preference, persist to localStorage, and notify all active listeners.
 */
export function setGridExpandedPreference(
  expandedOrUpdater: boolean | ((prev: boolean) => boolean)
): void {
  const current = getGridExpandedPreference();
  const next = typeof expandedOrUpdater === 'function' ? expandedOrUpdater(current) : expandedOrUpdater;
  memoryPreference = next;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // ignore
    }
    try {
      window.dispatchEvent(
        new CustomEvent(EVENT_NAME, { detail: next })
      );
    } catch {
      // ignore
    }
  }
  notifyListeners();
}

/**
 * Get current grid expanded preference synchronously.
 */
export function getGridExpandedPreference(fallback: boolean = false): boolean {
  if (memoryPreference !== null) {
    return memoryPreference;
  }
  return getStoredPreference(fallback);
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);

  const handleCustomEvent = (event: Event) => {
    const custom = event as CustomEvent<boolean>;
    if (typeof custom.detail === 'boolean') {
      memoryPreference = custom.detail;
    }
    callback();
  };

  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      if (event.newValue === 'true') memoryPreference = true;
      else if (event.newValue === 'false') memoryPreference = false;
      else memoryPreference = null;
      callback();
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener(EVENT_NAME, handleCustomEvent);
    window.addEventListener('storage', handleStorageEvent);
  }

  return () => {
    listeners.delete(callback);
    if (typeof window !== 'undefined') {
      window.removeEventListener(EVENT_NAME, handleCustomEvent);
      window.removeEventListener('storage', handleStorageEvent);
    }
  };
}

/**
 * Hook to read and write the global grid expanded state.
 * Shared across all AG Grid instances and workspace pages.
 */
export function useGridExpandedPreference(
  defaultFallback: boolean = false
): [boolean, (expanded: boolean | ((prev: boolean) => boolean)) => void] {
  const isExpanded = useSyncExternalStore(
    subscribe,
    () => {
      if (memoryPreference !== null) return memoryPreference;
      const stored = getStoredPreference(defaultFallback);
      memoryPreference = stored;
      return stored;
    },
    () => defaultFallback
  );

  const setExpanded = useCallback((val: boolean | ((prev: boolean) => boolean)) => {
    setGridExpandedPreference(val);
  }, []);

  return [isExpanded, setExpanded];
}
