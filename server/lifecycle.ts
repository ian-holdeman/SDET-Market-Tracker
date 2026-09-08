import type { Server } from 'node:http';

/** Cloud Run allows a bounded SIGTERM grace period; abrupt kills still need atomic storage. */
export function gracefulShutdown(server: Server, options: { graceMs?: number; onDrain?: () => void } = {}) {
  let closing: Promise<void> | null = null;
  return () => closing ??= new Promise<void>((resolve) => {
    options.onDrain?.();
    const deadline = setTimeout(() => {
      console.warn('Shutdown deadline reached; unfinished requests and persistence are not confirmed.');
      server.closeAllConnections();
    }, options.graceMs ?? 8000);
    server.close(() => { clearTimeout(deadline); resolve(); });
    server.closeIdleConnections();
  });
}
