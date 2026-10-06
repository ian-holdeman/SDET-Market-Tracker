import { test, expect } from '../../fixtures/showcase-test';
import { mockApp } from '../../fixtures/auth';
import { mockAlerts, alertEvent } from '../../fixtures/alerts';
import { AlertsPage } from '../../pages/alerts.page';
import { HeaderComponent } from '../../pages/components/header.component';

for (const colorScheme of ['light', 'dark'] as const) {
  test(`populated history has one usable scroll area and owner-wide bulk actions (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await mockApp(page, true);
    const state = await mockAlerts(page);
    state.events = Array.from({ length: 75 }, (_, i) => ({ ...alertEvent('bulk-' + i, 15.9849996566772, Date.now() - i * 1000), target: 15 }));
    await page.goto('/board/AAPL');
    await expect(new HeaderComponent(page).username).toHaveText('Test Member');
    const alerts = new AlertsPage(page);
    await alerts.historyBell.click();
    await expect(alerts.events).toHaveCount(30);
    await alerts.history.getByRole('button', { name: 'Close Alert history' }).click({ trial: true });
    const geometry = await alerts.history.evaluate(dialog => {
      const elements = [dialog, ...dialog.querySelectorAll('*')];
      return {
        scrollers: elements.filter(el => ['auto', 'scroll'].includes(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight + 1).length,
        clipped: dialog.scrollWidth > dialog.clientWidth + 1,
      };
    });
    expect(geometry).toEqual({ scrollers: 1, clipped: false });
    await page.screenshot({ path: test.info().outputPath(`history-populated-${colorScheme}.png`) });
    await expect(alerts.events.first()).toContainText('$15.98');
    await alerts.markAll.focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => state.events.filter(e => !e.read_at).length).toBe(0);
    await expect(alerts.unreadIndicator).toHaveCount(0);
    await alerts.older.click();
    await expect(alerts.events).toHaveCount(60);
    await alerts.clearHistory.focus();
    await page.keyboard.press('Space');
    await expect(alerts.clearConfirmation).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(alerts.clearConfirmation).toHaveCount(0);
    await expect(alerts.clearHistory).toBeFocused();
    expect(state.events).toHaveLength(75);
    await alerts.clearHistory.click();
    await alerts.clearConfirmation.getByRole('button', { name: 'Clear history', exact: true }).click();
    await expect(alerts.events).toHaveCount(0);
    expect(state.events).toHaveLength(0);
    await page.screenshot({ path: test.info().outputPath(`history-${colorScheme}.png`) });
  });
}
