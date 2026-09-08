export const showcaseScenarios = [
  {
    id: 'watchlist', label: 'Watchlist re-login',
    summary: 'Your watchlist should survive signing out. An asset you closed should stay closed.',
    significance: 'A navigation regression with two kinds of state to keep straight: saved assets and open cards.',
    steps: ['Save Apple and close its card.', 'Sign out, sign back in, and check that the saved asset returns without reopening the card.'],
    limits: 'Sign-in and storage are mocked; this checks the browser flow, not Google OAuth or database permissions.',
  },
  {
    id: 'cold-start', label: 'Cold-start recovery',
    summary: 'Saved results stay useful while fresh results arrive.',
    significance: 'The same metric tiles stay in place through loading, saved results, and a completed refresh.',
    steps: ['Start with no results.', 'Load a saved run while refresh continues.', 'Show the new run without shifting the layout, including with reduced motion.'],
    limits: 'Run history is test data. This checks refresh behavior, not GitHub publishing.',
  },
  {
    id: 'history', label: 'History recovery',
    summary: 'A failed request should not be a dead end.',
    significance: 'Retrying older results works without losing your place. Closing nested reports returns keyboard focus where it belongs.',
    steps: ['Open history, recover from a failed page request, then inspect an incomplete run.', 'Close the reports with Escape and check that Home still shows the last usable results.'],
    limits: 'The runs and request failure are mocked; their displayed outcomes are examples.',
  },
  {
    id: 'deletion', label: 'Safe deletion',
    summary: 'Only confirmed success signs you out after account deletion.',
    significance: 'An uncertain response must leave you signed in, with a clear error and a way to retry.',
    steps: ['Request deletion, receive an error, then retry successfully. The test checks the session is kept on failure and cleared on success.'],
    limits: 'No real account is deleted. Auth deletion and database cleanup are checked separately in local integration tests.',
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
      !/^src\/tests\/specs\/(auth\/auth|telemetry\/history)\.spec\.ts$/.test(r.sourceFile) ||
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
