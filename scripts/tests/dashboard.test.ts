import { test } from "node:test";
import assert from "node:assert/strict";
import { evidence, published } from "../../src/tests/fixtures/testEvidence";
import {
  runMetrics,
  recentResults,
  durationLabel,
  usableResults,
} from "../../src/telemetry/presentation";
import { fetchHistory, historyCursor } from "../../server/test-history";

test("presentation keeps flakes out of pass rate and computes wall-clock duration", () => {
  const e = evidence();
  e.tests[0].attempts[0].status = "failed";
  e.tests[0].attempts.push({
    retry: 1,
    status: "passed",
    durationMs: 8,
    startedAt: "2026-09-07T00:00:02.000Z",
  });
  const run = published(e),
    metrics = runMetrics(run);
  assert.equal(metrics.summary?.passRate, 0);
  assert.equal(metrics.summary?.flaky, 1);
  assert.equal(metrics.durationMs, 5000);
  assert.equal(durationLabel(metrics.durationMs), "5.0s");
  assert.equal(durationLabel(0), "0ms");
  assert.equal(durationLabel(null), "—");
  assert.equal(runMetrics(published(null)).summary, null);
});
test("recent results hides empty attempts but retains failed usable results and never exceeds five", () => {
  const runs = Array.from({ length: 7 }, (_, i) => ({
    ...published(),
    id: String(100 + i),
    number: 10 - i,
  }));
  const missing = { ...published(null), number: 11 };
  const failed = { ...published(), number: 12, status: "failed" as const };
  const selected = recentResults([missing, ...runs, failed]);
  assert.equal(selected.length, 5);
  assert.equal(selected[0].status, "failed");
  assert.equal(
    selected.some((r) => r.number === 11),
    false,
  );
  assert.equal(usableResults(missing), false);
});
test("history cursor traverses older runs and every retry without dropping or repeating attempts", async () => {
  const config = { repository: "owner/repo", branch: "main", token: "test" };
  const raw = (id: number, attempt = 1) => ({
    id,
    run_attempt: attempt,
    run_number: id,
    head_branch: "main",
    head_sha: "a".repeat(40),
    path: ".github/workflows/playwright.yml",
    event: "push",
    head_repository: { full_name: "owner/repo" },
    status: "completed",
    conclusion: "failure",
    run_started_at: "2026-09-07T00:00:00.000Z",
  });
  const anchors = new Set<string>();
  const request: typeof fetch = async (input) => {
    const u = new URL(String(input));
    if (u.pathname.includes("/workflows/")) {
      anchors.add(u.searchParams.get("created")!);
      return Response.json({
        total_count: 6,
        workflow_runs:
          u.searchParams.get("page") === "1"
            ? [raw(106, 7), raw(105), raw(104), raw(103), raw(102)]
            : [raw(101)],
      });
    }
    if (u.pathname.endsWith("/artifacts"))
      return Response.json({ artifacts: [] });
    const m = u.pathname.match(/runs\/(\d+)\/attempts\/(\d+)$/)!;
    return Response.json(raw(Number(m[1]), Number(m[2])));
  };
  let cursor: string | undefined;
  const keys: string[] = [];
  for (let pages = 0; pages < 10; pages++) {
    const result = await fetchHistory(config, request, cursor);
    keys.push(...result.runs.map((r) => r.id + ":" + r.attempt));
    if (!result.nextCursor) break;
    cursor = result.nextCursor;
  }
  assert.equal(keys.length, 12);
  assert.equal(new Set(keys).size, 12);
  assert.equal(keys[0], "106:7");
  assert.equal(keys.at(-1), "101:1");
  assert.equal(anchors.size, 1);
  for (const bad of [
    "garbage",
    "2026-09-07T00:00:00.000Z~0~0~0",
    "2026-09-07T00:00:00.000Z~201~0~0",
    "2026-09-07T00:00:00.000Z~1~5~0",
  ])
    assert.throws(() => historyCursor(bad));
});

test("history merge deduplicates attempts and preserves stale evidence", async () => {
  const { mergeHistory } = await import("../../src/services/testRunsService");
  const { feed } = await import("../../src/tests/fixtures/testEvidence");
  const first = feed();
  first.nextCursor = "first";
  const next = feed([published(), { ...published(), id: "102", number: 2 }]);
  next.nextCursor = null;
  next.stale = true;
  const combined = mergeHistory(first, next);
  assert.equal(combined.runs.length, 2);
  assert.equal(combined.runs[0].number, 3);
  assert.equal(combined.stale, true);
  assert.equal(combined.nextCursor, null);
});
