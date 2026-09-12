import { test, expect } from '@playwright/test';
import { mockApp } from '../../fixtures/auth';
import { HeaderComponent } from '../../pages/components/header.component';
import { SettingsPage } from '../../pages/settings.page';
import { mkdir } from 'node:fs/promises';

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

for (const signedIn of [false, true]) {
  for (const width of [320, 360, 375, 390, 640, 768, 900, 1024, 1440]) {
    test(`Header controls fit ${width}px in both palettes (${signedIn ? 'member' : 'guest'})`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      const state = await mockApp(page, signedIn);
      state.identity = { ...state.identity, user_metadata: { ...state.identity.user_metadata, full_name: 'Long Display Name For Header Layout' } };
      await page.goto('/');
      const header = new HeaderComponent(page);
      const account = signedIn ? header.profileButton : header.loginButton;
      await expect(account).toBeVisible();
      const directory = `.telemetry/header-appearance/${testInfo.project.name}/${signedIn ? 'member' : 'guest'}`;
      await mkdir(directory, { recursive: true });
      for (const theme of ['dark', 'light'] as const) {
        if (await header.appearanceAction(theme).isVisible()) await header.switchAppearance(theme);
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        await header.appearanceButton.click({ trial: true });
        const toggle = (await header.appearanceButton.boundingBox())!;
        const brand = (await header.brandLogoBtn.boundingBox())!;
        const accountBox = (await account.boundingBox())!;
        const banner = (await header.region.boundingBox())!;
        expect(toggle.width).toBeGreaterThanOrEqual(44);
        expect(toggle.height).toBeGreaterThanOrEqual(44);
        expect(brand.x + brand.width).toBeLessThanOrEqual(toggle.x);
        expect(toggle.x + toggle.width).toBeLessThanOrEqual(accountBox.x);
        expect(accountBox.x + accountBox.width).toBeLessThanOrEqual(width - 16);
        expect(accountBox.height).toBeLessThanOrEqual(36);
        expect(toggle.y + toggle.height).toBeLessThanOrEqual(width < 640 ? 64 : 80);
        expect(banner.height).toBeLessThanOrEqual(width < 640 ? 110 : width < 768 ? 126 : 81);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        for (const nav of [header.navBoardBtn, header.navTestsBtn, header.navLogicBtn]) {
          const visible = nav.filter({ visible: true });
          await expect(visible).toBeVisible();
          await visible.click({ trial: true });
          const box = (await visible.boundingBox())!;
          expect(box.height).toBeLessThanOrEqual(36);
          expect(box.x).toBeGreaterThanOrEqual(16);
          expect(box.x + box.width).toBeLessThanOrEqual(width - 16);
          if (width >= 768) {
            expect(box.x).toBeGreaterThanOrEqual(brand.x + brand.width);
            expect(box.x + box.width).toBeLessThanOrEqual(toggle.x);
          }
        }
        await header.region.screenshot({ path: `${directory}/${width}-${theme}.png` });
      }
    });
  }
}
