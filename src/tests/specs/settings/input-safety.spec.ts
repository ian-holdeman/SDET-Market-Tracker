import { test, expect } from '../../fixtures/showcase-test';
import { mockApp } from '../../fixtures/auth';
import { mockAlerts } from '../../fixtures/alerts';
import { SettingsPage } from '../../pages/settings.page';
import { TheBoardPage } from '../../pages/the-board.page';
import { AlertsPage } from '../../pages/alerts.page';

test('profile and provider text stay inert across navigation; both textboxes preserve valid input', async ({ page }) => {
  const payload = '<img src=/injection-probe onerror="window.__injected=true">';
  const state = await mockApp(page, true);
  state.identity = { ...state.identity, user_metadata: { ...state.identity.user_metadata, full_name: payload } };
  state.populated = true;
  const alerts = await mockAlerts(page);
  const probes: string[] = [];
  page.on('request', request => { if (request.url().includes('injection-probe')) probes.push(request.url()); });
  await page.route('**/api/search?**', route => route.fulfill({ json: { results: [{ symbol: 'SAFE', name: payload, assetType: 'Stock' }] } }));
  await page.route('**/api/quotes?symbols=SAFE', route => {
    const now = new Date().toISOString();
    return route.fulfill({ json: { quotes: [{ symbol: 'SAFE', name: payload, assetType: 'Stock', price: 102, change: 2,
      changePercent: 2, currency: 'USD', asOf: now, fetchedAt: now }] } });
  });
  await page.goto('/settings');
  await expect(new SettingsPage(page).name).toHaveText(payload);
  await page.reload();
  await expect(new SettingsPage(page).name).toHaveText(payload);
  await page.goto('/board');
  const board = new TheBoardPage(page);
  await expect(board.header.username).toBeVisible();
  await board.searchAsset('SAFE');
  await expect(board.assetRow('SAFE')).toContainText(payload);
  await board.searchAsset(payload);
  await expect(board.searchInput).toHaveValue(payload);
  await board.searchAsset('x'.repeat(81));
  await expect(board.searchInput).toHaveValue('x'.repeat(80));
  await board.searchAsset('AAPL');
  await board.assetRow('AAPL').click();
  const editor = new AlertsPage(page);
  await editor.bell().click();
  await expect(editor.target).toBeVisible();
  await editor.target.fill('-0.01');
  await editor.target.fill(payload);
  await expect(editor.target).toHaveValue('-0.01');
  await editor.create.click();
  await expect(editor.rules).toHaveCount(1);
  expect(alerts.rules[0].target).toBe(-0.01);
  expect(probes).toEqual([]);
  expect(await page.evaluate(() => (window as Window & { __injected?: boolean }).__injected)).toBeUndefined();
  await expect(page).toHaveURL(/\/board/);
});
