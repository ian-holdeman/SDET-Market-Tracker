import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { zipSync, strToU8 } from "fflate";
import {
  validateEvidence,
  summarize,
  testOutcome,
  orderRuns,
  validateFeed,
  runStatus,
} from "../../src/telemetry/contract";
import {
  decodeArtifact,
  fetchHistory,
  historyRouter,
  historyConfig,
} from "../../server/test-history";
import {
  evidence,
  published,
  feed,
} from "../../src/tests/fixtures/testEvidence";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("outcomes preserve retries, unfinished cases, skipped denominator and runner failures", () => {
  const e = evidence();
  assert.equal(summarize(validateEvidence(e)).status, "passed");
  e.tests[0].attempts[0].status = "failed";
  e.tests[0].attempts.push({
    retry: 1,
    status: "passed",
    durationMs: 6,
    startedAt: "2026-09-07T00:00:02.000Z",
  });
  assert.equal(summarize(validateEvidence(e)).status, "flaky");
  assert.equal(summarize(e).passed, 0);
  e.tests[0].attempts[1].status = "failed";
  assert.equal(testOutcome(e.tests[0]), "failed");
  e.tests[0].attempts[1].status = "interrupted";
  assert.equal(summarize(e).status, "interrupted");
  e.tests[0].attempts = [];
  assert.equal(summarize(e).status, "incomplete");
  const skipped = evidence();
  skipped.tests[0].attempts[0].status = "skipped";
  assert.equal(summarize(skipped).status, "skipped");
  const mixed = evidence();
  mixed.tests.push({ ...skipped.tests[0], id: "two" });
  mixed.planned = 2;
  assert.equal(summarize(validateEvidence(mixed)).passRate, 50);
  mixed.errorCount = 1;
  assert.equal(summarize(mixed).status, "failed");
  for (const status of [
    "failed",
    "timedout",
    "incomplete",
    "interrupted",
  ] as const) {
    const e = evidence();
    e.runnerStatus = status;
    assert.notEqual(summarize(e).status, "passed");
  }
  const empty = evidence();
  empty.tests = [];
  empty.planned = 0;
  assert.equal(summarize(empty).status, "incomplete");
});

test("contract rejects duplicate/missing tests, excess retries, malformed dates and secret-bearing unknown fields are stripped", () => {
  for (const mutate of [
    (e: any) => {
      e.version = 2;
    },
    (e: any) => {
      e.planned = 2;
    },
    (e: any) => {
      e.tests.push(e.tests[0]);
      e.planned = 2;
    },
    (e: any) => {
      e.tests[0].attempts.push(...e.tests[0].attempts, ...e.tests[0].attempts);
    },
    (e: any) => {
      e.tests[0].attempts[0].retry = 1;
    },
    (e: any) => {
      e.tests[0].attempts[0].durationMs = -1;
    },
    (e: any) => {
      e.tests[0].file = "C:/private/path";
    },
    (e: any) => {
      e.completedAt = "not a date";
    },
    (e: any) => {
      e.commitSha = "short";
    },
    (e: any) => {
      e.tests[0].attempts[0].status = "expected";
    },
  ]) {
    const e = evidence();
    mutate(e);
    assert.throws(() => validateEvidence(e));
  }
  const e: any = evidence();
  e.token = "secret";
  e.tests[0].attempts[0].stdout = "secret";
  assert.doesNotMatch(JSON.stringify(validateEvidence(e)), /secret/);
  assert.equal(runStatus("cancelled", true, evidence()), "cancelled");
  assert.equal(runStatus("failure", true, evidence()), "failed");
  assert.equal(runStatus("success", true, null), "incomplete");
});

test("late old runs and retries cannot replace newer runs; public feed rejects local and mismatched evidence", () => {
  const old = published();
  old.attempt = 5;
  old.number = 2;
  assert.equal(orderRuns([old, published()])[0].number, 3);
  for (const mutate of [
    (f: any) => {
      f.runs[0].evidence.environment = "local";
    },
    (f: any) => {
      f.runs[0].evidence.commitSha = "b".repeat(40);
    },
    (f: any) => {
      f.runs[0].status = "flaky";
    },
    (f: any) => {
      f.runs[0].url = "https://evil.test/";
    },
  ]) {
    const f = feed();
    mutate(f);
    assert.throws(() => validateFeed(f));
  }
  assert.equal(historyConfig({}), null);
  assert.throws(
    () => historyConfig({ TEST_HISTORY_TOKEN: "secret" }),
    (e) => !String(e).includes("secret"),
  );
});

function githubMock(mode: string) {
  const e = evidence();
  const r = {
    id: 101,
    run_attempt: 1,
    run_number: 3,
    head_branch: "main",
    head_sha: e.commitSha,
    path: ".github/workflows/playwright.yml",
    event: "push",
    head_repository: { full_name: "owner/repo" },
    status: "completed",
    conclusion: mode === "cancelled" ? "cancelled" : "success",
    run_started_at: e.startedAt,
  };
  let reads = 0;
  const request: typeof fetch = async (input, init) => {
    const url = String(input);
    reads++;
    if (url.includes("/workflows/"))
      return Response.json({
        workflow_runs: [
          r,
          { ...r, event: "pull_request" },
          { ...r, head_repository: { full_name: "fork/repo" } },
        ],
      });
    if (url.includes("/runs/101/artifacts"))
      return Response.json({
        artifacts:
          mode === "missing" || mode === "cancelled"
            ? []
            : [
                {
                  name: "test-evidence-v1-101-1",
                  id: 9,
                  size_in_bytes: 100,
                  expired: mode === "expired",
                  workflow_run: {
                    id: 101,
                    head_sha: e.commitSha,
                    head_branch: "main",
                  },
                },
              ],
      });
    if (url.endsWith("/artifacts/9/zip")) {
      assert.equal((init?.headers as any).Authorization, "Bearer test-token");
      return new Response(null, {
        status: 302,
        headers: { Location: "https://test.blob.core.windows.net/signed" },
      });
    }
    assert.equal(init?.headers, undefined);
    if (mode === "mismatch") e.runAttempt = 2;
    const data = zipSync({ "telemetry.json": strToU8(JSON.stringify(e)) });
    return new Response(data);
  };
  return { request, count: () => reads };
}
const config = {
  repository: "owner/repo",
  branch: "main",
  token: "test-token",
};
test("GitHub provenance, missing/expired/cancelled evidence and artifact identity fail closed", async () => {
  for (const mode of ["valid", "missing", "expired", "mismatch", "cancelled"]) {
    const mock = githubMock(mode);
    const f = await fetchHistory(config, mock.request);
    assert.equal(f.runs.length, 1);
    assert.equal(
      f.runs[0].status,
      mode === "valid"
        ? "passed"
        : mode === "cancelled"
          ? "cancelled"
          : "incomplete",
    );
    if (mode === "expired") assert.equal(f.runs[0].evidenceState, "expired");
  }
  assert.throws(() => decodeArtifact(new Uint8Array([1, 2, 3])));
  assert.throws(() => decodeArtifact(zipSync({ "other.json": strToU8("{}") })));
});

test("history retrieval deduplicates, caches, retains stale evidence and exposes no visitor writes", async (t) => {
  const realNow = Date.now;
  let now = realNow(),
    calls = 0,
    broken = false;
  Date.now = () => now;
  t.after(() => {
    Date.now = realNow;
  });
  const app = express().use(
    historyRouter(config, async () => {
      calls++;
      if (broken) throw Error();
      return feed();
    }),
  );
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  const url = `http://127.0.0.1:${(server.address() as any).port}/api/test-history`;
  await Promise.all([fetch(url), fetch(url)]);
  assert.equal(calls, 1);
  broken = true;
  now += 16000;
  const stale = await (await fetch(url)).json();
  assert.equal(stale.stale, true);
  assert.equal(stale.runs[0].id, "101");
  assert.equal((await fetch(url, { method: "POST" })).status, 404);
});

test("ingestion missing report produces incomplete local evidence, exits nonzero and cannot masquerade as publication", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "telemetry-"));
  try {
    const cli = fileURLToPath(
      new URL("../../node_modules/tsx/dist/cli.mjs", import.meta.url),
    );
    const script = fileURLToPath(
      new URL("../ingest-test-results.ts", import.meta.url),
    );
    const result = spawnSync(process.execPath, [cli, script], {
      cwd: dir,
      encoding: "utf8",
    });
    assert.equal(result.status, 1);
    const local = validateEvidence(
      JSON.parse(
        readFileSync(path.join(dir, ".telemetry/local/telemetry.json"), "utf8"),
      ),
    );
    assert.equal(local.environment, "local");
    assert.equal(summarize(local).status, "incomplete");
    const denied = spawnSync(process.execPath, [cli, script, "--github"], {
      cwd: dir,
      encoding: "utf8",
      env: { ...process.env, GITHUB_ACTIONS: "false" },
    });
    assert.equal(denied.status, 1);
    const valid = evidence();
    valid.environment = "local";
    writeFileSync(
      path.join(dir, ".telemetry/input.json"),
      JSON.stringify(valid),
    );
    assert.equal(
      spawnSync(process.execPath, [cli, script], { cwd: dir }).status,
      0,
    );
    const first = readFileSync(
      path.join(dir, ".telemetry/local/telemetry.json"),
      "utf8",
    );
    assert.equal(
      spawnSync(process.execPath, [cli, script], { cwd: dir }).status,
      0,
    );
    assert.equal(
      readFileSync(path.join(dir, ".telemetry/local/telemetry.json"), "utf8"),
      first,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("validated artifact cache avoids downloads but still observes upstream expiry", async () => {
  const cache = new Map();
  let downloads = 0;
  const mock = githubMock("valid");
  const request: typeof fetch = async (input, init) => {
    if (String(input).includes("/zip")) downloads++;
    return mock.request(input, init);
  };
  await fetchHistory(config, request, undefined, cache);
  await fetchHistory(config, request, undefined, cache);
  assert.equal(downloads, 1);
  const expired = await fetchHistory(
    config,
    githubMock("expired").request,
    undefined,
    cache,
  );
  assert.equal(expired.runs[0].evidenceState, "expired");
  assert.equal(expired.runs[0].evidence, null);
  for (const item of cache.values()) item.until = 0;
  await fetchHistory(config, request, undefined, cache);
  assert.equal(downloads, 2);
});
