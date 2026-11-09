import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import webpush from 'web-push';
import { configuredAlertRouter } from '../../server/alerts';

const instant = Date.UTC(2026, 10, 8, 12, 0, 3);
const device = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const event = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const subscription = { endpoint: 'https://fcm.googleapis.com/wp/transport-fixture', keys: {
  auth: Buffer.alloc(16).toString('base64url'), p256dh: Buffer.alloc(65).toString('base64url'),
} };

test('price transport survives short offline gaps without extending event freshness; tests stay short-lived', async t => {
  const sends: { payload: any; options: webpush.RequestOptions }[] = [];
  t.mock.method(webpush, 'sendNotification', async (_subscription: unknown, payload: string, options: webpush.RequestOptions) => {
    sends.push({ payload: JSON.parse(payload), options });
    return { statusCode: 201, body: '', headers: {} };
  });
  const keys = webpush.generateVAPIDKeys();
  let expiresAt: unknown = new Date(instant + 900000).toISOString();
  const outcomes: string[] = [];
  const app = express().use(express.json());
  app.get('/auth/v1/user', (_req, res) => res.json({ id: '22222222-2222-4222-8222-222222222222', aud: 'authenticated',
    role: 'authenticated', email: 'transport@example.invalid', app_metadata: {}, user_metadata: {}, created_at: new Date(instant).toISOString() }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const origin = `http://127.0.0.1:${(server.address() as any).port}`;
  app.use(configuredAlertRouter({ SUPABASE_URL: origin, SUPABASE_SECRET_KEY: 'sb_secret_test',
    VITE_AUTH_REDIRECT_URL: `${origin}/auth/callback`, ALERT_SCHEDULER_SECRET: 'S'.repeat(32),
    ALERT_VAPID_PUBLIC_KEY: keys.publicKey, ALERT_VAPID_PRIVATE_KEY: keys.privateKey, ALERT_VAPID_SUBJECT: 'https://example.invalid',
  }, { now: () => instant, rpc: async (name, args) => {
    if (name === 'claim_alert_work') return [];
    if (name === 'finish_alert_work') return 0;
    if (name === 'claim_alert_deliveries') return [{ eventId: event, installationId: device, lease: event, subscription, ...(expiresAt === undefined ? {} : { expiresAt }) }];
    if (name === 'finish_alert_delivery') { outcomes.push(args!.outcome as string); return null; }
    if (name === 'prepare_alert_notification_test') return { status: 'ready', eventId: event, installationId: device, subscription };
    throw Error(`Unexpected RPC ${name}`);
  } }));
  const request = (operation: string, body: unknown, bearer: string) => fetch(`${origin}/api/alerts/${operation}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bearer}` }, body: JSON.stringify(body),
  });
  for (const [expiry, expectedTtl] of [
    [new Date(instant + 900000).toISOString(), 900],
    [new Date(instant + 180000).toISOString(), 180],
    [new Date(instant + 3600000).toISOString(), 900],
    [undefined, 120],
  ] as const) {
    expiresAt = expiry;
    assert.equal((await request('evaluate', {}, 'S'.repeat(32))).status, 200);
    const sent = sends.at(-1)!;
    assert.equal(sent.options.TTL, expectedTtl, 'push service retention follows the remaining event lifetime');
    assert.equal(sent.options.urgency, 'high', 'time-sensitive visible alerts request prompt delivery');
    assert.deepEqual(sent.payload, { eventId: event, installationId: device }, 'the push hint remains opaque');
  }
  const sentCount = sends.length;
  for (const expiry of ['invalid', null, 900000, new Date(instant).toISOString(), new Date(instant - 1).toISOString(), new Date(instant + 500).toISOString()]) {
    expiresAt = expiry;
    assert.equal((await request('evaluate', {}, 'S'.repeat(32))).status, 200);
    assert.equal(outcomes.at(-1), 'retry');
  }
  assert.equal(sends.length, sentCount, 'expired or invalid lifetimes cannot enqueue a stale hint');
  assert.equal((await request('test', { installationId: device, capability: 'A'.repeat(43), requestId: event }, 'fixture-token')).status, 200);
  assert.equal(sends.at(-1)!.options.TTL, 120, 'Settings diagnostic retains its two-minute consumption lifetime');
});
