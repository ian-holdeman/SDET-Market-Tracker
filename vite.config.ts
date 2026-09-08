import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { readSupabaseConfig } from './src/lib/supabaseConfig';
import { mkdirSync, writeFileSync } from 'node:fs';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  if (Object.entries(env).some(([name, value]) => value.startsWith('sb_secret_') || /VITE_.*(?:SERVICE_ROLE|SUPABASE_SECRET)/.test(name))) {
    throw new Error('Privileged Supabase keys must not use VITE_ variables.');
  }
  if (env.VITE_SUPABASE_URL || env.VITE_SUPABASE_PUBLISHABLE_KEY) readSupabaseConfig(env);
  return {
    plugins: [react(), tailwindcss(), {
      name: 'private-release-configuration',
      closeBundle() {
        const release = process.env.RELEASE_COMMIT || null;
        const publicConfig = env.VITE_SUPABASE_URL ? readSupabaseConfig(env) : null;
        if (process.env.APP_DEPLOYMENT === 'cloud-run' && (!release || !/^[a-f0-9]{40}$/.test(release) ||
            !publicConfig || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(publicConfig.url) || !publicConfig.redirectUrl.startsWith('https://'))) {
          throw Error('Production build requires real public configuration and RELEASE_COMMIT.');
        }
        mkdirSync('dist/server', { recursive: true });
        writeFileSync('dist/server/build-config.json', JSON.stringify({version:1,publicConfig,releaseCommit:release}), 'utf8');
      },
    }],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('/node_modules/@supabase/')) return 'supabase';
            if (/\/node_modules\/(?:motion|motion-dom|motion-utils|framer-motion)\//.test(id)) return 'motion';
            if (/\/node_modules\/(?:react|react-dom|scheduler)\//.test(id)) return 'react';
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify - file watching is disabled to prevent flickering during agent edits.
      hmr: false,
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
