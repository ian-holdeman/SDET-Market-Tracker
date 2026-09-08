import { pipelineRouter } from './server/test-pipeline';
import { TestSnapshotStore, snapshotHistoryRouter } from './server/test-snapshot';
import { testActivityRouter } from './server/test-activity';
import { historyRouter, historyConfig } from './server/test-history';
import { configuredAssetRouter } from './server/assets';
import { marketRouter } from './server/market';
import express from "express";
import path from "path";
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import dotenv from 'dotenv';
import { configuredAccountRouter } from './server/account';

dotenv.config({ path: ['.env.local', '.env'], quiet: true });

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);
  if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  app.use(express.json());
  const history = historyConfig(process.env);
  if(history){
    const directory=path.resolve(process.env.TEST_SNAPSHOT_DIRECTORY || '.telemetry/snapshots');
    const publicDirectory=process.argv.includes('--development') ? path.resolve('dist/client') : path.resolve(fileURLToPath(new URL('../client/', import.meta.url)));
    if(directory===publicDirectory || directory.startsWith(publicDirectory+path.sep))throw Error('TEST_SNAPSHOT_DIRECTORY must be outside public assets.');
    app.use(snapshotHistoryRouter(history,new TestSnapshotStore(directory,{repository:history.repository,branch:history.branch})));
  }
  app.use(historyRouter(history));
  app.use(pipelineRouter(history));
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
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if ((path.extname(req.path) && !req.path.startsWith('/board/')) ||
          /(^|\/)\./.test(req.path) || /^\/(server|@vite|@fs|src)\//.test(req.path)) {
        res.sendStatus(404);
        return;
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

