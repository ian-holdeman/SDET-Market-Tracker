import { test, expect } from '../../fixtures/showcase-test';
import { mockApp } from '../../fixtures/auth';
import { responsePainted } from '../../fixtures/response-barrier';
import { TheBoardPage } from '../../pages/the-board.page';

for (const theme of ['dark', 'light'] as const)
 test(`current quote stays consistent with the row across chart selection, refresh and failure in ${theme}`, async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: theme });
  const account = await mockApp(page); account.populated = true; account.curated = ['AAPL'];
  let price = 999, failed = false;
  const at = new Date(Date.now() - 120000).toISOString();
  await page.route('**/api/quotes?**', route => failed ? route.fulfill({ status: 502, json: {} }) : route.fulfill({ json: { quotes: [{
    symbol: 'AAPL', price, change: price - 990, changePercent: (price - 990) / 990 * 100, prevClose: 990,
    currency: 'USD', assetType: 'Stock', asOf: at, fetchedAt: new Date().toISOString(), sparkline: [],
  }] } }));
  await page.route('**/api/candles?**', route => {
    const timeframe = new URL(route.request().url()).searchParams.get('timeframe');
    const value = timeframe === '1Y' ? 333 : 101;
    return route.fulfill({ json: { symbol: 'AAPL', timeframe, asOf: at, fetchedAt: at,
      points: [{ price: value - 1, timestamp: Date.parse(at) - 1000, date: at, label: '' }, { price: value, timestamp: Date.parse(at), date: at, label: '' }],
      startPrice: value - 1, currentPrice: value, change: 1, changePercent: 1, high: value, low: value - 1 } });
  });
  await page.goto('/board/AAPL');
  const board = new TheBoardPage(page), chart = board.chart('AAPL');
  await expect(board.assetRow('AAPL')).toContainText('$999.00');
  await expect(chart.currentPrice).toHaveText('$999.00');
  await chart.timeframe('1Y').click();
  await expect(chart.samplePrice).toHaveText('$333.00');
  await expect(chart.currentPrice).toHaveText('$999.00');
  await chart.hoverSample();
  await expect(chart.samplePrice).toHaveText('$332.00');
  await expect(chart.currentPrice).toHaveText('$999.00');
  await chart.clearSample();
  await expect(chart.samplePrice).toHaveText('$333.00');
  const path = await chart.line.getAttribute('d');
  price = 1001;
  await board.refreshButton.click();
  await expect(chart.currentPrice).toHaveText('$1,001.00');
  await expect(board.assetRow('AAPL')).toContainText('$1,001.00');
  await expect(chart.line).toHaveAttribute('d', path!);
  await board.captureCurrentQuote('AAPL', testInfo.outputPath(`current-quote-${theme}.png`));
  failed = true;
  await board.refreshButton.click();
  await expect(chart.currentQuote).toContainText('Refresh unavailable');
  await expect(chart.currentPrice).toHaveText('$1,001.00');
  await board.captureCurrentQuote('AAPL', testInfo.outputPath(`stale-current-quote-${theme}.png`));
});

test('unsaved searched quotes refresh manually and periodically without adding account data', async ({ page }) => {
  // Capture application timers before mount; keep time moving until setup settles.
  await page.clock.install();
  const account = await mockApp(page); account.populated = true;
  let price = 102, failSearch = false, searchRequests = 0;
  const observedAt = new Date(Date.now() - 60000).toISOString();
  await page.route('**/api/quotes?**', route => {
    const symbols = new URL(route.request().url()).searchParams.get('symbols')!.split(',');
    if (symbols.includes('MDB')) searchRequests++;
    if (symbols.includes('MDB') && failSearch) return route.fulfill({ status: 502, json: {} });
    return route.fulfill({ json: { quotes: symbols.map(symbol => ({ symbol, name: symbol === 'MDB' ? 'MongoDB, Inc.' : symbol,
      price: symbol === 'MDB' ? price : 100, currency: 'USD', assetType: 'Stock', asOf: observedAt, fetchedAt: new Date().toISOString(), sparkline: [] })) } });
  });
  await page.goto('/board');
  const board = new TheBoardPage(page);
  await board.searchAsset('MDB');
  await expect(board.assetRow('MDB')).toContainText('$102.00');
  price = 103;
  await board.refreshButton.click();
  await expect(board.assetRow('MDB')).toContainText('$103.00');
  await expect(board.refreshButton).toBeEnabled();
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 1000)));
  const beforePeriodic = searchRequests;
  price = 104;
  await page.clock.runFor(15000);
  await expect.poll(() => searchRequests).toBeGreaterThan(beforePeriodic);
  await expect(board.assetRow('MDB')).toContainText('$104.00');
  failSearch = true;
  await board.refreshButton.click();
  await expect(board.assetRow('MDB')).toHaveAttribute('data-market-status', 'stale');
  await expect(board.assetRow('MDB')).toContainText('$104.00');
  expect(account.watchlist).toEqual([]);
  expect(account.registrations).toEqual([]);
});

test('late custom-asset initialization cannot replace a newer batch quote', async ({ page }) => {
  const account = await mockApp(page, true); account.populated = true; account.curated = ['AAPL']; account.watchlist = ['MDB'];
  let release!: () => void, started = false;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const now = Date.now();
  await page.route('**/api/quotes?**', async route => {
    const symbols = new URL(route.request().url()).searchParams.get('symbols')!.split(',');
    const old = symbols.length === 1 && symbols[0] === 'MDB';
    if (old) { started = true; await gate; }
    return route.fulfill({ json: { quotes: symbols.map(symbol => ({ symbol, price: old ? 100 : 102, currency: 'USD',
      asOf: new Date(now - (old ? 120000 : 60000)).toISOString(), fetchedAt: new Date(now).toISOString(), sparkline: [] })) } });
  });
  await page.goto('/board');
  const board = new TheBoardPage(page);
  await expect.poll(() => started).toBe(true);
  await expect(board.assetRow('MDB')).toContainText('$102.00');
  const lateResponse = page.waitForResponse(response => response.url().endsWith('/api/quotes?symbols=MDB'));
  release(); await responsePainted(page, lateResponse);
  await expect(board.assetRow('MDB')).toContainText('$102.00');
});

test('unavailable current quote never borrows a historical sample', async ({ page }) => {
  const account = await mockApp(page); account.populated = true; account.curated = ['AAPL'];
  await page.route('**/api/quotes?**', route => route.fulfill({ status: 502, json: {} }));
  await page.goto('/board/AAPL');
  const chart = new TheBoardPage(page).chart('AAPL');
  await expect(chart.samplePrice).not.toHaveText('—');
  await expect(chart.currentPrice).toHaveText('—');
  await expect(chart.currentQuote).toContainText('Quote unavailable');
});
