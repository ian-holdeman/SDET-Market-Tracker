import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { priceActivity, marketRouter } from '../../server/market';
function history(samples: [string, number | null][]) {
  return { meta: { symbol: 'NEW' }, timestamp: samples.map(([d]) => Date.parse(d) / 1000), indicators: { quote: [{ close: samples.map(([,p]) => p) }] } };
}
test('calendar month clamps month-end and uses the last available close before a weekend', () => {
  const value = priceActivity(history([['2023-03-31', 50], ['2024-02-28', 80], ['2024-02-29', 100], ['2024-03-29', 110], ['2024-03-31', 120]]), 'NEW');
  assert.equal(value.month.changePercent, 20);
  assert.equal(value.year.changePercent, 140);
  const weekend = priceActivity(history([['2024-03-29', 100], ['2024-04-30', 110]]), 'NEW');
  assert.equal(weekend.month.changePercent, 10);
});
test('leap-day anniversary, null slots, zero prices and unavailable full-period history', () => {
  const c = history([['2023-02-28', 100], ['2024-01-29', 50], ['2024-02-28', null], ['2024-02-29', 0]]);
  const before = structuredClone(c), result = priceActivity(c, 'NEW');
  assert.equal(result.year.changePercent, -100); assert.equal(result.month.changePercent, -100); assert.deepEqual(c, before);
  assert.equal(priceActivity(history([['2024-02-20', 10], ['2024-02-29', 11]]), 'NEW').year.changePercent, null);
  assert.equal(priceActivity(history([['2024-01-01', 10], ['2024-02-29', 11]]), 'NEW').month.changePercent, null);
  assert.equal(priceActivity(history([['2024-01-29', 0], ['2024-02-29', 11]]), 'NEW').month.changePercent, null);
  assert.throws(() => priceActivity(history([['2024-01-29', null]]), 'NEW'));
});
test('uncurated symbol history is read-only, deduplicated, cached, and fails closed after expiry', async () => {
  let calls = 0, failed = false, time = Date.parse('2024-03-01');
  const provider: typeof fetch = async input => {
    calls++; const url = new URL(String(input));
    assert.equal(url.searchParams.get('range'), '2y'); assert.equal(url.searchParams.get('interval'), '1d');
    assert.equal(url.searchParams.get('includePrePost'), 'false');
    if (failed) return new Response('{}', { status: 503 });
    return Response.json({ chart: { result: [history([['2023-02-28', 50], ['2024-01-29', 100], ['2024-02-29', 110]])], error: null } });
  };
  const app = express(); app.use(marketRouter(provider, () => time));
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
  const url = `http://127.0.0.1:${(server.address() as any).port}/api/price-activity?symbol=`;
  try {
    const [a,b] = await Promise.all([fetch(url+'NEW').then(r=>r.json()),fetch(url+'NEW').then(r=>r.json())]);
    assert.equal(a.month.changePercent, 10); assert.deepEqual(a,b); assert.equal(calls,1);
    time += 1000; assert.deepEqual(await (await fetch(url+'NEW')).json(),a); assert.equal(calls,1);
    assert.equal((await fetch(url+'bad/path')).status,400);
    time += 300000; failed = true; assert.equal((await fetch(url+'NEW')).status,502);
  } finally { server.closeAllConnections(); await new Promise<void>(resolve=>server.close(()=>resolve())); }
});
test('browser history client retains stale results and distinguishes searched symbols', async () => {
  const { fetchPriceActivity } = await import('../../src/services/yahooMarket');
  const originalFetch = globalThis.fetch, originalNow = Date.now;
  let time = Date.parse('2024-03-01'), failed = false, count=0;
  Date.now = () => time;
  globalThis.fetch = async input => { count++; const symbol=new URL(String(input),'http://localhost').searchParams.get('symbol')!;
    return failed ? new Response('{}',{status:502}) : Response.json(priceActivity(history([['2023-02-28', 50],['2024-01-29',100],['2024-02-29',110]]),symbol,time)); };
  try {
    const first=await fetchPriceActivity('TEST'); await fetchPriceActivity('TEST'); assert.equal(count,1);
    assert.equal((await fetchPriceActivity('SEARCHED'))?.symbol,'SEARCHED');
    time+=300001; failed=true; const stale=await fetchPriceActivity('TEST');
    assert.equal(stale?.stale,true); assert.equal(stale?.fetchedAt,first?.fetchedAt); assert.equal(first?.stale,false);
    assert.equal(await fetchPriceActivity('NEVERLOADED'),null);
  } finally { globalThis.fetch=originalFetch; Date.now=originalNow; }
});
