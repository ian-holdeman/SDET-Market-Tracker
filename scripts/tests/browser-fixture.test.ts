import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Page, Route } from '@playwright/test';
import { mockApp, id } from '../../src/tests/fixtures/auth';
import { mockAlerts } from '../../src/tests/fixtures/alerts';

test('browser fixture distinguishes remove-one from owner clear and responds with requested identities', async () => {
  let handler!: (route: Route) => Promise<unknown>;
  const state = await mockApp({ route: async (_: string, callback: typeof handler) => { handler = callback; } } as unknown as Page);
  const request = async (path: string, method = 'GET', body?: unknown) => {
    let response: any;
    await handler({ request: () => ({ url: () => 'https://supabase.example.invalid' + path, method: () => method, postDataJSON: () => body }),
      fulfill: async (value: unknown) => { response = value; } } as unknown as Route);
    return response.json;
  };
  state.watchlist = ['AAPL', 'MSFT'];
  assert.deepEqual(await request(`/rest/v1/watchlist_items?user_id=eq.${id}&symbol=eq.AAPL`, 'DELETE'), [{ symbol: 'AAPL' }]);
  assert.deepEqual(state.watchlist, ['MSFT']);
  assert.deepEqual(await request(`/rest/v1/watchlist_items?user_id=eq.${id}`, 'DELETE'), [{ symbol: 'MSFT' }]);
  assert.deepEqual(state.watchlist, []);
  assert.deepEqual(await request('/rest/v1/assets?symbol=eq.MSFT'), { symbol: 'MSFT' });
  await request('/rest/v1/curated_assets', 'POST', { symbol: 'MDB' });
  assert.deepEqual(state.curated, ['AAPL', 'MSFT', 'MDB']);
});

test('alert fixture rejects unknown operations and wrong methods instead of manufacturing success', async () => {
  let handler!: (route: Route) => Promise<unknown>;
  await mockAlerts({ route: async (pattern: unknown, callback: typeof handler) => {
    if (pattern === '**/api/alerts/**') handler = callback;
  } } as unknown as Page);
  const request = (path: string, method: string) => handler({
    request: () => ({ url: () => 'http://127.0.0.1:3100/api/alerts/' + path, method: () => method }),
    fulfill: async () => {},
  } as unknown as Route);
  await assert.rejects(request('subcribe', 'POST'), /Unexpected alert request/);
  await assert.rejects(request('test', 'GET'), /Unexpected alert request/);
  await assert.rejects(request('config', 'POST'), /Unexpected alert request/);
  await request('config', 'GET');
  await request('test', 'POST');
});
