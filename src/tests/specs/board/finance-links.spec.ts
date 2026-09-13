import { test, expect } from '../../fixtures/showcase-test';
import { TheBoardPage } from '../../pages/the-board.page';

for (const [symbol, exchangeName, venue] of [['MDB', 'NGM', 'NASDAQ'], ['SPY', 'PCX', 'NYSEARCA']]) {
  test(`${symbol} links to its provider venue and falls back safely when that venue is missing`, async ({ page }, testInfo) => {
    let exchange: string | null = exchangeName;
    await page.route('https://supabase.example.invalid/**', route => route.fulfill({ json: [{ symbol }] }));
    await page.route('**/api/quotes?**', route => {
      const now = new Date().toISOString();
      return route.fulfill({ json: { quotes: [{ symbol, name: symbol === 'MDB' ? 'MongoDB, Inc.' : 'SPDR S&P 500 ETF', assetType: symbol === 'MDB' ? 'Stock' : 'ETF',
        price: 100, prevClose: 99, change: 1, changePercent: 1, currency: 'USD', exchangeName: exchange, asOf: now, fetchedAt: now, sparkline: [] }] } });
    });
    await page.route('**/api/candles?**', route => route.fulfill({ status: 502, json: { error: 'Unavailable' } }));
    await page.route('**/api/price-activity?**', route => route.fulfill({ status: 502, json: { error: 'Unavailable' } }));
    const board = new TheBoardPage(page), chart = board.chart(symbol);
    await page.goto(`/board?symbol=${symbol}`);
    await expect(chart.financeLink).toHaveAttribute('href', `https://www.google.com/finance/quote/${symbol}:${venue}`);
    await expect(chart.financeLink).toHaveAttribute('target', '_blank');
    await chart.financeLink.focus();
    await expect(chart.financeLink).toBeFocused();
    await page.screenshot({ path: testInfo.outputPath('finance-link.png') });
    exchange = null;
    await board.refreshButton.click();
    await expect(chart.financeLink).toHaveText('Google Finance search');
    const fallback = new URL((await chart.financeLink.getAttribute('href'))!);
    expect(fallback.origin + fallback.pathname).toBe('https://www.google.com/search');
    expect(fallback.searchParams.get('q')).toContain(symbol);
    expect(fallback.searchParams.get('q')).toContain('site:google.com/finance/quote');
  });
}

for (const query of ['MDB', 'MongoDB, Inc.']) {
  test(`newly searched asset resolves its quote venue via ${query}`, async ({ page }) => {
    const mutations: string[] = [];
    page.on('request', request => {
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) mutations.push(request.url());
    });
    await page.route('https://supabase.example.invalid/**', route => route.fulfill({ json: [{ symbol: 'AAPL' }] }));
    await page.route('**/api/quotes?**', route => {
      const symbol = new URL(route.request().url()).searchParams.get('symbols')!;
      const now = new Date().toISOString();
      return route.fulfill({ json: { quotes: [{ symbol, name: symbol === 'MDB' ? 'MongoDB, Inc.' : 'Apple', assetType: 'Stock', exchangeName: 'NGM',
        price: 100, prevClose: 99, change: 1, changePercent: 1, currency: 'USD', asOf: now, fetchedAt: now, sparkline: [] }] } });
    });
    await page.route('**/api/search?**', route => route.fulfill({ json: { results: [{ symbol: 'MDB', name: 'MongoDB, Inc.', exchange: 'NasdaqGS', assetType: 'Stock' }] } }));
    await page.route('**/api/candles?**', route => route.fulfill({ status: 502, json: { error: 'Unavailable' } }));
    await page.route('**/api/price-activity?**', route => route.fulfill({ status: 502, json: { error: 'Unavailable' } }));
    const board = new TheBoardPage(page);
    await page.goto('/board');
    await expect(board.assetRow('AAPL')).toBeVisible();
    await board.searchAsset(query);
    await board.assetRow('MDB').click();
    await expect(board.chart('MDB').financeLink).toHaveAttribute('href', 'https://www.google.com/finance/quote/MDB:NASDAQ');
    expect(mutations).toEqual([]);
  });
}

