import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { localSupabase } from '../local-supabase.mjs';

test('Owner-scoped bulk clear preserves another account, identities, roles and shared assets', { timeout: 60000 }, async t => {
  const status = localSupabase(); // Rejects every destination except the disposable local API.
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient(status.API_URL, status.SECRET_KEY, options);
  const ids: string[] = [];
  const symbol = 'ZZCLEAR' + randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase();
  const docker = process.platform === 'win32' ? 'C:/Program Files/Docker/Docker/resources/bin/docker.exe' : 'docker';
  const sql = (query: string) => execFileSync(docker, ['exec', 'supabase_db_sdet-market-tracker-local', 'psql', '-U', 'postgres', '-d', 'postgres', '-At', '-v', 'ON_ERROR_STOP=1', '-c', query], { encoding: 'utf8', windowsHide: true }).trim();
  t.after(async () => {
    for (const id of ids) await admin.auth.admin.deleteUser(id);
    sql(`delete from public.curated_assets where symbol='${symbol}'; delete from public.assets where symbol='${symbol}';`);
  });
  const accounts = [];
  for (let n = 0; n < 2; n++) {
    const email = `clear-${randomUUID()}@example.invalid`, password = randomUUID() + 'aA!1';
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    assert.equal(created.error, null);
    ids.push(created.data.user!.id);
    const client = createClient(status.API_URL, status.PUBLISHABLE_KEY, options);
    assert.equal((await client.auth.signInWithPassword({ email, password })).error, null);
    accounts.push(client);
  }
  sql(`insert into public.assets values ('${symbol}'); insert into public.curated_assets values ('${symbol}'); insert into private.admin_users values ('${ids[0]}');`);
  for (const [index, client] of accounts.entries()) {
    assert.equal((await client.from('watchlist_items').insert([{ user_id: ids[index], symbol }, { user_id: ids[index], symbol: 'AAPL' }])).error, null);
  }
  const denied = await accounts[0].from('watchlist_items').delete().eq('user_id', ids[1]).select('symbol');
  assert.equal(denied.error, null); assert.deepEqual(denied.data, []);
  const cleared = await accounts[0].from('watchlist_items').delete().eq('user_id', ids[0]).select('symbol');
  assert.equal(cleared.error, null); assert.equal(cleared.data?.length, 2);
  assert.deepEqual((await accounts[0].from('watchlist_items').select('symbol')).data, []);
  assert.equal((await accounts[1].from('watchlist_items').select('symbol')).data?.length, 2);
  assert.deepEqual((await accounts[0].from('watchlist_items').delete().eq('user_id', ids[0]).select('symbol')).data, []);
  for (const id of ids) assert.equal(sql(`select count(*) from auth.users where id='${id}'`), '1');
  assert.equal((await accounts[0].rpc('current_user_is_admin')).data, true);
  assert.equal(sql(`select count(*) from public.assets where symbol='${symbol}'`), '1');
  assert.equal(sql(`select count(*) from public.curated_assets where symbol='${symbol}'`), '1');
});
