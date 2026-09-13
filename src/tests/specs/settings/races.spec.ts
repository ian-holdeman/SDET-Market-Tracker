import { test, expect } from '../../fixtures/showcase-test';
import { responsePainted } from '../../fixtures/response-barrier';
import { mockApp, id, identity, session } from '../../fixtures/auth';
import { SettingsPage } from '../../pages/settings.page';
import { HeaderComponent } from '../../pages/components/header.component';
import { TheBoardPage } from '../../pages/the-board.page';

const secondId = '55555555-5555-4555-8555-555555555555';
const secondIdentity = { ...identity, id: secondId, user_metadata: { full_name: 'Second Member', role: 'user' } };
const secondSession = { ...session, user: secondIdentity, access_token: Buffer.from('{"alg":"HS256"}').toString('base64url') + '.' + Buffer.from(JSON.stringify({ sub: secondId, role: 'authenticated', exp: 4102444800 })).toString('base64url') + '.test' };

for (const operation of ['clear', 'delete'] as const) {
  test(`Late ${operation} completion cannot overwrite a different signed-in account`, async ({ page }) => {
    const state = await mockApp(page, true);
    state.watchlists = { [id]: ['AAPL'], [secondId]: ['MSFT'] };
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    if (operation === 'clear') state.clearGate = gate;
    else { state.deletionGate = gate; state.failDeletion = false; }
    const settings = new SettingsPage(page);
    await page.goto('/settings');
    await settings[operation].click();
    await (operation === 'clear' ? settings.confirmClear : settings.confirmDelete).click();
    await expect(settings.dialog.getByRole('status')).toBeVisible();
    await expect.poll(() => operation === 'clear' ? state.clearRequests.length : state.accountRequests).toBe(1);
    state.identity = secondIdentity;
    await page.evaluate(value => {
      localStorage.setItem('imt_supabase_auth', JSON.stringify(value));
      const channel = new BroadcastChannel('imt_supabase_auth');
      channel.postMessage({ event: 'SIGNED_IN', session: value }); channel.close();
    }, secondSession);
    await expect(settings.name).toHaveText('Second Member');
    const response = page.waitForResponse(r => operation === 'clear' ? r.url().includes('/watchlist_items') && r.request().method() === 'DELETE' : r.url().endsWith('/api/account'));
    release();
    await responsePainted(page, response);
    await expect(settings.delete).toBeEnabled();
    await expect(settings.name).toHaveText('Second Member');
    await expect(settings.panel).toContainText('1 saved asset');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('imt_supabase_auth')!).user.id)).toBe(secondId);
    expect(state.watchlists[secondId]).toEqual(['MSFT']);
    await expect(settings.dialog).toHaveCount(0);
  });
}

test('Conflicting watchlist changes are excluded while clear runs, including after dialog closure', async ({ page }) => {
  const state = await mockApp(page, true); state.watchlist = ['MSFT'];
  let release!: () => void; state.clearGate = new Promise(resolve => { release = resolve; });
  const settings = new SettingsPage(page);
  await page.goto('/settings');
  await settings.clear.click(); await settings.confirmClear.click();
  await expect(settings.confirmClear).toBeDisabled();
  await page.keyboard.press('Escape');
  await new HeaderComponent(page).navBoardBtn.click();
  const board = new TheBoardPage(page);
  await board.allAssets.click();
  await board.assetRow('AAPL').click();
  await new TheBoardPage(page).watchlistButton('AAPL').click();
  await expect(page.getByRole('alert')).toContainText('previous account or watchlist change');
  expect(state.writes).toEqual([]);
  release();
  await expect(new TheBoardPage(page).watchlistCount).toHaveCount(0);
  await new TheBoardPage(page).watchlistButton('AAPL').click();
  await expect(new TheBoardPage(page).watchingTag('AAPL')).toBeVisible();
  expect(state.writes).toEqual([{ user_id: id, symbol: 'AAPL' }]);
});

test('A pending add prevents clear and an older profile response cannot restore cleared items', async ({ page }) => {
  const state = await mockApp(page, true);
  let release!: () => void; state.mutationGate = new Promise(resolve => { release = resolve; });
  await page.goto('/board?symbol=AAPL');
  await expect(new HeaderComponent(page).username).toBeVisible();
  await new TheBoardPage(page).watchlistButton('AAPL').click();
  await expect.poll(() => state.writes.length).toBe(1);
  const settings = new SettingsPage(page);
  await settings.navigate();
  await expect(settings.clear).toBeDisabled();
  release();
  await expect(settings.clear).toBeEnabled();
  let readRelease!: () => void;
  const readGate = new Promise<void>(resolve => { readRelease = resolve; });
  let readStarted = false;
  await page.route('**/rest/v1/watchlist_items?*', async route => {
    if (route.request().method() !== 'GET') return route.fallback();
    readStarted = true; await readGate;
    return route.fulfill({ json: [{ symbol: 'AAPL' }] });
  });
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect.poll(() => readStarted).toBe(true);
  await settings.clear.click(); await settings.confirmClear.click();
  await expect(settings.clear).toBeDisabled();
  readRelease();
  await expect(settings.panel).toContainText('Your watchlist is empty');
});

test('Clear failure with unavailable reconciliation retains displayed items until a verified reload', async ({ page }) => {
  test.setTimeout(45000);
  const state = await mockApp(page, true); state.watchlist = ['AAPL'];
  await page.goto('/settings');
  const settings = new SettingsPage(page);
  await settings.clear.click();
  state.failClear = true; state.failWatchlistRead = true;
  await settings.confirmClear.click();
  await expect(settings.dialog.getByRole('alert')).toContainText('Displayed items are retained', { timeout: 20000 });
  await settings.cancel.click();
  await expect(settings.panel).toContainText('1 saved asset');
  await settings.clear.click(); await settings.confirmClear.click();
  await expect(settings.dialog.getByRole('alert')).toContainText('Reload before retrying');
  expect(state.clearRequests).toHaveLength(1);
  state.failClear = false; state.failWatchlistRead = false;
  await page.reload();
  await settings.clear.click(); await settings.confirmClear.click();
  await expect(settings.clear).toBeDisabled();
});

test('Signing out while clear runs removes Settings and ignores the late response', async ({ page }) => {
  const state = await mockApp(page, true); state.watchlist = ['AAPL'];
  let release!: () => void; state.clearGate = new Promise(resolve => { release = resolve; });
  const settings = new SettingsPage(page), header = new HeaderComponent(page);
  await page.goto('/settings');
  await settings.clear.click(); await settings.confirmClear.click();
  await page.keyboard.press('Escape');
  await header.profileButton.click(); await header.logoutButton.click();
  await expect(settings.panel).toHaveCount(0);
  const response = page.waitForResponse(r => r.url().includes('/watchlist_items') && r.request().method() === 'DELETE');
  release();
  await responsePainted(page, response);
  await expect(page.getByRole('button', { name: 'Sign In to Your Account' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('imt_supabase_auth'))).toBeNull();
});

test('Token refresh during account deletion still clears the deleted account session', async ({ page }) => {
  const state = await mockApp(page, true); state.failDeletion = false;
  let release!: () => void; state.deletionGate = new Promise(resolve => { release = resolve; });
  const settings = new SettingsPage(page);
  await page.goto('/settings');
  await settings.delete.click(); await settings.confirmDelete.click();
  await expect(settings.dialog.getByRole('status')).toContainText('Deleting');
  await page.evaluate(value => {
    localStorage.setItem('imt_supabase_auth', JSON.stringify(value));
    const channel = new BroadcastChannel('imt_supabase_auth');
    channel.postMessage({ event: 'TOKEN_REFRESHED', session: value }); channel.close();
  }, { ...session, access_token: session.access_token + '-refreshed' });
  release();
  await expect(new HeaderComponent(page).loginButton).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('imt_supabase_auth'))).toBeNull();
});

test('A persisted account switch before confirmation cannot delete the new account', async ({ page }) => {
  const state = await mockApp(page, true);
  await page.goto('/settings');
  const settings = new SettingsPage(page);
  await settings.delete.click();
  await page.evaluate(value => localStorage.setItem('imt_supabase_auth', JSON.stringify(value)), secondSession);
  await settings.confirmDelete.click();
  await expect(settings.dialog.getByRole('alert')).toContainText('Your account changed');
  expect(state.accountRequests).toBe(0);
});
