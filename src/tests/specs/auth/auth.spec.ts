import type { Page } from '@playwright/test';
import { fulfillShowcaseMarket } from '../../fixtures/showcase-market';
import { test, expect } from '../../fixtures/showcase-test';
import { HeaderComponent } from '../../pages/components/header.component';

const id = '44444444-4444-4444-8444-444444444444';
const identity = { id, aud: 'authenticated', role: 'authenticated', email: 'browser@example.invalid',
  user_metadata: { full_name: 'Test Member', role: 'admin' }, app_metadata: { provider: 'google' }, created_at: '2026-01-01T00:00:00Z' };
const jwt = (payload: unknown) => Buffer.from(JSON.stringify(payload)).toString('base64url');
const token = jwt({ alg: 'HS256', typ: 'JWT' }) + '.' + jwt({ sub: id, role: 'authenticated', exp: 4102444800 }) + '.test';
const session = { access_token: token, refresh_token: 'test-refresh', token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, user: identity };

async function mockApp(page: Page, authenticated = false, admin = false) {
  if (authenticated) await page.addInitScript((value) => {
    if (!sessionStorage.getItem('test-session-initialized')) {
      localStorage.setItem('imt_supabase_auth', JSON.stringify(value));
      sessionStorage.setItem('test-session-initialized', 'yes');
    }
  }, session);
  const state = { failRegistration: true, catalogAvailable: true, curated: ['AAPL', 'MSFT'], googleEnabled: true, failDeletion: true, watchlist: [] as string[], writes: [] as unknown[], exchanges: 0 };
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
      if (url.pathname === '/auth/v1/user') return route.fulfill({ json: identity });
      if (url.pathname === '/auth/v1/logout') return route.fulfill({ status: 204 });
      if (url.pathname === '/rest/v1/rpc/current_user_is_admin') return route.fulfill({ json: admin });
      if (url.pathname === '/rest/v1/curated_assets') {
        if (request.method() === 'DELETE') {
          const symbol = url.searchParams.get('symbol')!.slice(3);
          state.curated = state.curated.filter((item) => item !== symbol);
          return route.fulfill({ json: [{ symbol }] });
        }
        return route.fulfill({ json: state.curated.map((symbol) => ({ symbol })) });
      }
      if (url.pathname === '/rest/v1/assets') return route.fulfill({ json: state.catalogAvailable ? { symbol: 'AAPL' } : null });
      if (url.pathname === '/rest/v1/watchlist_items') {
        if (request.method() === 'POST') {
          const body = request.postDataJSON(); state.writes.push(body); state.watchlist.push(body.symbol);
        }
        return route.fulfill({ json: state.watchlist.map((symbol) => ({ symbol })) });
      }
      throw new Error('Unexpected Supabase request: ' + url.pathname);
    }
    if (url.origin !== 'http://127.0.0.1:3100') return route.abort();
    if (url.pathname === '/api/assets/register') {
      expect(request.headers().authorization).toBe('Bearer ' + token);
      expect(request.postDataJSON()).toEqual({ symbol: 'AAPL' });
      if (state.failRegistration) return route.fulfill({ status: 502, json: { error: 'Yahoo could not validate this symbol.' } });
      state.catalogAvailable = true;
      return route.fulfill({ json: { symbol: 'AAPL' } });
    }
    if (url.pathname === '/api/test-history') return route.fulfill({ json: { version: 1, configured: true, fetchedAt: new Date().toISOString(), stale: false, runs: [] } });
    if (url.pathname === '/api/account') {
      expect(request.method()).toBe('DELETE'); expect(request.headers().authorization).toBe('Bearer ' + token);
      expect(request.postData()).toBeNull();
      return state.failDeletion
        ? route.fulfill({ status: 502, json: { error: 'Account deletion was not confirmed. Check your session before retrying.' } })
        : route.fulfill({ status: 204 });
    }
    if (process.env.SHOWCASE_CAPTURE === '1' && await fulfillShowcaseMarket(route)) return;
    if (url.pathname.startsWith('/api/')) return route.fulfill({ json: url.pathname === '/api/quotes' ? { quotes: [] } : { points: [], results: [] } });
    return route.continue();
  });
  return state;
}

test('Google PKCE callback returns to the starting page and exchanges the code once', async ({ page }) => {
  const state = await mockApp(page);
  await page.goto('/logic');
  await page.locator('#header-login-btn').click();
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page.locator('#header-username-display')).toHaveText('Test Member');
  await expect(page).toHaveURL(/\/logic$/);
  expect(state.exchanges).toBe(1);
});

test('Watchlists use the Auth UUID; editable metadata cannot reveal admin controls', async ({ page }) => {
  const state = await mockApp(page, true);
  await page.goto('/board?symbol=AAPL');
  await expect(page.locator('#header-username-display')).toHaveText('Test Member');
  await expect(page.getByRole('button', { name: 'Remove from curated Board' })).toHaveCount(0);
  await page.locator('#watchlist-star-btn-aapl').click();
  await expect(page.locator('#watching-tag-aapl')).toBeVisible();
  expect(state.writes).toEqual([{ user_id: id, symbol: 'AAPL' }]);
});

test('Deletion errors retain the account; confirmed deletion clears the browser session', async ({ page }) => {
  const state = await mockApp(page, true, true);
  await page.goto('/settings');
  await page.locator('#btn-delete-account').click();
  await page.locator('#confirm-delete-account-btn').click();
  await expect(page.getByText('Account deletion was not confirmed. Check your session before retrying.')).toBeVisible();
  await expect(page.locator('#header-username-display')).toHaveText('Test Member');
  state.failDeletion = false;
  await page.locator('#confirm-delete-account-btn').click();
  await expect(page.locator('#header-login-btn')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('imt_supabase_auth'))).toBeNull();
});

test('Legacy local role forgery cannot create an authenticated account', async ({ page }) => {
  await mockApp(page);
  await page.addInitScript(() => localStorage.setItem('imt_active_user_session', JSON.stringify({ username: 'ihadmin', role: 'admin' })));
  await page.goto('/board?symbol=AAPL');
  await expect(page.locator('#header-login-btn')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remove from curated Board' })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('imt_active_user_session'))).toBeNull();
});


test('An unconfigured Google provider explains the problem without leaving the page', async ({ page }) => {
  const state = await mockApp(page);
  state.googleEnabled = false;
  await page.goto('/tests');
  await page.locator('#header-login-btn').click();
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Google sign-in is not enabled');
  await expect(page).toHaveURL(/\/tests$/);
});

test('An admin can remove curated membership while their watchlist stays intact', async ({ page }) => {
  const state = await mockApp(page, true, true);
  state.watchlist = ['AAPL'];
  await page.goto('/board?symbol=AAPL');
  await page.getByRole('button', { name: 'Remove from curated Board' }).click();
  await expect(page.getByRole('button', { name: 'Add to curated Board' })).toBeVisible();
  await expect(page.locator('#watching-tag-aapl')).toBeVisible();
  expect(state.watchlist).toEqual(['AAPL']);
  expect(state.curated).toEqual(['MSFT']);
});

test('An unregistered asset is not silently added to the watchlist', async ({ page }) => {
  const state = await mockApp(page, true);
  state.catalogAvailable = false;
  await page.goto('/board?symbol=AAPL');
  await expect(page.locator('#header-username-display')).toHaveText('Test Member');
  await page.locator('#watchlist-star-btn-aapl').click();
  await expect(page.getByRole('alert')).toContainText('Yahoo could not validate');
  await expect(page.locator('#watching-tag-aapl')).toHaveCount(0);
  expect(state.writes).toEqual([]);
});

test('Validated searched assets save to the owner watchlist without curation', async ({ page }) => {
  const state = await mockApp(page, true);
  state.catalogAvailable = false; state.failRegistration = false;
  await page.goto('/board?symbol=AAPL');
  await expect(page.locator('#header-username-display')).toHaveText('Test Member');
  await page.locator('#watchlist-star-btn-aapl').click();
  await expect(page.locator('#watching-tag-aapl')).toBeVisible();
  expect(state.writes).toEqual([{ user_id: id, symbol: 'AAPL' }]);
  expect(state.curated).toEqual(['AAPL', 'MSFT']);
  await page.reload();
  await expect(page.locator('#watching-tag-aapl')).toBeVisible();
  expect(state.writes).toHaveLength(1);
  await expect(page.getByRole('button', { name: 'Remove from curated Board' })).toHaveCount(0);
});

for (const collapse of ['card', 'all'] as const) {
  test(`A saved watchlist does not reopen a card after ${collapse} collapse and Google re-login`, async ({ page }) => {
    await mockApp(page, true);
    await page.goto('/board?symbol=AAPL');
    await expect(page.locator('#header-username-display')).toHaveText('Test Member');
    if (process.env.SHOWCASE_CAPTURE === '1') {
      await expect(page.locator('#board-row-aapl')).toHaveAttribute('data-market-status', 'available');
      await expect(page.locator('#card-previous-close-aapl')).toContainText('$200.00');
      await expect(page.locator('#card-1m-change-aapl')).toContainText('+2.00%');
      await expect(page.locator('#drilldown-card-aapl')).not.toContainText('Historical data unavailable');
    }
    await page.locator('#watchlist-star-btn-aapl').click();
    await expect(page.locator('#watching-tag-aapl')).toBeVisible();
    if (collapse === 'all') await page.locator('#board-expand-all-btn').click();
    else await page.locator('#board-row-aapl').click();
    await expect(page.locator('#drilldown-card-aapl')).toHaveCount(0);
    await expect(page).toHaveURL(/\/board$/);
    await page.locator('#header-user-profile-btn').click();
    await page.locator('#header-logout-btn').click();
    await page.locator('#header-login-btn').click();
    await page.getByRole('button', { name: 'Continue with Google' }).click();
    await expect(page.locator('#header-username-display')).toHaveText('Test Member');
    await expect(page).toHaveURL(/\/board$/);
    await expect(page.locator('[id^="drilldown-card-"]')).toHaveCount(0);
    await expect(page.locator('#board-watchlist-count-badge')).toContainText('1');
  });
}

for (const boardUrl of ['/board?symbol=AAPL', '/board/AAPL#chart']) {
  test(`Google re-login from an open card at ${boardUrl} returns to the Board overview`, async ({ page }) => {
    const state = await mockApp(page, true);
    state.watchlist = ['AAPL'];
    await page.goto(boardUrl);
    // Ordinary deep links still expand their asset before authentication navigation.
    await expect(page.locator('#drilldown-card-aapl')).toBeVisible();
    await expect(page.locator('#header-username-display')).toHaveText('Test Member');
    await page.locator('#header-user-profile-btn').click();
    await page.locator('#header-logout-btn').click();
    // Leave the card open: this reproduces the reported case without collapsing it first.
    await page.locator('#header-login-btn').click();
    await page.getByRole('button', { name: 'Continue with Google' }).click();
    await expect(page.locator('#header-username-display')).toHaveText('Test Member');
    await expect(page).toHaveURL(/\/board$/);
    await expect(page.locator('[id^="drilldown-card-"]')).toHaveCount(0);
    await expect(page.locator('#board-watchlist-count-badge')).toContainText('1');
  });
}

test('confirmed sign-out removes orphaned OAuth storage without clearing unrelated site data', async ({ page }) => {
  const header = new HeaderComponent(page);
  await mockApp(page, true);
  await page.goto('/board');
  await expect(header.username).toHaveText('Test Member');
  await page.evaluate(() => {
    localStorage.setItem('imt_supabase_auth-flow-0123456789abcdef-code-verifier', 'synthetic-orphan');
    localStorage.setItem('unrelated-preference', 'keep');
    sessionStorage.setItem('imt_oauth_return', '/board');
  });
  await header.profileButton.click();
  await header.logoutButton.click();
  await expect(header.loginButton).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('imt_supabase_auth-flow-0123456789abcdef-code-verifier'))).toBeNull();
  expect(await page.evaluate(() => sessionStorage.getItem('imt_oauth_return'))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('unrelated-preference'))).toBe('keep');
});
