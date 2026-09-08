import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readSupabaseConfig } from './supabaseConfig';

let client: SupabaseClient | undefined;
export const getAuthConfig = () => readSupabaseConfig(import.meta.env);
export function getSupabase() {
  if (!client) {
    const { url, key } = getAuthConfig();
    client = createClient(url, key, { auth: {
      flowType: 'pkce', detectSessionInUrl: false, persistSession: true, autoRefreshToken: true,
      storageKey: 'imt_supabase_auth',
    } });
  }
  return client;
}
