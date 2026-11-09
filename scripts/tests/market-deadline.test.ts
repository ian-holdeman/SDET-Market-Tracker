import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { marketRouter } from '../../server/market';

async function serve(provider: typeof fetch, claim: () => Promise<void>) {
  const server = express().use(marketRouter(provider, Date.now, claim)).listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  return { origin: `http://127.0.0.1:${(server.address() as any).port}`,
    close: () => { server.closeAllConnections(); server.close(); } };
}

test('a quote batch stops spending shared provider quota when its deadline expires', async t => {
  const deadline = new AbortController();
  t.mock.method(AbortSignal, 'timeout', () => deadline.signal);
  let claims = 0, providerCalls = 0, firstWave!: () => void;
  const started = new Promise<void>(resolve => { firstWave = resolve; });
  const server = await serve(async (_url, options) => {
    providerCalls++;
    const signal = options!.signal!;
    if (signal.aborted) throw Error('deadline');
    if (providerCalls === 10) firstWave();
    await new Promise<void>((_resolve, reject) => signal.addEventListener('abort', () => reject(Error('deadline')), { once: true }));
    throw Error('Unreachable');
  }, async () => { claims++; });
  t.after(server.close);
  const symbols = Array.from({ length: 30 }, (_, index) => `TEST${index}`);
  const response = fetch(`${server.origin}/api/quotes?symbols=${symbols.join(',')}`);
  await started;
  assert.equal(claims, 10, 'first provider wave is positively established');
  deadline.abort();
  const result = await response;
  assert.equal(result.status, 502);
  assert.deepEqual((await result.json()).unavailable, symbols);
  assert.equal(claims, 10, 'remaining symbols must not spend quota after cancellation');
  assert.equal(providerCalls, 10, 'expired work must not start another provider call');
});

test('expiry during shared admission prevents a provider request after admission settles', async t => {
  const deadline = new AbortController();
  t.mock.method(AbortSignal, 'timeout', () => deadline.signal);
  let started!: () => void, release!: () => void, providerCalls = 0;
  const admissionStarted = new Promise<void>(resolve => { started = resolve; });
  const admission = new Promise<void>(resolve => { release = resolve; });
  const server = await serve(async () => { providerCalls++; throw Error('Provider must not start'); }, async () => {
    started(); await admission;
  });
  t.after(server.close);
  const request = fetch(`${server.origin}/api/quotes?symbols=AAPL`);
  await admissionStarted;
  deadline.abort();
  release();
  assert.equal((await request).status, 502);
  assert.equal(providerCalls, 0);
});
