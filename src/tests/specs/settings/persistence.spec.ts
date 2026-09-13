import { test, expect } from '../../fixtures/showcase-test';
import { mockApp } from '../../fixtures/auth';
import { SettingsPage } from '../../pages/settings.page';
import { HeaderComponent } from '../../pages/components/header.component';

test.use({ colorScheme: 'dark' });

for (const stored of ['invalid', 'light']) {
  test(`Initial ${stored} preference is applied before the application module executes`, async ({ page }) => {
    await mockApp(page, true);
    await page.addInitScript(value => localStorage.setItem('imt_appearance', value), stored);
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route('**/assets/*.js', async route => { await gate; await route.continue(); });
    await page.goto('/settings', { waitUntil: 'commit' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', stored === 'light' ? 'light' : 'dark');
    release();
    const settings = new SettingsPage(page);
    await expect(stored === 'light' ? settings.light : settings.dark).toBeChecked();
  });
}

test('Blocked preference storage preserves rendering and current-tab controls without network writes', async ({ page }) => {
  await mockApp(page, true);
  await page.addInitScript(() => {
    const get = Storage.prototype.getItem, set = Storage.prototype.setItem;
    Storage.prototype.getItem = function(key) { if (key === 'imt_appearance') throw new DOMException('Blocked', 'SecurityError'); return get.call(this, key); };
    Storage.prototype.setItem = function(key, value) { if (key === 'imt_appearance') throw new DOMException('Blocked', 'SecurityError'); return set.call(this, key, value); };
  });
  const requests: string[] = [];
  page.on('request', request => { if (request.method() !== 'GET') requests.push(new URL(request.url()).pathname); });
  await page.goto('/settings');
  const settings = new SettingsPage(page);
  await expect(settings.dark).toBeChecked();
  requests.length = 0;
  await settings.light.check();
  await expect(settings.light).toBeChecked();
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(245, 247, 251)');
  await settings.dark.check();
  expect(requests.filter(path => path !== '/rest/v1/rpc/current_user_is_admin')).toEqual([]);
  await page.reload();
  await expect(settings.dark).toBeChecked();
});

test('Completely blocked storage still renders public pages', async ({ page }) => {
  await mockApp(page);
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } });
  });
  await page.goto('/settings');
  await expect(page.getByRole('button', { name: 'Sign In to Your Account' })).toBeVisible();
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(11, 14, 20)');
  const header = new HeaderComponent(page);
  await header.switchAppearance('light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(header.appearanceAction('dark')).toBeVisible();
  await page.reload();
  await expect(header.appearanceAction('light')).toBeVisible();
  await header.switchAppearance('light');
  await header.switchAppearance('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('Open tabs synchronize explicit theme changes, key removal and full storage reset', async ({ page, context }) => {
  await mockApp(page, true);
  await page.goto('/settings');
  const settings = new SettingsPage(page);
  await expect(settings.dark).toBeChecked();
  const other = await context.newPage();
  await mockApp(other, true);
  await other.goto('/settings');
  const second = new SettingsPage(other);
  await expect(second.dark).toBeChecked();
  await settings.light.check();
  await expect(second.light).toBeChecked();
  await second.dark.check();
  await expect(settings.dark).toBeChecked();
  await second.light.check();
  await other.evaluate(() => localStorage.removeItem('imt_appearance'));
  await expect(settings.dark).toBeChecked();
  await settings.light.check();
  await other.evaluate(() => localStorage.clear());
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(11, 14, 20)');
});

test('A lost clear response is reconciled from the server and remains visibly uncertain', async ({ page }) => {
  const state = await mockApp(page, true); state.watchlist = ['AAPL']; state.clearAppliedButLost = true;
  await page.goto('/settings');
  const settings = new SettingsPage(page);
  await settings.clear.click(); await settings.confirmClear.click();
  await expect(settings.dialog.getByRole('alert')).toContainText('not confirmed');
  await settings.cancel.click();
  await expect(settings.clear).toBeDisabled();
  await expect(settings.panel).toContainText('Your watchlist is empty');
  await expect(settings.panel.getByRole('alert')).toBeVisible();
});

test('A cross-tab appearance change preserves a pending dialog and duplicate confirmation sends one clear', async ({ page, context }) => {
  const state = await mockApp(page, true); state.watchlist = ['AAPL'];
  let release!: () => void; state.clearGate = new Promise(resolve => { release = resolve; });
  await page.goto('/settings');
  const settings = new SettingsPage(page);
  await settings.clear.click();
  const dialog = await settings.dialog.elementHandle();
  await settings.confirmClear.evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  await expect(settings.dialog.getByRole('status')).toContainText('Clearing');
  await settings.closePending.focus();
  const other = await context.newPage(); await mockApp(other, true); await other.goto('/settings');
  await new HeaderComponent(other).switchAppearance('light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(await dialog!.evaluate(element => element.isConnected)).toBe(true);
  await expect(settings.closePending).toBeFocused();
  await expect(settings.dialog.getByRole('status')).toContainText('Clearing');
  expect(state.clearRequests).toHaveLength(1);
  release();
  await expect(settings.clear).toBeDisabled();
  await expect(settings.panel.getByRole('status')).toContainText('Watchlist cleared');
  await expect(settings.panel.getByRole('heading', { name: 'Settings', exact: true })).toBeFocused();
});

for (const device of ['light', 'dark'] as const) {
  test(`A ${device} device supplies the unsaved default; an explicit choice overrides later device changes`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: device });
    await mockApp(page, true);
    await page.goto('/settings');
    const settings = new SettingsPage(page);
    await expect(settings[device]).toBeChecked();
    expect(await page.evaluate(() => localStorage.getItem('imt_appearance'))).toBeNull();
    const opposite = device === 'light' ? 'dark' : 'light';
    await page.emulateMedia({ colorScheme: opposite });
    await expect(settings[opposite]).toBeChecked();
    // Clicking the already selected pill also records an explicit preference.
    await settings[opposite].click();
    expect(await page.evaluate(() => localStorage.getItem('imt_appearance'))).toBe(opposite);
    await page.emulateMedia({ colorScheme: device });
    await expect(settings[opposite]).toBeChecked();
    await page.reload();
    await expect(settings[opposite]).toBeChecked();
    await page.evaluate(() => localStorage.removeItem('imt_appearance'));
    await page.reload();
    await expect(settings[device]).toBeChecked();
  });
}
