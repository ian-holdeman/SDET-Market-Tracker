import { TheBoardPage } from '../../pages/the-board.page';
import { test, expect } from '../../fixtures/showcase-test';
import { mockApp, id } from '../../fixtures/auth';
import { SettingsPage } from '../../pages/settings.page';
import { HeaderComponent } from '../../pages/components/header.component';

test.use({ colorScheme: 'dark' });

test('Settings waits for Auth, shows the account name and four controls through the dropdown', async ({ page }) => {
  const state = await mockApp(page, true);
  let release!: () => void;
  state.profileGate = new Promise(resolve => { release = resolve; });
  await page.goto('/settings');
  await expect(page.getByRole('status')).toContainText('Loading account');
  await expect(page.getByRole('button', { name: 'Sign In to Your Account' })).toHaveCount(0);
  release();
  const settings = new SettingsPage(page);
  await expect(settings.name).toHaveText('Test Member');
  await page.goto('/board');
  await settings.navigate();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(settings.clear).toBeDisabled();
  await expect(settings.delete).toBeVisible();
  await expect(settings.dark).toBeChecked();
  await settings.privacy.click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole('article')).toContainText('appearance preference');
});

test('Guests have the sign-in boundary and public privacy access', async ({ page }) => {
  await mockApp(page);
  await page.goto('/settings');
  await expect(page.getByRole('button', { name: 'Sign In to Your Account' })).toBeVisible();
  await expect(new SettingsPage(page).panel).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Settings', exact: true })).toHaveCount(0);
  await page.goto('/privacy');
  await expect(page.getByRole('article')).toContainText('Operator');
});

test('A dark device defaults dark, switches both ways, persists and survives sign-out and deletion', async ({ page }) => {
  const state = await mockApp(page, true);
  const settings = new SettingsPage(page);
  await page.goto('/settings');
  await expect(settings.dark).toBeChecked();
  expect(await page.evaluate(() => localStorage.getItem('imt_appearance'))).toBeNull();
  await settings.light.check();
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(245, 247, 251)');
  await page.reload();
  await expect(settings.light).toBeChecked();
  await settings.dark.check();
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(11, 14, 20)');
  await settings.light.check();
  const header = new HeaderComponent(page);
  await header.profileButton.click(); await header.logoutButton.click();
  await expect(settings.panel).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('imt_appearance'))).toBe('light');
  await header.loginButton.click();
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(settings.light).toBeChecked();
  state.failDeletion = false;
  await settings.delete.click(); await settings.confirmDelete.click();
  await expect(header.loginButton).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('imt_appearance'))).toBe('light');
});

test('Clear requires confirmation, traps focus, preserves state on failure and sends one owner-scoped delete', async ({ page }) => {
  const state = await mockApp(page, true); state.watchlist = ['AAPL', 'MSFT'];
  const settings = new SettingsPage(page);
  await page.goto('/settings');
  await settings.clear.click();
  await expect(settings.dialog).toContainText('Your account remains');
  await settings.confirmClear.focus(); await page.keyboard.press('Tab');
  await expect(settings.dialog.getByRole('button', { name: 'Close Clear Watchlist' })).toBeFocused();
  await page.keyboard.press('Escape'); await expect(settings.clear).toBeFocused();
  expect(state.clearRequests).toHaveLength(0);
  await settings.clear.click(); await settings.cancel.click();
  state.failClear = true;
  await settings.clear.click(); await settings.confirmClear.click();
  await expect(settings.dialog.getByRole('alert')).toContainText('not confirmed');
  expect(state.watchlist).toEqual(['AAPL', 'MSFT']);
  await page.screenshot({ path: test.info().outputPath('clear-failure.png') });
  state.failClear = false;
  let release!: () => void; state.clearGate = new Promise(resolve => { release = resolve; });
  await settings.confirmClear.click();
  await expect(settings.dialog.getByRole('status')).toContainText('Clearing');
  await expect(settings.confirmClear).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(settings.dialog).toHaveCount(0);
  await expect(settings.panel.getByRole('status')).toContainText('does not cancel');
  await expect(settings.clear).toBeDisabled();
  release();
  await expect(settings.panel).toContainText('Your watchlist is empty');
  await expect(settings.clear).toBeDisabled();
  expect(state.clearRequests).toHaveLength(2);
  for (const request of state.clearRequests) {
    const url = new URL(request);
    expect(url.searchParams.get('user_id')).toBe('eq.' + id);
    expect(url.searchParams.has('symbol')).toBe(false);
  }
  await page.goto('/board');
  const board = new TheBoardPage(page);
  await expect(board.header.username).toBeVisible();
  await expect(board.watchlistCount).toHaveCount(0);
  await board.watchlistTab.click();
  await expect(page.getByText('Your Watchlist is Empty', { exact: true })).toBeVisible();
  await expect(board.rows).toHaveCount(0);
  expect(state.watchlist).toEqual([]);
  expect(state.curated).toEqual(['AAPL', 'MSFT']);
});
