import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { accountRouter } from '../../server/account';
import { readSupabaseConfig, safeReturnPath } from '../../src/lib/supabaseConfig';

test('Auth config rejects missing, privileged, malformed, and insecure client values', () => {
  const valid = { VITE_SUPABASE_URL: 'http://127.0.0.1:54321', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test', VITE_AUTH_REDIRECT_URL: 'http://localhost:3000/auth/callback' };
  assert.equal(readSupabaseConfig(valid).redirectUrl, valid.VITE_AUTH_REDIRECT_URL);
  assert.throws(() => readSupabaseConfig({}), /VITE_SUPABASE_URL/);
  for (const key of ['sb_secret_do-not-print', 'eyJ.legacy-service-role.key']) {
    assert.throws(() => readSupabaseConfig({ ...valid, VITE_SUPABASE_PUBLISHABLE_KEY: key }),
      (err: Error) => !err.message.includes(key) && /public/.test(err.message));
  }
  for (const redirect of ['http://evil.test/auth/callback','https://app.test/api/auth/callback','https://app.test/auth/callback?next=x','https://user:pass@app.test/auth/callback']) {
    assert.throws(() => readSupabaseConfig({ ...valid, VITE_AUTH_REDIRECT_URL: redirect }));
  }
});

test('OAuth restores the current app page without allowing an open redirect', () => {
  for (const value of ['/','/board','/tests','/logic#design','/settings']) assert.equal(safeReturnPath(value), value);
  for (const value of ['/board?symbol=V', '/board?ticker=AAPL', '/board?s=NVDA#chart', '/board/AAPL', '/board/#chart']) assert.equal(safeReturnPath(value), '/board');
  for (const value of [null,'https://evil.test','//evil.test','/\\\\evil.test','/auth/callback?code=x','/api/account','/board/../../api/account','javascript:alert(1)']) assert.equal(safeReturnPath(value), '/');
});

test('Deletion fails closed: verification, targeting, origin and upstream failures', async (t) => {
  let deletes = 0;
  let mode = 'invalid';
  const auth = {
    getUser: async () => mode === 'invalid' ? { data: { user: null }, error: { status: 401 } }
      : mode === 'offline' ? { data: { user: null }, error: { status: 503 } }
      : { data: { user: { id: 'verified-caller' } }, error: null },
    admin: { deleteUser: async (id: string, soft: boolean) => {
      assert.equal(id, 'verified-caller'); assert.equal(soft, false); deletes++;
      return { error: mode === 'delete-failure' ? new Error('secret upstream details') : null };
    } },
  };
  const app = express().use(express.json()).use(accountRouter(auth as any, 'http://localhost:3000'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const url = `http://127.0.0.1:${(server.address() as any).port}/api/account`;
  const call = (headers = {}, body?: string) => fetch(url, { method: 'DELETE', headers, body });
  assert.equal((await call()).status, 401);
  assert.equal((await call({ Authorization: 'Bearer invalid' })).status, 401);
  assert.equal((await call({ Origin: 'https://evil.test', Authorization: 'Bearer token' })).status, 403);
  assert.equal((await call({ Authorization: 'Bearer token', 'Content-Type': 'application/json' }, '{"user_id":"victim"}')).status, 400);
  mode = 'offline';
  assert.equal((await call({ Authorization: 'Bearer token' })).status, 503);
  assert.equal(deletes, 0);
  mode = 'delete-failure';
  const failed = await call({ Authorization: 'Bearer token' });
  assert.equal(failed.status, 502); assert.doesNotMatch(await failed.text(), /secret upstream/);
  mode = 'valid';
  assert.equal((await call({ Authorization: 'Bearer token' })).status, 204);
  assert.equal(deletes, 2);
});

