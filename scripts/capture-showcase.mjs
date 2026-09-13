import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { scenarios } from './showcase-scenarios.mjs';
import { gzipSync } from 'node:zlib';

if (process.versions.node.split('.')[0] !== '22') throw Error('Use Node 22 from .nvmrc.');
const only = process.argv.find(arg => arg.startsWith('--scenario='))?.slice(11);
if (only && !scenarios.some(s => s.id === only)) throw Error('Unknown showcase scenario');
const directory = `.telemetry/showcase/${new Date().toISOString().replace(/[:.]/g, '-')}`;
mkdirSync(directory, { recursive: true });
writeFileSync('.telemetry/showcase/latest.json', JSON.stringify({ directory }));
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', windowsHide: true }).trim();
const files = git('ls-files', '--cached', '--others', '--exclude-standard').split('\n')
  .filter(p => /^(src\/|server\/|scripts\/|server\.ts$|playwright.*\.ts$|package.*\.json$|vite\.config\.ts$)/.test(p) && existsSync(p)).sort();
const sourceFiles = Object.fromEntries(files.map(p => [p, createHash('sha256').update(readFileSync(p)).digest('hex')]));
writeFileSync(`${directory}/source.json`, JSON.stringify({ commit: git('rev-parse', 'HEAD'),
  workingTreeModified: !!git('status', '--porcelain'),
  sourceDigest: createHash('sha256').update(JSON.stringify(sourceFiles)).digest('hex'), sourceFiles,
  node: process.version, playwright: JSON.parse(readFileSync('node_modules/@playwright/test/package.json', 'utf8')).version,
}, null, 2));
writeFileSync(`${directory}/source.patch`, execFileSync('git', ['diff', 'HEAD', '--binary'], { windowsHide: true, maxBuffer: 32 * 1024 * 1024 }));
writeFileSync(`${directory}/source.json.gz`, gzipSync(JSON.stringify(Object.fromEntries(files.map(p => [p, readFileSync(p, 'utf8')])))));
const run = (args, env = process.env) => {
  const result = spawnSync(process.execPath, args, { env, stdio: 'inherit', windowsHide: true });
  if (result.status !== 0) throw Error(`Command failed: ${args.join(' ')}`);
};
try {
  run([process.env.npm_execpath, 'run', 'build:e2e']);
  run(['node_modules/@playwright/test/cli.js', 'test', '--config=playwright.showcase.config.ts'], { ...process.env, SHOWCASE_CAPTURE: '1', SHOWCASE_DIRECTORY: directory, SHOWCASE_ONLY: only ?? '' });
} finally {
  run([process.env.npm_execpath, 'run', 'build']);
}
