import type { Express, ErrorRequestHandler } from 'express';

export function configureSecurity(app: Express, supabaseUrl?: string, development = false) {
  const connections = ["'self'"];
  if (supabaseUrl) {
    const url = new URL(supabaseUrl);
    if (url.username || url.password || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))) {
      throw new Error('Invalid public Supabase origin for security policy.');
    }
    connections.push(url.origin);
  }
  const policy = [
    "default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline'", "font-src 'self'",
    "img-src 'self' data: https://assets.parqet.com", "media-src 'self' blob:",
    `connect-src ${connections.join(' ')}`, "object-src 'none'", "base-uri 'self'", "frame-ancestors 'none'", "form-action 'self'",
  ].join('; ');
  app.disable('x-powered-by');
  app.set('query parser', 'simple');
  app.use((_req, res, next) => {
    // Vite injects inline development scripts; production always enforces this policy.
    res.set({ [development ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy']: policy, 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()' });
    next();
  });
}

export const safeRequestErrors: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error?.status === 413 ? 413 : error?.status === 400 ? 400 : 500;
  res.status(status).set('Cache-Control', 'no-store').json({ error: status === 413 ? 'Request body too large.' : status === 400 ? 'Invalid request body.' : 'Request failed.' });
};
