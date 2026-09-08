import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseRecordings } from '../../src/components/the-tests/showcase';
import { verifyRecordingAvailability } from '../../src/services/recordingMedia';

const catalog = () => JSON.parse(readFileSync('public/recordings/manifest.json', 'utf8'));
test('curated recordings match actual public files and preserve source and attempt evidence', () => {
  const recordings = parseRecordings(catalog());
  assert.equal(recordings.length, 4);
  const extras = catalog(); extras.recordings[0].token = 'private';
  assert.ok(!JSON.stringify(parseRecordings(extras)).includes('private'));
  for (const r of recordings) {
    assert.equal(createHash('sha256').update(readFileSync(`public${r.src}`)).digest('hex'), r.sha256);
    assert.ok(readFileSync(`public${r.poster}`).length > 0);
  }
});
test('recording boundary rejects unsafe paths, duplicate IDs, false outcomes and excessive retries', () => {
  for (const change of [
    (r: any) => { r.src = 'https://example.com/private.webm'; },
    (r: any) => { r.poster = '/recordings/../../private.png'; },
    (r: any) => { r.commit = 'local'; },
    (r: any) => { r.sourceDigest = 'unknown'; },
    (r: any) => { r.durationMs = -1; },
    (r: any) => { r.attempts = []; },
    (r: any) => { r.attempts[0].status = 'failed'; r.outcome = 'passed'; },
    (r: any) => { r.attempts.push({ ...r.attempts[0], retry: 1 }); },
    (r: any) => { r.attempts.push({ ...r.attempts[0], retry: 1 }, { ...r.attempts[0], retry: 2 }); },
  ]) {
    const value = catalog(); change(value.recordings[0]);
    assert.throws(() => parseRecordings(value));
  }
  const duplicate = catalog(); duplicate.recordings[1] = duplicate.recordings[0];
  assert.throws(() => parseRecordings(duplicate));
  assert.deepEqual(parseRecordings({ version: 1, recordings: [] }), []);
});
test('a retry success is flaky, with the failed first attempt retained', () => {
  const value = catalog(), r = value.recordings[0];
  r.attempts = [{ retry: 0, status: 'failed', durationMs: 123 }, { retry: 1, status: 'passed', durationMs: r.durationMs }];
  r.outcome = 'flaky';
  assert.equal(parseRecordings(value)[0].outcome, 'flaky');
  r.outcome = 'passed';
  assert.throws(() => parseRecordings(value));
});

test('media availability fails closed on missing, empty, wrong-type and oversized responses, and respects cancellation', async () => {
  const r = parseRecordings(catalog())[0];
  const request = (status = 200, headers: Record<string, string> = { 'content-type': 'video/mp4', 'content-length': '1024' }) =>
    (async (_input, init) => { assert.equal(init?.method, 'HEAD'); return new Response(null, { status, headers }); }) as typeof fetch;
  const signal = new AbortController().signal;
  await verifyRecordingAvailability(r.src, signal, request());
  for (const response of [request(404), request(200, {}),
    request(200, { 'content-type': 'text/html', 'content-length': '1024' }),
    request(200, { 'content-type': 'video/mp4', 'content-length': '0' }),
    request(200, { 'content-type': 'video/mp4', 'content-length': String(8 * 1024 * 1024 + 1) }),
  ]) await assert.rejects(verifyRecordingAvailability(r.src, signal, response));
  const controller = new AbortController(); controller.abort();
  await assert.rejects(verifyRecordingAvailability(r.src, controller.signal, request()));
});
