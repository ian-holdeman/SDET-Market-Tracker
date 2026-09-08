import type {
  Evidence,
  PublishedRun,
  TelemetryFeed,
} from "../../telemetry/contract";
import { runStatus } from "../../telemetry/contract";
export function evidence(): Evidence {
  return {
    version: 1,
    runId: "101",
    runAttempt: 1,
    commitSha: "a".repeat(40),
    environment: "github-actions",
    startedAt: "2026-09-07T00:00:00.000Z",
    completedAt: "2026-09-07T00:00:05.000Z",
    runnerStatus: "passed",
    planned: 1,
    errorCount: 0,
    tests: [
      {
        id: "one",
        name: "Owner-only watchlist",
        file: "auth/auth.spec.ts",
        project: "chromium-desktop",
        attempts: [
          {
            retry: 0,
            status: "passed",
            durationMs: 5,
            startedAt: "2026-09-07T00:00:01.000Z",
          },
        ],
      },
    ],
  };
}
export function published(e: Evidence | null = evidence()): PublishedRun {
  return {
    id: "101",
    attempt: 1,
    number: 3,
    branch: "main",
    commitSha: "a".repeat(40),
    url: "https://github.com/owner/repo/actions/runs/101/attempts/1",
    startedAt: "2026-09-07T00:00:00.000Z",
    completed: true,
    conclusion: "success",
    status: runStatus("success", true, e),
    evidence: e,
    evidenceState: e ? "available" : "missing",
  };
}
export function feed(runs = [published()]): TelemetryFeed {
  return {
    version: 1,
    configured: true,
    fetchedAt: "2026-09-07T00:10:00.000Z",
    stale: false,
    runs,
  };
}
