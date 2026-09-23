import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

// Independent loopback origin for actual worker update responses. Playwright cannot
// route updated worker scripts. Public files only; no environment or upstream access.
export async function pwaUpdateServer() {
  const root = path.resolve('dist/client');
  const original = await readFile(path.join(root, 'sw.js'), 'utf8');
  const state = { version: 'original', fail: false };
  const server = createServer(async (request, response) => {
    const url = new URL(request.url!, 'http://localhost');
    response.setHeader('Cache-Control', 'no-store');
    if (url.pathname === '/sw.js') {
      response.setHeader('Content-Type', 'text/javascript');
      const content = state.version === 'original' ? original : original.replace(/imt-pwa-offline-[a-f0-9]{16}/g, `imt-pwa-offline-${state.version}`);
      response.end(state.fail ? content.replace("const RESOURCES = [", "const RESOURCES = ['/missing-offline.html', ") : content);
      return;
    }
    let file = path.resolve(root, '.' + url.pathname);
    if (!file.startsWith(root + path.sep) && file !== root) { response.writeHead(404).end(); return; }
    if (url.pathname.startsWith('/api/')) { response.writeHead(503, { 'Content-Type': 'application/json' }).end('{}'); return; }
    if (!path.extname(file)) file = path.join(root, 'index.html');
    try {
      const content = await readFile(file);
      response.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.woff2': 'font/woff2' } as Record<string, string>)[path.extname(file)] || 'application/octet-stream');
      response.end(content);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  return { origin, state, close: () => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())) };
}
