import type {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  FullResult,
} from "@playwright/test/reporter";
import { mkdirSync, writeFileSync, renameSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Evidence } from "../src/telemetry/contract";

export default class EvidenceReporter implements Reporter {
  private evidence!: Evidence;
  onBegin(config: FullConfig, suite: Suite) {
    const github = process.env.GITHUB_ACTIONS === "true";
    this.evidence = {
      version: 1,
      runId: github ? process.env.GITHUB_RUN_ID! : randomUUID(),
      runAttempt: github ? Number(process.env.GITHUB_RUN_ATTEMPT) : 1,
      commitSha: github ? process.env.GITHUB_SHA! : "local",
      environment: github ? "github-actions" : "local",
      startedAt: new Date().toISOString(),
      completedAt: null,
      runnerStatus: "incomplete",
      errorCount: 0,
      planned: suite.allTests().length,
      tests: suite
        .allTests()
        .map((t) => ({
          id: t.id,
          name: t.titlePath().slice(2).join(" › "),
          file: path
            .relative(config.rootDir, t.location.file)
            .replaceAll("\\", "/"),
          project: t.parent.project()!.name,
          attempts: [],
        })),
    };
    this.save();
  }
  onTestEnd(test: TestCase, result: TestResult) {
    this.evidence.tests
      .find((t) => t.id === test.id)!
      .attempts.push({
        retry: result.retry,
        status: result.status,
        durationMs: result.duration,
        startedAt: result.startTime.toISOString(),
      });
    this.save();
  }
  onError() {
    if (this.evidence) {
      this.evidence.errorCount++;
      this.save();
    }
  }
  onEnd(result: FullResult) {
    if (!this.evidence) return; // Infrastructure failure before collection: ingestion emits incomplete evidence.
    this.evidence.runnerStatus = result.status;
    this.evidence.completedAt = new Date().toISOString();
    this.save();
  }
  private save() {
    mkdirSync(".telemetry", { recursive: true });
    writeFileSync(".telemetry/input.tmp", JSON.stringify(this.evidence));
    renameSync(".telemetry/input.tmp", ".telemetry/input.json");
  }
}
