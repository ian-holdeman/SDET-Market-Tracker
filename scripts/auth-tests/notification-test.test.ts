import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import express from "express";
import { createClient } from "@supabase/supabase-js";
import { localSupabase } from "../local-supabase.mjs";
import { configuredAlertRouter } from "../../server/alerts";

test("member push tests verify installation ownership, rate limit, deduplicate and use the price transport", async (t) => {
  const status = localSupabase(),
    options = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient(status.API_URL, status.SECRET_KEY, options),
    users: any[] = [];
  t.after(async () => {
    for (const user of users) await admin.auth.admin.deleteUser(user.id);
  });
  for (let i = 0; i < 2; i++) {
    const email = `notification-test-${randomUUID()}@example.invalid`,
      password = randomUUID() + "aA!1";
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    assert.equal(created.error, null);
    const client = createClient(
      status.API_URL,
      status.PUBLISHABLE_KEY,
      options,
    );
    const login = await client.auth.signInWithPassword({ email, password });
    assert.equal(login.error, null);
    users.push({
      id: created.data.user!.id,
      client,
      token: login.data.session!.access_token,
      session: JSON.parse(
        Buffer.from(
          login.data.session!.access_token.split(".")[1],
          "base64url",
        ).toString(),
      ).session_id,
    });
  }
  const [owner, other] = users,
    device = randomUUID(),
    secondDevice = randomUUID();
  const capability = randomBytes(32).toString("base64url"),
    hash = createHash("sha256").update(capability).digest("hex");
  const subscription = {
    endpoint: "https://fcm.googleapis.com/wp/" + randomUUID(),
    keys: {
      auth: randomBytes(16).toString("base64url"),
      p256dh: randomBytes(65).toString("base64url"),
    },
  };
  for (const id of [device, secondDevice]) {
    const saved = await admin.rpc("set_alert_installation", {
      verified_user: owner.id,
      verified_session: owner.session,
      installation_id: id,
      capability:
        id === device ? hash : createHash("sha256").update(id).digest("hex"),
      push_subscription: {
        ...subscription,
        endpoint: subscription.endpoint + id,
      },
    });
    assert.equal(saved.error, null);
  }
  assert.ok(
    (
      await owner.client.rpc("prepare_alert_notification_test", {
        verified_user: owner.id,
        installation_id: device,
        capability: hash,
        request_id: randomUUID(),
      })
    ).error,
  );
  const sent: any[] = [];
  let outcome: "accepted" | "retry" = "accepted";
  const app = express()
    .use(express.json())
    .use(
      configuredAlertRouter(
        {
          SUPABASE_URL: status.API_URL,
          SUPABASE_SECRET_KEY: status.SECRET_KEY,
          VITE_AUTH_REDIRECT_URL: "http://localhost:3000/auth/callback",
        },
        {
          send: async (job) => {
            sent.push(job);
            return outcome;
          },
          chart: async () => {
            throw Error("Tests must not fetch or invent market data");
          },
        },
      ),
    );
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/alerts/`;
  const post = (action: string, body: unknown, token = owner.token) =>
    fetch(url + action, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify(body),
    });
  const request = {
    installationId: device,
    capability,
    requestId: randomUUID(),
  };
  assert.equal((await post("test", request, "invalid")).status, 401);
  assert.equal((await post("test", request, other.token)).status, 403);
  assert.equal(
    (await post("test", { ...request, installationId: secondDevice })).status,
    403,
  );
  const responses = await Promise.all([
    post("test", request),
    post("test", request),
  ]);
  assert.deepEqual(
    responses.map((r) => r.status),
    [200, 200],
  );
  assert.equal(sent.length, 1);
  assert.equal(sent[0].installationId, device);
  assert.equal(sent[0].eventId, request.requestId);
  assert.equal(
    (await post("test", { ...request, requestId: randomUUID() })).status,
    429,
  );
  assert.equal(
    (await owner.client.from("alert_events").select("*")).data.length,
    0,
    "no fake market history",
  );
  assert.equal(
    (await owner.client.from("alert_rules").select("*")).data.length,
    0,
    "no temporary price rule",
  );
  const consume = () =>
    post("consume", {
      eventId: request.requestId,
      installationId: device,
      capability,
    });
  const first = (await (await consume()).json()).data;
  assert.equal(first.kind, "test");
  assert.equal(first.user_id, owner.id);
  assert.equal(
    (await (await consume()).json()).data,
    null,
    "single consumption",
  );
  // The second installation stays independent and can report a real transport failure.
  const secondCapability = randomBytes(32).toString("base64url");
  await admin.rpc("set_alert_installation", {
    verified_user: owner.id,
    verified_session: owner.session,
    installation_id: secondDevice,
    capability: createHash("sha256").update(secondCapability).digest("hex"),
    push_subscription: {
      ...subscription,
      endpoint: subscription.endpoint + secondDevice,
    },
  });
  outcome = "retry";
  assert.equal(
    (
      await post("test", {
        installationId: secondDevice,
        capability: secondCapability,
        requestId: randomUUID(),
      })
    ).status,
    503,
  );
  await admin.rpc("revoke_alert_installation", {
    installation_id: device,
    capability: hash,
  });
  assert.equal((await (await consume()).json()).data, null);
  assert.equal(
    (await post("test", { ...request, requestId: randomUUID() })).status,
    403,
  );
  await owner.client.auth.signOut();
  const afterSignOut = await post("consume", {
    eventId: sent[1].eventId,
    installationId: secondDevice,
    capability: secondCapability,
  });
  assert.equal(
    (await afterSignOut.json()).data,
    null,
    "queued tests recheck the live sign-in session",
  );
});
