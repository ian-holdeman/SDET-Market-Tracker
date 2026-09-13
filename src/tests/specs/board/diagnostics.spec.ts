import { test, expect } from '../../fixtures/showcase-test';
import { mockApp } from '../../fixtures/auth';
import { TheBoardPage } from '../../pages/the-board.page';

test('asset rows activate with Enter and Space and diagnostics restores keyboard focus', async ({ page }) => {
  const state = await mockApp(page); state.populated = true;
  const board = new TheBoardPage(page);
  await page.goto('/board');
  await board.assetRow('AAPL').focus();
  await page.keyboard.press('Enter');
  await expect(board.chart('AAPL').card).toBeVisible();
  await board.assetRow('AAPL').focus();
  await page.keyboard.press('Space');
  await expect(board.chart('AAPL').card).toHaveCount(0);
  await board.diagnosticsOpener.click();
  await expect(board.diagnostics).toBeVisible();
  const close = board.diagnostics.getByRole('button', { name: 'Close Market Provider Polling' });
  await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(board.diagnostics.getByRole('button', { name: 'Done', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(board.diagnostics).toHaveCount(0);
  await expect(board.diagnosticsOpener).toBeFocused();
});

test('diagnostics validates a quote and recovers after HTTP, malformed and stalled responses', async ({ page }) => {
  await mockApp(page);
  const board = new TheBoardPage(page);
  let mode = 'success';
  await page.route('**/api/quotes?symbols=SPY', route => {
    if (mode === 'stalled') return;
    if (mode === 'http') return route.fulfill({ status: 502, json: {} });
    return route.fulfill({ json: mode === 'malformed' ? { quotes: [{ symbol: 'WRONG', price: 123.45 }] } :
      { quotes: [{ symbol: 'SPY', price: 123.45, asOf: new Date().toISOString(), fetchedAt: new Date().toISOString() }] } });
  });
  await page.goto('/board');
  await board.diagnosticsOpener.click();
  await board.ping.click();
  await expect(page.getByText(/Yahoo returned a quote for SPY at \$123.45/)).toBeVisible();
  for (mode of ['http', 'malformed', 'stalled']) {
    await board.ping.click();
    await expect(page.getByText(/Connection check failed:/)).toBeVisible({ timeout: 18000 });
    await expect(board.ping).toBeEnabled();
  }
  mode = 'success';
  await board.ping.click();
  await expect(page.getByText(/Yahoo returned a quote for SPY at \$123.45/)).toBeVisible();
});
