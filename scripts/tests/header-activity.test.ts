import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { tradingSession } from "../../src/utils/tradingSession";
import {
  fetchTestActivity,
  testActivityRouter,
} from "../../server/test-activity";
const config = { repository: "owner/repo", branch: "main", token: "fixture" };
test("equity sessions cover premarket, regular and late boundaries in Eastern time across DST", () => {
  const cases: [string, ReturnType<typeof tradingSession>][] = [
    ["2026-03-06T08:59:59Z", null],
    ["2026-03-06T09:00:00Z", "premarket"],
    ["2026-03-09T08:00:00Z", "premarket"],
    ["2026-03-09T13:30:00Z", "regular"],
    ["2026-03-09T20:00:00Z", "after-hours"],
    ["2026-03-10T00:00:00Z", null],
    ["2026-11-02T09:00:00Z", "premarket"],
    ["2026-11-02T21:00:00Z", "after-hours"],
    ["2026-11-03T01:00:00Z", null],
    ["2026-09-05T16:00:00Z", null],
    ["2026-09-07T16:00:00Z", null],
    ["2026-11-27T18:00:00Z", "after-hours"],
    ["2026-11-27T22:00:00Z", null],
    ["2026-12-24T22:00:00Z", null],
    ["2028-07-03T17:00:00Z", "after-hours"],
    ["2029-01-02T16:00:00Z", null],
  ];
  for (const [date, expected] of cases)
    assert.equal(tradingSession(Date.parse(date)), expected, date);
});
test("activity requires in-progress trusted workflow; queued, PR, foreign and completed runs cannot light the dot", async () => {
  const run = {
    status: "in_progress",
    conclusion: null,
    head_branch: "main",
    head_repository: { full_name: "owner/repo" },
    path: ".github/workflows/playwright.yml",
    event: "push",
  };
  for (const [patch, expected] of [
    [{}, true],
    [{ status: "queued" }, false],
    [{ status: "completed" }, false],
    [{ event: "pull_request" }, false],
    [{ head_branch: "other" }, false],
    [{ head_repository: { full_name: "fork/repo" } }, false],
    [{ conclusion: "success" }, false],
  ] as const) {
    const request: typeof fetch = async (input) => {
      assert.equal(
        new URL(String(input)).searchParams.get("status"),
        "in_progress",
      );
      return Response.json({ workflow_runs: [{ ...run, ...patch }] });
    };
    assert.equal(await fetchTestActivity(config, request), expected);
  }
  await assert.rejects(
    fetchTestActivity(config, async () => Response.json({})),
  );
  await assert.rejects(
    fetchTestActivity(config, async () => new Response("", { status: 403 })),
  );
});
test("activity cache deduplicates and clears active status on upstream failure", async () => {
  let now = Date.now(),
    calls = 0,
    fail = false;
  const app = express();
  app.use(
    testActivityRouter(
      config,
      async () => {
        calls++;
        if (fail) throw Error();
        return true;
      },
      () => now,
    ),
  );
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address() as { port: number },
    url = "http://127.0.0.1:" + address.port + "/api/test-activity";
  try {
    const responses = await Promise.all([fetch(url), fetch(url)]);
    for (const r of responses) assert.equal((await r.json()).active, true);
    assert.equal(calls, 1);
    now += 30001;
    fail = true;
    assert.equal((await fetch(url)).status, 502);
    assert.equal((await fetch(url)).status, 502);
    assert.equal(calls, 2);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
