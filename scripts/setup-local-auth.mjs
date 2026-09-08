import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { localSupabase } from './local-supabase.mjs';
const status = localSupabase();
const path = '.env.local';
let content = existsSync(path) ? readFileSync(path, 'utf8') : '';
const values = {
  VITE_SUPABASE_URL: status.API_URL,
  VITE_SUPABASE_PUBLISHABLE_KEY: status.PUBLISHABLE_KEY,
  VITE_AUTH_REDIRECT_URL: 'http://localhost:3000/auth/callback',
  SUPABASE_URL: status.API_URL,
  SUPABASE_SECRET_KEY: status.SECRET_KEY,
};
for (const [name, value] of Object.entries(values)) {
  const existing = content.match(new RegExp('^' + name + '=(.*)$', 'm'))?.[1]?.trim();
  if (existing && existing !== value) throw new Error('Existing ' + name + ' differs. Review .env.local manually; no configuration was overwritten.');
  if (!existing) {
    content = content.replace(new RegExp('^' + name + '=.*(?:\\r?\\n|$)', 'm'), '');
    content += '\n' + name + '=' + value + '\n';
  }
}
writeFileSync(path, content, { mode: 0o600 });
console.log('Local Auth configuration written to ignored .env.local. Keys were not printed. Google provider credentials are still required.');

