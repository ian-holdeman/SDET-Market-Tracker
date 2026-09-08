export function readSupabaseConfig(env: Record<string, string | undefined>) {
  const names = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_AUTH_REDIRECT_URL'] as const;
  const missing = names.filter((name) => !env[name]?.trim());
  if (missing.length) throw new Error(`Sign-in is not configured. Set ${missing.join(', ')} in .env.local and rebuild. See supabase/README.md.`);
  let url: URL;
  let redirect: URL;
  try { url = new URL(env.VITE_SUPABASE_URL!); redirect = new URL(env.VITE_AUTH_REDIRECT_URL!); }
  catch { throw new Error('Supabase and authentication redirect configuration must contain valid URLs.'); }
  for (const value of [url, redirect]) {
    const local = ['localhost', '127.0.0.1'].includes(value.hostname);
    if ((value.protocol !== 'https:' && !(local && value.protocol === 'http:')) || value.username || value.password || value.search || value.hash) {
      throw new Error('Authentication URLs require HTTPS (HTTP is allowed on localhost), without credentials, queries, or fragments.');
    }
  }
  if (url.pathname !== '/' || redirect.pathname !== '/auth/callback') throw new Error('Use the Supabase project origin and an exact app redirect ending in /auth/callback.');
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY!.trim();
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) throw new Error('VITE_SUPABASE_PUBLISHABLE_KEY must be a public sb_publishable_ key, never a secret/service-role key.');
  return { url: url.origin, key, redirectUrl: redirect.href };
}

/** Never accept an external post-login destination, including protocol-relative URLs. */
export function safeReturnPath(value: string | null): string {
  if (!value || !/^\/(?:$|\?|#|board(?:[/?#]|$)|tests(?:[?#]|$)|logic(?:[?#]|$)|settings(?:[?#]|$))/.test(value) || /[\\\r\n]/.test(value)) return '/';
  const parsed = new URL(value, 'https://app.invalid');
  if (parsed.origin !== 'https://app.invalid' || !/^\/(?:$|board(?:\/|$)|tests$|logic$|settings$)/.test(parsed.pathname)) return '/';
  // OAuth returns to the Board overview, never to an expanded asset or scroll anchor.
  if (parsed.pathname === '/board' || parsed.pathname.startsWith('/board/')) return '/board';
  return parsed.pathname + parsed.search + parsed.hash;
}
