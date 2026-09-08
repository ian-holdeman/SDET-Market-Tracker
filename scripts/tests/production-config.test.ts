import { test } from 'node:test';
import assert from 'node:assert/strict';
import { productionConfig } from '../../server/production';
import { selectedPipeline } from '../../src/telemetry/pipeline';

const env = {
  APP_DEPLOYMENT: 'cloud-run', APP_ORIGIN: 'https://app.example.test',
  VITE_SUPABASE_URL: 'https://fixtureproject.supabase.co', SUPABASE_URL: 'https://fixtureproject.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fixture', SUPABASE_SECRET_KEY: 'sb_secret_fixture',
  VITE_AUTH_REDIRECT_URL: 'https://app.example.test/auth/callback',
  TEST_HISTORY_REPOSITORY: selectedPipeline.repository, TEST_HISTORY_BRANCH: selectedPipeline.branch, TEST_HISTORY_TOKEN: 'fixture',
  TEST_SNAPSHOT_BUCKET: 'fixture-snapshots', TEST_ARCHIVE_BUCKET: 'fixture-archives',
};
const build = { version: 1, releaseCommit: 'a'.repeat(40), publicConfig: {
  url: env.VITE_SUPABASE_URL, key: env.VITE_SUPABASE_PUBLISHABLE_KEY, redirectUrl: env.VITE_AUTH_REDIRECT_URL,
} };

test('production startup binds the deployed client to runtime origin and isolated providers', () => {
  assert.deepEqual(productionConfig(env, build), {origin: env.APP_ORIGIN, releaseCommit: build.releaseCommit});
  for (const change of [
    {APP_ORIGIN: 'http://app.example.test'}, {VITE_AUTH_REDIRECT_URL: 'https://other.example.test/auth/callback'},
    {SUPABASE_URL: 'http://127.0.0.1:54321'}, {VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_private'},
    {TEST_ARCHIVE_BUCKET: env.TEST_SNAPSHOT_BUCKET}, {GOOGLE_APPLICATION_CREDENTIALS: '/private/key.json'},
    {STORAGE_EMULATOR_HOST: 'http://localhost:1234'}, {TEST_SNAPSHOT_DIRECTORY: '/tmp/cache'},
    {TEST_HISTORY_REPOSITORY: 'foreign/repository'}, {TEST_HISTORY_BRANCH: 'untrusted'},
  ]) assert.throws(() => productionConfig({...env, ...change}, build), /Production configuration/);
  assert.throws(() => productionConfig(env, {...build, publicConfig: {...build.publicConfig, key: 'sb_publishable_other'}}));
  assert.throws(() => productionConfig(env, {...build, releaseCommit: 'unknown'}));
});
