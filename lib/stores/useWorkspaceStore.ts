'use client';

import { create } from 'zustand';
import type { EntitlementMap } from '@/types/subscriptions';

export interface AccessibleWorkspace {
  id: string;
  name: string;
  slug: string;
  status: string;
  role: string;
  avatarUrl?: string | null;
}

export interface WorkspaceBootstrap {
  activeWorkspaceId: string | null;
  workspaceName: string | null;
  roleName: string | null;
  permissions: string[];
  entitlements: EntitlementMap;
  workspaces?: AccessibleWorkspace[];
}

interface WorkspaceState extends WorkspaceBootstrap {
  workspaces: AccessibleWorkspace[];
  isSwitching: boolean;
  hydrate: (data: WorkspaceBootstrap) => void;
  updateFromServer: (data: Partial<WorkspaceBootstrap>) => void;
  setWorkspaces: (workspaces: AccessibleWorkspace[]) => void;
  setSwitching: (value: boolean) => void;
}

function arraysEqual<T>(a: T[] | undefined, b: T[] | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function workspacesEqual(a: AccessibleWorkspace[] | undefined, b: AccessibleWorkspace[] | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (
      a[i].id !== b[i].id ||
      a[i].name !== b[i].name ||
      a[i].role !== b[i].role ||
      a[i].status !== b[i].status ||
      a[i].slug !== b[i].slug
    ) {
      return false;
    }
  }
  return true;
}

function recordsEqual(a: Record<string, unknown> | undefined, b: Record<string, unknown> | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const k of aKeys) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  activeWorkspaceId: null,
  workspaceName: null,
  roleName: null,
  permissions: [],
  entitlements: {},
  workspaces: [],
  isSwitching: false,

  hydrate: (data) => {
    const current = get();
    const nextWorkspaces = data.workspaces ?? [];
    if (
      current.activeWorkspaceId === data.activeWorkspaceId &&
      current.workspaceName === data.workspaceName &&
      current.roleName === data.roleName &&
      arraysEqual(current.permissions, data.permissions) &&
      recordsEqual(current.entitlements as any, data.entitlements as any) &&
      workspacesEqual(current.workspaces, nextWorkspaces)
    ) {
      // Idempotent: incoming state identical to current state, prevent subscriber re-render storm
      return;
    }

    set({
      activeWorkspaceId: data.activeWorkspaceId,
      workspaceName: data.workspaceName,
      roleName: data.roleName,
      permissions: data.permissions,
      entitlements: data.entitlements,
      workspaces: nextWorkspaces,
    });
  },

  updateFromServer: (data) =>
    set((state) => ({
      activeWorkspaceId: data.activeWorkspaceId ?? state.activeWorkspaceId,
      workspaceName: data.workspaceName ?? state.workspaceName,
      roleName: data.roleName ?? state.roleName,
      permissions: data.permissions ?? state.permissions,
      entitlements: data.entitlements ?? state.entitlements,
      workspaces: data.workspaces ?? state.workspaces,
    })),

  setWorkspaces: (workspaces) => set({ workspaces }),
  setSwitching: (isSwitching) => set({ isSwitching }),
}));
