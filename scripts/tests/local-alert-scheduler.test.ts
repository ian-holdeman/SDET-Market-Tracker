import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localAlertConfig, nextAlertDelay, checkLocalAlerts } from '../local-alert-scheduler.mjs';

const env = {
  SUPABASE_URL: 'http://127.0.0.1:54321',
  VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
  VITE_AUTH_REDIRECT_URL: 'http://localhost:3000/auth/callback',
  ALERT_SCHEDULER_SECRET: 'test-only-secret-with-at-least-32-characters',
};

test('local alert runner refuses hosted databases, hosted servers and missing authorization', () => {
  assert.equal(localAlertConfig(env).url, 'http://localhost:3000/api/alerts/evaluate');
  for (const override of [
    {SUPABASE_URL:'https://project.supabase.co'},
    {VITE_SUPABASE_URL:'https://project.supabase.co'},
    {VITE_AUTH_REDIRECT_URL:'https://example.com/auth/callback'},
    {VITE_AUTH_REDIRECT_URL:'http://localhost.evil.invalid:3000/auth/callback'},
    {ALERT_SCHEDULER_SECRET:''},
    {K_SERVICE:'production'},
  ]) assert.throws(() => localAlertConfig({...env,...override}));
});

test('local evaluator sends trusted authorization, forbids redirects and reports failed checks', async () => {
  const config = localAlertConfig(env);
  const result = await checkLocalAlerts(config, async (url, options) => {
    assert.equal(url, config.url);
    assert.equal(options.method, 'POST');
    assert.equal(options.redirect, 'error');
    assert.equal(options.headers.Authorization, 'Bearer ' + env.ALERT_SCHEDULER_SECRET);
    assert.ok(options.signal instanceof AbortSignal);
    return new Response(JSON.stringify({checked:1,events:2,accepted:0}), {status:200});
  });
  assert.deepEqual(result, {checked:1,events:2,accepted:0});
  await assert.rejects(checkLocalAlerts(config, async () => new Response('private diagnostic', {status:503})), /HTTP 503/);
});

test('local checks align to the next five-minute boundary after work finishes', () => {
  assert.equal(nextAlertDelay(0), 300000);
  assert.equal(nextAlertDelay(1000), 299000);
  assert.equal(nextAlertDelay(299999), 1);
  assert.equal(nextAlertDelay(300000), 300000);
});
