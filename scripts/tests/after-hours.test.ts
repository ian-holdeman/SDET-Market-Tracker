import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import { marketRouter, validateQuoteResponse } from '../../server/market';
import { applyQuote, emptyStock } from '../../src/utils/marketValues';

const regularStart = Date.parse('2026-11-06T14:30:00Z') / 1000;
const regularEnd = Date.parse('2026-11-06T21:00:00Z') / 1000;
const postEnd = Date.parse('2026-11-07T01:00:00Z') / 1000;
const observed = Date.parse('2026-11-07T00:55:00Z') / 1000;
const now = Date.parse('2026-11-07T00:56:00Z');
function fixture() {
  return { chart: { result: [{ meta: {
    symbol: 'AAPL', instrumentType: 'EQUITY', currency: 'USD', regularMarketPrice: 110,
    regularMarketTime: regularEnd + 1, previousClose: 100,
    currentTradingPeriod: { regular: { start: regularStart, end: regularEnd }, post: { start: regularEnd, end: postEnd } },
  }, timestamp: [regularEnd - 300, observed, observed + 30], indicators: { quote: [{ close: [109, 112, null] }] } }] } };
}
const afterHours = { price: 112, asOf: new Date(observed * 1000).toISOString() };

test('regular quotes carry a separate latest daily after-hours sample, including retained closed sessions', () => {
  const body = fixture(), original = structuredClone(body);
  const quote = validateQuoteResponse(body, 'AAPL', now);
  assert.deepEqual(quote.afterHours, afterHours);
  assert.equal(quote.price, 110); assert.equal(quote.changePercent, 10);
  assert.equal(quote.asOf, new Date((regularEnd + 1) * 1000).toISOString());
  assert.deepEqual(body, original, 'Optional observation must not rewrite source candles');
  assert.deepEqual(validateQuoteResponse(body, 'AAPL', now + 2 * 86400000).afterHours, afterHours, 'A closed weekend retains the dated last after-hours observation');
  body.chart.result[0].meta.instrumentType = 'ETF';
  assert.deepEqual(validateQuoteResponse(body, 'AAPL', now).afterHours, afterHours);
});

test('ambiguous, invalid, non-post and different-session candles cannot become after-hours quotes', () => {
  const cases: Array<(body: any) => void> = [
    b => delete b.chart.result[0].timestamp,
    b => b.chart.result[0].timestamp.reverse(),
    b => b.chart.result[0].indicators.quote[0].close = [109, 112],
    b => b.chart.result[0].indicators.quote[0].close[1] = '112',
    b => b.chart.result[0].indicators.quote[0].close[1] = Infinity,
    b => { b.chart.result[0].timestamp[1] = now / 1000 + 1; b.chart.result[0].timestamp[2] = now / 1000 + 2; },
    b => b.chart.result[0].meta.currentTradingPeriod.post.start += 1,
    b => b.chart.result[0].meta.currentTradingPeriod.post.end = regularEnd,
    b => b.chart.result[0].meta.currentTradingPeriod.post.end = Infinity,
    b => b.chart.result[0].meta.currentTradingPeriod.regular.start = regularEnd,
    b => b.chart.result[0].meta.currentTradingPeriod.regular.end = regularEnd + 300,
    b => b.chart.result[0].meta.currentTradingPeriod.post.end += 3 * 86400,
    b => { for (const p of Object.values(b.chart.result[0].meta.currentTradingPeriod) as any[]) { p.start += 86400; p.end += 86400; } },
    b => b.chart.result[0].meta.regularMarketTime = regularStart - 86400,
    b => b.chart.result[0].meta.regularMarketTime = regularEnd + 120,
    b => { b.chart.result[0].timestamp = [regularEnd - 600, regularEnd - 300]; b.chart.result[0].indicators.quote[0].close = [109, 110]; },
    b => { b.chart.result[0].timestamp = [regularEnd - 300, postEnd]; b.chart.result[0].indicators.quote[0].close = [109, 112]; },
    b => b.chart.result[0].meta.instrumentType = 'CRYPTOCURRENCY',
    b => b.chart.result[0].meta.instrumentType = 'INDEX',
    b => b.chart.result[0].meta.instrumentType = 'FUTURE',
    b => b.chart.result[0].meta.instrumentType = 'MUTUALFUND',
  ];
  for (const mutate of cases) {
    const body = fixture(); mutate(body);
    const quote = validateQuoteResponse(body, 'AAPL', now);
    assert.equal(quote.price, 110, 'Optional daily sample failure preserves the valid regular quote');
    assert.equal(quote.afterHours, null, String(mutate));
  }
  const wrong = fixture(); wrong.chart.result[0].meta.symbol = 'OTHER';
  assert.throws(() => validateQuoteResponse(wrong, 'AAPL', now), /symbol mismatch/);
});

test('new quotes clear missing or malformed after-hours values while older responses preserve known data', () => {
  const quote = { symbol: 'AAPL', price: 110, assetType: 'Stock', asOf: new Date((regularEnd + 1) * 1000).toISOString(), fetchedAt: new Date(now).toISOString(), afterHours };
  const stock = applyQuote(emptyStock('AAPL'), quote);
  assert.deepEqual(stock.afterHours, afterHours);
  const newer = { ...quote, fetchedAt: new Date(now + 1000).toISOString() };
  for (const invalid of [undefined, null, { price: NaN, asOf: afterHours.asOf }, { price: 112, asOf: 'invalid' }, { price: 112, asOf: quote.asOf }, { price: 112, asOf: new Date(now + 2000).toISOString() }])
    assert.equal(applyQuote(stock, { ...newer, afterHours: invalid }).afterHours, null);
  assert.deepEqual(applyQuote(stock, { ...quote, fetchedAt: new Date(now - 1000).toISOString(), afterHours: null }).afterHours, afterHours);
});

test('after-hours quotes use the existing daily provider request and retain timestamps in the quote cache', async () => {
  const paths: string[] = [];
  const server = express().use(marketRouter(async input => { paths.push(String(input)); return Response.json(fixture()); }, () => now)).listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  try {
    const origin = `http://127.0.0.1:${(server.address() as any).port}`;
    const first = await (await fetch(`${origin}/api/quotes?symbols=AAPL`)).json();
    assert.deepEqual(first.quotes[0].afterHours, afterHours);
    assert.deepEqual((await (await fetch(`${origin}/api/quotes?symbols=AAPL`)).json()).quotes[0].afterHours, afterHours);
    assert.equal(paths.length, 1);
    const request = new URL(paths[0]);
    assert.equal(request.searchParams.get('range'), '1d'); assert.equal(request.searchParams.get('interval'), '5m'); assert.equal(request.searchParams.get('includePrePost'), 'true');
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});


test('equal regular observations retain the later known after-hours sample across provider lag', () => {
  const quote = { symbol: 'AAPL', price: 110, assetType: 'Stock', asOf: new Date((regularEnd + 1) * 1000).toISOString(), fetchedAt: new Date(now).toISOString(), afterHours };
  const stock = applyQuote(emptyStock('AAPL'), quote);
  const lagging = { ...quote, fetchedAt: new Date(now + 1000).toISOString(), afterHours: { price: 111, asOf: new Date((observed - 300) * 1000).toISOString() } };
  assert.deepEqual(applyQuote(stock, lagging).afterHours, afterHours, 'A more recent retrieval cannot make an older post-session sample current');
  assert.equal(applyQuote(stock, { ...lagging, afterHours: null }).afterHours, null, 'Explicit absence still clears the optional observation');
  assert.equal(applyQuote(stock, { ...lagging, afterHours: { price: NaN, asOf: afterHours.asOf } }).afterHours, null);
  assert.equal(applyQuote(stock, { ...lagging, asOf: new Date(now + 1000).toISOString() }).afterHours, null, 'A new regular session cannot retain the preceding after-hours sample');
});
