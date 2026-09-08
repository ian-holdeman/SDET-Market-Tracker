import type { Route } from '@playwright/test';
import type { ProxyQuoteItem } from '../../services/yahooMarket';

// Synthetic market observations for recordings only. Never used by application code.
const observed = '2026-09-04T20:00:00.000Z';
export async function fulfillShowcaseMarket(route: Route): Promise<boolean> {
  const url = new URL(route.request().url());
  if (url.origin !== 'http://127.0.0.1:3100') return false;
  const fetchedAt = new Date().toISOString();
  const baseline = (symbol: string) => symbol === 'AAPL' ? 200 : symbol === 'MSFT' ? 400 : 100;
  const prices = (symbol: string) => [0, 0.3, 0.1, 0.7, 0.4, 0.9, 0.6, 1].map(delta => baseline(symbol) + delta * 2);
  if (url.pathname === '/api/quotes') {
    const quotes: ProxyQuoteItem[] = (url.searchParams.get('symbols') || '').split(',').filter(Boolean).map(symbol => ({
      symbol, price: baseline(symbol) + 2, prevClose: baseline(symbol), change: 2,
      changePercent: 2 / baseline(symbol) * 100, open: baseline(symbol), dayLow: baseline(symbol), dayHigh: baseline(symbol) + 2,
      volume: 12000000, fiftyTwoWeekLow: baseline(symbol) * 0.8, fiftyTwoWeekHigh: baseline(symbol) * 1.2,
      currency: 'USD', asOf: observed, fetchedAt, sparkline: prices(symbol),
    }));
    await route.fulfill({ json: { quotes } }); return true;
  }
  const symbol = url.searchParams.get('symbol') || 'AAPL';
  if (url.pathname === '/api/candles') {
    const points = prices(symbol).map((price, index) => {
      const timestamp = Date.parse(observed) / 1000 - (7 - index) * 1800;
      const date = new Date(timestamp * 1000).toISOString();
      return { price, timestamp, date, label: date };
    });
    await route.fulfill({ json: { symbol, timeframe: url.searchParams.get('timeframe'), asOf: observed, fetchedAt,
      points, startPrice: baseline(symbol), currentPrice: baseline(symbol) + 2, change: 2,
      changePercent: 2 / baseline(symbol) * 100, high: baseline(symbol) + 2, low: baseline(symbol),
      previousClose: baseline(symbol), source: 'synthetic recording fixture' } }); return true;
  }
  if (url.pathname === '/api/price-activity') {
    await route.fulfill({ json: { symbol, asOf: observed, fetchedAt, stale: false,
      month: { changePercent: 2, baselineDate: '2026-08-04' }, year: { changePercent: 12, baselineDate: '2025-09-04' } } }); return true;
  }
  return false;
}
