import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readFirebaseConfig } from '../../src/lib/firebaseConfig';
import { summarizeReport } from '../test-report';

function report(status = 'expected', results = [{ status: 'passed', duration: 5 }]) {
  return {
    stats: { startTime: '2026-09-07T00:00:00.000Z', duration: 5,
      expected: Number(status === 'expected'), unexpected: Number(status === 'unexpected'),
      flaky: Number(status === 'flaky'), skipped: Number(status === 'skipped') },
    suites: [{ title: 'Navigation', file: 'navigation.spec.ts', specs: [{ title: 'routes',
      tests: [{ status, projectName: 'chromium', results }] }] }],
    errors: [],
  };
}

test('Firebase validation names missing fields without disclosing supplied values', () => {
  assert.throws(() => readFirebaseConfig({ VITE_FIREBASE_API_KEY: 'private-test-value' }), (error: Error) => {
    assert.match(error.message, /VITE_FIREBASE_PROJECT_ID/);
    assert.match(error.message, /VITE_FIREBASE_APP_ID/);
    assert.doesNotMatch(error.message, /private-test-value/);
    return true;
  });
  assert.throws(() => readFirebaseConfig({ VITE_FIREBASE_API_KEY: 'YOUR_KEY' }), /API_KEY/);
  const values = { VITE_FIREBASE_API_KEY: 'test-key', VITE_FIREBASE_PROJECT_ID: 'demo-test', VITE_FIREBASE_APP_ID: 'test-app' };
  assert.equal(readFirebaseConfig(values).databaseId, '(default)');
  assert.equal(readFirebaseConfig({ ...values, VITE_FIREBASE_DATABASE_ID: 'named-test' }).databaseId, 'named-test');
});

test('telemetry preserves failures, flaky retries, every project, and run-level errors', () => {
  const passed = summarizeReport(report());
  assert.equal(passed.status, 'passed');
  assert.equal(Object.hasOwn(passed.suites[0].tests[0], 'error'), false);
  assert.equal(summarizeReport(report('unexpected', [{ status: 'failed', duration: 5 }])).status, 'failed');
  assert.equal(summarizeReport(report('unexpected', [{ status: 'timedOut', duration: 5 }])).status, 'failed');
  const retried = summarizeReport(report('flaky', [{ status: 'failed', duration: 2 }, { status: 'passed', duration: 3 }]));
  assert.equal(retried.status, 'flaky');
  assert.equal(retried.totalTests, 1);
  assert.equal(retried.passed, 0);
  assert.equal(retried.suites[0].tests[0].durationMs, 5);
  const multiple = report();
  multiple.suites[0].specs[0].tests.push({ status: 'expected', projectName: 'webkit', results: [{ status: 'passed', duration: 2 }] });
  multiple.stats.expected = 2;
  assert.equal(summarizeReport(multiple).suites[0].tests.length, 2);
  const globalFailure = { ...report(), errors: [{ message: 'global teardown failed' }] };
  assert.equal(summarizeReport(globalFailure).status, 'failed');
});

test('invalid, inconsistent, interrupted, empty, and skipped-only reports cannot become passing runs', () => {
  for (const value of [null, {}, { suites: [], stats: {} }, report('skipped', []),
    { ...report(), suites: [] }, report('expected', [{ status: 'interrupted', duration: 1 }]),
    report('expected', [{ status: 'failed', duration: 1 }])]) {
    assert.throws(() => summarizeReport(value), /Invalid or empty/);
  }
});

test('missing report exits nonzero before Firebase access', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'market-report-'));
  try {
    const result = spawnSync(process.execPath, [
      fileURLToPath(new URL('../../node_modules/tsx/dist/cli.mjs', import.meta.url)),
      fileURLToPath(new URL('../ingest-test-results.ts', import.meta.url)),
    ], { cwd: directory, encoding: 'utf8', timeout: 10000 });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Telemetry ingestion failed.*ENOENT/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('production starts outside the project root and serves only public artifacts', { timeout: 20000 }, async (t) => {
  const socket = createServer();
  await new Promise<void>((resolve) => socket.listen(0, '127.0.0.1', resolve));
  const port = (socket.address() as { port: number }).port;
  await new Promise<void>((resolve, reject) => socket.close((error) => error ? reject(error) : resolve()));
  const serverPath = fileURLToPath(new URL('../../dist/server/server.mjs', import.meta.url));
  const child = spawn(process.execPath, [serverPath], {
    cwd: tmpdir(), env: { ...process.env, PORT: String(port), NODE_ENV: 'development' },
    windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const closed = new Promise<void>((resolve) => child.once('close', () => resolve()));
      child.kill();
      await closed;
    }
  });
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Production startup timed out')), 10000);
    child.once('error', (error) => { clearTimeout(timer); reject(error); });
    child.once('exit', (code) => { clearTimeout(timer); reject(new Error(`Server exited: ${code}`)); });
    child.stdout.on('data', (chunk) => {
      if (String(chunk).includes('Server running')) { clearTimeout(timer); resolve(); }
    });
  });
  const base = `http://127.0.0.1:${port}`;
  assert.equal((await (await fetch(`${base}/api/health`)).json()).status, 'ok');
  const page = await fetch(`${base}/board?symbol=NVDA`);
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /<div id="root">/);
  const asset = html.match(/src="(\/assets\/[^" ]+\.js)"/)?.[1];
  assert.ok(asset);
  assert.equal((await fetch(`${base}${asset}`)).status, 200);
  for (const route of ['/server.cjs', '/server.cjs.map', '/server.mjs', '/server.mjs.map', '/server/server.mjs', '/server.ts', '/.env', '/@vite/client', '/assets/missing.js']) {
    const response = await fetch(`${base}${route}`);
    assert.equal(response.status, 404, route);
  }
  const unknown = await fetch(`${base}/api/not-real`);
  assert.equal(unknown.status, 404);
  assert.match(unknown.headers.get('content-type')!, /application\/json/);
  const invalidPort = spawnSync(process.execPath, [serverPath], {
    env: { ...process.env, PORT: 'invalid' }, encoding: 'utf8', timeout: 10000,
  });
  assert.equal(invalidPort.status, 1);
  assert.match(invalidPort.stderr, /PORT must be/);
});
