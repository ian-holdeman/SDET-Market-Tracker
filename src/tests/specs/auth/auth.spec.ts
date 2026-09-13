import { test, expect } from '../../fixtures/showcase-test';
import { HeaderComponent } from '../../pages/components/header.component';

import { mockApp, id } from '../../fixtures/auth';

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


test('admin add-curation preserves saved membership and survives reload', async ({ page }) => {
  const state = await mockApp(page, true, true); state.curated = ['MSFT']; state.watchlist = ['AAPL'];
  await page.goto('/board?symbol=AAPL');
  await page.getByRole('button', { name: 'Add to curated Board' }).click();
  await expect(page.getByRole('button', { name: 'Remove from curated Board' })).toBeVisible();
  expect(state.curated).toEqual(['MSFT', 'AAPL']);
  expect(state.watchlist).toEqual(['AAPL']);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Remove from curated Board' })).toBeVisible();
});

test('OAuth callback cancellation is visible and a fresh sign-in recovers', async ({ page }) => {
  const state = await mockApp(page);
  await page.goto('/auth/callback?error=access_denied&error_description=Sign-in%20cancelled');
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(/cancelled|denied/);
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(new HeaderComponent(page).username).toHaveText('Test Member');
  expect(state.exchanges).toBe(1);
});
