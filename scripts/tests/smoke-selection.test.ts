import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('commit smoke keeps essential browser coverage within budget and inside the full regression inventory', () => {
  const inventory = (script: string) => {
    const result = spawnSync(process.execPath, [script, ...(script.includes('run-browser-smoke') ? [] : ['test']), '--list', '--reporter=json'],
      { encoding: 'utf8', windowsHide: true, timeout: 30000, maxBuffer: 5_000_000,
        env: { ...process.env, IMT_BROWSER_SUITE: '', FORCE_COLOR: '0' } });
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    const cases: { file: string; name: string; project: string }[] = [];
    const visit = (suite: any) => {
      for (const spec of suite.specs || []) for (const attempt of spec.tests)
        cases.push({ file: spec.file, name: spec.title, project: attempt.projectName });
      for (const child of suite.suites || []) visit(child);
    };
    for (const suite of report.suites) visit(suite);
    return cases;
  };
  const smoke = inventory('scripts/run-browser-smoke.mjs');
  const full = inventory('node_modules/@playwright/test/cli.js');
  assert(smoke.length > 0 && smoke.length <= 20, 'Keep commit browser smoke small; review coverage before raising its budget');
  assert(full.length > smoke.length);
  const required = ['navigation/navigation.spec.ts', 'auth/auth.spec.ts', 'board/the-board.spec.ts',
    'board/market-data.spec.ts', 'telemetry/history.spec.ts', 'settings/settings.spec.ts',
    'pwa/install.spec.ts', 'pwa/worker.spec.ts'];
  assert.deepEqual([...new Set(smoke.map(c => c.file))].sort(), required.sort());
  assert.deepEqual([...new Set(smoke.map(c => c.project))].sort(),
    ['android-pwa-smoke', 'chromium-desktop-smoke', 'mobile-safari-smoke']);
  for (const selected of smoke) assert(full.some(c => c.file === selected.file && c.name === selected.name && c.project === selected.project.replace(/-smoke$/, '')));
  assert(full.some(c => c.file === 'board/feed-status.spec.ts' && c.name.endsWith('in dark')), 'Nightly retains the detailed refresh regression');
});
