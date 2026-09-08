import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
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
