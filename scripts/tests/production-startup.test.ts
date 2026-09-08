import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

test('Cloud Run refuses to start with incomplete release configuration', async () => {
  const file = fileURLToPath(new URL('../../dist/server/server.mjs', import.meta.url));
  const child = spawn(process.execPath, [file], { cwd: tmpdir(), windowsHide: true,
    env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, K_SERVICE: 'fixture-service', PORT: '3199' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stderr.on('data', value => { output += value; });
  const result = await new Promise<'started'|number|null>((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', resolve);
    child.stdout.on('data', value => { if (String(value).includes('Server running')) resolve('started'); });
  });
  if (result === 'started') {
    const closed = new Promise<void>(resolve => child.once('close', () => resolve()));
    child.kill(); await closed;
  }
  assert.equal(result, 1, 'Cloud Run must fail closed before listening');
  assert.match(output, /Production configuration/);
});
