import { test, expect } from '../../fixtures/showcase-test';
import { TheBoardPage } from '../../pages/the-board.page';

test('failed market requests show unavailable data, not seeded prices or synthetic history', async ({ page }) => {
  const board = new TheBoardPage(page);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.route('https://supabase.example.invalid/**', route => route.fulfill({ json: [{ symbol: 'AAPL' }] }));
  await page.route('**/api/quotes?**', route => route.fulfill({ status: 502, json: { error: 'Unavailable' } }));
  await page.route('**/api/candles?**', route => route.fulfill({ status: 502, json: { error: 'Unavailable' } }));
  await page.route('**/api/price-activity?**', route => route.fulfill({ status: 502, json: { error: 'Unavailable' } }));
  await page.goto('/board?symbol=AAPL');
  const row = board.assetRow('AAPL');
  await expect(row).toHaveAttribute('data-market-status', 'unavailable');
  const card = board.chart('AAPL').card;
  await expect(card).toContainText('Historical data unavailable for this period.');
  await expect(board.metric('AAPL', 'previous-close')).toContainText('—');
  await expect(board.metric('AAPL', 'volume')).toContainText('—');
  await expect(board.chart('AAPL').pulse).toHaveCount(0);
  await board.chart('AAPL').timeframe('1Y').click();
  await expect(card).toContainText('Historical data unavailable for this period.');
  expect(errors).toEqual([]);
});

test('a one-point chart stays historical; switching to failed history clears it', async ({ page }) => {
  const board = new TheBoardPage(page);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const asOf = '2026-07-01T16:00:00.000Z';
  await page.route('https://supabase.example.invalid/**', route => route.fulfill({ json: [{ symbol: 'AAPL' }] }));
  await page.route('**/api/quotes?**', route => route.fulfill({ json: { quotes: [{ symbol: 'AAPL', price: 999, change: 0, changePercent: 0, prevClose: 999, open: null, dayHigh: null, dayLow: null, volume: 0, peRatio: 0, dividendYield: 0, asOf, fetchedAt: asOf, currency: 'USD', assetType: 'Stock', sparkline: [] }] } }));
  await page.route('**/api/candles?**', route => {
    const tf = new URL(route.request().url()).searchParams.get('timeframe');
    return tf === '1D' ? route.fulfill({ json: { symbol: 'AAPL', timeframe: '1D', asOf, fetchedAt: asOf, points: [{ price: 101, timestamp: Date.parse(asOf), date: asOf, label: asOf }], startPrice: 100, currentPrice: 101, change: 1, changePercent: 1, high: 101, low: 101 } }) : route.fulfill({ status: 502, json: { error: 'Unavailable' } });
  });
  await page.route('**/api/price-activity?**', route => route.fulfill({ status: 502, json: { error: 'Unavailable' } }));
  await page.goto('/board?symbol=AAPL');
  const card = board.chart('AAPL').card;
  await expect(card).not.toContainText('Historical samples through');
  await expect(card).toContainText('$101.00');
  await expect(board.metric('AAPL', 'volume')).toContainText('0');
  await expect(board.metric('AAPL', 'previous-close')).toContainText('$999.00');
  await board.chart('AAPL').timeframe('1Y').click();
  await expect(card).toContainText('Historical data unavailable');
  await expect(card).not.toContainText('$101.00');
  expect(errors).toEqual([]);
});

test('quote refresh failure preserves the price with an explicit stale label', async ({ page }) => {
  const board = new TheBoardPage(page);
  let fail = false; let price = 101;
  const asOf = '2026-07-01T16:00:00.000Z';
  await page.route('https://supabase.example.invalid/**', route => route.fulfill({ json: [{ symbol: 'AAPL' }] }));
  await page.route('**/api/quotes?**', route => fail ? route.fulfill({ status: 502, json: { error: 'Unavailable' } }) : route.fulfill({ json: { quotes: [{ symbol: 'AAPL', price, change: 1, changePercent: 1, prevClose: 100, open: null, dayHigh: null, dayLow: null, volume: 0, asOf, fetchedAt: asOf, currency: 'USD', assetType: 'Stock', sparkline: [] }] } }));
  await page.goto('/board');
  const row = board.assetRow('AAPL');
  await expect(row).toHaveAttribute('data-market-status', 'available');
  await expect(row).not.toContainText('As of');
  await expect(row).toContainText('$101.00');
  fail = true;
  await board.refreshButton.click();
  await expect(row).toHaveAttribute('data-market-status', 'stale');
  await expect(page.getByText('Market update failed. Previous observations are stale; assets without data remain unavailable.')).toBeVisible();
  await expect(row).toContainText('$101.00');
  fail = false; price = 102;
  await board.refreshButton.click();
  await expect(row).toHaveAttribute('data-market-status', 'available');
  await expect(row).toContainText('$102.00');
  await expect(page.getByText('Market update failed. Previous observations are stale; assets without data remain unavailable.')).toHaveCount(0);
});

test('six compact metrics work for a searched asset without registration', async ({ page, isMobile }) => {
  const board = new TheBoardPage(page);
  const now=new Date().toISOString(); const requests: string[]=[];
  await page.route('https://supabase.example.invalid/**', route=>route.fulfill({json:[{symbol:'AAPL'}]}));
  await page.route('**/api/quotes?**', route=>{
    const symbols=new URL(route.request().url()).searchParams.get('symbols')!.split(',');
    return route.fulfill({json:{quotes:symbols.map(symbol=>({symbol,name:symbol,assetType:'Stock',currency:'USD',price:1234.56,prevClose:1234.56,change:10,changePercent:10,dayLow:9999,dayHigh:123456,fiftyTwoWeekLow:1234,fiftyTwoWeekHigh:999999,volume:0,sparkline:[],asOf:now,fetchedAt:now}))}});
  });
  await page.route('**/api/candles?**',route=>route.fulfill({status:502,json:{error:'Unavailable'}}));
  await page.route('**/api/price-activity?**',route=>{
    const symbol=new URL(route.request().url()).searchParams.get('symbol')!;requests.push(symbol);
    return route.fulfill({json:{symbol,month:{changePercent:0,baselineDate:now},year:{changePercent:25,baselineDate:now},asOf:now,fetchedAt:now,stale:false}});
  });
  await page.goto('/board');
  await board.searchAsset('ZZTEST');
  const row=board.assetRow('ZZTEST');await expect(row).toBeVisible();
  await expect(row.getByTitle('$1,234.56').filter({visible:true})).toHaveText('$1,234.56');
  if (!isMobile) {
    await expect(row.getByTitle('$999,999.00')).toHaveText('$1M');
    const low = await row.getByTitle('$1,234.00').boundingBox(), high = await row.getByTitle('$999,999.00').boundingBox();
    expect(low!.x + low!.width).toBeLessThanOrEqual(high!.x);
  }
  await row.click();
  await expect(board.metric('ZZTEST', 'day-range')).toContainText('$9,999');
  await expect(board.metric('ZZTEST', '52w-range')).toContainText('$1M');
  await expect(board.metric('ZZTEST', 'previous-close')).toContainText('$1,234.56');
  await expect(board.metric('ZZTEST', 'previous-close')).toHaveAttribute('title', 'Previous close: $1,234.56');
  const geometry = await board.metricGeometry('ZZTEST');
  expect(geometry.every(cell => cell.fits)).toBe(true);
  for (const [index, cell] of geometry.entries()) for (const other of geometry.slice(index + 1)) {
    expect(cell.right <= other.left || other.right <= cell.left || cell.bottom <= other.top || other.bottom <= cell.top).toBe(true);
  }
  await expect(board.metric('ZZTEST', 'volume')).toContainText('0');
  await expect(board.metric('ZZTEST', '1m-change')).toContainText('0.00%');
  await expect(board.metric('ZZTEST', '1y-change')).toContainText('+25.00%');
  await row.click();await expect(board.chart('ZZTEST').card).toHaveCount(0);await row.click();
  await expect(board.metric('ZZTEST', '1y-change')).toContainText('+25.00%');
  expect(requests.filter(s=>s==='ZZTEST')).toHaveLength(1);
});

test('a partial batch is described as a partial update rather than a lost connection', async ({ page }) => {
  const board = new TheBoardPage(page);
  const asOf = new Date().toISOString();
  await page.route('https://supabase.example.invalid/**', r => r.fulfill({ json: [{ symbol: 'AAPL' }, { symbol: 'MSFT' }] }));
  await page.route('**/api/quotes?**', r => r.fulfill({ json: { quotes: [{ symbol: 'AAPL', price: 101, change: 1, changePercent: 1, prevClose: 100, open: null, dayHigh: null, dayLow: null, volume: 0, asOf, fetchedAt: asOf, currency: 'USD', assetType: 'Stock', sparkline: [] }], unavailable: ['MSFT'], status: 'partial' } }));
  await page.goto('/board');
  await expect(board.assetRow('AAPL')).toHaveAttribute('data-market-status', 'available');
  await expect(board.assetRow('MSFT')).toHaveAttribute('data-market-status', 'unavailable');
  await expect(page.locator('#board-offline-alert')).toContainText('Partial Market Update:');
  await expect(page.locator('#board-offline-alert')).not.toContainText('Connection Interrupted');
});
