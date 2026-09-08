import { readFile, mkdir, writeFile, rename } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import {
  validateEvidence,
  summarize,
  type Evidence,
} from "../src/telemetry/contract";

async function ingest() {
  const args = process.argv.slice(2);
  if (args.some((a) => a !== "--github") || args.length > 1)
    throw Error(
      "Use --github only inside the trusted GitHub Actions workflow.",
    );
  const github = args.includes("--github");
  if (
    github &&
    (process.env.GITHUB_ACTIONS !== "true" ||
      !["push", "workflow_dispatch"].includes(
        process.env.GITHUB_EVENT_NAME || "",
      ))
  )
    throw Error("Publishing requires a trusted GitHub Actions event.");
  let invalid = false;
  let evidence: Evidence;
  try {
    evidence = validateEvidence(
      JSON.parse(await readFile(".telemetry/input.json", "utf8")),
    );
    if (
      github &&
      (evidence.environment !== "github-actions" ||
        evidence.runId !== process.env.GITHUB_RUN_ID ||
        evidence.runAttempt !== Number(process.env.GITHUB_RUN_ATTEMPT) ||
        evidence.commitSha !== process.env.GITHUB_SHA)
    )
      throw Error();
    if (!github && evidence.environment !== "local") throw Error();
  } catch {
    invalid = true;
    evidence = validateEvidence({
      version: 1,
      runId: github ? process.env.GITHUB_RUN_ID : randomUUID(),
      runAttempt: github ? Number(process.env.GITHUB_RUN_ATTEMPT) : 1,
      commitSha: github ? process.env.GITHUB_SHA : "local",
      environment: github ? "github-actions" : "local",
      startedAt: new Date().toISOString(),
      completedAt: null,
      runnerStatus: "incomplete",
      planned: 0,
      errorCount: 1,
      tests: [],
    });
  }
  const directory = github ? ".telemetry/publish" : ".telemetry/local";
  await mkdir(directory, { recursive: true });
  const destination = directory + "/telemetry.json";
  await writeFile(destination + ".tmp", JSON.stringify(evidence));
  await rename(destination + ".tmp", destination);
  console.log(
    `Validated ${evidence.environment} evidence: ${summarize(evidence).status}. ${destination}`,
  );
  if (invalid)
    throw Error(
      "Missing, mismatched or invalid report: only incomplete evidence was written.",
    );
}
ingest().catch(() => {
  console.error(
    "Telemetry ingestion failed. No passing evidence was published.",
  );
  process.exitCode = 1;
});
