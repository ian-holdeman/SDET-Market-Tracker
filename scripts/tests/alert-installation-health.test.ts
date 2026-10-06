import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createHash } from 'node:crypto';
import { configuredAlertRouter } from '../../server/alerts';

test('installation health checks a capability without sending, renewing, or exposing a subscription', async t => {
  let available = true;
  const calls: any[] = [];
  const app = express().use(express.json()).use(configuredAlertRouter({
    SUPABASE_URL: 'http://127.0.0.1:54321', SUPABASE_SECRET_KEY: 'sb_secret_test',
    VITE_AUTH_REDIRECT_URL: 'http://localhost:3000/auth/callback',
  }, { rpc: async (name, args) => { calls.push({ name, args }); return available; },
    send: async () => { throw Error('Health must never send a push'); } }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const url = `http://127.0.0.1:${(server.address() as any).port}/api/alerts/status`;
  const body = { installationId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', capability: 'A'.repeat(43) };
  const request = (value: unknown = body, origin = 'http://localhost:3000') => fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(value),
  });
  const response = await request();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { data: true });
  assert.deepEqual(calls, [{ name: 'alert_installation_available', args: {
    installation_id: body.installationId, capability: createHash('sha256').update(body.capability).digest('hex'),
  } }]);
  available = false;
  assert.deepEqual(await (await request()).json(), { data: false });
  assert.equal((await request({ ...body, capability: 'invalid' })).status, 400);
  assert.equal((await request({ ...body, owner: 'other' })).status, 400);
  assert.equal((await request(body, 'https://other.invalid')).status, 403);
  assert.equal(calls.length, 2);
});
