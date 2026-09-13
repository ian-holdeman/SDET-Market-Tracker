import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { fulfillShowcaseMarket } from './showcase-market';
export const id = '44444444-4444-4444-8444-444444444444';
export const identity = { id, aud: 'authenticated', role: 'authenticated', email: 'browser@example.invalid',
  user_metadata: { full_name: 'Test Member', role: 'admin' }, app_metadata: { provider: 'google' }, created_at: '2026-01-01T00:00:00Z' };
const jwt = (payload: unknown) => Buffer.from(JSON.stringify(payload)).toString('base64url');
const token = jwt({ alg: 'HS256', typ: 'JWT' }) + '.' + jwt({ sub: id, role: 'authenticated', exp: 4102444800 }) + '.test';
export const session = { access_token: token, refresh_token: 'test-refresh', token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, user: identity };

export async function mockApp(page: Page, authenticated = false, admin = false) {
  if (authenticated) await page.addInitScript((value) => {
    if (!sessionStorage.getItem('test-session-initialized')) {
      localStorage.setItem('imt_supabase_auth', JSON.stringify(value));
      sessionStorage.setItem('test-session-initialized', 'yes');
    }
  }, session);
  const state = { failRegistration: true, failSave: false, failRemove: false, catalogAvailable: true, catalog: new Set(['AAPL', 'MSFT']), registrations: [] as string[], curated: ['AAPL', 'MSFT'], googleEnabled: true, failDeletion: true, watchlist: [] as string[], writes: [] as unknown[], exchanges: 0, accountRequests: 0, clearRequests: [] as string[], failClear: false, clearAppliedButLost: false, clearGate: null as Promise<void> | null, profileGate: null as Promise<void> | null, populated: false, falling: false, failWatchlistRead: false, mutationGate: null as Promise<void> | null, deletionGate: null as Promise<void> | null, identity, watchlists: null as Record<string, string[]> | null };
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === 'https://supabase.example.invalid') {
      if (url.pathname === '/auth/v1/settings') return route.fulfill({ json: { external: { google: state.googleEnabled } } });
      if (url.pathname === '/auth/v1/authorize') {
        expect(url.searchParams.get('provider')).toBe('google');
        expect(url.searchParams.get('redirect_to')).toBe('http://127.0.0.1:3100/auth/callback');
        expect(url.searchParams.get('code_challenge')).toBeTruthy();
        return route.fulfill({ contentType: 'text/html', body: '<meta http-equiv="refresh" content="0;url=http://127.0.0.1:3100/auth/callback?code=test-code">' });
      }
      if (url.pathname === '/auth/v1/token') { state.exchanges++; return route.fulfill({ json: session }); }
      if (url.pathname === '/auth/v1/user') { await state.profileGate; return route.fulfill({ json: state.identity }); }
      if (url.pathname === '/auth/v1/logout') return route.fulfill({ status: 204 });
      if (url.pathname === '/rest/v1/rpc/current_user_is_admin') return route.fulfill({ json: admin });
      if (url.pathname === '/rest/v1/curated_assets') {
        if (request.method() === 'POST') {
          const { symbol } = request.postDataJSON();
          if (!state.curated.includes(symbol)) state.curated.push(symbol);
          return route.fulfill({ json: [{ symbol }] });
        }
        if (request.method() === 'DELETE') {
          const symbol = url.searchParams.get('symbol')!.slice(3);
          state.curated = state.curated.filter((item) => item !== symbol);
          return route.fulfill({ json: [{ symbol }] });
        }
        return route.fulfill({ json: state.curated.map((symbol) => ({ symbol })) });
      }
      if (url.pathname === '/rest/v1/assets') {
        const symbol = url.searchParams.get('symbol')?.slice(3);
        return route.fulfill({ json: state.catalogAvailable && state.catalog.has(symbol!) ? { symbol } : null });
      }
      if (url.pathname === '/rest/v1/watchlist_items') {
        const requestedOwner = url.searchParams.get('user_id')?.slice(3) || state.identity.id;
        const items = state.watchlists?.[requestedOwner] ?? state.watchlist;
        if (request.method() === 'DELETE') {
          state.clearRequests.push(request.url());
          await state.clearGate;
          if (state.failClear) return route.fulfill({ status: 503, json: { message: 'Unavailable' } });
          const filter = url.searchParams.get('symbol');
          expect(url.searchParams.get('user_id')).toMatch(/^eq\./);
          if (filter) expect(filter).toMatch(/^eq\./);
          if (filter && state.failRemove) return route.fulfill({ status: 503, json: { message: 'Removal unavailable' } });
          const removed = items.filter(symbol => !filter || symbol === filter.slice(3));
          const remaining = items.filter(symbol => !removed.includes(symbol));
          if (state.watchlists) state.watchlists[requestedOwner] = remaining; else state.watchlist = remaining;
          if (state.clearAppliedButLost) return route.abort();
          return route.fulfill({ json: removed.map(symbol => ({ symbol })) });
        }
        if (request.method() === 'POST') {
          const body = request.postDataJSON(); state.writes.push(body);
          await state.mutationGate;
          if (state.failSave) return route.fulfill({ status: 503, json: { message: 'Save unavailable' } });
          if (!items.includes(body.symbol)) items.push(body.symbol);
          return route.fulfill({ json: [{ symbol: body.symbol }] });
        }
        if (state.failWatchlistRead) return route.fulfill({ status: 503, json: { message: 'Read unavailable' } });
        return route.fulfill({ json: items.map((symbol) => ({ symbol })) });
      }
      throw new Error('Unexpected Supabase request: ' + url.pathname);
    }
    if (url.origin !== 'http://127.0.0.1:3100') return route.abort();
    if (url.pathname === '/api/assets/register') {
      expect(request.headers().authorization).toBe('Bearer ' + token);
      const { symbol } = request.postDataJSON();
      expect(request.postDataJSON()).toEqual({ symbol });
      expect(symbol).toMatch(/^[A-Z0-9^][A-Z0-9.^=-]*$/);
      state.registrations.push(symbol);
      if (state.failRegistration) return route.fulfill({ status: 502, json: { error: 'Yahoo could not validate this symbol.' } });
      state.catalogAvailable = true; state.catalog.add(symbol);
      return route.fulfill({ json: { symbol } });
    }
    if (url.pathname === '/api/test-history') return route.fulfill({ json: { version: 1, configured: true, fetchedAt: new Date().toISOString(), stale: false, runs: [] } });
    if (url.pathname === '/api/account') {
      state.accountRequests++;
      await state.deletionGate;
      expect(request.method()).toBe('DELETE'); expect(request.headers().authorization).toBe('Bearer ' + token);
      expect(request.postData()).toBeNull();
      return state.failDeletion
        ? route.fulfill({ status: 502, json: { error: 'Account deletion was not confirmed. Check your session before retrying.' } })
        : route.fulfill({ status: 204 });
    }
    if ((state.populated || process.env.SHOWCASE_CAPTURE === '1') && await fulfillShowcaseMarket(route, state.falling)) return;
    if (url.pathname.startsWith('/api/')) return route.fulfill({ json: url.pathname === '/api/quotes' ? { quotes: [] } : { points: [], results: [] } });
    return route.continue();
  });
  return state;
}

