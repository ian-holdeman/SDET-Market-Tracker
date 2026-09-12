import { test, expect, type Locator } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { mockApp } from '../../fixtures/auth';
import { AuthModalComponent } from '../../pages/components/auth-modal.component';
import { measureContrast } from '../../pages/components/contrast';
import { SettingsPage } from '../../pages/settings.page';

for (const theme of ['light', 'dark'] as const) {
  test(`Google sign-in retains a readable label through interaction states in ${theme}`, async ({ page }, testInfo) => {
    await page.emulateMedia({ colorScheme: theme });
    await mockApp(page);
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route('**/auth/v1/settings', async route => {
      await gate;
      await route.fulfill({ json: { external: { google: false } } });
    });
    await page.goto('/');
    const auth = new AuthModalComponent(page);
    await auth.open();
    await expect(auth.google).toBeEnabled();
    const directory = `.telemetry/light-visibility/${process.env.VISIBILITY_PHASE || 'after'}/${testInfo.project.name}/${theme}`;
    await mkdir(directory, { recursive: true });
    const measurements: Record<string, Awaited<ReturnType<typeof measureContrast>>> = {};
    const capture = async (state: string, target: Locator = auth.google) => {
      measurements[state] = await measureContrast(target);
      await page.screenshot({ path: `${directory}/google-${state}.png` });
    };
    await capture('default');
    await auth.google.hover();
    await capture('hover');
    await auth.notice.hover();
    await auth.focusGoogle();
    await expect(auth.google).toBeFocused();
    expect(await auth.google.evaluate(element => element.matches(':focus-visible'))).toBe(true);
    await capture('focus');
    await page.keyboard.press('Enter');
    try {
      await expect(auth.google).toBeDisabled();
      await expect(auth.google).toHaveText('Connecting…');
      await capture('connecting');
      await auth.google.hover({ force: true });
      await capture('connecting-hover');
    } finally { release(); }
    await expect(auth.error).toContainText('Google sign-in is not enabled');
    await expect(auth.google).toBeEnabled();
    await capture('error', auth.error);
    await writeFile(`${directory}/google-contrast.json`, JSON.stringify(measurements, null, 2));
    if (theme === 'light') {
      for (const [state, measurement] of Object.entries(measurements)) {
        expect(measurement.unmeasuredImages, state).toEqual([]);
        expect.soft(measurement.ratio, state).toBeGreaterThanOrEqual(4.5);
      }
      expect(measurements.default.foreground.slice(0, 3).every(channel => channel < 100)).toBe(true);
    }
    expect(measurements.connecting).not.toEqual(measurements.default);
  });
}

for (const theme of ['light', 'dark'] as const) {
  test(`Settings disabled and pending actions remain distinguishable in ${theme}`, async ({ page }, testInfo) => {
    await page.emulateMedia({ colorScheme: theme });
    const state = await mockApp(page, true); state.watchlist = ['AAPL'];
    let release!: () => void;
    state.clearGate = new Promise<void>(resolve => { release = resolve; });
    await page.goto('/settings');
    const settings = new SettingsPage(page);
    await expect(settings.clear).toBeEnabled();
    const measurements: Record<string, Awaited<ReturnType<typeof measureContrast>>> = {};
    const directory = `.telemetry/light-visibility/${process.env.VISIBILITY_PHASE || 'after'}/${testInfo.project.name}/${theme}`;
    await mkdir(directory, { recursive: true });
    measurements.enabled = await measureContrast(settings.clear);
    await settings.clear.click();
    measurements.confirm = await measureContrast(settings.confirmClear);
    await settings.confirmClear.click();
    try {
      await expect(settings.confirmClear).toBeDisabled();
      measurements.pending = await measureContrast(settings.confirmClear);
      await page.screenshot({ path: `${directory}/settings-pending.png` });
      await settings.closePending.click();
      measurements.clearPending = await measureContrast(settings.clear);
      measurements.deletePending = await measureContrast(settings.delete);
      await page.screenshot({ path: `${directory}/settings-pending-panel.png` });
    } finally { release(); }
    await expect(settings.panel.getByRole('status')).toContainText('Watchlist cleared');
    await expect(settings.clear).toBeDisabled();
    measurements.empty = await measureContrast(settings.clear);
    await page.screenshot({ path: `${directory}/settings-empty.png` });
    await writeFile(`${directory}/settings-actions-contrast.json`, JSON.stringify(measurements, null, 2));
    if (theme === 'light') for (const [name, measurement] of Object.entries(measurements)) {
      expect.soft(measurement.ratio, name).toBeGreaterThanOrEqual(4.5);
    }
    expect(measurements.empty).not.toEqual(measurements.enabled);
    expect(state.clearRequests).toHaveLength(1);
  });
}
