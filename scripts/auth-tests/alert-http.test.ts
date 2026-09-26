import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express from "express";
import { createClient } from "@supabase/supabase-js";
import { localSupabase } from "../local-supabase.mjs";
import { configuredAlertRouter } from "../../server/alerts";

test("HTTP alert mutations verify identity and provider unit; scheduler rejects visitors", async (t) => {
  const status = localSupabase(),
    options = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient(status.API_URL, status.SECRET_KEY, options),
    user = createClient(status.API_URL, status.PUBLISHABLE_KEY, options);
  const email = `alert-http-${randomUUID()}@example.invalid`,
    password = randomUUID() + "aA!1";
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  assert.equal(created.error, null);
  t.after(async () => {
    await admin.auth.admin.deleteUser(created.data.user!.id);
  });
  const login = await user.auth.signInWithPassword({ email, password });
  assert.equal(login.error, null);
  const app = express()
    .use(express.json())
    .use(
      configuredAlertRouter(
        {
          SUPABASE_URL: status.API_URL,
          SUPABASE_SECRET_KEY: status.SECRET_KEY,
          VITE_AUTH_REDIRECT_URL: "http://localhost:3000/auth/callback",
          ALERT_SCHEDULER_SECRET:
            "test-only-scheduler-key-with-at-least-32-characters",
        },
        {
          chart: async (symbol) => ({
            chart: {
              result: [
                {
                  meta: {
                    symbol,
                    currency: "USD",
                    regularMarketPrice: 100,
                    regularMarketTime: Date.now() / 1000,
                  },
                  timestamp: [],
                  indicators: { quote: [{ close: [] }] },
                },
              ],
            },
          }),
          send: null,
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
  const post = (
    action: string,
    body: unknown,
    bearer = login.data.session!.access_token,
    origin = "http://localhost:3000",
  ) =>
    fetch(url + action, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + bearer,
        Origin: origin,
      },
      body: JSON.stringify(body),
    });
  const rule = {
    id: randomUUID(),
    symbol: "AAPL",
    comparison: "above",
    target: "0",
    revision: null,
  };
  assert.equal((await post("evaluate", {})).status, 401);
  assert.equal((await post("rules", rule, "invalid")).status, 401);
  assert.equal(
    (await post("rules", rule, undefined, "https://other.invalid")).status,
    403,
  );
  assert.equal(
    (await post("rules", { ...rule, user_id: randomUUID() })).status,
    400,
  );
  assert.equal((await post("rules", { ...rule, target: "1K" })).status, 400);
  assert.equal((await post("rules", { ...rule, target: "1.001" })).status, 400);
  const saved = await post("rules", rule);
  assert.equal(saved.status, 200);
  const data = (await saved.json()).data;
  assert.equal(data.user_id, created.data.user!.id);
  assert.equal(data.target, 0);
  assert.equal(data.unit, "USD");
  assert.equal((await post("rules", rule)).status, 200);
  assert.equal(
    (await user.from("alert_rules").select("*")).data?.length,
    1,
    "duplicate HTTP retry persists one rule",
  );
});
