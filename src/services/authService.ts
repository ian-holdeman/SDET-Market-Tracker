import type { User } from '@supabase/supabase-js';
import type { UserProfile } from '../types';
import { getSupabase, getAuthConfig } from '../lib/supabase';
import { safeReturnPath } from '../lib/supabaseConfig';
export type { UserProfile };

const RETURN_KEY = 'imt_oauth_return';
export async function signInWithGoogle() {
  const { url, key, redirectUrl } = getAuthConfig();
  if (new URL(redirectUrl).origin !== location.origin) throw new Error('Open the app at the origin configured in VITE_AUTH_REDIRECT_URL before signing in.');
  let settings: { external?: { google?: boolean } };
  try {
    const response = await fetch(url + '/auth/v1/settings', { headers: { apikey: key }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error();
    settings = await response.json();
  } catch { throw new Error('The sign-in service is unavailable. Please try again later.'); }
  if (!settings.external?.google) throw new Error('Google sign-in is not enabled for this Supabase project yet. The site owner must configure the Google OAuth client.');
  sessionStorage.setItem(RETURN_KEY, safeReturnPath(location.pathname + location.search + location.hash));
  const { error } = await getSupabase().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectUrl } });
  if (error) throw new Error('Google sign-in could not start. Please try again.');
}

// React StrictMode may mount twice. Exchange an authorization code only once.
let callback: Promise<void> | undefined;
export function completeOAuth() {
  if (location.pathname !== '/auth/callback') return Promise.resolve();
  return callback ??= (async () => {
    const params = new URLSearchParams(location.search);
    try {
      if (params.has('error') || new URLSearchParams(location.hash.slice(1)).has('error')) throw new Error('Google sign-in was cancelled or rejected. Please try again.');
      const code = params.get('code');
      if (!code) throw new Error('The sign-in callback has no authorization code. Start sign-in again.');
      const { error } = await getSupabase().auth.exchangeCodeForSession(code);
      if (error) throw new Error('The sign-in link expired or could not be verified. Start sign-in again in this browser.');
    } finally {
      const destination = safeReturnPath(sessionStorage.getItem(RETURN_KEY));
      sessionStorage.removeItem(RETURN_KEY);
      history.replaceState(null, '', destination);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  })();
}

export async function loadProfile(identity: User): Promise<UserProfile> {
  const client = getSupabase();
  const [watchlist, role] = await Promise.all([
    client.from('watchlist_items').select('symbol').eq('user_id', identity.id),
    client.rpc('current_user_is_admin'),
  ]);
  if (watchlist.error || role.error) throw new Error('Your watchlist or permissions could not be loaded. Please retry sign-in.');
  return { id: identity.id, username: String(identity.user_metadata?.full_name || 'Member'),
    watchlist: watchlist.data.map((row) => row.symbol), role: role.data === true ? 'admin' : 'user' };
}

export async function changeWatchlist(userId: string, symbol: string, add: boolean) {
  const client = getSupabase();
  if (add) {
    const catalog = await client.from('assets').select('symbol').eq('symbol', symbol).maybeSingle();
    if (catalog.error) throw new Error('The asset catalog is unavailable. Your watchlist has not been changed.');
    if (!catalog.data) {
      const { data, error } = await client.auth.getSession();
      if (error || !data.session) throw new Error('Sign in again before saving this asset.');
      let response: Response;
      try {
        response = await fetch('/api/assets/register', { method: 'POST',
          headers: { Authorization: 'Bearer ' + data.session.access_token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol }), signal: AbortSignal.timeout(35000) });
      } catch { throw new Error('Asset validation was not confirmed. Your watchlist has not changed; please retry.'); }
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.symbol !== symbol) throw new Error(result?.error || 'Asset registration was not confirmed. Your watchlist has not changed.');
    }
  }
  const result = add
    ? await client.from('watchlist_items').insert({ user_id: userId, symbol }).select('symbol')
    : await client.from('watchlist_items').delete().eq('user_id', userId).eq('symbol', symbol).select('symbol');
  if (result.error || result.data?.length !== 1) throw new Error('The watchlist change was not confirmed. Reload to check its current state before retrying.');
}

export async function deleteUserAccount() {
  const client = getSupabase();
  const { data, error } = await client.auth.getSession();
  if (error || !data.session) throw new Error('Sign in again before deleting your account.');
  let response: Response;
  try {
    response = await fetch('/api/account', { method: 'DELETE',
      headers: { Authorization: `Bearer ${data.session.access_token}` }, signal: AbortSignal.timeout(20000) });
  } catch { throw new Error('The deletion response was not received. Deletion may have completed; check your session before retrying.'); }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || 'Account deletion was not confirmed. Please try again.');
  }
  // Delete persisted state first, so local SDK sign-out cannot depend on a remote logout response.
  localStorage.removeItem('imt_supabase_auth');
  localStorage.removeItem('imt_supabase_auth-code-verifier');
  localStorage.removeItem('imt_active_user_session');
  try { await client.auth.signOut({ scope: 'local' }); } catch { /* Auth deletion already succeeded. */ }
}
