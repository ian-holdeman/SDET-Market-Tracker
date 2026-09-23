import { test, expect } from '../../fixtures/showcase-test';
import { mockApp } from '../../fixtures/auth';
import { InstallPage } from '../../pages/install.page';

test('guest can open installation help without starting installation', { tag: '@smoke' }, async ({ page }) => {
  await mockApp(page);
  await page.goto('/');
  const install = new InstallPage(page);
  await expect(install.opener).toBeVisible();
  await expect(install.dialog).toHaveCount(0);
  await install.open();
  await expect(install.dialog).toContainText('Brave or Chrome');
  await page.keyboard.press('Escape');
  await expect(install.opener).toBeFocused();
});

for (const theme of ['light', 'dark'] as const) {
  test(`signed-in installation help supports keyboard and ${theme} appearance`, async ({ page }, testInfo) => {
    await page.emulateMedia({ colorScheme: theme });
    await mockApp(page, true);
    await page.goto('/logic');
    const install = new InstallPage(page);
    await install.opener.focus();
    await page.keyboard.press('Enter');
    await expect(install.close).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(install.close).toBeFocused();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    const bounds = await install.dialog.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    await page.screenshot({ path: testInfo.outputPath(`install-${theme}.png`) });
    await install.close.click();
    await expect(install.opener).toBeFocused();
    await install.opener.click({ trial: true });
    await page.screenshot({ path: testInfo.outputPath(`footer-${theme}.png`) });
  });
}

for (const outcome of ['accepted', 'dismissed', 'error'] as const) {
  test(`browser prompt ${outcome} is user-initiated, single-use and truthful`, async ({ page }) => {
    await mockApp(page);
    await page.goto('/');
    const install = new InstallPage(page);
    await install.opener.waitFor();
    await install.prompt(outcome);
    expect(await page.evaluate(() => (window as any).installCalls)).toBe(0);
    await install.open();
    expect(await page.evaluate(() => (window as any).installCalls)).toBe(0);
    await install.install.click();
    await expect(install.status).toContainText(outcome === 'accepted' ? 'Installation was accepted' : outcome === 'dismissed' ? 'Installation was dismissed' : 'prompt is unavailable');
    await expect(install.install).toHaveCount(0);
    await install.close.click();
    await install.open();
    expect(await page.evaluate(() => (window as any).installCalls)).toBe(1);
    if (outcome === 'accepted') await expect(install.status).not.toContainText('completed');
    await install.prompt('dismissed');
    await expect(install.install).toBeVisible();
  });
}

test('closing pending help and late prompt completion cannot undo an installation event', async ({ page }) => {
  await mockApp(page);
  await page.goto('/');
  const install = new InstallPage(page);
  await install.opener.waitFor();
  await install.prompt('pending');
  await install.open();
  await install.install.click();
  await install.close.click();
  await install.open();
  await expect(install.status).toContainText('Complete or dismiss');
  await page.evaluate(() => { window.dispatchEvent(new Event('appinstalled')); (window as any).finishInstall(); });
  await expect(install.status).toContainText('reported that installation completed');
});

test('standalone display reports only the current window and offers no install prompt', async ({ page }) => {
  await page.addInitScript(() => {
    const original = window.matchMedia.bind(window);
    window.matchMedia = query => query === '(display-mode: standalone)'
      ? Object.assign(new EventTarget(), { matches: true, media: query, onchange: null, addListener() {}, removeListener() {} }) as MediaQueryList
      : original(query);
  });
  await mockApp(page);
  await page.goto('/');
  const install = new InstallPage(page);
  await install.opener.waitFor();
  await install.prompt('accepted');
  await install.open();
  await expect(install.status).toHaveText('You’re using the app in a standalone window.');
  await expect(install.install).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).installCalls)).toBe(0);
});
