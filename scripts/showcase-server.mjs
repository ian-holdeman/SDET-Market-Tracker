import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// An empty working directory prevents dotenv from reading personal settings.
// Only OS necessities are inherited; no account/history secrets reach this server.
const cwd = await mkdtemp(path.join(tmpdir(), 'market-showcase-'));
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
  /^(path|systemroot|windir|temp|tmp|comspec)$/i.test(key)));
const child = spawn(process.execPath, [fileURLToPath(new URL('../dist/server/server.mjs', import.meta.url))], {
  cwd, env: { ...env, PORT: '3100' }, stdio: 'inherit', windowsHide: true,
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill());
child.on('exit', async code => { await rm(cwd, { recursive: true, force: true }); process.exitCode = code ?? 1; });
