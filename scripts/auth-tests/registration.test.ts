import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { localSupabase } from '../local-supabase.mjs';
import { configuredAssetRouter } from '../../server/assets';

test('real local Auth and REST enforce registered watchlist ownership and idempotent catalog insert', async t => {
  const status = localSupabase(); // Hard guard: this test cannot target a hosted project.
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient(status.API_URL, status.SECRET_KEY, options);
  const user = createClient(status.API_URL, status.PUBLISHABLE_KEY, options);
  const symbol = 'ZZREG' + randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase();
  const email = `registration-${randomUUID()}@example.invalid`, password = randomUUID() + 'aA!1';
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  assert.equal(created.error, null); const id = created.data.user!.id;
  t.after(async () => {
    await admin.auth.admin.deleteUser(id);
    const docker = process.platform === 'win32' ? 'C:/Program Files/Docker/Docker/resources/bin/docker.exe' : 'docker';
    execFileSync(docker, ['exec', 'supabase_db_sdet-market-tracker-local', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', `delete from public.assets where symbol='${symbol}'`], { stdio: 'ignore', windowsHide: true });
  });
  const login = await user.auth.signInWithPassword({ email, password }); assert.equal(login.error, null);
  const originalFetch = globalThis.fetch;
  // Only Yahoo is simulated: Auth, PostgREST, grants, conflict handling and RLS are real.
  globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    if (url.hostname.endsWith('.finance.yahoo.com')) {
      const now = Math.floor(Date.now() / 1000);
      return Response.json({ chart: { result: [{ meta: { symbol, regularMarketPrice: 12, regularMarketTime: now }, timestamp: [now], indicators: { quote: [{ close: [12] }] } }] } });
    }
    return originalFetch(input, init);
  };
  t.after(() => { globalThis.fetch = originalFetch; });
  const app = express().use(express.json()).use(configuredAssetRouter({ SUPABASE_URL: status.API_URL, SUPABASE_SECRET_KEY: status.SECRET_KEY, VITE_AUTH_REDIRECT_URL: 'http://localhost:3000/auth/callback' }));
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(r => server.once('listening', r));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const url = `http://127.0.0.1:${(server.address() as any).port}/api/assets/register`;
  const save = () => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${login.data.session!.access_token}` }, body: JSON.stringify({ symbol }) });
  assert.ok((await user.from('assets').insert({ symbol })).error);
  assert.equal((await save()).status, 200);
  assert.equal((await save()).status, 200);
  // A fresh router models a second revision/instance with an independent local limiter.
  const secondApp = express().use(express.json()).use(configuredAssetRouter({ SUPABASE_URL: status.API_URL, SUPABASE_SECRET_KEY: status.SECRET_KEY, VITE_AUTH_REDIRECT_URL: 'http://localhost:3000/auth/callback' }));
  const secondServer = secondApp.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => secondServer.once('listening', resolve));
  t.after(() => { secondServer.closeAllConnections(); secondServer.close(); });
  const secondUrl = `http://127.0.0.1:${(secondServer.address() as {port:number}).port}/api/assets/register`;
  const concurrent = await Promise.all(Array.from({length: 10}, (_, index) => fetch(index % 2 ? url : secondUrl, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${login.data.session!.access_token}` }, body: JSON.stringify({symbol}),
  })));
  assert.equal(concurrent.filter(response => response.status === 200).length, 8);
  assert.equal(concurrent.filter(response => response.status === 429).length, 2);
  assert.equal((await user.from('watchlist_items').insert({ user_id: id, symbol })).error, null);
  assert.ok((await user.from('watchlist_items').insert({ user_id: '22222222-2222-4222-8222-222222222222', symbol })).error);
  assert.ok((await user.from('curated_assets').insert({ symbol })).error);
  assert.equal((await user.rpc('current_user_is_admin')).data, false);
  assert.equal((await user.from('watchlist_items').select('symbol').eq('symbol', symbol)).data?.length, 1);
  await admin.auth.admin.deleteUser(id);
  assert.equal((await save()).status, 401);
});
