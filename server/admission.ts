import type { RequestHandler } from 'express';

/** Bounded process protection, not an edge limiter or a billing cap. Never key by
 * untrusted forwarded headers (Cloud Run's proxy chain is not an identity). */
export function apiAdmission(clock = Date.now, perMinute = 600, concurrent = 32): RequestHandler {
  let starts = 0, resetAt = 0, active = 0;
  return (req, res, next) => {
    if (req.path === '/health') return next();
    const now = clock();
    if (now >= resetAt) { starts = 0; resetAt = now + 60000; }
    if (starts >= perMinute || active >= concurrent) {
      return res.status(429).set({ 'Cache-Control': 'no-store', 'Retry-After': String(Math.max(1, Math.ceil((resetAt - now) / 1000))) })
        .json({ error: 'Requests are temporarily limited. Retry shortly.' });
    }
    starts++; active++;
    let released = false;
    const release = () => { if (!released) { released = true; active--; } };
    res.once('finish', release); res.once('close', release);
    next();
  };
}
