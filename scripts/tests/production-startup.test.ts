import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

test('Cloud Run refuses to start with incomplete release configuration', { timeout: 15000 }, async (t) => {
  const file = fileURLToPath(new URL('../../dist/server/server.mjs', import.meta.url));
  const child = spawn(process.execPath, [file], { cwd: tmpdir(), windowsHide: true,
    env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, K_SERVICE: 'fixture-service', PORT: '3199' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const closed = new Promise<void>(resolve => child.once('close', () => resolve()));
      child.kill(); await closed;
    }
  });
  let output = '';
  child.stderr.on('data', value => { output += value; });
  const result = await new Promise<'started'|number|null>((resolve, reject) => {
    const deadline = setTimeout(() => reject(Error('Production startup deadline exceeded')), 10000);
    child.once('error', error => { clearTimeout(deadline); reject(error); });
    child.once('exit', code => { clearTimeout(deadline); resolve(code); });
    child.stdout.on('data', value => { if (String(value).includes('Server running')) { clearTimeout(deadline); resolve('started'); } });
  });
  if (result === 'started') {
    const closed = new Promise<void>(resolve => child.once('close', () => resolve()));
    child.kill(); await closed;
  }
  assert.equal(result, 1, 'Cloud Run must fail closed before listening');
  assert.match(output, /Production configuration/);
});
