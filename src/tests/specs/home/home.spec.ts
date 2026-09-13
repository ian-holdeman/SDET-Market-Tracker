import { test, expect } from '../../fixtures/showcase-test';
import { mockApp } from '../../fixtures/auth';
import { HomePage } from '../../pages/home.page';
import { TheBoardPage } from '../../pages/the-board.page';

test('movers bound positive and negative rankings, exclude invalid and unchanged quotes, and open the selected asset', async ({ page }) => {
  const state = await mockApp(page); let fail = false;
  const observations = [ ['AAPL', 3], ['MSFT', 8], ['AMD', 1], ['NVDA', 6], ['GOOGL', 2], ['META', 4],
    ['SPY', -2], ['QQQ', -10], ['VTI', -1], ['VOO', 0], ['TSLA', null], ['SOFI', -5] ] as const;
  state.curated = [...observations.map(([symbol]) => symbol), 'AGG', 'BND'];
  await page.route('**/api/quotes?**', route => {
    if (fail) return route.fulfill({ status: 502, json: {} });
    const now = new Date().toISOString();
    const quotes = observations.map(([symbol, changePercent]) => ({ symbol, price: symbol === 'VOO' ? 0 : 100, changePercent,
      change: changePercent, asOf: now, fetchedAt: now, currency: 'USD' }));
    // JSON's numeric exponent can overflow to Infinity on receipt; it must not rank.
    const body = JSON.stringify({ quotes: [...quotes, { symbol: 'AGG', price: 100, changePercent: 'overflow', asOf: now, fetchedAt: now, currency: 'USD' }] }).replace('"overflow"', '1e400');
    return route.fulfill({ contentType: 'application/json', body });
  });
  const home = new HomePage(page), board = new TheBoardPage(page);
  await page.goto('/');
  await expect.poll(() => home.moverSymbols('risers')).toEqual(['MSFT', 'NVDA', 'META', 'AAPL', 'GOOGL']);
  await expect.poll(() => home.moverSymbols('fallers')).toEqual(['QQQ', 'SOFI', 'SPY', 'VTI']);
  await home.movers('fallers').filter({ hasText: 'QQQ' }).click();
  await expect(board.chart('QQQ').card).toBeVisible();
  await expect(page).toHaveURL(/symbol=QQQ/);
  fail = true;
  await board.refreshButton.click();
  await expect(board.assetRow('QQQ')).toHaveAttribute('data-market-status', 'stale');
  await board.header.brandLogoBtn.click();
  await expect(home.movers('risers')).toHaveCount(0);
  await expect(home.movers('fallers')).toHaveCount(0);
  await home.boardCard.click();
  await expect(board.pageHeading).toBeVisible();
});
