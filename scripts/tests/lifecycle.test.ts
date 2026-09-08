import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { gracefulShutdown } from '../../server/lifecycle';

test('shutdown drains an in-flight response and coalesces duplicate signals', async () => {
  let respond!: () => void, started!: () => void;
  const requestStarted = new Promise<void>(resolve => { started = resolve; });
  const server = createServer((_req, res) => { respond = () => res.end('durable work complete'); started(); });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${(server.address() as {port:number}).port}`;
  const request = fetch(url).then(r => r.text());
  await requestStarted;
  let drained = false, calls = 0;
  const shutdown = gracefulShutdown(server, { onDrain: () => { calls++; }, graceMs: 1000 });
  const closing = shutdown();
  assert.equal(shutdown(), closing);
  void closing.then(() => { drained = true; });
  assert.equal(drained, false);
  respond();
  assert.equal(await request, 'durable work complete');
  await closing;
  assert.equal(calls, 1);
  await assert.rejects(fetch(url));
});

test('shutdown closes a stalled response at its bounded deadline', async () => {
  let started!: () => void;
  const requestStarted = new Promise<void>(resolve => { started = resolve; });
  const server = createServer(() => started());
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const request = fetch(`http://127.0.0.1:${(server.address() as {port:number}).port}`).then(() => false, () => true);
  await requestStarted;
  await gracefulShutdown(server, { graceMs: 25 })();
  assert.equal(await request, true);
});
