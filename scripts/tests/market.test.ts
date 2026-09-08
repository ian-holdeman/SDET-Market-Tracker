import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import { marketRouter, validateChart, normalizeQuote, normalizeCandles, providerSymbol, changeFrom } from '../../server/market';
import { applyQuote, emptyStock, fixed, priceLabel, fullPriceLabel, rangePriceLabel } from '../../src/utils/marketValues';
const now = Date.parse('2026-07-01T16:00:00Z');
function fixture(symbol = 'SPY') {
  return { chart: { error: null, result: [{ meta: { symbol, instrumentType: 'ETF', currency: 'USD', regularMarketPrice: 110, regularMarketTime: now / 1000 - 60, previousClose: 100, regularMarketVolume: 0 }, timestamp: [now / 1000 - 600, now / 1000 - 300], indicators: { quote: [{ close: [101, 105], volume: [0, 10] }] } }] } };
}
test('identity aliases distinguish Nasdaq indices and crypto; ETF is not a bond yield', () => {
  assert.equal(providerSymbol('NDX'), '^NDX'); assert.equal(providerSymbol('COMP'), '^IXIC'); assert.equal(providerSymbol('XRP'), 'XRP-USD');
  assert.equal(normalizeQuote(validateChart(fixture('AGG'), 'AGG', now), 'AGG', {}, now).assetType, 'ETF');
});
test('reject malformed provider identity, envelope, numeric data and time ordering', () => {
  for (const mutate of [
    (b: any) => b.chart.error = { description: 'bad' },
    (b: any) => b.chart.result[0].meta.symbol = 'OTHER',
    (b: any) => b.chart.result[0].indicators.quote[0].close = [101],
    (b: any) => b.chart.result[0].indicators.quote[0].close[0] = '101',
    (b: any) => b.chart.result[0].indicators.quote[0].close[0] = Infinity,
    (b: any) => b.chart.result[0].timestamp.reverse(),
    (b: any) => b.chart.result[0].timestamp[1] = now / 1000 + 120,
  ]) { const body = fixture(); mutate(body); assert.throws(() => validateChart(body, 'SPY', now)); }
});
test('zero, negative and small numbers survive; missing data is not zero or an estimated metric', () => {
  const c = validateChart(fixture(), 'SPY', now); c.meta.regularMarketPrice = 0;
  const q = normalizeQuote(c, 'SPY', { trailingPE: -3, dividendYield: 0 }, now);
  assert.equal(q.price, 0); assert.equal(q.volume, 0); assert.equal(q.dividendYield, 0); assert.equal(q.peRatio, -3);
  assert.equal(q.open, null); assert.equal(q.fiftyTwoWeekHigh, null); assert.equal(q.targetPrice1Y, null); assert.equal(q.changePercent, -100);
  c.indicators.quote[0].close = [-.00001234, 0];
  const candles = normalizeCandles(c, 'SPY', '1M', now);
  assert.equal(candles.points[0].price, -.00001234); assert.equal(candles.points[0].volume, 0);
  assert.equal(candles.changePercent, null); // Negative baseline: undefined conventional return.
  assert.equal(priceLabel(1234.56, 'USD'), '$1,234.56');
  assert.equal(priceLabel(9999.99, 'USD'), '$9,999.99');
  assert.equal(rangePriceLabel(1234.56, 'USD'), '$1,235');
  assert.equal(priceLabel(1234.56, 'USD', 'Index'), '$1,234.56');
  assert.equal(priceLabel(12345.67, 'USD'), '$12.3K');
  assert.equal(priceLabel(999999, 'USD'), '$1M');
  assert.equal(priceLabel(-12345.67, 'USD'), '-$12.3K');
  assert.equal(priceLabel(12345.67, 'GBP'), '£12.3K');
  assert.equal(priceLabel(12345.67, 'USD', 'Index'), '$12.3K');
  assert.equal(priceLabel(4.25, null, 'Bond Yield'), '4.25%');
  assert.equal(priceLabel(0.000123, 'USD'), '$0.000123');
  assert.equal(priceLabel(Infinity, 'USD'), '—');
  assert.equal(fullPriceLabel(12345.67, 'USD'), '$12,345.67');
  assert.equal(fixed(null), '—'); assert.equal(priceLabel(0, 'USD'), '$0.00'); assert.equal(priceLabel(12, 'GBP'), '£12.00');
});
test('returns use the appropriate baseline and never replace historical candles with current quotes', () => {
  const c = validateChart(fixture(), 'SPY', now);
  const snapshot = structuredClone(c);
  const daily = normalizeCandles(c, 'SPY', '1D', now), year = normalizeCandles(c, 'SPY', '1Y', now);
  assert.equal(daily.changePercent, 5); assert.equal(year.startPrice, 101); assert.equal(year.currentPrice, 105);
  assert.equal(year.changePercent, 4 / 101 * 100); assert.equal(year.high, 105);
  assert.deepEqual(changeFrom(20, 0), { change: 20, changePercent: null });
  assert.deepEqual(changeFrom(20, null), { change: null, changePercent: null });
  assert.deepEqual(c, snapshot);
});
test('initial catalog contains no prices and new observations clear old optional values', () => {
  const initial = emptyStock('SPY'); assert.equal(initial.price, null); assert.deepEqual(initial.sparkline, []);
  const updated = applyQuote({ ...initial, peRatio: 15, expenseRatio: .03 }, { price: 0, symbol: 'SPY', asOf: new Date(now).toISOString() });
  assert.equal(updated.peRatio, null); assert.equal(updated.expenseRatio, null); assert.equal(updated.price, 0);
});
async function withRouter(run: (url: string, state: { fail: boolean; time: number }) => Promise<void>) {
  const state = { fail: false, time: now };
  const provider: typeof fetch = async (input) => {
    const url = new URL(String(input));
    if (state.fail || url.pathname.includes('/v7/')) return new Response('{}', { status: 503 });
    if (url.pathname.includes('search')) return Response.json({ quotes: [] });
    const symbol = decodeURIComponent(url.pathname.split('/').at(-1)!);
    return symbol === 'BAD' ? Response.json({ chart: { error: { code: 'Not Found' } } }) : Response.json(fixture(symbol));
  };
  const app = express(); app.use(marketRouter(provider, () => state.time));
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
  try { await run(`http://127.0.0.1:${(server.address() as any).port}`, state); }
  finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
}
test('HTTP failures, partial batches, cache age and bad input are explicit', async () => {
  await withRouter(async (url, state) => {
    assert.equal((await fetch(url + '/api/quotes?symbols=bad/path')).status, 400);
    assert.equal((await fetch(url + '/api/candles?symbol=SPY&timeframe=INVALID')).status, 400);
    const partial = await (await fetch(url + '/api/quotes?symbols=SPY,BAD')).json();
    assert.equal(partial.status, 'partial'); assert.deepEqual(partial.unavailable, ['BAD']);
    const first = partial.quotes[0]; state.time += 1000;
    const cached = await (await fetch(url + '/api/quotes?symbols=SPY')).json();
    assert.equal(cached.quotes[0].fetchedAt, first.fetchedAt); assert.equal(cached.quotes[0].asOf, first.asOf);
    state.fail = true; state.time += 16000;
    assert.equal((await fetch(url + '/api/quotes?symbols=SPY')).status, 502);
    assert.equal((await fetch(url + '/api/candles?symbol=SPY')).status, 502);
    assert.equal((await fetch(url + '/api/search?q=SPY')).status, 502);
  });
});

test('client cache preserves observation time and explicitly labels failed refreshes stale', async () => {
  const { fetchProxyCandles } = await import('../../src/services/yahooMarket');
  const realFetch = globalThis.fetch, realNow = Date.now;
  let time = now, fail = false;
  try {
    Date.now = () => time;
    globalThis.fetch = async () => fail ? new Response('{}', { status: 502 }) : Response.json(normalizeCandles(validateChart(fixture(), 'SPY', now), 'SPY', '1D', now));
    const first = await fetchProxyCandles('SPY', '1D');
    assert.equal(first?.stale, false);
    time += 31000; fail = true;
    const stale = await fetchProxyCandles('SPY', '1D');
    assert.equal(stale?.stale, true); assert.equal(stale?.asOf, first?.asOf); assert.deepEqual(stale?.points, first?.points);
    assert.equal(first?.stale, false); // Error metadata must not mutate the cached successful response.
    assert.equal(await fetchProxyCandles('SPY', '1Y'), null); // Never substitute daily history for a failed annual request.
  } finally { globalThis.fetch = realFetch; Date.now = realNow; }
});
