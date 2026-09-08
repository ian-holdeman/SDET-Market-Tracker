import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chartSession, hasRecentSessionSample } from '../../src/utils/chartSession';
import { EMPTY_TIMEFRAME, TimeframeSummary } from '../../src/utils/timeframeData';

test('endpoint activity requires recent verified samples inside a provider session', () => {
  const now = Date.parse('2026-09-08T13:31:00Z');
  const data: TimeframeSummary = { ...EMPTY_TIMEFRAME, points: [{ price: 18, date: '', label: '', timeUnix: now - 60000 }],
    asOf: new Date(now - 60000).toISOString(), fetchedAt: new Date(now).toISOString(),
    sessionSource: 'provider', sessionStartUnix: now - 3600000, sessionEndUnix: now + 3600000 };
  assert.equal(hasRecentSessionSample(data, '1D', now), true);
  assert.equal(hasRecentSessionSample(data, '1Y', now), false);
  for (const changed of [
    { stale: true }, { sessionSource: 'samples' as const }, { sessionEndUnix: now }, { sessionStartUnix: now + 1 },
    { asOf: new Date(now + 1).toISOString() }, { asOf: new Date(now - 600001).toISOString() },
    { fetchedAt: new Date(now - 60001).toISOString() }, { points: [] },
  ]) assert.equal(hasRecentSessionSample({ ...data, ...changed }, '1D', now), false);
});

test('session parsing respects early closes and rejects invalid or disjoint schedules', () => {
  const start = Date.parse('2026-11-27T14:30:00Z') / 1000, end = Date.parse('2026-11-27T18:00:00Z') / 1000;
  assert.equal(chartSession({ regular: { start, end } }, start * 1000, (start + 60) * 1000).sessionEndUnix, end * 1000);
  for (const value of [{ regular: { start, end: start - 1 } }, { regular: { start: NaN, end } },
    { regular: { start, end }, post: { start: end + 3600, end: end + 7200 } }]) {
    assert.equal(chartSession(value, start * 1000, (start + 60) * 1000).sessionSource, 'samples');
  }
});
