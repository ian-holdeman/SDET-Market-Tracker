import { nightlyScope, type NightlyEnvelope } from '../../telemetry/nightlyPipeline';
export function nightlyFixture(now: number, number = 40, outcome: 'success'|'failure'|'cancelled' = 'success'): NightlyEnvelope {
  const identity = { runId: 1000 + number, number, attempt: 1, commit: 'a'.repeat(40) };
  return { version: 2, scope: nightlyScope, checkedAt: new Date(now).toISOString(), expiresAt: new Date(now + 60000).toISOString(),
    state: 'verified', active: null, highest: identity, continuity: 'verified', archive: null,
    latest: { ...identity, createdAt: new Date(now - 600000).toISOString(), outcome, jobsState: 'available', browserState: 'missing', browserEvidence: null,
      jobs: ['test', 'database'].map((name, i) => ({ id: number * 10 + i, name, outcome: name === 'database' ? outcome : 'success',
        startedAt: new Date(now - 590000).toISOString(), completedAt: new Date(now - 300000 + i * 10000).toISOString() })) } };
}
