import { Router } from 'express';
import { readRunArtifact, type HistoryConfig } from './test-history';
import { nightlyScope, nightlyIdentity, compareNightly, validateNightly, conclusions, type NightlyEnvelope, type NightlyIdentity, type NightlyJob } from '../src/telemetry/nightlyPipeline';
import type { Evidence } from '../src/telemetry/contract';
import type { Pipeline } from '../src/telemetry/pipeline';
import type { NightlyGuard } from './nightly-guard';

async function boundedJson(response: Response) {
  if (!response.ok || !response.body) throw Error('Nightly source unavailable');
  const reader = response.body.getReader(); let size = 0; const chunks: Uint8Array[] = [];
  try { while (true) { const { done, value } = await reader.read(); if (done) break;
    size += value.length; if (size > 300000) throw Error('Nightly metadata exceeds limit'); chunks.push(value);
  } } finally { await reader.cancel(); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
function identity(run: any): NightlyIdentity {
  if (run?.repository?.full_name !== nightlyScope.repository || run.head_repository?.full_name !== nightlyScope.repository ||
    run.head_branch !== nightlyScope.branch || run.path !== nightlyScope.workflow || run.workflow_id !== nightlyScope.workflowId ||
    run.event !== 'schedule' || (run.pull_requests !== undefined && (!Array.isArray(run.pull_requests) || run.pull_requests.length))) throw Error('Untrusted scheduled run');
  return nightlyIdentity({ runId: run.id, number: run.run_number, attempt: run.run_attempt, commit: run.head_sha });
}
export async function fetchNightly(config: HistoryConfig, request: typeof fetch = fetch, clock = Date.now,
  reports = new Map<string, { until: number; evidence: Evidence }>()): Promise<NightlyEnvelope> {
  if (config.repository !== nightlyScope.repository || config.branch !== nightlyScope.branch) throw Error('Unconfigured nightly scope');
  const signal = AbortSignal.timeout(10000), base = 'https://api.github.com/repos/' + config.repository;
  const options = { signal, redirect: 'error' as const, headers: { Authorization: 'Bearer ' + config.token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' } };
  const get = (path: string) => request(base + path, options).then(boundedJson);
  const runs = new Map<number, any>(); let exhausted = true;
  for (let page = 1; page <= 5; page++) {
    const listing = await get('/actions/workflows/' + nightlyScope.workflowId + '/runs?event=schedule&branch=' + encodeURIComponent(config.branch) + '&per_page=5&page=' + page);
    if (!Array.isArray(listing.workflow_runs) || listing.workflow_runs.length > 5 || !Number.isSafeInteger(listing.total_count) || listing.total_count < 0) throw Error('Invalid nightly listing');
    for (const run of listing.workflow_runs) { const key = identity(run); if (runs.has(key.runId)) throw Error('Unstable nightly listing'); runs.set(key.runId, run); }
    if (listing.workflow_runs.length < 5 || runs.size >= listing.total_count) { exhausted = false; break; }
  }
  const ordered = [...runs.values()].sort((a, b) => compareNightly(identity(b), identity(a)));
  const activeRun = ordered.find(r => r.status !== 'completed');
  let selected: any = null, budget = 10;
  for (const head of ordered) {
    if (!['completed', 'queued', 'in_progress', 'waiting', 'pending', 'requested'].includes(head.status)) throw Error('Invalid nightly status');
    for (let attempt = head.run_attempt; attempt >= 1; attempt--) {
      if (attempt === head.run_attempt && head.status !== 'completed') continue;
      if (--budget < 0) throw Error('Nightly attempt search exhausted');
      const exact = await get('/actions/runs/' + head.id + '/attempts/' + attempt);
      const expected = { ...identity(head), attempt }, actual = identity(exact);
      if (compareNightly(actual, expected) !== 0 || actual.runId !== expected.runId || actual.commit !== expected.commit) throw Error('Mismatched exact attempt');
      if (exact.status === 'completed') {
        if (!conclusions.includes(exact.conclusion)) throw Error('Invalid nightly conclusion');
        selected = exact; break;
      }
    }
    if (selected) break;
  }
  if (!selected && exhausted) throw Error('Nightly discovery bound exhausted');
  const now = clock();
  const envelope: NightlyEnvelope = { version: 2, scope: nightlyScope, checkedAt: new Date(now).toISOString(), expiresAt: new Date(now + 60000).toISOString(),
    state: selected ? 'verified' : 'empty', latest: null, active: activeRun ? identity(activeRun) : null, highest: null, continuity: 'verified', archive: null };
  if (selected) {
    const key = identity(selected), path = '/actions/runs/' + key.runId;
    let jobs: NightlyJob[] = [], jobsState: 'available' | 'incomplete' | 'unavailable' = 'unavailable';
    try {
      const listing = await get(path + '/attempts/' + key.attempt + '/jobs?per_page=100');
      if (!Array.isArray(listing.jobs) || listing.jobs.length > 100 || listing.total_count !== listing.jobs.length) throw Error('Incomplete job listing');
      jobs = listing.jobs.map((job: any) => {
        if (job.run_id !== key.runId || job.run_attempt !== key.attempt || job.head_sha !== key.commit || job.status !== 'completed') throw Error('Mismatched attempt job');
        return { id: job.id, name: job.name, outcome: job.conclusion, startedAt: job.started_at ?? null, completedAt: job.completed_at ?? null };
      });
      // Validate metadata separately so corrupt jobs cannot erase a valid failed run identity.
      validateNightly({ ...envelope, latest: { ...key, createdAt: selected.created_at, outcome: selected.conclusion,
        jobs, jobsState: 'incomplete', browserState: 'missing', browserEvidence: null } }, now);
      jobsState = jobs.length === 2 && ['test', 'database'].every(name => jobs.filter(j => j.name === name && j.startedAt && j.completedAt).length === 1) ? 'available' : 'incomplete';
    } catch { jobs = []; }
    let browserEvidence: Evidence | null = null, browserState: NonNullable<NightlyEnvelope['latest']>['browserState'] = 'unavailable';
    try {
      const listing = await get(path + '/artifacts?per_page=100');
      if (!Array.isArray(listing.artifacts)) throw Error('Invalid artifact listing');
      const artifact = await readRunArtifact(config, { id: key.runId, head_sha: key.commit }, key.attempt, listing.artifacts, request, signal, reports);
      if (artifact.evidence) {
        browserState = 'invalid';
        validateNightly({ ...envelope, latest: { ...key, createdAt: selected.created_at, outcome: selected.conclusion,
          jobs, jobsState, browserState: 'available', browserEvidence: artifact.evidence } }, now);
      }
      browserEvidence = artifact.evidence; browserState = artifact.evidenceState;
    } catch { /* Run and job outcomes are independent of browser artifact availability. */ }
    envelope.latest = { ...key, createdAt: selected.created_at, outcome: selected.conclusion, jobs, jobsState, browserState, browserEvidence };
    envelope.highest = key;
  }
  return validateNightly(envelope, now);
}
export function nightlyPipelineRouter(config: HistoryConfig | null, guard: NightlyGuard | null, archive: { read(): Promise<Pipeline | null> } | null,
  load = fetchNightly, clock = Date.now) {
  const router = Router(), reports = new Map<string, { until: number; evidence: Evidence }>();
  let value: NightlyEnvelope | null = null, next = 0, highest: NightlyIdentity | null = null, pending: Promise<void> | null = null;
  router.get('/api/test-pipeline', async (_req, res) => {
    res.set('Cache-Control', 'no-store');
    if (clock() >= next) {
      pending ??= (async () => {
        const now = clock();
        let current: NightlyEnvelope = { version: 2, scope: nightlyScope, checkedAt: new Date(now).toISOString(), expiresAt: new Date(now + 15000).toISOString(),
          state: 'unavailable', latest: null, active: null, highest, continuity: 'verified', archive: null };
        let ticket: Awaited<ReturnType<NightlyGuard['begin']>> | null = null;
        try { if (guard) { ticket = await guard.begin(); if (ticket.highest && (!highest || compareNightly(ticket.highest, highest) > 0)) highest = ticket.highest; } }
        catch { current.continuity = 'unavailable'; }
        try {
          if (!config) throw Error('Not configured');
          const fresh = await load(config, fetch, clock, reports);
          if (highest && (!fresh.latest || compareNightly(fresh.latest, highest) < 0)) throw Error('Previously observed nightly unavailable');
          if (current.continuity === 'unavailable') throw Error('Nightly continuity cannot be verified');
          if (fresh.latest) {
            highest = nightlyIdentity(fresh.latest);
            if (ticket) {
              try { await ticket.save(highest); } catch (error) { current.continuity = 'unavailable'; throw error; }
            }
          }
          current = { ...fresh, highest };
        } catch { current.highest = highest; }
        try { if (archive) current.archive = await archive.read(); } catch { /* Historical fallback has independent integrity and revocation. */ }
        value = validateNightly(current, clock()); next = Date.parse(value.expiresAt);
      })().catch(() => { value = null; next = clock() + 15000; }).finally(() => { pending = null; });
      await pending;
    }
    if (!value) return res.status(502).json({ error: 'Nightly verification unavailable.' });
    return res.json(value);
  });
  return router;
}
