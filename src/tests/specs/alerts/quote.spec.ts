import { test, expect } from '../../fixtures/showcase-test';
import { mockApp } from '../../fixtures/auth';
import { mockAlerts } from '../../fixtures/alerts';
import { AlertsPage } from '../../pages/alerts.page';
import { HeaderComponent } from '../../pages/components/header.component';

test('creation quote updates from the Board and retains dated price after refresh failure', async ({ page }) => {
  await page.clock.install();
  const account = await mockApp(page, true); account.populated = true;
  await mockAlerts(page);
  let release!: () => void, requested!: () => void, fail = false;
  const gate = new Promise<void>(r => release = r), started = new Promise<void>(r => requested = r);
  const observed = new Date(Date.now() - 86400000).toISOString();
  await page.route('**/api/quotes?**', async route => {
    requested(); await gate;
    if (fail) return route.fulfill({ status: 503, json: { error: 'unavailable' } });
    return route.fulfill({ json: { quotes: [{ symbol: 'AAPL', name: 'Apple Inc.', assetType: 'Stock',
      price: 15.9849996566772, change: 0, changePercent: 0, currency: 'USD', asOf: observed, fetchedAt: new Date().toISOString() }] } });
  });
  await page.goto('/board/AAPL'); await started;
  await expect(new HeaderComponent(page).username).toHaveText('Test Member');
  const alerts = new AlertsPage(page);
  await alerts.bell().click();
  await expect(alerts.modal).toContainText('Quote unavailable');
  release();
  await expect(alerts.modal).toContainText('Last price · $15.98');
  await expect(alerts.modal.locator('time')).toHaveAttribute('datetime', observed);
  fail = true;
  await page.clock.runFor(30001);
  await expect(alerts.modal).toContainText('Refresh unavailable');
  await expect(alerts.modal).toContainText('Last price · $15.98');
  await expect(alerts.modal).not.toContainText('Quote unavailable');
});
