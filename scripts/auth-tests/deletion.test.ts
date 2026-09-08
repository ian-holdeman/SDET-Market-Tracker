import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { localSupabase } from '../local-supabase.mjs';
import { accountRouter } from '../../server/account';

test('Local Auth API deletion cascades personal data and same-email recreation inherits nothing', { timeout: 60000 }, async (t) => {
  const status = localSupabase();
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient(status.API_URL, status.SECRET_KEY, options);
  const user = createClient(status.API_URL, status.PUBLISHABLE_KEY, options);
  const email = `auth-test-${randomUUID()}@example.invalid`;
  const password = randomUUID() + 'aA!1';
  const ids: string[] = [];
  const docker = process.platform === 'win32' ? 'C:/Program Files/Docker/Docker/resources/bin/docker.exe' : 'docker';
  function sql(query: string) {
    return execFileSync(docker, ['exec', 'supabase_db_sdet-market-tracker-local', 'psql', '-U', 'postgres', '-d', 'postgres', '-At', '-v', 'ON_ERROR_STOP=1', '-c', query], { encoding: 'utf8', windowsHide: true }).trim();
  }
  const symbol = 'ZZAUTH' + randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase();
  t.after(async () => {
    for (const id of ids) await admin.auth.admin.deleteUser(id);
    sql(`delete from public.curated_assets where symbol='${symbol}'; delete from public.assets where symbol='${symbol}';`);
  });
  async function create() {
    const result = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    assert.equal(result.error, null);
    const id = result.data.user!.id;
    assert.match(id, /^[0-9a-f-]{36}$/);
    ids.push(id);
    return id;
  }
  const original = await create();
  const session = await user.auth.signInWithPassword({ email, password });
  assert.equal(session.error, null);
  const token = session.data.session!.access_token;
  sql(`insert into private.admin_users values ('${original}'); insert into public.assets values ('${symbol}'); insert into public.curated_assets values ('${symbol}');`);
  assert.equal((await user.rpc('current_user_is_admin')).data, true);
  assert.equal((await user.from('watchlist_items').insert({ user_id: original, symbol })).error, null);
  const app = express().use(express.json()).use(accountRouter(admin.auth, 'http://localhost:3000'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const url = `http://127.0.0.1:${(server.address() as any).port}/api/account`;
  const response = await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token}`, Origin: 'http://localhost:3000' } });
  assert.equal(response.status, 204);
  assert.ok((await admin.auth.getUser(token)).error, 'Auth must reject the deleted identity');
  assert.equal(sql(`select count(*) from auth.users where id='${original}'`), '0');
  assert.equal(sql(`select count(*) from public.watchlist_items where user_id='${original}'`), '0');
  assert.equal(sql(`select count(*) from private.admin_users where user_id='${original}'`), '0');
  assert.equal(sql(`select count(*) from public.curated_assets where symbol='${symbol}'`), '1');
  assert.equal(sql(`select count(*) from public.assets where symbol='${symbol}'`), '1');
  assert.equal((await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })).status, 401);
  assert.ok((await user.auth.signInWithPassword({ email, password })).error);
  const fresh = await create();
  assert.notEqual(fresh, original);
  assert.equal((await user.auth.signInWithPassword({ email, password })).error, null);
  assert.deepEqual((await user.from('watchlist_items').select('*')).data, []);
  assert.equal((await user.rpc('current_user_is_admin')).data, false);
  assert.ok((await user.from('curated_assets').insert({ symbol: 'MSFT' })).error);
});

