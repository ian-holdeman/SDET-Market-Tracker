export const showcaseScenarios = [
  {
    id: 'watchlist', label: 'Watchlist re-login',
    summary: 'Your watchlist should survive signing out. An asset you closed should stay closed.',
    significance: 'A navigation regression with two kinds of state to keep straight: saved assets and open cards.',
    steps: ['Save Apple and close its card.', 'Sign out, sign back in, and check that the saved asset returns without reopening the card.'],
    limits: 'Sign-in and storage are mocked; this checks the browser flow, not Google OAuth or database permissions.',
  },
  {
    id: 'chart', label: 'Chart session handoff',
    summary: 'A partial trading day stays readable through a session change and a failed refresh.',
    significance: 'The chart preserves usable prices, marks stale evidence and restores fresh activity after recovery.',
    steps: ['Move from a holiday into premarket and a partial trading day.', 'Fail a refresh, check the stale chart, then restore fresh prices.'],
    limits: 'Market responses and clock progression are controlled fixtures, not live market observations.',
  },
  {
    id: 'settings', label: 'Settings clear recovery',
    summary: 'Clearing a watchlist requires confirmation and can recover from an uncertain response.',
    significance: 'Cancel keeps saved assets. A failed request preserves them, and retry clears only the signed-in owner’s watchlist.',
    steps: ['Cancel the confirmation, then receive a clear failure.', 'Retry, close the pending dialog, then open Watchlist to confirm it is empty.'],
    limits: 'Mocked account and market data. All contains AAPL and MSFT; clearing the watchlist leaves that shared Board intact.',
  },
  {
    id: 'history', label: 'History recovery',
    summary: 'A failed request should not be a dead end.',
    significance: 'Retrying older results works without losing your place. Closing nested reports returns keyboard focus where it belongs.',
    steps: ['Open history, recover from a failed page request, then inspect an incomplete run.', 'Close the reports with Escape and check that Home still shows the last usable results.'],
    limits: 'The runs and request failure are mocked; their displayed outcomes are examples. The market fixture contains only AAPL and MSFT.',
  },
] as const;

export type Recording = {
  id: string; src: string; poster: string; sha256: string; originalSha256: string;
  testTitle: string; sourceFile: string; sourceFileSha256: string;
  commit: string; sourceDigest: string; workingTreeModified: boolean;
  capturedAt: string; browser: string; viewport: string; node: string; playwright: string;
  outcome: 'passed' | 'flaky' | 'failed';
  durationMs: number; videoDurationSeconds: number;
  attempts: { retry: number; status: 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted'; durationMs: number }[];
};

export function parseRecordings(value: unknown): Recording[] {
  const data = value as { version?: unknown; recordings?: unknown };
  if (!data || data.version !== 1 || !Array.isArray(data.recordings) || data.recordings.length > 4) throw Error('Invalid recording catalog');
  const seen = new Set<string>();
  return data.recordings.map((raw: unknown) => {
    if (!raw || typeof raw !== 'object') throw Error('Invalid recording');
    const r = raw as Recording;
    const text = (v: unknown) => typeof v === 'string' && v.length > 0 && v.length <= 500;
    const digest = (v: unknown) => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
    if (!showcaseScenarios.some(s => s.id === r.id) || seen.has(r.id) ||
      !digest(r.sha256) || !digest(r.originalSha256) || !digest(r.sourceDigest) || !digest(r.sourceFileSha256) ||
      !/^[a-f0-9]{40}$/.test(r.commit) || typeof r.workingTreeModified !== 'boolean' ||
      !text(r.capturedAt) || !Number.isFinite(Date.parse(r.capturedAt)) ||
      ![r.testTitle, r.browser, r.viewport, r.node, r.playwright].every(text) ||
      !/^src\/tests\/specs\/(auth\/auth|telemetry\/history|board\/chart-session|settings\/settings)\.spec\.ts$/.test(r.sourceFile) ||
      r.src !== `/recordings/${r.id}-${r.sha256.slice(0, 12)}.mp4` ||
      r.poster !== `/recordings/${r.id}-${r.sha256.slice(0, 12)}.png` ||
      !Number.isFinite(r.durationMs) || r.durationMs < 0 ||
      !Number.isFinite(r.videoDurationSeconds) || r.videoDurationSeconds <= 0 || r.videoDurationSeconds > 300 ||
      !Array.isArray(r.attempts) || r.attempts.length < 1 || r.attempts.length > 2 ||
      r.attempts.some((a, i) => !a || a.retry !== i || !['passed', 'failed', 'timedOut', 'skipped', 'interrupted'].includes(a.status) || !Number.isFinite(a.durationMs) || a.durationMs < 0) ||
      (r.attempts.length === 2 && !['failed', 'timedOut'].includes(r.attempts[0].status))) throw Error('Invalid recording evidence');
    const last = r.attempts.at(-1)!;
    const outcome = last.status === 'passed' ? (r.attempts.length === 2 ? 'flaky' : 'passed') : 'failed';
    if (r.outcome !== outcome || r.durationMs !== last.durationMs) throw Error('Inconsistent recording outcome');
    seen.add(r.id);
    return {
      id: r.id, src: r.src, poster: r.poster, sha256: r.sha256, originalSha256: r.originalSha256,
      testTitle: r.testTitle, sourceFile: r.sourceFile, sourceFileSha256: r.sourceFileSha256,
      commit: r.commit, sourceDigest: r.sourceDigest, workingTreeModified: r.workingTreeModified,
      capturedAt: r.capturedAt, browser: r.browser, viewport: r.viewport, node: r.node, playwright: r.playwright,
      outcome: r.outcome, durationMs: r.durationMs, videoDurationSeconds: r.videoDurationSeconds,
      attempts: r.attempts.map(a => ({ retry: a.retry, status: a.status, durationMs: a.durationMs })),
    };
  });
}
