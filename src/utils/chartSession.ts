import type { TimeframeSummary } from './timeframeData';

// Accept the provider's dated session only when it contains this dataset.
// Never project a new trading day's schedule onto a previous day's prices.
export function chartSession(value: unknown, first: number, last: number) {
  const fallback = { sessionStartUnix: first, sessionEndUnix: last, sessionSource: 'samples' as const };
  if (!value || typeof value !== 'object') return fallback;
  const periods: { start: number; end: number }[] = [];
  for (const key of ['pre', 'regular', 'post']) {
    const raw = (value as Record<string, unknown>)[key];
    if (raw == null) continue;
    if (typeof raw !== 'object') return fallback;
    const { start, end } = raw as Record<string, unknown>;
    if (typeof start !== 'number' || typeof end !== 'number' || !Number.isFinite(start) || !Number.isFinite(end) || start <= 0 || end < start) return fallback;
    if (start !== end) periods.push({ start: start * 1000, end: end * 1000 });
  }
  periods.sort((a, b) => a.start - b.start);
  if (!periods.length || periods.some((p, i) => i > 0 && p.start !== periods[i - 1].end)) return fallback;
  const start = periods[0].start, end = periods.at(-1)!.end;
  if (end - start > 36 * 3600000 || first < start || last > end) return fallback;
  return { sessionStartUnix: start, sessionEndUnix: end, sessionSource: 'provider' as const };
}

export function hasRecentSessionSample(data: TimeframeSummary, timeframe: string, now: number): boolean {
  const observed = Date.parse(data.asOf ?? ''), fetched = Date.parse(data.fetchedAt ?? '');
  return timeframe === '1D' && data.sessionSource === 'provider' && !data.stale && data.points.length > 0 &&
    Number.isFinite(data.sessionStartUnix) && Number.isFinite(data.sessionEndUnix) &&
    now >= data.sessionStartUnix! && now < data.sessionEndUnix! &&
    now >= observed && now - observed <= 10 * 60000 && now >= fetched && now - fetched <= 60000;
}
