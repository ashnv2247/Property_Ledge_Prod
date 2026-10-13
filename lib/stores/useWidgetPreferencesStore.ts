'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useState, useEffect } from 'react';

export interface WidgetPreferencesState {
  collapsedWidgets: Record<string, boolean>;
  isCollapsed: (widgetId: string, defaultCollapsed?: boolean) => boolean;
  toggleWidget: (widgetId: string, defaultCollapsed?: boolean) => void;
  setWidgetCollapsed: (widgetId: string, collapsed: boolean) => void;
  setCollapsed: (widgetId: string, collapsed: boolean) => void;
  resetAllWidgets: () => void;
  resetAll: () => void;
  collapseAll: (widgetIds: string[]) => void;
  expandAll: (widgetIds: string[]) => void;
}

export const useWidgetPreferencesStore = create<WidgetPreferencesState>()(
  persist(
    (set, get) => ({
      collapsedWidgets: {},

      isCollapsed: (widgetId: string, defaultCollapsed = false) => {
        return get().collapsedWidgets[widgetId] ?? defaultCollapsed;
      },

      toggleWidget: (widgetId: string, defaultCollapsed = false) => {
        set((state) => {
          const current = state.collapsedWidgets[widgetId] ?? defaultCollapsed;
          return {
            collapsedWidgets: {
              ...state.collapsedWidgets,
              [widgetId]: !current,
            },
          };
        });
      },

      setWidgetCollapsed: (widgetId: string, collapsed: boolean) => {
        set((state) => ({
          collapsedWidgets: {
            ...state.collapsedWidgets,
            [widgetId]: collapsed,
          },
        }));
      },

      setCollapsed: (widgetId: string, collapsed: boolean) => {
        get().setWidgetCollapsed(widgetId, collapsed);
      },

      resetAllWidgets: () => {
        set({ collapsedWidgets: {} });
      },

      resetAll: () => {
        get().resetAllWidgets();
      },

      collapseAll: (widgetIds: string[]) => {
        set((state) => {
          const next = { ...state.collapsedWidgets };
          for (const id of widgetIds) {
            next[id] = true;
          }
          return { collapsedWidgets: next };
        });
      },

      expandAll: (widgetIds: string[]) => {
        set((state) => {
          const next = { ...state.collapsedWidgets };
          for (const id of widgetIds) {
            next[id] = false;
          }
          return { collapsedWidgets: next };
        });
      },
    }),
    {
      name: 'propertyledge_widget_preferences_v1',
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined') {
          return localStorage;
        }
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
    }
  )
);

/**
 * SSR-safe React hook to get and toggle a widget's collapsed state.
 * Returns { isCollapsed, toggle, setCollapsed, isHydrated }.
 */
export function useCollapsibleWidget(widgetId: string, defaultCollapsed = false) {
  const [isHydrated, setIsHydrated] = useState(false);
  const storeCollapsed = useWidgetPreferencesStore(
    (state) => state.collapsedWidgets[widgetId]
  );
  const toggleWidget = useWidgetPreferencesStore((state) => state.toggleWidget);
  const setWidgetCollapsed = useWidgetPreferencesStore((state) => state.setWidgetCollapsed);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const isCollapsed = isHydrated ? (storeCollapsed ?? defaultCollapsed) : defaultCollapsed;

  const toggle = () => {
    toggleWidget(widgetId, defaultCollapsed);
  };

  const setCollapsed = (collapsed: boolean) => {
    setWidgetCollapsed(widgetId, collapsed);
  };

  return {
    isCollapsed,
    toggle,
    setCollapsed,
    isHydrated,
  };
}
