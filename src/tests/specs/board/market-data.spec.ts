import { test, expect } from '@playwright/test';

test('failed market requests show unavailable data, not seeded prices or synthetic history', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.route('https://supabase.example.invalid/**', route => route.fulfill({ json: [{ symbol: 'AAPL' }] }));
  await page.route('**/api/quotes?**', route => route.fulfill({ status: 502, json: { error: 'Unavailable' } }));
  await page.route('**/api/candles?**', route => route.fulfill({ status: 502, json: { error: 'Unavailable' } }));
  await page.route('**/api/price-activity?**', route => route.fulfill({ status: 502, json: { error: 'Unavailable' } }));
  await page.goto('/board?symbol=AAPL');
  const row = page.locator('#board-row-aapl');
  await expect(row).toHaveAttribute('data-market-status', 'unavailable');
  const card = page.locator('#drilldown-card-aapl');
  await expect(card).toContainText('Historical data unavailable for this period.');
  await expect(card.locator('#card-previous-close-aapl')).toContainText('—');
  await expect(card.locator('#card-volume-aapl')).toContainText('—');
  await expect(card.locator('#live-trading-beacon-aapl')).toHaveCount(0);
  await card.locator('#btn-timeframe-aapl-1y').click();
  await expect(card).toContainText('Historical data unavailable for this period.');
  expect(errors).toEqual([]);
});

test('a one-point chart stays historical; switching to failed history clears it', async ({ page }) => {
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
  const card = page.locator('#drilldown-card-aapl');
  await expect(card).not.toContainText('Historical samples through');
  await expect(card).toContainText('$101.00');
  await expect(card.locator('#card-volume-aapl')).toContainText('0');
  await expect(card.locator('#card-previous-close-aapl')).toContainText('$999.00');
  await card.locator('#btn-timeframe-aapl-1y').click();
  await expect(card).toContainText('Historical data unavailable');
  await expect(card).not.toContainText('$101.00');
  expect(errors).toEqual([]);
});

test('quote refresh failure preserves the price with an explicit stale label', async ({ page }) => {
  let fail = false;
  const asOf = '2026-07-01T16:00:00.000Z';
  await page.route('https://supabase.example.invalid/**', route => route.fulfill({ json: [{ symbol: 'AAPL' }] }));
  await page.route('**/api/quotes?**', route => fail ? route.fulfill({ status: 502, json: { error: 'Unavailable' } }) : route.fulfill({ json: { quotes: [{ symbol: 'AAPL', price: 101, change: 1, changePercent: 1, prevClose: 100, open: null, dayHigh: null, dayLow: null, volume: 0, asOf, fetchedAt: asOf, currency: 'USD', assetType: 'Stock', sparkline: [] }] } }));
  await page.goto('/board');
  const row = page.locator('#board-row-aapl');
  await expect(row).toHaveAttribute('data-market-status', 'available');
  await expect(row).not.toContainText('As of');
  await expect(row).toContainText('$101.00');
  fail = true;
  await page.locator('#board-refresh-btn').click();
  await expect(row).toHaveAttribute('data-market-status', 'stale');
  await expect(page.getByText('Market update failed. Previous observations are stale; assets without data remain unavailable.')).toBeVisible();
  await expect(row).toContainText('$101.00');
});

test('six compact metrics work for a searched asset without registration', async ({ page, isMobile }) => {
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
  if(isMobile) await page.getByRole('button',{name:'Search market assets',exact:true}).click();
  await page.getByRole('textbox',{name:'Search market assets'}).fill('ZZTEST');
  const row=page.locator('#board-row-zztest');await expect(row).toBeVisible();
  await expect(row.getByTitle('$1,234.56').filter({visible:true})).toHaveText('$1,234.56');
  if (!isMobile) {
    await expect(row.getByTitle('$999,999.00')).toHaveText('$1M');
    const overlaps = await row.getByTitle('$999,999.00').evaluate(high => {
      const grid = high.closest('.grid')!;
      const children = [...grid.children].map(e => e.getBoundingClientRect());
      return children.some((box, i) => i > 0 && box.left < children[i - 1].right);
    });
    expect(overlaps).toBe(false);
  }
  await row.click();
  const grid=page.locator('#price-activity-zztest');await expect(grid.locator(':scope > div')).toHaveCount(6);
  await expect(grid.locator('#card-previous-close-zztest')).toContainText('$1,234.56');
  await expect(grid.locator('#card-previous-close-zztest')).toHaveAttribute('title', 'Previous close: $1,234.56');
  const overflow = await grid.locator(':scope > div').evaluateAll(cards => cards.some(card => card.scrollWidth > card.clientWidth || [...card.querySelectorAll('span')].some(child => child.getBoundingClientRect().right > card.getBoundingClientRect().right + 1)));
  expect(overflow).toBe(false);
  await expect(grid.locator('#card-volume-zztest')).toContainText('0');
  await expect(grid.locator('#card-1m-change-zztest')).toContainText('0.00%');
  await expect(grid.locator('#card-1y-change-zztest')).toContainText('+25.00%');
  await expect(grid).not.toContainText('P/E');await expect(grid).not.toContainText('Target');
  const columns=await grid.evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length);
  expect(columns).toBe(isMobile?2:6);
  await row.click();await expect(grid).toHaveCount(0);await row.click();
  await expect(page.locator('#card-1y-change-zztest')).toContainText('+25.00%');
  expect(requests.filter(s=>s==='ZZTEST')).toHaveLength(1);
});

test('a partial batch is described as a partial update rather than a lost connection', async ({ page }) => {
  const asOf = new Date().toISOString();
  await page.route('https://supabase.example.invalid/**', r => r.fulfill({ json: [{ symbol: 'AAPL' }, { symbol: 'MSFT' }] }));
  await page.route('**/api/quotes?**', r => r.fulfill({ json: { quotes: [{ symbol: 'AAPL', price: 101, change: 1, changePercent: 1, prevClose: 100, open: null, dayHigh: null, dayLow: null, volume: 0, asOf, fetchedAt: asOf, currency: 'USD', assetType: 'Stock', sparkline: [] }], unavailable: ['MSFT'], status: 'partial' } }));
  await page.goto('/board');
  await expect(page.locator('#board-row-aapl')).toHaveAttribute('data-market-status', 'available');
  await expect(page.locator('#board-row-msft')).toHaveAttribute('data-market-status', 'unavailable');
  await expect(page.locator('#board-offline-alert')).toContainText('Partial Market Update:');
  await expect(page.locator('#board-offline-alert')).not.toContainText('Connection Interrupted');
});
