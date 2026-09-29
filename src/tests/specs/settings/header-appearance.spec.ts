import { test, expect } from '../../fixtures/showcase-test';
import { mockApp } from '../../fixtures/auth';
import { HeaderComponent } from '../../pages/components/header.component';
import { SettingsPage } from '../../pages/settings.page';
import { AlertsPage } from '../../pages/alerts.page';
import { AuthModalComponent } from '../../pages/components/auth-modal.component';

test.use({ colorScheme: 'dark' });

test('Guests can switch appearance both ways through the header and retain it across navigation and reload', async ({ page }) => {
  await mockApp(page);
  await page.goto('/');
  const header = new HeaderComponent(page);
  await expect(header.loginButton).toBeVisible();
  await expect(header.appearanceAction('light')).toBeVisible();
  await header.switchAppearance('light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(header.appearanceAction('dark')).toBeVisible();
  await header.navBoardBtn.click();
  await expect(page).toHaveURL(/\/board$/);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(header.appearanceAction('dark')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await header.switchAppearance('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(header.appearanceAction('light')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('imt_appearance'))).toBe('dark');
});

test('Header and Settings synchronize in both directions and across tabs', async ({ page, context }) => {
  await mockApp(page, true);
  await page.goto('/settings');
  const header = new HeaderComponent(page), settings = new SettingsPage(page);
  await expect(settings.dark).toBeChecked();
  await header.switchAppearance('light');
  await expect(settings.light).toBeChecked();
  await settings.dark.check();
  await expect(header.appearanceAction('light')).toBeVisible();
  const other = await context.newPage();
  await other.emulateMedia({ colorScheme: 'dark' });
  await mockApp(other, true);
  await other.goto('/settings');
  const otherHeader = new HeaderComponent(other), otherSettings = new SettingsPage(other);
  await expect(otherSettings.dark).toBeChecked();
  await otherHeader.switchAppearance('light');
  await expect(settings.light).toBeChecked();
  await expect(header.appearanceAction('dark')).toBeVisible();
  await settings.dark.check();
  await expect(otherSettings.dark).toBeChecked();
  await expect(otherHeader.appearanceAction('light')).toBeVisible();
  await other.close();
});

for (const device of ['light', 'dark'] as const) {
  test(`Guest header follows the ${device} device until selection and keeps account actions protected`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: device });
    const state = await mockApp(page);
    await page.goto('/settings');
    const header = new HeaderComponent(page), settings = new SettingsPage(page);
    const opposite = device === 'light' ? 'dark' : 'light';
    await expect(header.appearanceAction(opposite)).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('imt_appearance'))).toBeNull();
    await page.emulateMedia({ colorScheme: opposite });
    await expect(header.appearanceAction(device)).toBeVisible();
    await header.switchAppearance(device);
    await page.emulateMedia({ colorScheme: device });
    await page.emulateMedia({ colorScheme: opposite });
    await expect(page.locator('html')).toHaveAttribute('data-theme', device);
    await expect(settings.panel).toHaveCount(0);
    await expect(header.profileButton).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Sign In to Your Account' })).toBeVisible();
    expect(state.accountRequests).toBe(0);
    expect(state.clearRequests).toEqual([]);
    expect(state.writes).toEqual([]);
  });
}

test('Guest header supports Tab, Enter and Space with visible focus retained across palette changes', async ({ page }) => {
  await mockApp(page);
  await page.goto('/');
  const header = new HeaderComponent(page);
  await expect(header.appearanceButton).toBeVisible();
  // Traverse the real tab order; never focus the toggle directly.
  await header.brandLogoBtn.focus();
  for (let step = 0; step < 5 && !await header.appearanceButton.evaluate(element => element === document.activeElement); step++) {
    await page.keyboard.press('Tab');
  }
  await expect(header.appearanceButton).toBeFocused();
  await expect(header.appearanceButton).not.toHaveCSS('box-shadow', 'none');
  await page.keyboard.press('Enter');
  await expect(header.appearanceAction('dark')).toBeFocused();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(header.appearanceButton).not.toHaveCSS('box-shadow', 'none');
  await page.keyboard.press('Space');
  await expect(header.appearanceAction('light')).toBeFocused();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.keyboard.press('Tab');
  await expect(header.loginButton).toBeFocused();
});

// Keep one narrow/desktop sample per account state and the demonstrated 768px
// wrapping boundary. Labels may wrap; navigation and account actions must work.
for (const scenario of [
  { name: 'guest', signedIn: false, width: null, theme: 'light' },
  { name: 'member', signedIn: true, width: null, theme: 'dark' },
  { name: 'member at the desktop navigation boundary', signedIn: true, width: 768, theme: 'light' },
] as const) {
  test(`Header actions remain usable for ${scenario.name}`, async ({ page, isMobile }, testInfo) => {
    const { signedIn, theme } = scenario;
    await page.setViewportSize({ width: scenario.width ?? (isMobile ? 320 : 1440), height: 900 });
    // Exercise the crowded state independently of execution time or CI schedule.
    await page.clock.setFixedTime(new Date('2026-09-28T16:49:00Z'));
    const state = await mockApp(page, signedIn);
    state.identity = { ...state.identity, user_metadata: { ...state.identity.user_metadata, full_name: 'Long Display Name For Header Layout' } };
    await page.route('**/api/test-activity', route => route.fulfill({ json: { active: true, checkedAt: '2026-09-28T16:49:00Z' } }));
    await page.emulateMedia({ colorScheme: theme });
    await page.goto('/');
    const header = new HeaderComponent(page);
    const alerts = new AlertsPage(page);
    const account = signedIn ? header.profileButton : header.loginButton;
    await expect(account).toBeVisible();
    await expect(header.boardActivity.filter({ visible: true })).toBeVisible();
    await expect(header.testsActivity.filter({ visible: true })).toBeVisible();
    for (const control of [header.brandLogoBtn, header.appearanceButton, account, ...(signedIn ? [alerts.historyBell] : [])]) {
      await expect(control).toBeInViewport({ ratio: 1 });
      await control.click({ trial: true });
    }
    // These icon-only actions retain their accepted minimum touch target;
    // no maximum size, exact spacing or header-height contract is imposed.
    for (const control of [header.appearanceButton, ...(signedIn ? [alerts.historyBell] : [])]) {
      const target = (await control.boundingBox())!;
      expect(target.width).toBeGreaterThanOrEqual(44);
      expect(target.height).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await header.region.screenshot({ path: testInfo.outputPath('header.png') });
    for (const [nav, route] of [[header.navBoardBtn, 'board'], [header.navTestsBtn, 'tests'], [header.navLogicBtn, 'logic']] as const) {
      await expect(nav.filter({ visible: true })).toBeInViewport({ ratio: 1 });
      await nav.click();
      await expect(page).toHaveURL(new RegExp(`/${route}$`));
    }
    await header.switchAppearance(theme === 'light' ? 'dark' : 'light');
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme === 'light' ? 'dark' : 'light');
    if (signedIn) {
      await alerts.historyBell.click();
      await expect(alerts.history).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(alerts.historyBell).toBeFocused();
      await header.profileButton.click();
      await header.settingsButton.click();
      await expect(page).toHaveURL(/\/settings$/);
    } else {
      // Safari pointer activation does not establish keyboard focus. Exercise
      // restoration from a focused opener, as a keyboard visitor would.
      await header.loginButton.focus();
      await page.keyboard.press('Enter');
      await expect(new AuthModalComponent(page).google).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(header.loginButton).toBeFocused();
    }
  });
}
