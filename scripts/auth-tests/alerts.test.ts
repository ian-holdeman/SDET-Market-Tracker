import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { localSupabase } from "../local-supabase.mjs";

test("real alert ownership, concurrent limits, durable transitions, revisions and private delivery", async (t) => {
  const status = localSupabase(); // This helper rejects hosted targets.
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient(status.API_URL, status.SECRET_KEY, options);
  const identities: { id: string; client: SupabaseClient; session: string }[] =
    [];
  const symbol =
    "ZZAL" + randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase();
  const sql = (statement: string) =>
    execFileSync(
      process.platform === "win32"
        ? "C:/Program Files/Docker/Docker/resources/bin/docker.exe"
        : "docker",
      [
        "exec",
        "supabase_db_sdet-market-tracker-local",
        "psql",
        "-U",
        "postgres",
        "-d",
        "postgres",
        "-v",
        "ON_ERROR_STOP=1",
        "-Atc",
        statement,
      ],
      { encoding: "utf8", windowsHide: true },
    );
  t.after(async () => {
    for (const user of identities) await admin.auth.admin.deleteUser(user.id);
    sql(
      `delete from private.alert_assets where symbol='${symbol}'; delete from public.assets where symbol='${symbol}'`,
    );
  });
  for (let i = 0; i < 2; i++) {
    const email = `alerts-${randomUUID()}@example.invalid`,
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
    identities.push({
      id: created.data.user!.id,
      client,
      session: JSON.parse(
        Buffer.from(
          login.data.session!.access_token.split(".")[1],
          "base64url",
        ).toString(),
      ).session_id,
    });
  }
  const [alice, bob] = identities;
  assert.equal((await admin.from("assets").insert({ symbol })).error, null);
  const save = (
    owner: string,
    id: string,
    target = 100,
    revision: number | null = null,
    comparison = "above",
  ) =>
    admin.rpc("save_alert_rule", {
      verified_user: owner,
      rule_id: id,
      asset_symbol: symbol,
      direction: comparison,
      target_value: target,
      quote_unit: "USD",
      expected_revision: revision,
    });
  const concurrent = await Promise.all(
    Array.from({ length: 8 }, () => save(alice.id, randomUUID())),
  );
  assert.equal(
    concurrent.filter((r) => !r.error).length,
    4,
    "four concurrent creates succeed, all same direction",
  );
  assert.equal(concurrent.filter((r) => r.error).length, 4);
  const rules = (await alice.client.from("alert_rules").select("*")).data!;
  assert.equal(rules.length, 4);
  assert.deepEqual((await bob.client.from("alert_rules").select("*")).data, []);
  assert.ok(
    (await bob.client.rpc("save_alert_rule", { verified_user: alice.id }))
      .error,
  );
  assert.ok(
    (
      await alice.client
        .from("alert_rules")
        .update({ armed: true })
        .eq("id", rules[0].id)
    ).error,
  );
  assert.equal(
    (
      await bob.client
        .from("alert_rules")
        .delete()
        .eq("id", rules[0].id)
        .select()
    ).data?.length,
    0,
  );
  const rpc = async (name: string, args?: Record<string, unknown>) => {
    const result = await admin.rpc(name, args);
    assert.equal(result.error, null, `${name}: ${result.error?.message}`);
    return result.data;
  };
  const due = () =>
    sql(
      `update private.alert_assets set due_at=now()-interval '1 second',lease_until=null where symbol='${symbol}'`,
    );
  const expireCooldown = () => sql(`update private.alert_asset_cooldowns set admitted_at=clock_timestamp()-interval '60 minutes' where user_id='${alice.id}' and symbol='${symbol}'`);
  const claims = await Promise.all([
    rpc("claim_alert_work"),
    rpc("claim_alert_work"),
  ]);
  assert.equal(
    claims.flat().filter((j) => j.symbol === symbol).length,
    1,
    "overlapping workers claim once",
  );
  let stamp = Date.now() - 600000;
  const observe = async (
    value: number | null,
    custom?: { unit?: string; at?: number },
  ) => {
    due();
    const jobs = (await rpc("claim_alert_work")).filter(
      (j) => j.symbol === symbol,
    );
    stamp += 1000;
    const observation =
      value === null
        ? null
        : {
            symbol,
            value,
            unit: custom?.unit ?? "USD",
            observedAt: new Date(custom?.at ?? stamp).toISOString(),
            retrievedAt: new Date().toISOString(),
            source: "Yahoo Finance sampled close",
            session: "regular",
          };
    const results = jobs.map((j) => ({ ...j, observation }));
    const overlapping = await Promise.all([rpc('finish_alert_work', { results }), rpc('finish_alert_work', { results })]);
    assert.ok(overlapping.includes(0), 'overlapping evaluator settlement admits at most once');
    const first = overlapping.reduce((sum, count) => sum + count, 0);
    assert.equal(
      await rpc("finish_alert_work", { results }),
      0,
      "retry cannot duplicate committed events",
    );
    return first;
  };
  const installationIds = [randomUUID(), randomUUID()];
  const capability = createHash("sha256")
    .update("test-only-capability")
    .digest("hex");
  for (const id of installationIds)
    assert.equal(
      await rpc("set_alert_installation", {
        verified_user: alice.id,
        verified_session: alice.session,
        installation_id: id,
        capability:
          id === installationIds[0]
            ? capability
            : createHash("sha256").update(id).digest("hex"),
        push_subscription: {
          endpoint: "https://fcm.googleapis.com/fcm/send/" + id,
          keys: { auth: "test", p256dh: "test" },
        },
      }),
      true,
    );
  assert.equal(await observe(99), 0);
  assert.equal(
    await observe(100),
    1,
    "simultaneous matching rules share one owner/asset admission",
  );
  assert.equal(await observe(101), 0);
  assert.equal(await observe(100), 0, "equality stays qualified");
  assert.equal(await observe(null), 0, "outage never rearms");
  assert.equal(await observe(101), 0, "recovery cannot retrigger unarmed rule");
  assert.equal(
    await observe(99, { at: stamp - 10000 }),
    0,
    "out-of-order exit is ignored",
  );
  assert.equal(
    await observe(99, { at: Date.now() - 3600000 }),
    0,
    "stale exit is ignored",
  );
  assert.equal(
    await observe(99, { unit: "EUR" }),
    0,
    "different units cannot rearm",
  );
  assert.equal(await observe(100), 0);
  assert.equal(await observe(99), 0);
  assert.equal(
    await observe(100),
    0,
    "a crossing inside cooldown is suppressed without deferred delivery",
  );
  expireCooldown();
  assert.equal(await observe(101), 0, 'expiry alone cannot replay the suppressed crossing');
  assert.equal(await observe(99), 0);
  assert.equal(await observe(100), 1, 'a new crossing after cooldown creates exactly one second event');
  const events = (
    await alice.client.from("alert_events").select("*").order("created_at")
  ).data!;
  assert.equal(events.length, 2);
  assert.equal(events[0].rule_id, [...rules].sort((a,b) => a.id.localeCompare(b.id))[0].id, 'stable rule UUID tie-breaker');
  assert.deepEqual(
    (await bob.client.from("alert_events").select("*")).data,
    [],
  );
  assert.equal(
    (await bob.client.rpc("read_alert_event", { event_id: events[0].id })).data,
    false,
  );
  assert.equal(
    (await alice.client.rpc("read_alert_event", { event_id: events[0].id }))
      .data,
    true,
  );
  assert.ok(
    (
      await alice.client
        .from("alert_events")
        .select("read_at")
        .eq("id", events[0].id)
        .single()
    ).data!.read_at,
  );
  assert.ok(
    (await alice.client.from("alert_events").insert({ user_id: alice.id }))
      .error,
  );
  const deliveries = await rpc("claim_alert_deliveries");
  assert.equal(deliveries.length, 4, "two admitted events fan out to both devices");
  assert.equal(
    (await rpc("claim_alert_deliveries")).length,
    0,
    "delivery claims coalesce",
  );
  const eventId = events[0].id,
    device = installationIds[0];
  assert.equal(
    (
      await rpc("consume_alert_delivery", {
        event_key: eventId,
        installation_id: device,
        capability,
      })
    ).id,
    eventId,
  );
  assert.equal(
    await rpc("consume_alert_delivery", {
      event_key: eventId,
      installation_id: device,
      capability,
    }),
    null,
    "duplicate push cannot display again",
  );
  assert.equal((await rpc('consume_alert_delivery', { event_key: events[1].id, installation_id: device, capability })).id, events[1].id,
    'same installation consumes a distinct second price event without re-registration');
  assert.equal((await rpc('consume_alert_delivery', { event_key: events[1].id, installation_id: installationIds[1],
    capability: createHash('sha256').update(installationIds[1]).digest('hex') })).id, events[1].id, 'second installation is independent');
  await rpc("revoke_alert_installation", {
    installation_id: device,
    capability,
  });
  assert.equal(
    await rpc("consume_alert_delivery", {
      event_key: events[1].id,
      installation_id: device,
      capability,
    }),
    null,
    "queued revoked push has no private payload",
  );
  // Edits concurrent with observations cannot consume the old condition's claim.
  due();
  const oldJobs = (await rpc("claim_alert_work")).filter(
    (j) => j.symbol === symbol,
  );
  assert.equal(
    (await save(alice.id, rules[0].id, 100, 1)).data.revision,
    1,
    "no-op edit cannot rearm",
  );
  assert.equal(
    (await save(alice.id, rules[0].id, 100, 1, "below")).data.revision,
    2,
  );
  const editObservation = {
    symbol,
    value: 99,
    unit: "USD",
    observedAt: new Date(stamp + 1000).toISOString(),
    retrievedAt: new Date().toISOString(),
    source: "Yahoo Finance sampled close",
    session: "regular",
  };
  assert.equal(
    await rpc("finish_alert_work", {
      results: oldJobs.map((j) => ({ ...j, observation: editObservation })),
    }),
    0,
  );
  assert.equal(
    await observe(99),
    0,
    "editing does not bypass the owner/asset cooldown",
  );
  assert.equal(await observe(100), 0, "above rules reenter inside cooldown without extra history");
  assert.equal(
    await observe(101),
    0,
    "below rule rearms without repeating above events",
  );
  expireCooldown();
  assert.equal(await observe(100), 1, "below equality reenters after cooldown");
  const memory = sql(`select id,armed,last_observed from public.alert_rules where user_id='${alice.id}' order by id`);
  assert.equal((await alice.client.rpc('mutate_alert_history', { operation: 'clear' })).data, true);
  assert.equal(sql(`select id,armed,last_observed from public.alert_rules where user_id='${alice.id}' order by id`), memory, 'clear never changes rule memory');
  assert.equal(sql(`select count(*) from private.alert_deliveries d join private.alert_installations i on i.id=d.installation_id where i.user_id='${alice.id}'`).trim(), '0', 'clear cancels pending deliveries');
  assert.equal(sql(`select count(*) from private.alert_installations where user_id='${alice.id}'`).trim(), '1', 'clear preserves remaining device');
  assert.equal(await observe(101), 0);
  assert.equal(await observe(100), 0, 'clearing history does not release cooldown');
  await alice.client.from("alert_rules").delete().eq("id", rules[0].id);
  assert.ok(
    (await save(alice.id, rules[0].id, 10, 2)).error,
    "deleted edit cannot resurrect",
  );
  assert.equal((await save(alice.id, randomUUID(), 0)).error, null);
  assert.equal(await observe(101), 0, 'recreated armed rule cannot bypass persisted asset cooldown');
  sql(
    `update public.alert_events set created_at=now()-interval '31 days' where user_id='${alice.id}'`,
  );
  assert.equal(
    (await alice.client.from("alert_events").select("*")).data?.length,
    0,
    "RLS expires before physical cleanup",
  );
  assert.equal(await observe(101), 0, "expiry does not reset evaluator memory");
  assert.equal(
    (await alice.client.from("alert_events").select("*")).data?.length,
    0,
  );
  await admin.auth.admin.deleteUser(alice.id);
  assert.equal(
    sql(
      `select count(*) from public.alert_rules where user_id='${alice.id}'`,
    ).trim(),
    "0",
  );
  assert.equal(
    sql(
      `select count(*) from private.alert_installations where user_id='${alice.id}'`,
    ).trim(),
    "0",
  );
});
