import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { assetRouter, validateAsset } from '../../server/assets';

test('registration verifies the caller, rejects extra privileges, fails closed and bounds attempts', async t => {
  let mode = 'ok'; const writes: string[] = []; const validated: string[] = [];
  const app = express().use(express.json()).use(assetRouter({
    verify: async token => { if (mode === 'auth-down') throw Error(); return token === 'valid' ? 'owner' : null; },
    validate: async symbol => { validated.push(symbol); if (mode === 'provider-down') throw Error(); },
    register: async symbol => { if (mode === 'db-down') throw Error(); writes.push(symbol); },
  }, 'http://localhost:3000'));
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(r => server.once('listening', r));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const url = `http://127.0.0.1:${(server.address() as any).port}/api/assets/register`;
  const call = (body: unknown = { symbol: ' airj ' }, token = 'valid', origin = 'http://localhost:3000') => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, Origin: origin }, body: JSON.stringify(body) });
  assert.equal((await call({}, '')).status, 401);
  assert.equal((await call(undefined, 'invalid')).status, 401);
  assert.equal((await call(undefined, 'valid', 'https://evil.test')).status, 403);
  for (const body of [{ symbol: 'AAPL', user_id: 'victim' }, { symbol: 'AAPL', role: 'admin' }, { symbol: '../AAPL' }, { symbol: 'A'.repeat(33) }, []]) assert.equal((await call(body)).status, 400);
  assert.deepEqual(validated, []); assert.deepEqual(writes, []);
  mode = 'auth-down'; assert.equal((await call()).status, 503);
  mode = 'provider-down'; assert.equal((await call()).status, 502); assert.deepEqual(writes, []);
  mode = 'db-down'; assert.equal((await call()).status, 502);
  mode = 'ok'; const result = await call(); assert.equal(result.status, 200); assert.deepEqual(await result.json(), { symbol: 'AIRJ' });
  assert.deepEqual(writes, ['AIRJ']);
  for (let i = 0; i < 7; i++) assert.equal((await call()).status, 200);
  assert.equal((await call()).status, 429);
  assert.equal(writes.length, 8);
});

test('provider registration rejects missing, mismatched and malformed quotes; accepts valid zero', async () => {
  const now = Math.floor(Date.now() / 1000);
  const body = (symbol: string, price: unknown = 0) => ({ chart: { result: [{ meta: { symbol, regularMarketPrice: price, regularMarketTime: now }, timestamp: [now], indicators: { quote: [{ close: [0] }] } }] } });
  for (const payload of [{}, body('OTHER'), body('AIRJ', null), { chart: { error: { code: 'Not Found' }, result: null } }]) {
    await assert.rejects(validateAsset('AIRJ', (async () => Response.json(payload)) as typeof fetch));
  }
  await assert.rejects(validateAsset('AIRJ', (async () => new Response('', { status: 429 })) as typeof fetch));
  await assert.rejects(validateAsset('AIRJ', (async () => { throw Error('timeout'); }) as typeof fetch));
  await validateAsset('AIRJ', (async () => Response.json(body('AIRJ'))) as typeof fetch);
  await validateAsset('SPX', (async () => Response.json(body('^GSPC'))) as typeof fetch);
});
