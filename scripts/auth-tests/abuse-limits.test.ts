import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { localSupabase } from '../local-supabase.mjs';

test('shared member quotas survive concurrent callers and installation churn; only trusted admins are exempt', async t => {
  const status = localSupabase();
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const service = createClient(status.API_URL, status.SECRET_KEY, options);
  const secondService = createClient(status.API_URL, status.SECRET_KEY, options);
  const client = createClient(status.API_URL, status.PUBLISHABLE_KEY, options);
  const sql = (statement: string) => execFileSync(process.platform === 'win32'
    ? 'C:/Program Files/Docker/Docker/resources/bin/docker.exe' : 'docker',
    ['exec', 'supabase_db_sdet-market-tracker-local', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-Atc', statement],
    { encoding: 'utf8', windowsHide: true });
  const email = `abuse-${randomUUID()}@example.invalid`, password = randomUUID() + 'aA1!';
  const created = await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { role: 'admin' } });
  assert.equal(created.error, null);
  const owner = created.data.user!.id;
  const prefix = 'ZZSEC' + randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase();
  const symbols = Array.from({ length: 11 }, (_, i) => prefix + i);
  t.after(async () => {
    await service.auth.admin.deleteUser(owner);
    const list = symbols.map(s => `'${s}'`).join(',');
    sql(`delete from private.alert_assets where symbol in (${list}); delete from public.assets where symbol in (${list});`);
  });
  assert.equal((await service.from('assets').insert(symbols.map(symbol => ({ symbol })))).error, null);
  const login = await client.auth.signInWithPassword({ email, password });
  assert.equal(login.error, null);
  const session = JSON.parse(Buffer.from(login.data.session!.access_token.split('.')[1], 'base64url').toString()).session_id;
  const rules = Array.from({ length: 41 }, (_, i) => ({ verified_user: owner, rule_id: randomUUID(), asset_symbol: symbols[Math.floor(i / 4)],
    direction: 'above', target_value: i, quote_unit: 'USD', expected_revision: null }));
  assert.ok((await client.rpc('save_alert_rule', rules[0])).error, 'member cannot call service-only mutation');
  const results = await Promise.all(rules.map((rule, i) => (i % 2 ? service : secondService).rpc('save_alert_rule', rule)));
  assert.equal(results.filter(r => !r.error).length, 40, 'account-wide cap is atomic across independent callers');
  assert.equal(results.filter(r => r.error?.code === 'P4290').length, 1);
  assert.equal((await client.from('alert_rules').select('id')).data!.length, 40);
  const saved = results.findIndex(r => !r.error);
  assert.equal((await service.rpc('save_alert_rule', rules[saved])).error, null, 'idempotent create at capacity');
  assert.equal((await service.rpc('save_alert_rule', { ...rules[saved], target_value: -0.01, expected_revision: 1 })).error, null, 'editing at capacity remains available');
  sql(`insert into private.admin_users(user_id) values ('${owner}');`);
  const rejected = rules[results.findIndex(r => r.error)];
  assert.equal((await service.rpc('save_alert_rule', rejected)).error, null, 'trusted admin bypasses new member count cap');
  sql(`delete from private.admin_users where user_id='${owner}';`);

  const capability = createHash('sha256').update(randomUUID()).digest('hex');
  const device = randomUUID();
  const subscription = { endpoint: 'https://fcm.googleapis.com/wp/' + device, keys: { auth: 'fixture', p256dh: 'fixture' } };
  const subscribe = { verified_user: owner, verified_session: session, installation_id: device, capability, push_subscription: subscription };
  assert.equal((await service.rpc('set_alert_installation', subscribe)).error, null);
  const send = (request_id = randomUUID()) => service.rpc('prepare_alert_notification_test', {
    verified_user: owner, installation_id: device, capability, request_id,
  });
  const firstId = randomUUID();
  assert.equal((await send(firstId)).data.status, 'ready');
  assert.equal((await send(firstId)).data.status, 'duplicate');
  for (let i = 1; i < 6; i++) {
    sql(`update private.alert_notification_tests set requested_at=now()-interval '31 seconds' where installation_id='${device}';`);
    assert.equal((await send()).data.status, 'ready');
  }
  // Replacing the installation cannot reset the owner's hourly budget.
  assert.equal((await service.rpc('set_alert_installation', { ...subscribe, push_subscription: { ...subscription, endpoint: subscription.endpoint + 'new' } })).error, null);
  assert.equal((await send()).data.status, 'budget_limited');
  sql(`update private.usage_budgets set expires_at=now()-interval '1 second' where user_id='${owner}' and scope like 'test-hour:%';`);
  assert.equal((await send()).data.status, 'ready', 'hourly expiry restores service');
  sql(`update private.usage_budgets set attempts=20 where user_id='${owner}' and scope like 'test-day:%'; update private.alert_notification_tests set requested_at=now()-interval '31 seconds' where installation_id='${device}';`);
  assert.equal((await send()).data.status, 'budget_limited');
  sql(`insert into private.admin_users(user_id) values ('${owner}');`);
  assert.equal((await send()).data.status, 'ready', 'trusted admin bypasses member hourly/daily sends');
  sql(`delete from private.admin_users where user_id='${owner}';`);
  for (let i = 2; i < 10; i++) assert.equal((await service.rpc('set_alert_installation', {
    ...subscribe, push_subscription: { ...subscription, endpoint: subscription.endpoint + i },
  })).error, null);
  assert.equal((await service.rpc('set_alert_installation', { ...subscribe, capability: createHash('sha256').update('new').digest('hex') })).error?.code, 'P4290');
  assert.equal((await service.rpc('revoke_alert_installation', { installation_id: device, capability })).error, null, 'revocation stays available at the limit');
  assert.ok((await client.rpc('claim_market_budget')).error, 'members cannot spend or inspect shared provider capacity');
});
