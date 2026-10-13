'use client';

import { create } from 'zustand';

export interface SavedGridState {
  columnState?: any[] | null;
  filterModel?: Record<string, any> | null;
  quickFilter?: string;
  page?: number;
  pageSize?: number;
  scrollTop?: number;
  updatedAt: number;
}

interface GridStateStoreState {
  gridStates: Record<string, SavedGridState>;
  saveGridState: (key: string, patch: Partial<SavedGridState>) => void;
  getGridState: (key: string) => SavedGridState | undefined;
  clearGridState: (key: string) => void;
  clearAllGridStates: () => void;
}

const STORAGE_PREFIX = 'propertyledge:grid:';

function readSessionStorage(key: string): SavedGridState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as SavedGridState;
  } catch {
    return null;
  }
}

function writeSessionStorage(key: string, state: SavedGridState): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(state));
  } catch {
    // sessionStorage quota or security restriction fallback
  }
}

export function buildGridStateKey(
  gridId: string,
  workspaceId: string | null | undefined,
  propertyId?: string | null | undefined
): string {
  const ws = workspaceId || 'all';
  const prop = propertyId || 'all';
  return `${gridId}:${ws}:${prop}`;
}

export const useGridStateStore = create<GridStateStoreState>((set, get) => ({
  gridStates: {},

  saveGridState: (key: string, patch: Partial<SavedGridState>) => {
    const existing = get().gridStates[key] || readSessionStorage(key) || { updatedAt: Date.now() };
    const updated: SavedGridState = {
      ...existing,
      ...patch,
      updatedAt: Date.now(),
    };

    writeSessionStorage(key, updated);

    set((state) => ({
      gridStates: {
        ...state.gridStates,
        [key]: updated,
      },
    }));
  },

  getGridState: (key: string) => {
    const memory = get().gridStates[key];
    if (memory) return memory;
    const session = readSessionStorage(key);
    if (session) {
      // Hydrate memory cache
      set((state) => ({
        gridStates: {
          ...state.gridStates,
          [key]: session,
        },
      }));
      return session;
    }
    return undefined;
  },

  clearGridState: (key: string) => {
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.removeItem(STORAGE_PREFIX + key);
      } catch {}
    }
    set((state) => {
      const next = { ...state.gridStates };
      delete next[key];
      return { gridStates: next };
    });
  },

  clearAllGridStates: () => {
    if (typeof window !== 'undefined') {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const k = window.sessionStorage.key(i);
          if (k && k.startsWith(STORAGE_PREFIX)) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => window.sessionStorage.removeItem(k));
      } catch {}
    }
    set({ gridStates: {} });
  },
}));

export function clearAllGridStates(): void {
  useGridStateStore.getState().clearAllGridStates();
}
