import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { runInNewContext } from 'node:vm';
import { zipSync, strToU8 } from 'fflate';
import { fetchHistory } from '../../server/test-history';
import { evidence } from '../../src/tests/fixtures/testEvidence';
import { summarize, validateEvidence } from '../../src/telemetry/contract';

const config = { repository: 'owner/repo', branch: 'main', token: 'fixture' };
const workflow = readFileSync(new URL('../../.github/workflows/playwright.yml', import.meta.url), 'utf8').replace(/\r\n/g, '\n');

test('native nightly schedule covers every day without commit, prior-success or clock gates', () => {
  assert.match(workflow, /schedule:\s*\n(?:\s*#[^\n]*\n)*\s*- cron: ['"]17 2 \* \* \*['"]\s*\n\s*timezone: ['"]America\/Denver['"]/);
  assert.match(workflow, /push:\s*\n\s*branches: \[main, master\]/);
  assert.match(workflow, /pull_request:\s*\n\s*branches: \[main, master\]/);
  assert.match(workflow, /workflow_dispatch:/);
  // Both complete jobs start for every trigger, including an unchanged successful SHA.
  assert.deepEqual([...workflow.split('\njobs:\n')[1].matchAll(/^  ([a-z]+):$/gm)].map(m => m[1]), ['test', 'database']);
  assert.doesNotMatch(workflow, /^    (if|needs):|concurrency:|paths-ignore:|skip-duplicate|test:market:live|test:market:coverage/m);
  for (const command of ['lint', 'build', 'build:e2e', 'test:baseline', 'test:e2e', 'db:start', 'db:reset', 'db:test', 'db:lint', 'test:auth', 'db:stop']) {
    assert.ok(workflow.includes(`run: npm run ${command}`), command);
  }
});

test('publication gates retain failed-run evidence for trusted events and exclude PRs', () => {
  const conditions = [...workflow.matchAll(/^        if: (.+)$/gm)].map(m => m[1]);
  const [ingest, upload] = conditions;
  for (const event of ['push', 'workflow_dispatch', 'schedule', 'pull_request', 'pull_request_target', 'repository_dispatch']) {
    for (const dependencies of ['success', 'failure', 'skipped']) {
      const context = { always: () => true, github: { event_name: event }, steps: { dependencies: { outcome: dependencies } } };
      const trusted = ['push', 'workflow_dispatch', 'schedule'].includes(event);
      assert.equal(runInNewContext(ingest, context), trusted && dependencies === 'success', `ingest ${event}/${dependencies}`);
      assert.equal(runInNewContext(upload, context), trusted, `upload ${event}/${dependencies}`);
    }
  }
  assert.match(workflow, /if-no-files-found: error/);
  assert.match(workflow, /overwrite: false/);
  assert.doesNotMatch(workflow, /continue-on-error:/);
});

test('Denver boundary fixtures document native DST targets; no local time gate rejects delayed runs', () => {
  const zone = workflow.match(/timezone: ['"]([^'"]+)['"]/)?.[1];
  assert.equal(zone, 'America/Denver');
  const format = new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  // GitHub owns scheduling, including advancing a nonexistent 02:17 to 03:00.
  // These verify zone boundaries, not delivery by GitHub's scheduler.
  for (const [utc, local] of [
    ['2026-03-07T09:17:00Z', '02:17'],
    ['2026-03-08T08:59:00Z', '01:59'],
    ['2026-03-08T09:00:00Z', '03:00'],
    ['2026-03-09T08:17:00Z', '02:17'],
    ['2026-10-31T08:17:00Z', '02:17'],
    ['2026-11-01T07:17:00Z', '01:17'],
    ['2026-11-01T08:17:00Z', '01:17'],
    ['2026-11-01T09:17:00Z', '02:17'],
    ['2026-11-02T09:17:00Z', '02:17'],
  ]) assert.equal(format.format(new Date(utc)), local, utc);
});

function source(id = 101, attempt = 1) {
  return { id, run_attempt: attempt, run_number: id, head_branch: 'main', head_sha: evidence().commitSha,
    path: '.github/workflows/playwright.yml', event: 'schedule', head_repository: { full_name: config.repository },
    status: 'completed', conclusion: 'success', run_started_at: evidence().startedAt };
}

function historyFixture(runs = [source()], report: ReturnType<typeof evidence> | null = evidence(), older = source(101, 1)) {
  const request: typeof fetch = async (input, options) => {
    const url = String(input);
    if (url.includes('/workflows/')) return Response.json({ workflow_runs: runs });
    if (url.includes('/attempts/')) return Response.json(older);
    if (url.includes('/artifacts?')) {
      const id = Number(url.match(/\/runs\/(\d+)/)![1]);
      return Response.json({ artifacts: report ? [1, 2].map(attempt => ({
        name: `test-evidence-v1-${id}-${attempt}`, id: id * 10 + attempt, size_in_bytes: 100,
        expired: false, workflow_run: { id, head_sha: evidence().commitSha, head_branch: 'main' },
      })) : [] });
    }
    if (url.endsWith('/zip')) return new Response(null, { status: 302, headers: { location: `https://fixture.blob.core.windows.net/${url.match(/artifacts\/(\d+)/)![1]}` } });
    assert.equal(options?.headers, undefined);
    const artifactId = Number(new URL(url).pathname.slice(1));
    return new Response(zipSync({ 'telemetry.json': strToU8(JSON.stringify({ ...report, runId: String(Math.floor(artifactId / 10)), runAttempt: artifactId % 10 })) }));
  };
  return fetchHistory(config, request);
}

test('nightly history retains separate runs and attempts for the same already-passing commit', async () => {
  const feed = await historyFixture([source(102), source(101, 2)]);
  assert.deepEqual(feed.runs.map(r => [r.id, r.attempt, r.status]), [['102', 1, 'passed'], ['101', 2, 'passed'], ['101', 1, 'passed']]);
  assert.equal(new Set(feed.runs.map(r => r.commitSha)).size, 1);
});

test('scheduled history preserves source rejection in the listing and prior attempts', async () => {
  for (const patch of [
    { event: 'pull_request' }, { event: 'pull_request_target' }, { event: 'repository_dispatch' },
    { head_branch: 'other' }, { path: '.github/workflows/other.yml' }, { head_repository: { full_name: 'fork/repo' } },
  ]) {
    assert.equal((await historyFixture([{ ...source(), ...patch }])).runs.length, 0);
    await assert.rejects(historyFixture([source(101, 2)], evidence(), { ...source(), ...patch }));
  }
  for (const patch of [{ id: 999 }, { run_attempt: 3 }, { head_sha: 'b'.repeat(40) }]) {
    await assert.rejects(historyFixture([source(101, 2)], evidence(), { ...source(), ...patch }));
  }
  for (const event of ['push', 'workflow_dispatch']) assert.equal((await historyFixture([{ ...source(), event }])).runs[0].status, 'passed');
});

test('scheduled publication preserves retry, missing and interrupted cases and database failure', async () => {
  const report = evidence();
  for (const [attempts, expected] of [
    [['passed'], 'passed'], [['failed', 'passed'], 'flaky'], [['failed', 'failed'], 'failed'],
    [['interrupted'], 'interrupted'], [[], 'incomplete'],
  ] as const) {
    report.tests[0].attempts = attempts.map((status, retry) => ({ status, retry, durationMs: 1, startedAt: `2026-09-07T00:00:0${retry + 1}.000Z` }));
    const run = (await historyFixture([source()], report)).runs[0];
    assert.equal(run.status, expected);
    assert.equal(summarize(run.evidence!).total, 1);
    assert.deepEqual(run.evidence!.tests[0].attempts, report.tests[0].attempts);
  }
  const databaseFailure = (await historyFixture([{ ...source(), conclusion: 'failure' }])).runs[0];
  assert.equal(databaseFailure.status, 'failed');
  assert.equal(summarize(databaseFailure.evidence!).passRate, 100);
  for (const conclusion of ['success', 'failure', 'cancelled', 'timed_out']) {
    const run = (await historyFixture([{ ...source(), conclusion }], null)).runs[0];
    assert.equal(run.evidenceState, 'missing');
    assert.equal(run.evidence, null);
    assert.notEqual(run.status, 'passed');
  }
  const active = (await historyFixture([{ ...source(), status: 'in_progress', conclusion: null! }])).runs[0];
  assert.equal(active.evidenceState, 'pending');
});

test('ingestion admits scheduled evidence but cannot turn validation success into test success', () => {
  const cli = fileURLToPath(new URL('../../node_modules/tsx/dist/cli.mjs', import.meta.url));
  const script = fileURLToPath(new URL('../ingest-test-results.ts', import.meta.url));
  for (const event of ['schedule', 'push', 'workflow_dispatch', 'pull_request']) {
    const dir = mkdtempSync(path.join(tmpdir(), 'nightly-ingestion-'));
    try {
      mkdirSync(path.join(dir, '.telemetry'));
      const report = evidence();
      report.tests[0].attempts[0].status = 'failed';
      report.runnerStatus = 'failed';
      const input = path.join(dir, '.telemetry/input.json');
      const output = path.join(dir, '.telemetry/publish/telemetry.json');
      writeFileSync(input, JSON.stringify(report), 'utf8');
      const env = { ...process.env, GITHUB_ACTIONS: 'true', GITHUB_EVENT_NAME: event, GITHUB_RUN_ID: report.runId, GITHUB_RUN_ATTEMPT: '1', GITHUB_SHA: report.commitSha };
      const run = (patch = {}) => spawnSync(process.execPath, [cli, script, '--github'], { cwd: dir, encoding: 'utf8', env: { ...env, ...patch } });
      const trusted = event !== 'pull_request';
      assert.equal(run().status, trusted ? 0 : 1, event);
      assert.equal(existsSync(output), trusted);
      if (!trusted) continue;
      assert.equal(summarize(validateEvidence(JSON.parse(readFileSync(output, 'utf8')))).status, 'failed');
      for (const patch of [{ GITHUB_RUN_ID: '102' }, { GITHUB_RUN_ATTEMPT: '2' }, { GITHUB_SHA: 'b'.repeat(40) }]) {
        assert.equal(run(patch).status, 1);
        assert.equal(summarize(validateEvidence(JSON.parse(readFileSync(output, 'utf8')))).status, 'incomplete');
      }
      rmSync(input);
      assert.equal(run().status, 1);
      assert.equal(summarize(validateEvidence(JSON.parse(readFileSync(output, 'utf8')))).passRate, null);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  }
});
