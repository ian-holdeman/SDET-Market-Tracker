// Public allowlist: never include stdout, errors, attachments, URLs visited, or user data.
export type Outcome =
  | "passed"
  | "flaky"
  | "failed"
  | "skipped"
  | "interrupted"
  | "incomplete";
export type Attempt = {
  retry: number;
  status: "passed" | "failed" | "timedOut" | "skipped" | "interrupted";
  durationMs: number;
  startedAt: string;
};
export type TestEvidence = {
  id: string;
  name: string;
  file: string;
  project: string;
  attempts: Attempt[];
};
export type Evidence = {
  version: 1;
  runId: string;
  runAttempt: number;
  commitSha: string;
  environment: "local" | "github-actions";
  startedAt: string;
  completedAt: string | null;
  runnerStatus: "passed" | "failed" | "timedout" | "interrupted" | "incomplete";
  planned: number;
  errorCount: number;
  tests: TestEvidence[];
};
const fail = (): never => {
  throw new Error("Invalid test evidence");
};
const text = (v: unknown, max = 500): string =>
  typeof v === "string" &&
  v.length > 0 &&
  v.length <= max &&
  !/[\x00-\x1f]/.test(v)
    ? v
    : fail();
const count = (v: unknown): number =>
  Number.isSafeInteger(v) && Number(v) >= 0 ? Number(v) : fail();
const date = (v: unknown): string =>
  typeof v === "string" &&
  /^\d{4}-\d\d-\d\dT/.test(v) &&
  Number.isFinite(Date.parse(v))
    ? v
    : fail();
export function validateEvidence(raw: any): Evidence {
  if (
    !raw ||
    raw.version !== 1 ||
    !["local", "github-actions"].includes(raw.environment) ||
    !["passed", "failed", "timedout", "interrupted", "incomplete"].includes(
      raw.runnerStatus,
    )
  )
    fail();
  const runId = text(raw.runId, 100),
    runAttempt = count(raw.runAttempt),
    commitSha = text(raw.commitSha, 100);
  if (
    !runAttempt ||
    (raw.environment === "github-actions" &&
      (!/^\d+$/.test(runId) || !/^[a-f0-9]{40}$/.test(commitSha)))
  )
    fail();
  const startedAt = date(raw.startedAt),
    completedAt = raw.completedAt === null ? null : date(raw.completedAt);
  if (completedAt && Date.parse(completedAt) < Date.parse(startedAt)) fail();
  if (raw.runnerStatus !== "incomplete" && !completedAt) fail();
  if (
    !Array.isArray(raw.tests) ||
    raw.tests.length > 5000 ||
    count(raw.planned) !== raw.tests.length
  )
    fail();
  const ids = new Set<string>();
  const tests = raw.tests.map((t: any): TestEvidence => {
    const id = text(t.id),
      name = text(t.name),
      project = text(t.project, 100),
      file = text(t.file);
    if (
      ids.has(id) ||
      file.startsWith("/") ||
      file.includes("..") ||
      file.includes(":") ||
      file.includes("\\")
    )
      fail();
    ids.add(id);
    if (!Array.isArray(t.attempts) || t.attempts.length > 2) fail();
    const attempts = t.attempts.map((a: any, i: number): Attempt => {
      if (
        !a ||
        a.retry !== i ||
        !["passed", "failed", "timedOut", "skipped", "interrupted"].includes(
          a.status,
        ) ||
        !Number.isFinite(a.durationMs) ||
        a.durationMs < 0
      )
        fail();
      const time = date(a.startedAt);
      if (
        Date.parse(time) < Date.parse(startedAt) ||
        (completedAt && Date.parse(time) > Date.parse(completedAt))
      )
        fail();
      return {
        retry: i,
        status: a.status,
        durationMs: a.durationMs,
        startedAt: time,
      };
    });
    if (
      attempts.length === 2 &&
      (!["failed", "timedOut"].includes(attempts[0].status) ||
        Date.parse(attempts[1].startedAt) < Date.parse(attempts[0].startedAt))
    )
      fail();
    return { id, name, file, project, attempts };
  });
  return {
    version: 1,
    runId,
    runAttempt,
    commitSha,
    environment: raw.environment,
    startedAt,
    completedAt,
    runnerStatus: raw.runnerStatus,
    planned: tests.length,
    errorCount: count(raw.errorCount),
    tests,
  };
}
export function testOutcome(t: TestEvidence): Outcome {
  const last = t.attempts.at(-1);
  if (!last) return "incomplete";
  if (last.status === "passed")
    return t.attempts.length > 1 ? "flaky" : "passed";
  if (last.status === "skipped")
    return t.attempts.length > 1 ? "incomplete" : "skipped";
  if (last.status === "interrupted") return "interrupted";
  return "failed";
}
export function summarize(e: Evidence) {
  const counts: Record<Outcome, number> = {
    passed: 0,
    flaky: 0,
    failed: 0,
    skipped: 0,
    interrupted: 0,
    incomplete: 0,
  };
  for (const test of e.tests) counts[testOutcome(test)]++;
  const total = e.tests.length;
  const status: Outcome =
    e.runnerStatus === "interrupted"
      ? "interrupted"
      : !total || e.runnerStatus === "incomplete" || counts.incomplete
        ? "incomplete"
        : counts.interrupted
          ? "interrupted"
          : e.errorCount ||
              ["failed", "timedout"].includes(e.runnerStatus) ||
              counts.failed
            ? "failed"
            : counts.flaky
              ? "flaky"
              : counts.skipped === total
                ? "skipped"
                : "passed";
  // Denominator includes every collected test/project, including skipped and unexecuted cases.
  return {
    ...counts,
    total,
    status,
    passRate: total ? Math.round((counts.passed / total) * 1000) / 10 : null,
  };
}
export type PublishedRun = {
  id: string;
  attempt: number;
  number: number;
  branch: string;
  commitSha: string;
  url: string;
  startedAt: string;
  completed: boolean;
  conclusion: string | null;
  status: Outcome | "running" | "cancelled";
  evidence: Evidence | null;
  evidenceState: "available" | "missing" | "invalid" | "expired" | "pending";
};
export type TelemetryFeed = {
  nextCursor?: string | null;
  historyLimited?: boolean;
  version: 1;
  configured: boolean;
  fetchedAt: string;
  stale: boolean;
  runs: PublishedRun[];
};
export function orderRuns(runs: PublishedRun[]) {
  // Workflow run number is creation order; a late finish or old-run retry cannot displace a newer run.
  return [...runs].sort((a, b) => b.number - a.number || b.attempt - a.attempt);
}
export function runStatus(
  conclusion: string | null,
  complete: boolean,
  evidence: Evidence | null,
): PublishedRun["status"] {
  if (!complete) return "running";
  if (conclusion === "cancelled") return "cancelled";
  if (conclusion === "skipped") return "skipped";
  if (!evidence) return "incomplete";
  const status = summarize(evidence).status;
  return conclusion !== "success" && ["passed", "flaky"].includes(status)
    ? "failed"
    : status;
}
export function validateFeed(raw: any): TelemetryFeed {
  if (
    raw?.version !== 1 ||
    typeof raw.configured !== "boolean" ||
    typeof raw.stale !== "boolean" ||
    !Array.isArray(raw.runs) ||
    raw.runs.length > 20
  )
    fail();
  if (
    raw.nextCursor != null &&
    (typeof raw.nextCursor !== "string" || raw.nextCursor.length > 150)
  )
    fail();
  if (
    raw.historyLimited !== undefined &&
    typeof raw.historyLimited !== "boolean"
  )
    fail();
  const keys = new Set<string>();
  const runs = raw.runs.map((r: any): PublishedRun => {
    const id = text(r.id),
      attempt = count(r.attempt),
      number = count(r.number),
      branch = text(r.branch),
      commitSha = text(r.commitSha);
    if (
      !/^\d+$/.test(id) ||
      !attempt ||
      !number ||
      !/^[a-f0-9]{40}$/.test(commitSha) ||
      typeof r.completed !== "boolean" ||
      !["available", "missing", "invalid", "expired", "pending"].includes(
        r.evidenceState,
      )
    )
      fail();
    const url = new URL(text(r.url));
    if (
      url.protocol !== "https:" ||
      url.hostname !== "github.com" ||
      url.username ||
      url.password ||
      !new RegExp("/actions/runs/" + id + "/attempts/" + attempt + "$").test(
        url.pathname,
      )
    )
      fail();
    const key = id + ":" + attempt;
    if (keys.has(key)) fail();
    keys.add(key);
    const evidence = r.evidence === null ? null : validateEvidence(r.evidence);
    if (
      evidence &&
      (evidence.environment !== "github-actions" ||
        evidence.runId !== id ||
        evidence.runAttempt !== attempt ||
        evidence.commitSha !== commitSha)
    )
      fail();
    if ((r.evidenceState === "available") !== Boolean(evidence)) fail();
    const conclusion = r.conclusion === null ? null : text(r.conclusion, 50);
    const status = runStatus(conclusion, r.completed, evidence);
    if (r.status !== status) fail();
    return {
      id,
      attempt,
      number,
      branch,
      commitSha,
      url: url.href,
      startedAt: date(r.startedAt),
      completed: r.completed,
      conclusion,
      status,
      evidence,
      evidenceState: r.evidenceState,
    };
  });
  if (!raw.configured && runs.length) fail();
  return {
    version: 1,
    configured: raw.configured,
    nextCursor: raw.nextCursor ?? null,
    historyLimited: raw.historyLimited ?? false,
    fetchedAt: date(raw.fetchedAt),
    stale: raw.stale,
    runs: orderRuns(runs),
  };
}
