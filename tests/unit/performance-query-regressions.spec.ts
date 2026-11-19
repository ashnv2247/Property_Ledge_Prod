import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { requestCache } from '@/lib/cache/request-cache';
import { serverCache } from '@/lib/cache/server-cache';
import { shouldPersistColumnEvent } from '@/lib/grid/persistence';
import { useGridStateStore } from '@/lib/stores/useGridStateStore';

// Execute the real query module with only its I/O dependencies replaced.
function loadQueries(client: unknown) {
  const source = fs.readFileSync('lib/dashboard/queries.ts', 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports: Record<string, (...args: any[]) => Promise<any>> = {};
  vm.runInNewContext(outputText, {
    exports, console: { error() {} }, Date,
    require: (name: string) => {
      if (name === '@/lib/supabase/server') return { createClient: async () => client };
      if (name === '@/lib/cache/request-cache') return { requestCache };
      if (name === '@/lib/auth/authorization') return { getActiveWorkspaceId: async () => 'ws-1' };
      if (name === '@/lib/properties/queries') return {};
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  return exports;
}

function queryDouble(response: { data: any; error: any }) {
  const calls: Array<[string, ...any[]]> = [];
  const query: any = {};
  for (const method of ['select', 'eq', 'gt', 'lte', 'order', 'limit']) {
    query[method] = (...args: any[]) => { calls.push([method, ...args]); return query; };
  }
  query.then = (resolve: any, reject: any) => Promise.resolve(response).then(resolve, reject);
  const client = { from(table: string) { calls.push(['from', table]); return query; } };
  return { client, calls };
}

test('private data does not survive outside a React request or consult the process cache', () => {
  const key = 'workspace:shared:dashboard_properties';
  serverCache.set(key, [{ secret: 'another user' }]);
  requestCache.set(key, [{ secret: 'previous request' }]);
  expect(requestCache.get(key)).toBeUndefined();
  serverCache.delete(key);
});

test('dashboard queries only six upcoming leases and omit tenant relations', async () => {
  const { client, calls } = queryDouble({ data: [{ id: 'lease-1', properties: { workspace_id: 'ws-1' } }], error: null });
  const result = await loadQueries(client).getDashboardUpcomingLeases({ workspaceId: 'ws-1' });
  expect(calls).toContainEqual(['eq', 'properties.workspace_id', 'ws-1']);
  expect(calls).toContainEqual(['eq', 'status', 'active']);
  expect(calls).toContainEqual(['limit', 6]);
  expect(calls.find(([method]) => method === 'select')?.[1]).not.toContain('tenant');
  expect(result[0].id).toBe('lease-1');
  expect(result[0]).not.toHaveProperty('properties');
});

test('property dashboard retains its property boundary', async () => {
  const { client, calls } = queryDouble({ data: [], error: null });
  await loadQueries(client).getDashboardUpcomingLeases({ propertyId: 'property-1' });
  expect(calls).toContainEqual(['eq', 'property_id', 'property-1']);
  expect(calls.filter(([method]) => method === 'from')).toHaveLength(1);
});

test('workspace lease errors fail closed without an unscoped retry', async () => {
  const { client, calls } = queryDouble({ data: null, error: { message: 'permission denied' } });
  const error = await loadQueries(client).getAllWorkspaceLeases('ws-1').then(
    () => null,
    (failure: Error) => failure.message,
  );
  expect(error).toContain('permission denied');
  expect(calls).toContainEqual(['eq', 'property.workspace_id', 'ws-1']);
  expect(calls.filter(([method]) => method === 'from')).toHaveLength(1);
});

test('workspace tenants use the embedded relation alias for filtering', async () => {
  const { client, calls } = queryDouble({ data: [], error: null });
  await loadQueries(client).getAllWorkspaceTenants('ws-1');
  expect(calls).toContainEqual(['eq', 'property.workspace_id', 'ws-1']);
});

test('column dragging persists the final state once and preserves visibility changes', () => {
  const store = useGridStateStore.getState();
  store.clearAllGridStates();
  let writes = 0;
  const unsubscribe = useGridStateStore.subscribe(() => writes++);
  for (let width = 120; width < 420; width++) {
    if (shouldPersistColumnEvent({ finished: width === 419 })) {
      store.saveGridState('perf-test', { columnState: [{ colId: 'name', width }] });
    }
  }
  unsubscribe();
  expect(writes).toBe(1);
  expect(store.getGridState('perf-test')?.columnState?.[0].width).toBe(419);
  expect(shouldPersistColumnEvent({})).toBe(true);
  store.clearAllGridStates();
});
