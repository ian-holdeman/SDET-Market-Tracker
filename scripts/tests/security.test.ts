import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { marketRouter } from '../../server/market';
import { configureSecurity, safeRequestErrors } from '../../server/security';
import { apiAdmission } from '../../server/admission';
import { marketBudget, ResourceLimitError } from '../../server/resource-budget';

test('ambiguous and injected market parameters are rejected before any provider work', async (t) => {
  let calls = 0;
  const app = express();
  configureSecurity(app);
  app.use(marketRouter(async () => { calls++; return Response.json({ quotes: [] }); }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  for (const path of [
    '/api/search?q=AAPL&admin=true', '/api/search?q=A&q=B', '/api/search?q=%00AAPL',
    '/api/search?q=' + 'x'.repeat(81), '/api/search?q[constructor][prototype]=x',
    '/api/candles?symbol=AAPL&timeframe=1D&timeframe=1D',
    '/api/candles?symbol=AAPL&timeframe[0]=1D', '/api/candles?symbol=AAPL&url=http://127.0.0.1',
    '/api/quotes?symbols=AAPL&symbols=MSFT', '/api/quotes?symbols=AAPL&callback=execute',
    '/api/quotes?symbols=' + encodeURIComponent("AAPL');DROP TABLE assets;--"),
    '/api/price-activity?symbol=AAPL&__proto__=x', '/api/price-activity?symbol=..%2F..%2F.env',
  ]) assert.equal((await fetch(base + path)).status, 400, path);
  assert.equal(calls, 0);
  assert.equal((await fetch(base + '/api/search?q=' + encodeURIComponent("Société O'Brien"))).status, 200);
  assert.equal(calls, 1, 'legitimate Unicode and punctuation are searchable');
});

test('admission ignores forged forwarding identities, bounds active work, and releases capacity', async t => {
  let now = 1000, handled = 0;
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const app = express().use('/api', apiAdmission(() => now, 3, 1));
  app.get('/api/hold', async (_req, res) => { handled++; await gate; res.end(); });
  app.get('/api/read', (_req, res) => { handled++; res.end(); });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  t.after(() => { release(); server.closeAllConnections(); server.close(); });
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/`;
  let entered!: () => void;
  const pending = new Promise<void>(resolve => { entered = resolve; });
  server.once('request', entered);
  const first = fetch(base + 'hold');
  await pending;
  assert.equal((await fetch(base + 'read')).status, 429);
  release(); await first;
  for (let i = 0; i < 2; i++) assert.equal((await fetch(base + 'read')).status, 200);
  assert.equal((await fetch(base + 'read', { headers: { 'X-Forwarded-For': '192.0.2.123', Forwarded: 'for=another' } })).status, 429);
  assert.equal(handled, 3);
  now += 60000;
  assert.equal((await fetch(base + 'read')).status, 200);
});

test('configured shared-budget failure never permits work and rejection circuit recovers', async () => {
  let now = 0, calls = 0, mode: 'error' | 'denied' | 'ok' = 'error';
  const claim = marketBudget({ client: { rpc: () => ({ abortSignal: async () => {
    calls++; return { data: mode === 'ok', error: mode === 'error' ? { message: 'private upstream detail' } : null };
  } }) } } as any, () => now);
  await assert.rejects(claim(), (e: ResourceLimitError) => e.status === 503 && !e.message.includes('private'));
  await assert.rejects(claim()); assert.equal(calls, 1);
  now += 5000; mode = 'denied';
  await assert.rejects(claim(), (e: ResourceLimitError) => e.status === 429);
  await assert.rejects(claim()); assert.equal(calls, 2);
  now += 30000; mode = 'ok'; await claim(); assert.equal(calls, 3);
});

test('API mutations require JSON content and parser errors disclose no submitted payload', async (t) => {
  let writes = 0;
  const app = express();
  configureSecurity(app);
  app.use(express.json({ limit: '16kb' }));
  app.post('/api/probe', (_req, res) => { writes++; res.json({ ok: true }); });
  app.use(safeRequestErrors);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/probe`;
  for (const contentType of ['text/plain', 'application/x-www-form-urlencoded']) {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': contentType }, body: 'private-sentinel' });
    assert.equal(response.status, 415);
    assert.doesNotMatch(await response.text(), /private-sentinel/);
  }
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"private-sentinel":' });
  assert.equal(response.status, 400);
  assert.doesNotMatch(await response.text(), /private-sentinel/);
  assert.equal(writes, 0);
  assert.equal((await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 200);
  assert.equal(writes, 1);
});

test('provider budget denial prevents fetches and recovers; cached/coalesced results claim once', async t => {
  let allowed = false, claims = 0, calls = 0;
  const app = express().use(marketRouter(async () => { calls++; return Response.json({ quotes: [] }); }, Date.now,
    async () => { claims++; if (!allowed) throw Object.assign(new Error('limited'), { status: 429 }); }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/search?q=SAFE`;
  assert.equal((await fetch(base)).status, 429);
  assert.equal(calls, 0);
  allowed = true;
  const responses = await Promise.all(Array.from({ length: 8 }, () => fetch(base)));
  assert.ok(responses.every(response => response.status === 200));
  assert.equal(calls, 1);
  assert.equal(claims, 2, 'one denied claim, then one successful load shared by every reader');
});
