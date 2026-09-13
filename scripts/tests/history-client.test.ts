import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readHistory } from '../../src/services/testRunsService';
import { feed } from '../../src/tests/fixtures/testEvidence';

test('history preview is shared across navigation; departing subscribers cannot cancel fresh verification', async t => {
  const saved = { ...feed(), snapshot: true, refreshing: true };
  const fresh = feed([]);
  let release!: () => void, previewed!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const seen = new Promise<void>(resolve => { previewed = resolve; });
  const urls: string[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    urls.push(url);
    if (url.endsWith('?snapshot=1')) return Response.json(saved);
    await gate;
    return Response.json(fresh);
  });
  const controller = new AbortController();
  const first = readHistory(null, controller.signal, value => { assert.deepEqual(value.runs, saved.runs); previewed(); });
  // Register rejection before cancellation so the test also detects stray rejections.
  const cancelled = assert.rejects(first, /abort/i);
  await seen;
  controller.abort();
  let replayed = false;
  const second = readHistory(null, undefined, value => { replayed = true; assert.equal(value.snapshot, true); });
  assert.equal(replayed, true);
  release();
  assert.deepEqual((await second).runs, []);
  await cancelled;
  assert.deepEqual(urls, ['/api/test-history?snapshot=1', '/api/test-history']);
  await readHistory();
  assert.equal(urls.length, 4, 'Settled requests must be removed from the coalescing map');
});

test('unavailable preview falls back to active retrieval and a warm verified preview avoids duplicate work', async t => {
  let warm = false;
  const urls: string[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    urls.push(url);
    return url.includes('snapshot') && !warm ? new Response('{}', { status: 502 }) : Response.json(feed());
  });
  assert.equal((await readHistory()).runs.length, 1);
  assert.equal(urls.length, 2);
  warm = true;
  await readHistory();
  assert.equal(urls.length, 3);
  await readHistory('older');
  assert.equal(urls[3], '/api/test-history?cursor=older');
});
