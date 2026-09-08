import { spawnSync } from 'node:child_process';
// A deterministic public-only test target. Browser tests intercept every request to this origin.
const result = spawnSync(process.execPath, [process.env.npm_execpath, 'run', 'build'], {
  stdio: 'inherit', windowsHide: true, env: { ...process.env,
    VITE_SUPABASE_URL: 'https://supabase.example.invalid',
    VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_browser_test_only',
    VITE_AUTH_REDIRECT_URL: 'http://127.0.0.1:3100/auth/callback',
  },
});
process.exit(result.status ?? 1);

