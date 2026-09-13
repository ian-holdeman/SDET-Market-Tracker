import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchNightly, nightlyPipelineRouter } from '../../server/nightly-pipeline';
import { selectedPipeline } from '../../src/telemetry/pipeline';
import { NightlyGuard, LocalNightlyObjects } from '../../server/nightly-guard';
import { MemoryObjects } from '../test-support/memory-objects';
import { nightlyReplay, validateNightly } from '../../src/telemetry/nightlyPipeline';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import express from 'express';
import { nightlyFixture } from '../../src/tests/fixtures/nightly-pipeline';
import { pipelineFixture, pipelineBrowserEvidence } from '../../src/tests/fixtures/pipeline';
import { validatePipeline, browserResultsAt } from '../../src/telemetry/pipeline';
const config = { repository: selectedPipeline.repository, branch: selectedPipeline.branch, token: 'fixture-only' };
const now = Date.parse('2026-09-12T12:00:00Z');
function run(number: number, attempt = 1, status = 'completed', conclusion = 'success') {
  return { id: 1000 + number, run_number: number, run_attempt: attempt, status, conclusion: status === 'completed' ? conclusion : null,
    workflow_id: selectedPipeline.workflowId, path: selectedPipeline.workflow, repository: { full_name: config.repository },
    head_repository: { full_name: config.repository }, head_branch: config.branch, head_sha: 'a'.repeat(40), event: 'schedule', pull_requests: [],
    created_at: '2026-09-12T08:17:00Z', run_started_at: '2026-09-12T08:17:01Z', updated_at: '2026-09-12T08:30:00Z' };
}
function source(runs: ReturnType<typeof run>[], patch?: (value: any, url: string) => void) {
  const calls: string[] = [];
  const request: typeof fetch = async (input, options) => {
    const url = String(input); calls.push(url);
    assert.equal(options?.redirect, 'error'); assert.ok(options?.signal);
    let result: any;
    if (url.includes('/workflows/')) result = { total_count: runs.length, workflow_runs: runs };
    else {
      const id = Number(url.match(/\/runs\/(\d+)/)?.[1]);
      const head = runs.find(r => r.id === id)!;
      const attempt = Number(url.match(/\/attempts\/(\d+)/)?.[1]) || head.run_attempt;
      if (url.includes('/jobs?')) result = { total_count: 2, jobs: ['test', 'database'].map((name, i) => ({ id: id * 10 + i, name,
        run_id: id, run_attempt: attempt, head_sha: head.head_sha, status: 'completed', conclusion: name === 'database' ? head.conclusion ?? 'success' : 'success',
        started_at: '2026-09-12T08:18:00Z', completed_at: '2026-09-12T08:25:00Z' })) };
      else if (url.includes('/artifacts?')) result = { artifacts: [] };
      else result = { ...head, run_attempt: attempt, status: 'completed', conclusion: head.conclusion ?? 'success' };
    }
    patch?.(result, url); return Response.json(result);
  };
  return { request, calls };
}
test('new nightly identity outranks late old reruns at the same SHA; latest failure remains selected', async () => {
  const fixture = source([run(39, 5), run(40, 1, 'completed', 'failure')]);
  const result = await fetchNightly(config, fixture.request, () => now);
  assert.equal(result.latest.number, 40); assert.equal(result.latest.outcome, 'failure');
  assert.equal(result.latest.browserState, 'missing');
  assert.equal(result.latest.jobs.find((j: any) => j.name === 'database').outcome, 'failure');
});
test('an active rerun uses its exact prior completed attempt without borrowing browser evidence', async () => {
  const fixture = source([run(40, 3, 'in_progress')]);
  const result = await fetchNightly(config, fixture.request, () => now);
  assert.equal(result.latest.attempt, 2); assert.equal(result.active.attempt, 3);
  assert.ok(fixture.calls.some(url => url.includes('/attempts/2/jobs')));
  assert.equal(result.latest.browserEvidence, null);
});
test('cancelled latest nightly with no jobs remains visible and has no invented timing', async () => {
  const fixture = source([run(40, 1, 'completed', 'cancelled')], (value, url) => {
    if (url.includes('/jobs?')) { value.jobs = []; value.total_count = 0; }
  });
  const result = await fetchNightly(config, fixture.request, () => now);
  assert.equal(result.latest.outcome, 'cancelled'); assert.equal(result.latest.jobsState, 'incomplete');
  assert.deepEqual(result.latest.jobs, []);
});
test('scheduled discovery rejects forged scope and exact-attempt identity', async () => {
  for (const mutate of [
    (r: any) => { r.event = 'workflow_dispatch'; }, (r: any) => { r.head_repository.full_name = 'fork/repo'; },
    (r: any) => { r.head_branch = 'other'; }, (r: any) => { r.workflow_id++; }, (r: any) => { r.pull_requests = [{ number: 1 }]; },
  ]) {
    const head = run(40); mutate(head);
    await assert.rejects(fetchNightly(config, source([head]).request, () => now));
  }
  const fixture = source([run(40)], (value, url) => { if (/\/attempts\/1$/.test(url)) value.run_attempt = 2; });
  await assert.rejects(fetchNightly(config, fixture.request, () => now));
});

test('continuity persists one highest identity and rejects late writers, sequential rollback, denial and corruption', async t => {
  const directory = await mkdtemp(path.join(tmpdir(), 'nightly-guard-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  for (const objects of [new MemoryObjects(), new LocalNightlyObjects(directory)]) {
    const first = new NightlyGuard(objects), second = new NightlyGuard(objects);
    const a = { runId: 1040, number: 40, attempt: 1, commit: 'a'.repeat(40) };
    const late = await first.begin(), newer = await second.begin();
    await newer.save(a);
    await assert.rejects(late.save({ ...a, runId: 1039, number: 39 }));
    const restored = await new NightlyGuard(objects).begin();
    assert.deepEqual(restored.highest, a);
    await assert.rejects(restored.save({ ...a, runId: 1039, number: 39, attempt: 10 }));
    await restored.save({ ...a, attempt: 2 });
    assert.equal((await first.begin()).highest?.attempt, 2);
    const stored = await objects.read(first.name, 4096);
    await objects.put(first.name, Buffer.from('{broken'), stored!.generation);
    await assert.rejects(first.begin());
  }
  const denied = new MemoryObjects(); denied.denied = true;
  await assert.rejects(new NightlyGuard(denied).begin());
});

test('partial topology and zero duration remain distinguishable; invalid timing never becomes a zero bar', async () => {
  const fixture = source([run(40)], (value, url) => {
    if (url.includes('/jobs?')) {
      value.jobs[0].completed_at = value.jobs[0].started_at;
      value.jobs[1].started_at = null; value.jobs[1].completed_at = null;
    }
  });
  const result = await fetchNightly(config, fixture.request, () => now);
  assert.equal(result.latest?.jobsState, 'incomplete');
  const replay = nightlyReplay(result)!;
  assert.equal(replay.jobs.length, 1);
  assert.equal(replay.jobs[0].startedAt, replay.jobs[0].completedAt);
  const invalid = structuredClone(result); invalid.latest!.jobs[0].completedAt = '2026-09-12T01:00:00Z';
  assert.throws(() => validateNightly(invalid, now));
});

test('bounded discovery reports exhaustion and never picks guessed success after unknown attempts', async () => {
  let calls = 0;
  const request: typeof fetch = async input => {
    calls++;
    const page = Number(new URL(String(input)).searchParams.get('page'));
    return Response.json({ total_count: 100, workflow_runs: Array.from({ length: 5 }, (_, i) => run(100 - page * 5 - i, 1, 'in_progress')) });
  };
  await assert.rejects(fetchNightly(config, request, () => now), /bound exhausted/);
  assert.equal(calls, 5);
});

test('request-scoped cache coalesces, persists before response, discloses removal, and recovers without archive masking', async t => {
  let time = now, calls = 0, fail = false, number = 40, archiveDenied = false;
  const objects = new MemoryObjects(), guard = new NightlyGuard(objects);
  const archive = () => validatePipeline({ ...pipelineFixture(time), source: 'archive', archivePublishedAt: new Date(time - 1000).toISOString(), browserEvidence: pipelineBrowserEvidence() }, time);
  const load = async () => { calls++; if (fail) throw Error('private source detail'); return nightlyFixture(time, number, 'failure'); };
  async function serve() {
    const server = express().use(nightlyPipelineRouter(config, guard, { read: async () => { if (archiveDenied) throw Error('corrupt archive'); return archive(); } }, load, () => time)).listen(0, '127.0.0.1');
    await new Promise<void>(resolve => server.once('listening', resolve));
    t.after(() => { server.closeAllConnections(); server.close(); });
    return `http://127.0.0.1:${(server.address() as { port: number }).port}/api/test-pipeline`;
  }
  const url = await serve();
  const pages = await Promise.all([fetch(url).then(r => r.json()), fetch(url).then(r => r.json())]);
  assert.equal(calls, 1); assert.equal((await guard.begin()).highest?.number, 40);
  for (const page of pages) { assert.equal(page.latest.outcome, 'failure'); assert.equal(page.archive.source, 'archive'); }
  time += 60000; fail = true;
  const failed = await (await fetch(url)).json();
  assert.equal(failed.latest, null); assert.equal(failed.state, 'unavailable'); assert.equal(failed.archive.number, 30);
  assert.equal(JSON.stringify(failed).includes('private source detail'), false);
  await fetch(url); assert.equal(calls, 2);
  time += 15000; fail = false; number = 39;
  const restarted = await serve();
  assert.equal((await (await fetch(restarted)).json()).state, 'unavailable');
  time += 15000; number = 41;
  assert.equal((await (await fetch(restarted)).json()).latest.number, 41);
  time += 60000; archiveDenied = true; number = 42;
  const independent = await (await fetch(restarted)).json();
  assert.equal(independent.latest.number, 42); assert.equal(independent.archive, null);
});

test('nightly cases preserve retry success, retry failure and incomplete checkpoints without fabricating completions', () => {
  const value = nightlyFixture(now), report = pipelineBrowserEvidence();
  Object.assign(report, { runId: String(value.latest!.runId), commitSha: value.latest!.commit, completedAt: null, runnerStatus: 'incomplete' });
  value.latest!.createdAt = '2026-09-08T10:00:00Z';
  value.latest!.jobs[0].startedAt = '2026-09-08T10:07:00Z'; value.latest!.jobs[0].completedAt = '2026-09-08T10:12:00Z';
  report.tests[0].attempts[0].status = 'failed';
  report.tests[0].attempts.push({ retry: 1, status: 'passed', durationMs: 0, startedAt: '2026-09-08T10:09:02Z' });
  report.tests[1].attempts = [];
  value.latest!.browserState = 'available'; value.latest!.browserEvidence = report;
  const parsed = validateNightly(value, now), replay = nightlyReplay(parsed)!;
  assert.equal(browserResultsAt(replay, now).find(t => t.id === 'case-0')?.outcome, 'flaky');
  assert.equal(browserResultsAt(replay, now).some(t => t.id === 'case-1'), false);
  report.tests[0].attempts[1].status = 'failed';
  assert.equal(browserResultsAt(nightlyReplay(validateNightly(value, now))!, now).find(t => t.id === 'case-0')?.outcome, 'failed');
  report.tests[0].attempts[1].durationMs = 9999999;
  assert.equal(nightlyReplay(validateNightly(value, now))!.browserEvidence, null);
});

test('failed-jobs-only attempt exposes only its database job and missing browser artifact', async () => {
  const fixture = source([run(40, 2, 'completed', 'failure')], (value, url) => {
    if (url.includes('/jobs?')) { value.jobs = value.jobs.filter((j: any) => j.name === 'database'); value.total_count = 1; }
  });
  const result = await fetchNightly(config, fixture.request, () => now);
  assert.equal(result.latest!.attempt, 2); assert.equal(result.latest!.jobsState, 'incomplete');
  assert.deepEqual(result.latest!.jobs.map(j => j.name), ['database']); assert.equal(result.latest!.browserEvidence, null);
});

test('the browser boundary rejects a false complete topology and impossible report dates', () => {
  const value = nightlyFixture(now);
  value.latest.jobs = [];
  assert.throws(() => validateNightly(value, now), /topology/);
  value.latest.jobsState = 'incomplete';
  const report = pipelineBrowserEvidence();
  Object.assign(report, { runId: String(value.latest.runId), commitSha: value.latest.commit });
  value.latest.browserState = 'available'; value.latest.browserEvidence = report;
  // The exact identity alone cannot validate case evidence from before this run.
  assert.throws(() => validateNightly(value, now), /report interval/);
});
