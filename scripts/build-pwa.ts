import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

// Generate only explicit offline resources; never enumerate application bundles or media.
export function buildPwa() {
  const theme = readFileSync('src/theme.css', 'utf8').replace(/@custom-variant[^;]+;/g, '').replace('@theme', ':root');
  const offline = readFileSync('pwa/offline.html', 'utf8').replace('__THEME__', theme);
  const worker = readFileSync('pwa/sw.js', 'utf8');
  const version = createHash('sha256').update(JSON.stringify([
    worker, offline, readFileSync('public/offline.js', 'utf8'), readFileSync('public/appearance.js', 'utf8'),
  ])).digest('hex').slice(0, 16);
  writeFileSync('dist/client/offline.html', offline, 'utf8');
  writeFileSync('dist/client/sw.js', worker.replace('__VERSION__', version), 'utf8');
}
