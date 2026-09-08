import { loadPipelineWithArchive, pipelineRouter } from './server/test-pipeline';
import { CloudSnapshotStore, TestSnapshotStore, snapshotHistoryRouter } from './server/test-snapshot';
import { GoogleObjectStore } from './server/object-store';
import { PipelineArchive } from './server/test-archive';
import { productionConfig } from './server/production';
import { gracefulShutdown } from './server/lifecycle';
import { testActivityRouter } from './server/test-activity';
import { fetchHistory, historyRouter, historyConfig } from './server/test-history';
import { configuredAssetRouter } from './server/assets';
import { marketRouter } from './server/market';
import express from "express";
import path from "path";
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import dotenv from 'dotenv';
import { configuredAccountRouter } from './server/account';
import { configureSecurity, safeRequestErrors } from './server/security';

if (!process.env.K_SERVICE && process.env.APP_DEPLOYMENT !== 'cloud-run') dotenv.config({ path: ['.env.local', '.env'], quiet: true });

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);
  if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }
  let build: unknown = null;
  if (process.env.K_SERVICE || process.env.APP_DEPLOYMENT === 'cloud-run') {
    try { build = JSON.parse(await readFile(new URL('./build-config.json', import.meta.url), 'utf8')); } catch { /* validation below */ }
  }
  const production = productionConfig(process.env, build);
  let draining = false;
  app.use((_req, res, next) => {
    if (draining) return res.status(503).set('Cache-Control','no-store').json({error:'Server restarting; retry shortly.'});
    if (production) res.set('Strict-Transport-Security', 'max-age=31536000');
    next();
  });

  configureSecurity(app, process.env.VITE_SUPABASE_URL, process.argv.includes('--development'));
  app.use(express.json({ limit: '16kb' }));
  const history = historyConfig(process.env);
  if(history){
    const directory=path.resolve(process.env.TEST_SNAPSHOT_DIRECTORY || '.telemetry/snapshots');
    const publicDirectory=process.argv.includes('--development') ? path.resolve('dist/client') : path.resolve(fileURLToPath(new URL('../client/', import.meta.url)));
    if(directory===publicDirectory || directory.startsWith(publicDirectory+path.sep))throw Error('TEST_SNAPSHOT_DIRECTORY must be outside public assets.');
    const scope = {repository:history.repository,branch:history.branch};
    const store = process.env.TEST_SNAPSHOT_BUCKET
      ? new CloudSnapshotStore(new GoogleObjectStore(process.env.TEST_SNAPSHOT_BUCKET), scope)
      : new TestSnapshotStore(directory, scope);
    app.use(snapshotHistoryRouter(history,store,fetchHistory,Date.now,{requestScoped:!!production || !!process.env.TEST_SNAPSHOT_BUCKET}));
  }
  app.use(historyRouter(history));
  const archive = process.env.TEST_ARCHIVE_BUCKET ? new PipelineArchive(new GoogleObjectStore(process.env.TEST_ARCHIVE_BUCKET)) : null;
  app.use(pipelineRouter(history, config => loadPipelineWithArchive(config,archive)));
  app.use(testActivityRouter(historyConfig(process.env)));
  app.use(configuredAccountRouter(process.env));
  app.use(configuredAssetRouter(process.env));

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });

  app.use(marketRouter());

  // Explicit JSON 404 for any unmatched /api/* route so it never falls through to HTML SPA
  app.all('/api/*', (_req, res) => {
    res.status(404).json({ error: 'API route not found' });
  });
  app.use(safeRequestErrors);

  // Vite middleware for development
  if (process.argv.includes('--development')) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = fileURLToPath(new URL('../client/', import.meta.url));
    if (!existsSync(path.join(distPath, 'index.html'))) {
      throw new Error('Production client build is missing. Run npm run build before npm start.');
    }
    app.use(express.static(distPath, { setHeaders(res, file) {
      // Only hashed Vite assets get immutable caching; HTML, PDFs and manifests revalidate.
      res.setHeader('Cache-Control', /[/\\]assets[/\\].+-[A-Za-z0-9_-]{8,}\.(?:js|css|mjs|svg)$/.test(file)
        ? 'public, max-age=31536000, immutable' : 'no-cache');
    } }));
    app.get('*', (req, res) => {
      if ((path.extname(req.path) && !req.path.startsWith('/board/')) ||
          /(^|\/)\./.test(req.path) || /^\/(server|@vite|@fs|src)\//.test(req.path)) {
        res.sendStatus(404);
        return;
      }
      res.set('Cache-Control', 'no-cache').sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
  server.requestTimeout = 30000;
  server.headersTimeout = 15000;
  const shutdown = gracefulShutdown(server, { onDrain: () => { draining = true; } });
  const stop = () => { void shutdown().then(() => { process.exitCode = 0; }); };
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);
}

startServer().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

