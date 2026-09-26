import { test } from "node:test";
import assert from "node:assert/strict";
import {
  alertObservation,
  alertUnit,
  parseTarget,
} from "../../server/alert-observation";
import { evaluateAlerts, validatePushSubscription } from "../../server/alerts";

const now = Date.UTC(2026, 8, 25, 20, 10);
function sample(symbol = "AAPL", type = "EQUITY", currency = "USD") {
  return {
    chart: {
      result: [
        {
          meta: {
            symbol,
            instrumentType: type,
            currency,
            regularMarketPrice: 102,
            regularMarketTime: now / 1000 - 60,
            currentTradingPeriod: {
              regular: { start: now / 1000 - 3600, end: now / 1000 - 600 },
              post: { start: now / 1000 - 600, end: now / 1000 + 3600 },
            },
          },
          timestamp: [now / 1000 - 300],
          indicators: { quote: [{ close: [101] }] },
        },
      ],
    },
  };
}
test("targets retain signed hundredths and reject excess precision without rounding", () => {
  assert.throws(
    () => parseTarget("0." + "0".repeat(400) + "1"),
    /two decimal places/,
  );
  for (const value of ["0", "-0.01", "123456789.12", ".25", "100.10"])
    assert.equal(parseTarget(value), Number(value));
  for (const value of ["1.001", "-0.001", "1.230", "12.123456789"])
    assert.throws(() => parseTarget(value), /two decimal places/);
  for (const value of [
    "",
    " ",
    "1K",
    "1,000",
    "Infinity",
    "NaN",
    "1e309",
    null,
    true,
  ])
    assert.throws(() => parseTarget(value));
});
test("alert observations use one sampled-close stream and explicit extended session evidence", () => {
  const data = sample();
  assert.deepEqual(alertObservation(data, "AAPL", now), {
    symbol: "AAPL",
    value: 101,
    unit: "USD",
    observedAt: new Date(now - 300000).toISOString(),
    retrievedAt: new Date(now).toISOString(),
    source: "Yahoo Finance sampled close",
    session: "post",
  });
  data.chart.result[0].meta.currentTradingPeriod.post.start = now / 1000;
  assert.throws(() => alertObservation(data, "AAPL", now), /session/i);
});
test("invalid, stale and mismatched observations never become transitions", () => {
  for (const close of [NaN, Infinity]) {
    const data = sample();
    data.chart.result[0].indicators.quote[0].close = [close];
    assert.throws(() => alertObservation(data, "AAPL", now));
  }
  assert.throws(() => alertObservation(sample(), "MSFT", now));
  assert.throws(() => alertObservation(sample(), "AAPL", now + 1200000));
  const data = sample();
  data.chart.result[0].timestamp = [now / 1000 + 1];
  assert.throws(() => alertObservation(data, "AAPL", now));
});
test("crypto and actual units including zero/negative yield values are preserved", () => {
  const crypto = sample("BTC-USD", "CRYPTOCURRENCY");
  assert.equal(alertObservation(crypto, "BTC", now).session, "continuous");
  const yieldData = sample("^TNX", "INDEX");
  for (const value of [0, -0.25]) {
    yieldData.chart.result[0].indicators.quote[0].close = [value];
    assert.equal(alertObservation(yieldData, "^TNX", now).value, value);
  }
  assert.equal(alertUnit(yieldData, "^TNX", now), "%");
  assert.equal(
    alertUnit(sample("VOD.L", "EQUITY", "GBp"), "VOD.L", now),
    "GBp",
  );
});

test("push subscriptions cannot become an SSRF relay", () => {
  const keys = {
    auth: Buffer.alloc(16).toString("base64url"),
    p256dh: Buffer.alloc(65).toString("base64url"),
  };
  assert.equal(
    validatePushSubscription({
      endpoint: "https://fcm.googleapis.com/fcm/send/test",
      keys,
    }).endpoint,
    "https://fcm.googleapis.com/fcm/send/test",
  );
  for (const endpoint of [
    "http://fcm.googleapis.com/fcm/send/test",
    "https://127.0.0.1/private",
    "https://fcm.googleapis.com.evil.test/fcm/send/test",
    "https://fcm.googleapis.com:444/fcm/send/test",
    "https://fcm.googleapis.com/fcm/send/test?redirect=evil",
    "https://user@fcm.googleapis.com/fcm/send/test",
  ])
    assert.throws(() => validatePushSubscription({ endpoint, keys }));
});
test("evaluation persists events before fanout and transport failures are independent", async () => {
  const calls: string[] = [],
    outcomes: string[] = [];
  const subscription = {
    endpoint: "https://fcm.googleapis.com/wp/test",
    keys: {
      auth: Buffer.alloc(16).toString("base64url"),
      p256dh: Buffer.alloc(65).toString("base64url"),
    },
  };
  const result = await evaluateAlerts({
    now: () => now,
    chart: async (symbol) => {
      if (symbol === "MSFT") throw Error("outage");
      return sample();
    },
    rpc: async (name, args) => {
      calls.push(name);
      if (name === "claim_alert_work")
        return ["AAPL", "MSFT"].map((symbol) => ({
          symbol,
          lease: "lease",
          rules: [],
        }));
      if (name === "finish_alert_work") {
        const rows = args!.results as any[];
        assert.equal(rows.find((r) => r.symbol === "MSFT").observation, null);
        assert.equal(
          rows.find((r) => r.symbol === "AAPL").observation.value,
          101,
        );
        return 1;
      }
      if (name === "claim_alert_deliveries")
        return [1, 2].map((i) => ({
          eventId: "one-event",
          installationId: String(i),
          lease: "lease",
          subscription,
        }));
      if (name === "finish_alert_delivery")
        outcomes.push(args!.outcome as string);
    },
    send: async (job) => {
      assert.ok(calls.includes("finish_alert_work"));
      if (job.installationId === "1") throw Error("network");
      return "accepted";
    },
  });
  assert.deepEqual(result, { checked: 2, events: 1, accepted: 1 });
  assert.deepEqual(outcomes.sort(), ["accepted", "retry"]);
});

test("evaluation waits for other claimed work to settle after a persistence failure", async () => {
  let release!: () => void,
    secondStarted!: () => void,
    firstFailed!: () => void;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  const started = new Promise<void>((resolve) => {
    secondStarted = resolve;
  });
  const failed = new Promise<void>((resolve) => {
    firstFailed = resolve;
  });
  const subscription = {
    endpoint: "https://fcm.googleapis.com/wp/test",
    keys: {
      auth: Buffer.alloc(16).toString("base64url"),
      p256dh: Buffer.alloc(65).toString("base64url"),
    },
  };
  let settled = false,
    secondPersisted = false;
  const evaluation = evaluateAlerts({
    now: () => now,
    chart: async () => sample(),
    rpc: async (name, args) => {
      if (name === "claim_alert_work") return [];
      if (name === "finish_alert_work") return 0;
      if (name === "claim_alert_deliveries")
        return ["first", "second"].map((installationId) => ({
          eventId: "event",
          installationId,
          lease: "lease",
          subscription,
        }));
      if (
        name === "finish_alert_delivery" &&
        args?.installation_id === "first"
      ) {
        firstFailed();
        throw Error("persistence unavailable");
      }
      if (name === "finish_alert_delivery") secondPersisted = true;
    },
    send: async (job) => {
      if (job.installationId === "second") {
        secondStarted();
        await blocked;
      }
      return "accepted";
    },
  }).finally(() => {
    settled = true;
  });
  const rejected = assert.rejects(evaluation, /persistence unavailable/);
  await Promise.all([started, failed]);
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(settled, false);
  release();
  await rejected;
  assert.equal(secondPersisted, true);
});
