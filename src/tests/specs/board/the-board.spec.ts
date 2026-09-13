import { test, expect } from '../../fixtures/showcase-test';
import { mockApp, id } from '../../fixtures/auth';
import { TheBoardPage } from '../../pages/the-board.page';

test('uncurated search recovers from registration, save and removal failures and retains another saved asset', async ({ page }) => {
  const state = await mockApp(page, true); state.populated = true; state.watchlist = ['MSFT'];
  await page.route('**/api/search?**', route => route.fulfill({ json: { results: [{ symbol: 'MDB', name: 'MongoDB, Inc.', assetType: 'Stock' }] } }));
  await page.route('**/api/quotes?symbols=MDB', route => route.fulfill({ json: { quotes: [{ symbol: 'MDB', name: 'MongoDB, Inc.', assetType: 'Stock', price: 102, change: 2, changePercent: 2, currency: 'USD', asOf: new Date().toISOString(), fetchedAt: new Date().toISOString() }] } }));
  const board = new TheBoardPage(page);
  await page.goto('/board');
  await expect(board.header.username).toBeVisible();
  await expect(board.assetRow('MDB')).toHaveCount(0);
  await board.searchAsset('MongoDB, Inc.');
  await board.assetRow('MDB').click();
  await expect(board.chart('MDB').line).toBeVisible();
  await board.watchlistButton('MDB').click();
  await expect(page.getByRole('alert')).toContainText('Yahoo could not validate');
  expect(state.writes).toEqual([]);
  state.failRegistration = false; state.failSave = true;
  await board.watchlistButton('MDB').click();
  await expect(page.getByRole('alert')).toContainText('watchlist change was not confirmed');
  expect(state.watchlist).toEqual(['MSFT']);
  state.failSave = false;
  await board.watchlistButton('MDB').click();
  await expect(board.watchingTag('MDB')).toBeVisible();
  expect(state.writes.at(-1)).toEqual({ user_id: id, symbol: 'MDB' });
  expect(state.registrations).toEqual(['MDB', 'MDB']);
  expect(state.curated).toEqual(['AAPL', 'MSFT']);
  await page.reload();
  await expect(board.watchingTag('MDB')).toBeVisible();
  state.failRemove = true;
  await board.watchlistButton('MDB').click();
  await expect(page.getByRole('alert')).toContainText('watchlist change was not confirmed');
  await expect(board.watchingTag('MDB')).toBeVisible();
  state.failRemove = false;
  await board.watchlistButton('MDB').click();
  await expect(board.watchingTag('MDB')).toHaveCount(0);
  expect(state.watchlist).toEqual(['MSFT']);
  await page.reload();
  await expect(board.header.username).toBeVisible();
  await board.watchlistTab.click();
  await expect.poll(() => board.symbols()).toEqual(['MSFT']);
});

test('Stocks and ETFs retain numeric order, unavailable-last and watchlist filter recovery', async ({ page }) => {
  const state = await mockApp(page, true); state.watchlist = ['MSFT'];
  state.curated = ['AAPL', 'MSFT', 'AMD', 'SPY', 'QQQ'];
  await page.route('**/api/quotes?**', route => {
    const now = new Date().toISOString();
    return route.fulfill({ json: { quotes: [
      ['AAPL', 9, -12, 'Stock'], ['MSFT', 100, 2, 'Stock'], ['SPY', 20, -3, 'ETF'], ['QQQ', 3, 10, 'ETF'],
    ].map(([symbol, price, changePercent, assetType]) => ({ symbol, price, changePercent, assetType, change: changePercent, currency: 'USD', asOf: now, fetchedAt: now })) } });
  });
  const board = new TheBoardPage(page);
  await page.goto('/board');
  await expect(board.assetRow('AAPL')).toHaveAttribute('data-market-status', 'available');
  await board.allAssets.click();
  await board.category('Stocks');
  await expect.poll(() => board.symbols()).toEqual(['MSFT', 'AAPL', 'AMD']);
  await board.sort('price');
  await expect.poll(() => board.symbols()).toEqual(['AAPL', 'MSFT', 'AMD']);
  await board.sort('change');
  await expect.poll(() => board.symbols()).toEqual(['MSFT', 'AAPL', 'AMD']);
  await board.sort('change');
  await expect.poll(() => board.symbols()).toEqual(['AAPL', 'MSFT', 'AMD']);
  await board.category('ETFs');
  await expect.poll(() => board.symbols()).toEqual(['SPY', 'QQQ']);
  await board.watchlistTab.click();
  await expect(page.getByText('No Watched ETFs Found', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'View All Watched (1)' }).click();
  await expect.poll(() => board.symbols()).toEqual(['MSFT']);
  await board.allAssets.click();
  await expect.poll(() => board.symbols()).toEqual(['AAPL', 'SPY', 'MSFT', 'QQQ', 'AMD']);
});


test('curation arriving during an older quote request immediately fetches the new universe', async ({ page }) => {
  const state = await mockApp(page); state.curated = ['AAPL', 'SPY'];
  let release!: () => void, first = true;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/quotes?**', async route => {
    const symbols = new URL(route.request().url()).searchParams.get('symbols')!.split(',');
    if (first) { first = false; await gate; }
    const now = new Date().toISOString();
    return route.fulfill({ json: { quotes: symbols.map(symbol => ({ symbol, price: 123, assetType: symbol === 'SPY' ? 'ETF' : 'Stock', asOf: now, fetchedAt: now, currency: 'USD' })) } });
  });
  const board = new TheBoardPage(page); await page.goto('/board');
  await expect(board.assetRow('SPY')).toBeVisible();
  release();
  await expect(board.assetRow('SPY')).toHaveAttribute('data-market-status', 'available');
});
