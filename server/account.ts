import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';

type AuthAdmin = Pick<ReturnType<typeof createClient>['auth'], 'getUser' | 'admin'>;

/** Inject the Auth API only for deterministic failure testing; never accept identity from the request body. */
export function accountRouter(auth: AuthAdmin | null, appOrigin: string | null) {
  const router = Router();
  router.delete('/api/account', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (!auth || !appOrigin) return res.status(503).json({ error: 'Account deletion is not configured on this server. Contact the site owner.' });
    if (req.get('origin') && req.get('origin') !== appOrigin) return res.status(403).json({ error: 'Request origin is not allowed.' });
    if (Object.keys(req.query).length || (req.body && Object.keys(req.body).length)) return res.status(400).json({ error: 'Account deletion accepts no target identity or other parameters.' });
    const match = /^Bearer ([^\s]+)$/i.exec(req.get('authorization') || '');
    if (!match) return res.status(401).json({ error: 'Sign in again before deleting your account.' });
    try {
      // Auth network verification rejects deleted identities even when an old JWT is unexpired.
      const { data, error } = await auth.getUser(match[1]);
      if (error || !data.user) {
        const unavailable = error && (!error.status || error.status >= 500);
        return res.status(unavailable ? 503 : 401).json({ error: unavailable
          ? 'Account verification is unavailable. No deletion was attempted.'
          : 'Your account could not be verified. Sign in again before retrying.' });
      }
      const result = await auth.admin.deleteUser(data.user.id, false);
      if (result.error) return res.status(502).json({ error: 'Account deletion was not confirmed. It may have completed; check your session before retrying.' });
      return res.status(204).end();
    } catch {
      return res.status(502).json({ error: 'Account deletion was not confirmed. Check your session before retrying.' });
    }
  });
  return router;
}

export function serverSupabase(env: NodeJS.ProcessEnv) {
  const { SUPABASE_URL: url, SUPABASE_SECRET_KEY: key, VITE_AUTH_REDIRECT_URL: redirect } = env;
  if (!url && !key && !redirect) return null;
  if (!url || !key || !redirect) {
    console.warn('Trusted account and asset operations disabled: set SUPABASE_URL, SUPABASE_SECRET_KEY and VITE_AUTH_REDIRECT_URL.');
    return null;
  }
  let callback: URL;
  let project: URL;
  try { callback = new URL(redirect); project = new URL(url); }
  catch { throw new Error('Supabase server configuration must contain valid project and callback URLs.'); }
  for (const value of [callback, project]) {
    if (value.username || value.password || value.search || value.hash ||
        (value.protocol !== 'https:' && !(value.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(value.hostname)))) {
      throw new Error('Supabase server URLs require HTTPS or loopback HTTP, without credentials, queries or fragments.');
    }
  }
  if (callback.pathname !== '/auth/callback') throw new Error('VITE_AUTH_REDIRECT_URL must end in /auth/callback.');
  const origin = callback.origin;
  if (!key.startsWith('sb_secret_') || project.pathname !== '/' ||
      (project.protocol !== 'https:' && !(project.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(project.hostname))) ||
      (env.VITE_SUPABASE_URL && new URL(env.VITE_SUPABASE_URL).origin !== project.origin)) {
    throw new Error('Invalid server Supabase configuration: use a secret key and the same project as the public client.');
  }
  const client = createClient(project.origin, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10000) }) } });
  return { client, origin };
}

export function configuredAccountRouter(env: NodeJS.ProcessEnv) {
  const config = serverSupabase(env);
  return accountRouter(config?.client.auth ?? null, config?.origin ?? null);
}
