import { test, expect } from '../../fixtures/showcase-test';
import { mockApp, id } from '../../fixtures/auth';
import { mockAlerts } from '../../fixtures/alerts';
import { AlertsPage } from '../../pages/alerts.page';

test('server-revoked push turns off on focus; uncertain health preserves opt-in and never sends a test', async ({ page }) => {
  await page.addInitScript(owner => {
    Object.defineProperty(window, 'Notification', { value: class { static permission = 'granted'; } });
    localStorage.setItem('imt_alert_notifications', JSON.stringify({ owner, mode: 'push', since: Date.now() }));
    const ready = new Promise<void>((resolve, reject) => {
      const open = indexedDB.open('imt-alert-delivery', 1);
      open.onupgradeneeded = () => open.result.createObjectStore('installation');
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const db = open.result, tx = db.transaction('installation', 'readwrite');
        tx.objectStore('installation').put({ owner, installationId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', capability: 'A'.repeat(43), enabled: true }, 'current');
        tx.oncomplete = () => { db.close(); resolve(); };
      };
    });
    Object.defineProperty(navigator, 'serviceWorker', { value: { getRegistration: async () => {
      await ready;
      return { pushManager: { getSubscription: async () => ({}) } };
    } } });
  }, id);
  await mockApp(page, true, false);
  await mockAlerts(page);
  let outcome: 'available' | 'unknown' | 'expired' = 'available', sends = 0, reads = 0;
  await page.route('**/api/alerts/test', route => { sends++; return route.fulfill({ json: { data: true } }); });
  await page.route('**/api/alerts/status', route => {
    reads++;
    return route.fulfill({ status: outcome === 'unknown' ? 503 : 200,
      json: outcome === 'unknown' ? { error: 'unavailable' } : { data: outcome === 'available' } });
  });
  await page.goto('/settings');
  const alerts = new AlertsPage(page);
  await expect(alerts.notificationSwitch).toHaveAttribute('aria-checked', 'true');
  await expect.poll(() => reads).toBe(1);
  await page.evaluate(() => navigator.locks.request('imt-alert-device', () => undefined));
  // Fence each completed health read through an observable result before rechecking.
  outcome = 'unknown';
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByRole('alert')).toHaveText('Background delivery could not be verified.');
  await expect(alerts.notificationSwitch).toHaveAttribute('aria-checked', 'true');
  outcome = 'expired';
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(alerts.notificationSwitch).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByRole('alert')).toHaveText('Push connection expired. Turn notifications on to reconnect.');
  await expect(alerts.testNotification).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem('imt_alert_notifications'))).toBeNull();
  expect(sends).toBe(0);
});
