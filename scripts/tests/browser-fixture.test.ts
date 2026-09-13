import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Page, Route } from '@playwright/test';
import { mockApp, id } from '../../src/tests/fixtures/auth';

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
