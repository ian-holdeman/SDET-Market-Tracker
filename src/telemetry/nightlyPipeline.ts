import { validateEvidence, type Evidence } from './contract';
import { pipelineDate, selectedPipeline, validatePipeline, type Pipeline, type PipelineJob } from './pipeline';

export const nightlyScope = { repository: selectedPipeline.repository, branch: selectedPipeline.branch,
  workflow: selectedPipeline.workflow, workflowId: selectedPipeline.workflowId };
export const conclusions = ['success', 'failure', 'cancelled', 'timed_out', 'action_required', 'neutral', 'skipped', 'startup_failure', 'stale'] as const;
export type Conclusion = typeof conclusions[number];
export type NightlyIdentity = { runId: number; number: number; attempt: number; commit: string };
export type NightlyJob = { id: number; name: string; outcome: Conclusion; startedAt: string | null; completedAt: string | null };
export type NightlyRun = NightlyIdentity & { createdAt: string; outcome: Conclusion; jobs: NightlyJob[];
  jobsState: 'available' | 'incomplete' | 'unavailable'; browserState: 'available' | 'missing' | 'expired' | 'invalid' | 'unavailable'; browserEvidence: Evidence | null };
export type NightlyEnvelope = { version: 2; scope: typeof nightlyScope; checkedAt: string; expiresAt: string;
  state: 'verified' | 'empty' | 'unavailable'; latest: NightlyRun | null; active: NightlyIdentity | null;
  highest: NightlyIdentity | null; continuity: 'verified' | 'unavailable'; archive: Pipeline | null };
export function nightlyIdentity(value: unknown): NightlyIdentity {
  const r = value as NightlyIdentity;
  if (!r || ![r.runId, r.number, r.attempt].every(n => Number.isSafeInteger(n) && n > 0) || !/^[a-f0-9]{40}$/.test(r.commit)) throw Error('Invalid nightly identity');
  return { runId: r.runId, number: r.number, attempt: r.attempt, commit: r.commit };
}
export function compareNightly(a: NightlyIdentity, b: NightlyIdentity) {
  if (a.number === b.number && (a.runId !== b.runId || a.commit !== b.commit)) throw Error('Conflicting nightly identity');
  return a.number - b.number || a.attempt - b.attempt;
}
function conclusion(value: unknown): Conclusion {
  if (!conclusions.includes(value as Conclusion)) throw Error('Invalid nightly conclusion');
  return value as Conclusion;
}
export function validateNightly(raw: unknown, now = Date.now()): NightlyEnvelope {
  const r = raw as NightlyEnvelope;
  if (!r || r.version !== 2 || Object.entries(nightlyScope).some(([k, v]) => r.scope?.[k as keyof typeof nightlyScope] !== v) ||
    !['verified', 'empty', 'unavailable'].includes(r.state) || !['verified', 'unavailable'].includes(r.continuity)) throw Error('Untrusted nightly scope');
  const checkedAt = pipelineDate(r.checkedAt), expiresAt = pipelineDate(r.expiresAt);
  const checked = Date.parse(checkedAt), expires = Date.parse(expiresAt);
  if (checked > now + 5000 || expires <= now || expires <= checked || expires - checked > 60000) throw Error('Expired nightly verification');
  let latest: NightlyRun | null = null;
  if (r.latest) {
    const identity = nightlyIdentity(r.latest), createdAt = pipelineDate(r.latest.createdAt);
    if (Date.parse(createdAt) > checked || !Array.isArray(r.latest.jobs) || r.latest.jobs.length > 100 ||
      !['available', 'incomplete', 'unavailable'].includes(r.latest.jobsState) ||
      !['available', 'missing', 'expired', 'invalid', 'unavailable'].includes(r.latest.browserState)) throw Error('Invalid nightly metadata');
    const ids = new Set<number>();
    const jobs = r.latest.jobs.map(j => {
      if (!j || !Number.isSafeInteger(j.id) || j.id <= 0 || ids.has(j.id) || typeof j.name !== 'string' || !j.name || j.name.length > 200 || /[\x00-\x1f]/.test(j.name)) throw Error('Invalid nightly job');
      ids.add(j.id);
      const startedAt = j.startedAt === null ? null : pipelineDate(j.startedAt);
      const completedAt = j.completedAt === null ? null : pipelineDate(j.completedAt);
      if ((startedAt && (Date.parse(startedAt) < Date.parse(createdAt) || Date.parse(startedAt) > checked)) ||
        (completedAt && (!startedAt || Date.parse(completedAt) < Date.parse(startedAt) || Date.parse(completedAt) > checked))) throw Error('Invalid nightly interval');
      return { id: j.id, name: j.name, outcome: conclusion(j.outcome), startedAt, completedAt };
    });
    const completeTopology = jobs.length === 2 && ['test', 'database'].every(name => jobs.filter(j => j.name === name && j.startedAt && j.completedAt).length === 1);
    if ((r.latest.jobsState === 'available' && !completeTopology) || (r.latest.jobsState === 'unavailable' && jobs.length)) throw Error('Inconsistent job topology');
    let browserEvidence: Evidence | null = null;
    if (r.latest.browserEvidence) {
      const e = validateEvidence(r.latest.browserEvidence);
      if (e.environment !== 'github-actions' || e.runId !== String(identity.runId) || e.runAttempt !== identity.attempt || e.commitSha !== identity.commit) throw Error('Mismatched nightly cases');
      const begin = Date.parse(pipelineDate(e.startedAt)), end = e.completedAt === null ? null : Date.parse(pipelineDate(e.completedAt));
      if (begin < Date.parse(createdAt) || begin > checked || (end !== null && end > checked)) throw Error('Invalid browser report interval');
      browserEvidence = e;
    }
    if ((r.latest.browserState === 'available') !== !!browserEvidence) throw Error('Inconsistent browser evidence state');
    latest = { ...identity, createdAt, outcome: conclusion(r.latest.outcome), jobs, jobsState: r.latest.jobsState, browserState: r.latest.browserState, browserEvidence };
  }
  if ((r.state === 'verified') !== !!latest) throw Error('Unverified latest nightly');
  const active = r.active ? nightlyIdentity(r.active) : null, highest = r.highest ? nightlyIdentity(r.highest) : null;
  if (latest && highest && compareNightly(latest, highest) < 0) throw Error('Nightly rollback');
  const archive = r.archive ? validatePipeline(r.archive, now) : null;
  if (archive && archive.source !== 'archive') throw Error('Fallback is not independently archived');
  return { version: 2, scope: nightlyScope, checkedAt, expiresAt, state: r.state, latest, active, highest, continuity: r.continuity, archive };
}

/** Only completed, validated intervals and case completions become replay events. */
export function nightlyReplay(envelope: NightlyEnvelope): Pipeline | null {
  const run = envelope.latest;
  if (!run) return null;
  const jobs: PipelineJob[] = run.jobs.flatMap(j => j.startedAt && j.completedAt ? [{ ...j, startedAt: j.startedAt, completedAt: j.completedAt }] : []);
  if (!jobs.length) return null;
  const testJobs = jobs.filter(j => j.name === 'test');
  let browserEvidence = run.browserEvidence;
  if (browserEvidence) {
    const job = testJobs.length === 1 ? testJobs[0] : null;
    if (!job || browserEvidence.tests.some(t => t.attempts.some(a => {
      const start = Date.parse(a.startedAt), end = start + a.durationMs;
      return start < Date.parse(job.startedAt) || end > Date.parse(job.completedAt);
    }))) browserEvidence = null;
  }
  return { version: 2, ...nightlyScope, ...nightlyIdentity(run), url: `https://github.com/${nightlyScope.repository}/actions/runs/${run.runId}/attempts/${run.attempt}`,
    source: 'nightly', startedAt: run.createdAt, outcome: run.outcome, checkedAt: envelope.checkedAt, expiresAt: envelope.expiresAt, jobs, browserEvidence };
}
