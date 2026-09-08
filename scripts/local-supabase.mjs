import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export function localSupabase() {
  const cli = fileURLToPath(new URL('./supabase.mjs', import.meta.url));
  const status = JSON.parse(execFileSync(process.execPath, [cli, 'status', '-o', 'json'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true }));
  // Destructive tests and generated development configuration must never target hosted services.
  if (status.API_URL !== 'http://127.0.0.1:54321') throw new Error('Expected the local Supabase API at http://127.0.0.1:54321. No hosted target is allowed.');
  if (!status.PUBLISHABLE_KEY?.startsWith('sb_publishable_') || !status.SECRET_KEY?.startsWith('sb_secret_')) throw new Error('Local public/secret keys are unavailable. Run npm run db:start.');
  return status;
}

