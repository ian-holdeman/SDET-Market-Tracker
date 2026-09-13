import { test, expect } from '../../fixtures/showcase-test';
import { mockApp } from '../../fixtures/auth';
import { TheBoardPage } from '../../pages/the-board.page';
import { responsePainted } from '../../fixtures/response-barrier';

test('empty and unavailable searches recover and a released older query cannot replace the newer asset', async ({ page }) => {
  const state = await mockApp(page); state.populated = true;
  let release!: () => void, started = false;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/search?**', async route => {
    const query = new URL(route.request().url()).searchParams.get('q');
    if (query === 'Old query') { started = true; await gate; }
    if (query === 'Unavailable query') return route.fulfill({ status: 502, json: {} });
    const symbol = query === 'Old query' ? 'OLD' : 'MDB';
    return route.fulfill({ json: { results: query === 'Empty query' ? [] : [{ symbol, name: query, assetType: 'Stock' }] } });
  });
  await page.route('**/api/quotes?symbols=MDB', route => route.fulfill({ json: { quotes: [{ symbol: 'MDB', name: 'MongoDB, Inc.', price: 102, currency: 'USD', asOf: new Date().toISOString(), fetchedAt: new Date().toISOString() }] } }));
  const board = new TheBoardPage(page);
  await page.goto('/board');
  await board.searchAsset('Empty query');
  await expect(page.getByText('No assets match your search "Empty query"')).toBeVisible();
  await page.getByRole('button', { name: 'Clear search', exact: true }).filter({ hasText: 'Clear search' }).click();
  await expect(board.assetRow('AAPL')).toBeVisible();
  await board.searchAsset('Unavailable query');
  await expect(page.getByRole('alert')).toContainText('unavailable');
  await board.searchAsset('Old query');
  await expect.poll(() => started).toBe(true);
  await board.searchAsset('MongoDB, Inc.');
  await expect(board.assetRow('MDB')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  const oldResponse = page.waitForResponse(response => response.url().includes('q=Old%20query'));
  release();
  await responsePainted(page, oldResponse);
  await expect.poll(() => board.symbols()).toEqual(['MDB']);
});

test('a delayed old timeframe cannot overwrite the selected year chart', async ({ page }) => {
  const state = await mockApp(page); state.populated = true;
  let release!: () => void, started = false;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/candles?**', async route => {
    const timeframe = new URL(route.request().url()).searchParams.get('timeframe')!;
    if (timeframe === '1M') { started = true; await gate; }
    const now = new Date().toISOString(), price = timeframe === '1Y' ? 333 : timeframe === '1M' ? 222 : 111;
    return route.fulfill({ json: { symbol: 'AAPL', timeframe, asOf: now, fetchedAt: now,
      points: [{ price: price - 1, timestamp: Date.parse(now) - 1000, date: now, label: '' }, { price, timestamp: Date.parse(now), date: now, label: '' }],
      startPrice: price - 1, currentPrice: price, change: 1, changePercent: 1, high: price, low: price - 1 } });
  });
  const board = new TheBoardPage(page), chart = board.chart('AAPL');
  await page.goto('/board?symbol=AAPL');
  await expect(chart.card).toContainText('$111.00');
  await chart.timeframe('1M').click(); await expect.poll(() => started).toBe(true);
  await chart.timeframe('1Y').click();
  await expect(chart.card).toContainText('$333.00');
  const path = await chart.line.getAttribute('d');
  const oldResponse = page.waitForResponse(response => response.url().includes('timeframe=1M'));
  release(); await responsePainted(page, oldResponse);
  await expect(chart.card).toContainText('$333.00');
  await expect(chart.card).not.toContainText('$222.00');
  await expect(chart.line).toHaveAttribute('d', path!);
  await chart.timeframe('1M').click();
  await expect(chart.card).toContainText('$222.00');
  await chart.timeframe('1Y').click();
  await expect(chart.card).toContainText('$333.00');
});
