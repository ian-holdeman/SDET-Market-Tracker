import { Router } from "express";
import { createHash, timingSafeEqual } from "node:crypto";
import webpush from "web-push";
import { serverSupabase } from "./account";
import {
  alertObservation,
  alertUnit,
  fetchAlertChart,
  parseTarget,
  type AlertObservation,
} from "./alert-observation";

const uuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const token = (value: string | undefined) =>
  /^Bearer ([^\s]+)$/i.exec(value || "")?.[1];
const exact = (body: unknown, keys: string[]) =>
  body !== null &&
  typeof body === "object" &&
  !Array.isArray(body) &&
  Object.keys(body).length === keys.length &&
  Object.keys(body).every((key) => keys.includes(key));

export function validatePushSubscription(
  value: unknown,
): webpush.PushSubscription {
  const data = value as webpush.PushSubscription;
  if (!data || typeof data.endpoint !== "string" || data.endpoint.length > 2048)
    throw Error("Invalid push subscription.");
  const endpoint = new URL(data.endpoint);
  // Exact trusted transport origins, never arbitrary client-supplied network URLs.
  if (
    endpoint.protocol !== "https:" ||
    endpoint.hostname !== "fcm.googleapis.com" ||
    endpoint.port ||
    endpoint.username ||
    endpoint.password ||
    endpoint.search ||
    endpoint.hash ||
    !/^\/(?:fcm\/send|wp)\/[A-Za-z0-9_:\-]+$/.test(endpoint.pathname)
  )
    throw Error("This browser push service is not supported.");
  if (
    !data.keys ||
    typeof data.keys.auth !== "string" ||
    typeof data.keys.p256dh !== "string" ||
    !/^[A-Za-z0-9_-]+$/.test(data.keys.auth) ||
    !/^[A-Za-z0-9_-]+$/.test(data.keys.p256dh) ||
    Buffer.from(data.keys.auth, "base64url").length !== 16 ||
    Buffer.from(data.keys.p256dh, "base64url").length !== 65
  )
    throw Error("Invalid push keys.");
  return {
    endpoint: endpoint.href,
    keys: { auth: data.keys.auth, p256dh: data.keys.p256dh },
  };
}

export interface AlertJob {
  symbol: string;
  lease: string;
  rules: { id: string; revision: number }[];
}
export interface DeliveryJob {
  eventId: string;
  installationId: string;
  lease: string;
  subscription: webpush.PushSubscription;
}
type Rpc = (name: string, args?: Record<string, unknown>, signal?: AbortSignal) => Promise<any>;
export interface AlertDependencies {
  rpc: Rpc;
  chart: (symbol: string, signal: AbortSignal) => Promise<unknown>;
  send: ((job: DeliveryJob) => Promise<"accepted" | "gone" | "retry">) | null;
  now: () => number;
}

async function pool<T>(
  values: T[],
  concurrency: number,
  action: (value: T) => Promise<void>,
) {
  let next = 0;
  const settled = await Promise.allSettled(
    Array.from({ length: Math.min(concurrency, values.length) }, async () => {
      while (next < values.length) await action(values[next++]);
    }),
  );
  const failure = settled.find(result => result.status === 'rejected');
  if (failure?.status === 'rejected') throw failure.reason;
}

/** Every request awaits persistence and delivery; no work relies on idle Cloud Run CPU. */
export async function evaluateAlerts(deps: AlertDependencies) {
  const deadline = AbortSignal.timeout(24000);
  const rpc: Rpc = (name, args) => { deadline.throwIfAborted(); return deps.rpc(name, args, deadline); };
  const jobs = (await rpc("claim_alert_work")) as AlertJob[];
  if (!Array.isArray(jobs) || jobs.length > 16)
    throw Error("Invalid evaluation batch.");
  const results: (AlertJob & { observation: AlertObservation | null })[] = [];
  await pool(jobs, 8, async (job) => {
    deadline.throwIfAborted();
    let observation: AlertObservation | null = null;
    try {
      observation = alertObservation(
        await deps.chart(job.symbol, AbortSignal.any([deadline, AbortSignal.timeout(5000)])),
        job.symbol,
        deps.now(),
      );
    } catch {
      /* Missing evidence never changes rule state. */
    }
    results.push({ ...job, observation });
  });
  const events = await rpc("finish_alert_work", { results });
  let accepted = 0;
  if (deps.send) {
    const deliveries = (await rpc(
      "claim_alert_deliveries",
    )) as DeliveryJob[];
    if (!Array.isArray(deliveries) || deliveries.length > 16)
      throw Error("Invalid delivery batch.");
    await pool(deliveries, 8, async (job) => {
      deadline.throwIfAborted();
      let outcome: "accepted" | "gone" | "retry" = "retry";
      try {
        validatePushSubscription(job.subscription);
        outcome = await deps.send!(job);
      } catch {
        /* One transport failure does not suppress another device. */
      }
      await rpc("finish_alert_delivery", {
        event_key: job.eventId,
        installation_id: job.installationId,
        claim: job.lease,
        outcome,
      });
      if (outcome === "accepted") accepted++;
    });
  }
  return { checked: jobs.length, events, accepted };
}

export function configuredAlertRouter(
  env: NodeJS.ProcessEnv,
  overrides: Partial<AlertDependencies> = {},
) {
  const router = Router();
  const config = serverSupabase(env);
  const schedulerKey = env.ALERT_SCHEDULER_SECRET;
  if (schedulerKey && schedulerKey.length < 32)
    throw Error("ALERT_SCHEDULER_SECRET requires at least 32 characters.");
  const pushReady = !!(
    env.ALERT_VAPID_PUBLIC_KEY &&
    env.ALERT_VAPID_PRIVATE_KEY &&
    env.ALERT_VAPID_SUBJECT
  );
  if (
    [
      env.ALERT_VAPID_PUBLIC_KEY,
      env.ALERT_VAPID_PRIVATE_KEY,
      env.ALERT_VAPID_SUBJECT,
    ].some(Boolean) &&
    !pushReady
  )
    throw Error("Set all three ALERT_VAPID configuration values together.");
  if (pushReady)
    webpush.getVapidHeaders(
      "https://fcm.googleapis.com",
      env.ALERT_VAPID_SUBJECT!,
      env.ALERT_VAPID_PUBLIC_KEY!,
      env.ALERT_VAPID_PRIVATE_KEY!,
      "aes128gcm",
    );
  const rpc: Rpc = async (name, args, signal = AbortSignal.timeout(10000)) => {
    if (!config) throw Error("Alerts are not configured.");
    const { data, error } = await config.client.rpc(name, args).abortSignal(signal);
    if (error)
      throw Error(
        error.code === "P0001"
          ? error.message
          : "The alert change was not confirmed. Reload before retrying.",
      );
    return data;
  };
  const deps: AlertDependencies = {
    rpc,
    now: Date.now,
    chart: (symbol, signal) => fetchAlertChart(symbol, fetch, signal),
    send: pushReady
      ? async (job) => {
          try {
            await webpush.sendNotification(
              job.subscription,
              JSON.stringify({
                eventId: job.eventId,
                installationId: job.installationId,
              }),
              {
                TTL: 120,
                urgency: "normal",
                timeout: 3000,
                vapidDetails: {
                  subject: env.ALERT_VAPID_SUBJECT!,
                  publicKey: env.ALERT_VAPID_PUBLIC_KEY!,
                  privateKey: env.ALERT_VAPID_PRIVATE_KEY!,
                },
              },
            );
            return "accepted";
          } catch (error) {
            return [404, 410].includes(
              (error as { statusCode?: number }).statusCode ?? 0,
            )
              ? "gone"
              : "retry";
          }
        }
      : null,
    ...overrides,
  };
  let active = 0,
    evaluating = false;
  router.use("/api/alerts", (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  router.get("/api/alerts/config", (_req, res) =>
    res.json({
      enabled: !!config && !!schedulerKey,
      pushKey: pushReady ? env.ALERT_VAPID_PUBLIC_KEY : null,
    }),
  );
  router.post("/api/alerts/evaluate", async (req, res) => {
    const supplied = token(req.get("authorization"));
    if (!config || !schedulerKey)
      return res
        .status(503)
        .json({ error: "Scheduled alerts are not configured." });
    if (
      !supplied ||
      !timingSafeEqual(
        Buffer.from(hash(supplied)),
        Buffer.from(hash(schedulerKey)),
      )
    )
      return res
        .status(401)
        .json({ error: "Trusted scheduler authorization required." });
    if (
      Object.keys(req.query).length ||
      (req.body && Object.keys(req.body).length)
    )
      return res
        .status(400)
        .json({ error: "Evaluation accepts no parameters." });
    if (evaluating)
      return res.status(429).json({ error: "Evaluation already in progress." });
    evaluating = true;
    try {
      return res.json(await evaluateAlerts(deps));
    } catch {
      return res
        .status(503)
        .json({
          error:
            "Evaluation did not complete. Durable leases allow a later retry.",
        });
    } finally {
      evaluating = false;
    }
  });
  router.post("/api/alerts/:operation", async (req, res) => {
    if (!config)
      return res
        .status(503)
        .json({ error: "Alerts are not configured on this server." });
    if (req.get("origin") && req.get("origin") !== config.origin)
      return res.status(403).json({ error: "Request origin is not allowed." });
    if (Object.keys(req.query).length || active >= 8)
      return res
        .status(429)
        .json({ error: "Alert service busy. Retry shortly." });
    active++;
    try {
      const body = req.body;
      // Opaque per-installation capability permits revocation while offline/signed
      // out, and lets the worker recheck authorization without storing an Auth JWT.
      if (
        req.params.operation === "revoke" ||
        req.params.operation === "consume"
      ) {
        const keys =
          req.params.operation === "consume"
            ? ["installationId", "capability", "eventId"]
            : ["installationId", "capability"];
        if (
          !exact(body, keys) ||
          !uuid(body.installationId) ||
          typeof body.capability !== "string" ||
          !/^[A-Za-z0-9_-]{43}$/.test(body.capability) ||
          (req.params.operation === "consume" && !uuid(body.eventId))
        )
          return res
            .status(400)
            .json({ error: "Invalid installation request." });
        const data = await rpc(
          req.params.operation === "consume"
            ? "consume_alert_notification"
            : "revoke_alert_installation",
          {
            installation_id: body.installationId,
            capability: hash(body.capability),
            ...(body.eventId ? { event_key: body.eventId } : {}),
          },
        );
        return res.json({ data });
      }
      const bearer = token(req.get("authorization"));
      if (!bearer)
        return res.status(401).json({ error: "Sign in to manage alerts." });
      const verified = await config.client.auth.getUser(bearer);
      if (verified.error || !verified.data.user)
        return res
          .status(401)
          .json({
            error: "Your session could not be verified. Sign in again.",
          });
      const owner = verified.data.user.id;
      if (req.params.operation === "test") {
        if (!deps.send)
          return res.status(503).json({ error: "Background push is not configured." });
        if (
          !exact(body, ["installationId", "capability", "requestId"]) ||
          !uuid(body.installationId) ||
          !uuid(body.requestId) ||
          typeof body.capability !== "string" ||
          !/^[A-Za-z0-9_-]{43}$/.test(body.capability)
        )
          return res.status(400).json({ error: "Invalid notification test." });
        const job = await deps.rpc("prepare_alert_notification_test", {
          verified_user: owner,
          installation_id: body.installationId,
          capability: hash(body.capability),
          request_id: body.requestId,
        });
        if (job?.status === "limited")
          return res.status(429).json({ error: "Wait 30 seconds before testing again." });
        if (job?.status === "unavailable")
          return res.status(403).json({ error: "This notification installation is unavailable." });
        if (job?.status === "duplicate") return res.json({ data: true });
        if (job?.status !== "ready") throw Error("Invalid notification test result.");
        validatePushSubscription(job.subscription);
        // Reuse the price-alert transport: the worker consumes the opaque hint and
        // verifies this installation/session again before displaying any details.
        const outcome = await deps.send(job);
        if (outcome === "gone")
          await rpc("revoke_alert_installation", {
            installation_id: body.installationId,
            capability: hash(body.capability),
          });
        if (outcome !== "accepted")
          return res.status(503).json({ error: "Test notification could not be sent." });
        return res.json({ data: true });
      }
      if (req.params.operation === "rules") {
        if (!schedulerKey)
          return res
            .status(503)
            .json({ error: "Scheduled alerts are not configured yet." });
        if (
          !exact(body, ["id", "symbol", "comparison", "target", "revision"]) ||
          !uuid(body.id) ||
          typeof body.symbol !== "string" ||
          !/^[A-Z0-9^][A-Z0-9.^=-]{0,31}$/.test(body.symbol) ||
          !["above", "below"].includes(body.comparison) ||
          !(
            body.revision === null ||
            (Number.isSafeInteger(body.revision) && body.revision > 0)
          )
        )
          return res.status(400).json({ error: "Invalid alert rule." });
        let target: number;
        try {
          target = parseTarget(body.target);
        } catch (error) {
          return res.status(400).json({ error: (error as Error).message });
        }
        if (!(await rpc("claim_asset_registration", { verified_user: owner })))
          return res
            .status(429)
            .json({ error: "Too many changes. Retry in a minute." });
        const chart = await deps.chart(body.symbol, AbortSignal.timeout(8000));
        const unit = alertUnit(chart, body.symbol, deps.now());
        const registration = await config.client
          .from("assets")
          .upsert(
            { symbol: body.symbol },
            { onConflict: "symbol", ignoreDuplicates: true },
          );
        if (registration.error)
          throw Error("Asset registration was not confirmed. Retry shortly.");
        const data = await rpc("save_alert_rule", {
          verified_user: owner,
          rule_id: body.id,
          asset_symbol: body.symbol,
          direction: body.comparison,
          target_value: target,
          quote_unit: unit,
          expected_revision: body.revision,
        });
        return res.json({ data });
      }
      if (req.params.operation === "subscribe") {
        if (!pushReady)
          return res
            .status(503)
            .json({ error: "Background push is not configured." });
        if (
          !exact(body, ["installationId", "capability", "subscription"]) ||
          !uuid(body.installationId) ||
          typeof body.capability !== "string" ||
          !/^[A-Za-z0-9_-]{43}$/.test(body.capability)
        )
          return res.status(400).json({ error: "Invalid installation." });
        let subscription: webpush.PushSubscription;
        try {
          subscription = validatePushSubscription(body.subscription);
        } catch (error) {
          return res.status(400).json({ error: (error as Error).message });
        }
        // Only decode claims after online Auth verification. The database separately
        // verifies that this session still exists and belongs to the verified UUID.
        const claims = JSON.parse(
          Buffer.from(bearer.split(".")[1], "base64url").toString("utf8"),
        );
        if (!uuid(claims.session_id))
          return res
            .status(401)
            .json({ error: "Sign in again to enable notifications." });
        await rpc("set_alert_installation", {
          verified_user: owner,
          verified_session: claims.session_id,
          installation_id: body.installationId,
          capability: hash(body.capability),
          push_subscription: subscription,
        });
        return res.json({ data: true });
      }
      return res.status(404).json({ error: "Unknown alert action." });
    } catch (error) {
      // Never expose provider bodies, subscription endpoints, tokens or key material.
      const message =
        error instanceof Error &&
        /^(An asset can|This alert|Up to ten|Revoke the previous|Session expired|The alert change|Asset registration|The provider has)/.test(
          error.message,
        )
          ? error.message
          : "The alert request was not confirmed. Retry shortly.";
      return res.status(502).json({ error: message });
    } finally {
      active--;
    }
  });
  return router;
}
