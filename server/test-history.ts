import { Router } from "express";
import { unzipSync, strFromU8 } from "fflate";
import {
  validateEvidence,
  validateFeed,
  runStatus,
  orderRuns,
  type PublishedRun,
  type TelemetryFeed,
} from "../src/telemetry/contract";

export type HistoryConfig = {
  repository: string;
  branch: string;
  token: string;
};
export function historyConfig(env: NodeJS.ProcessEnv): HistoryConfig | null {
  const {
    TEST_HISTORY_REPOSITORY: repository,
    TEST_HISTORY_BRANCH: branch,
    TEST_HISTORY_TOKEN: token,
  } = env;
  if (!repository && !branch && !token) return null;
  if (
    !repository ||
    !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) ||
    !branch ||
    branch.length > 200 ||
    !token
  )
    throw Error(
      "Configure TEST_HISTORY_REPOSITORY, TEST_HISTORY_BRANCH and server-only TEST_HISTORY_TOKEN together.",
    );
  return { repository, branch, token };
}
async function bytes(response: Response, max = 2_000_000) {
  if (!response.body) throw Error("Missing response");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.length;
      if (size > max) throw Error("Response too large");
      chunks.push(next.value);
    }
  } finally {
    await reader.cancel();
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}
export function decodeArtifact(data: Uint8Array) {
  const files = unzipSync(data, {
    filter: (entry) =>
      entry.name === "telemetry.json" && entry.originalSize <= 1_000_000,
  });
  if (!files["telemetry.json"]) throw Error("Missing telemetry");
  return validateEvidence(JSON.parse(strFromU8(files["telemetry.json"])));
}
export async function fetchHistory(
  config: HistoryConfig,
  request: typeof fetch = fetch,
): Promise<TelemetryFeed> {
  const base = `https://api.github.com/repos/${config.repository}`;
  const signal = AbortSignal.timeout(25000);
  const headers = {
    Authorization: `Bearer ${config.token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  async function json(path: string) {
    const response = await request(base + path, {
      headers,
      signal,
      redirect: "error",
    });
    if (!response.ok) throw Error("GitHub history unavailable");
    return JSON.parse(strFromU8(await bytes(response)));
  }
  const listing = await json(
    `/actions/workflows/playwright.yml/runs?branch=${encodeURIComponent(config.branch)}&per_page=20`,
  );
  if (!Array.isArray(listing.workflow_runs))
    throw Error("Invalid GitHub run list");
  const trusted = listing.workflow_runs
    .filter(
      (r: any) =>
        r.head_branch === config.branch &&
        ["push", "workflow_dispatch"].includes(r.event) &&
        r.head_repository?.full_name === config.repository &&
        r.path === ".github/workflows/playwright.yml",
    )
    .slice(0, 5);
  const runs: PublishedRun[] = [];
  // Each run retains its current and immediately preceding attempt; independent runs remain ordered by creation.
  for (const head of trusted) {
    if (
      !Number.isSafeInteger(head.id) ||
      head.id <= 0 ||
      !Number.isSafeInteger(head.run_attempt) ||
      head.run_attempt < 1
    )
      throw Error("Invalid GitHub identity");
    let artifacts: any[] | undefined;
    for (
      let attempt = head.run_attempt;
      attempt >= Math.max(1, head.run_attempt - 1);
      attempt--
    ) {
      const r =
        attempt === head.run_attempt
          ? head
          : await json(`/actions/runs/${head.id}/attempts/${attempt}`);
      if (
        r.id !== head.id ||
        r.run_attempt !== attempt ||
        r.head_sha !== head.head_sha ||
        r.head_branch !== config.branch ||
        r.path !== ".github/workflows/playwright.yml" ||
        r.head_repository?.full_name !== config.repository ||
        !["push", "workflow_dispatch"].includes(r.event)
      )
        throw Error("Mismatched GitHub attempt");
      const complete = r.status === "completed";
      let evidence: PublishedRun["evidence"] = null;
      let evidenceState: PublishedRun["evidenceState"] = complete
        ? "missing"
        : "pending";
      if (complete) {
        if (!artifacts) {
          const listing = await json(
            `/actions/runs/${head.id}/artifacts?per_page=100`,
          );
          if (!Array.isArray(listing.artifacts))
            throw Error("Invalid artifact list");
          artifacts = listing.artifacts;
        }
        const candidates = artifacts!.filter(
          (a) => a.name === `test-evidence-v1-${head.id}-${attempt}`,
        );
        if (candidates.length > 1) evidenceState = "invalid";
        else if (candidates.length === 1) {
          const a = candidates[0];
          if (a.expired) evidenceState = "expired";
          else if (
            !Number.isSafeInteger(a.id) ||
            a.id <= 0 ||
            a.size_in_bytes > 1_000_000 ||
            a.workflow_run?.id !== head.id ||
            a.workflow_run?.head_sha !== head.head_sha ||
            a.workflow_run?.head_branch !== config.branch
          )
            evidenceState = "invalid";
          else {
            const redirect = await request(
              base + `/actions/artifacts/${a.id}/zip`,
              { headers, signal, redirect: "manual" },
            );
            if (redirect.status !== 302)
              throw Error("Artifact download unavailable");
            const destination = new URL(redirect.headers.get("location") || "");
            if (
              destination.protocol !== "https:" ||
              destination.username ||
              destination.password ||
              ![".blob.core.windows.net", ".githubusercontent.com"].some(
                (suffix) => destination.hostname.endsWith(suffix),
              )
            )
              throw Error("Untrusted artifact host");
            // Never forward the GitHub credential to the signed storage URL.
            const downloaded = await request(destination.href, {
              signal,
              redirect: "error",
            });
            if (!downloaded.ok) throw Error("Artifact download unavailable");
            const data = await bytes(downloaded, 1_000_000);
            try {
              const parsed = decodeArtifact(data);
              if (
                parsed.environment !== "github-actions" ||
                parsed.runId !== String(head.id) ||
                parsed.runAttempt !== attempt ||
                parsed.commitSha !== head.head_sha
              )
                throw Error();
              evidence = parsed;
              evidenceState = "available";
            } catch {
              evidenceState = "invalid";
            }
          }
        }
      }
      runs.push({
        id: String(r.id),
        attempt,
        number: r.run_number,
        branch: r.head_branch,
        commitSha: r.head_sha,
        url: `https://github.com/${config.repository}/actions/runs/${r.id}/attempts/${attempt}`,
        startedAt: r.run_started_at || r.created_at,
        completed: complete,
        conclusion: r.conclusion,
        status: runStatus(r.conclusion, complete, evidence),
        evidence,
        evidenceState,
      });
    }
  }
  return validateFeed({
    version: 1,
    configured: true,
    fetchedAt: new Date().toISOString(),
    stale: false,
    runs: orderRuns(runs),
  });
}
export function historyRouter(
  config: HistoryConfig | null,
  load = fetchHistory,
) {
  const router = Router();
  let cached: TelemetryFeed | undefined;
  let next = 0;
  let pending: Promise<TelemetryFeed> | undefined;
  const empty = (): TelemetryFeed => ({
    version: 1,
    configured: false,
    fetchedAt: new Date().toISOString(),
    stale: false,
    runs: [],
  });
  router.get("/api/test-history", async (_req, res) => {
    res.set("Cache-Control", "no-store");
    if (!config) return res.json(empty());
    try {
      if (Date.now() >= next) {
        pending ??= load(config)
          .then((result) => {
            cached = validateFeed(result);
            return cached;
          })
          .finally(() => {
            pending = undefined;
            next = Date.now() + 60000;
          });
        await pending;
      }
      if (!cached) throw Error();
      return res.json(cached);
    } catch {
      if (cached) {
        cached = { ...cached, stale: true };
        return res.json(cached);
      }
      return res
        .status(502)
        .json({
          error: "Test history could not be retrieved. Please retry shortly.",
        });
    }
  });
  return router;
}
