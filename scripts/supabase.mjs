import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config({ path: '.env', quiet: true });
const id = process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID?.trim();
const secret = process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET?.trim();
if (Boolean(id) !== Boolean(secret)) throw new Error('Set both Google OAuth client variables in .env, or leave both empty.');
const enabled = Boolean(id && secret);
const cli = fileURLToPath(new URL('../node_modules/supabase/dist/supabase.js', import.meta.url));
const result = spawnSync(process.execPath, [cli, ...process.argv.slice(2)], {
  stdio: 'inherit', windowsHide: true, env: { ...process.env,
    SUPABASE_AUTH_EXTERNAL_GOOGLE_ENABLED: String(enabled),
    SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID: id || '',
    SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET: secret || '',
  },
});
process.exit(result.status ?? 1);
