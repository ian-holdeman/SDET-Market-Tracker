import { test, expect } from '../../fixtures/showcase-test';
import { mockApp } from '../../fixtures/auth';
import { mockAlerts, alertEvent } from '../../fixtures/alerts';
import { AlertsPage } from '../../pages/alerts.page';

test('confirmed history clear cancels a polled notification waiting for its cross-tab lock', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).displayed = [];
    Object.defineProperty(window, 'Notification', { value: class {
      static permission = 'granted';
      constructor(_title: string, options: NotificationOptions) { (window as any).displayed.push(options.tag); }
      close() {}
    } });
  });
  const now = new Date('2026-10-06T19:00:00Z');
  await page.clock.install({ time: now });
  await mockApp(page, true);
  const state = await mockAlerts(page);
  state.events = [alertEvent('old-baseline', 101, now.getTime() - 1000)];
  await page.goto('/settings');
  const alerts = new AlertsPage(page);
  await expect(alerts.unreadIndicator).toBeVisible();
  await alerts.notificationSwitch.click();
  await expect(alerts.notificationSwitch).toHaveAttribute('aria-checked', 'true');
  state.events = [];
  await page.clock.pauseAt(new Date(now.getTime() + 60000));
  await expect(alerts.unreadIndicator).toHaveCount(0);
  await page.evaluate(() => new Promise<void>(acquired => {
    void navigator.locks.request('imt-alert-notifications', () => new Promise<void>(release => {
      (window as any).releaseNotification = release;
      acquired();
    }));
  }));
  await page.clock.runFor(1000);
  state.events = [alertEvent('queued-before-clear', 103, now.getTime() + 61000)];
  await page.clock.runFor(15000);
  await expect(alerts.unreadIndicator).toBeVisible();
  await alerts.historyBell.click();
  await expect(alerts.events).toHaveCount(1);
  await alerts.clearHistory.click();
  await alerts.clearConfirmation.getByRole('button', { name: 'Clear history', exact: true }).click();
  await expect(alerts.events).toHaveCount(0);
  expect(state.events).toHaveLength(0);
  await page.evaluate(async () => {
    (window as any).releaseNotification();
    await navigator.locks.request('imt-alert-notifications', () => undefined);
  });
  expect(await page.evaluate(() => (window as any).displayed)).toEqual([]);
});
