import { Router } from "express";
import { unzipSync, strFromU8 } from "fflate";
import {
  validateEvidence,
  validateFeed,
  runStatus,
  orderRuns,
  type PublishedRun,
  type Evidence,
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
export async function readRunArtifact(config: HistoryConfig, head: {id:number;head_sha:string}, attempt:number, artifacts: any[], request:typeof fetch, signal:AbortSignal, reportCache=new Map<string,{until:number;evidence:Evidence}>()) {
  const base=`https://api.github.com/repos/${config.repository}`;
  const headers={Authorization:`Bearer ${config.token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
  let evidence: PublishedRun['evidence']=null;
  let evidenceState: PublishedRun['evidenceState']='missing';
        const candidates = artifacts.filter(
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
            const reportKey =
              config.repository + ":" + a.id + ":" + head.head_sha;
            const remembered = reportCache.get(reportKey);
            if (
              remembered &&
              remembered.until > Date.now() &&
              remembered.evidence.runId === String(head.id) &&
              remembered.evidence.runAttempt === attempt
            ) {
              evidence = remembered.evidence;
              evidenceState = "available";
            } else {
              const redirect = await request(
                base + `/actions/artifacts/${a.id}/zip`,
                { headers, signal, redirect: "manual" },
              );
              if (redirect.status !== 302)
                throw Error("Artifact download unavailable");
              const destination = new URL(
                redirect.headers.get("location") || "",
              );
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
                if (reportCache.size >= 32)
                  reportCache.delete(reportCache.keys().next().value!);
                reportCache.set(reportKey, {
                  until: Date.now() + 300000,
                  evidence: parsed,
                });
              } catch {
                evidenceState = "invalid";
              }
            }
          }
        }
  return {evidence,evidenceState};
}
export function historyCursor(value?: string) {
  if (!value)
    return { anchor: new Date().toISOString(), page: 1, index: 0, attempt: 0 };
  const [anchor, page, index, attempt, extra] = value.split("~");
  if (
    extra !== undefined ||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(anchor) ||
    !Number.isFinite(Date.parse(anchor)) ||
    ![page, index, attempt].every((v) => /^\d+$/.test(v)) ||
    +page < 1 ||
    +page > 200 ||
    +index > 4 ||
    +attempt > 10000
  )
    throw Error("Invalid history cursor");
  return { anchor, page: +page, index: +index, attempt: +attempt };
}
export async function fetchHistory(
  config: HistoryConfig,
  request: typeof fetch = fetch,
  cursor?: string,
  reportCache = new Map<string, { until: number; evidence: Evidence }>(),
): Promise<TelemetryFeed> {
  const position = historyCursor(cursor);
  const encode = (page: number, index = 0, attempt = 0) =>
    `${position.anchor}~${page}~${index}~${attempt}`;
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
    `/actions/workflows/playwright.yml/runs?branch=${encodeURIComponent(config.branch)}&per_page=5&page=${position.page}&created=${encodeURIComponent("<=" + position.anchor)}`,
  );
  if (!Array.isArray(listing.workflow_runs))
    throw Error("Invalid GitHub run list");
  const trusted = listing.workflow_runs.filter(
    (r: any) =>
      r.head_branch === config.branch &&
      ["push", "workflow_dispatch"].includes(r.event) &&
      r.head_repository?.full_name === config.repository &&
      r.path === ".github/workflows/playwright.yml",
  );
  const runs: PublishedRun[] = [];
  // Page attempts independently, preserving older reruns without unbounded responses.
  let nextCursor: string | null = null;
  let historyLimited = false;
  outer: for (let index = position.index; index < trusted.length; index++) {
    const head = trusted[index];
    if (
      !Number.isSafeInteger(head.id) ||
      head.id <= 0 ||
      !Number.isSafeInteger(head.run_attempt) ||
      head.run_attempt < 1
    )
      throw Error("Invalid GitHub identity");
    let artifacts: any[] | undefined;
    for (
      let attempt =
        index === position.index && position.attempt
          ? Math.min(position.attempt, head.run_attempt)
          : head.run_attempt;
      attempt >= 1;
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
        ({evidence,evidenceState}=await readRunArtifact(config,head,attempt,artifacts!,request,signal,reportCache));
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
      if (runs.length === 5) {
        if (attempt > 1) nextCursor = encode(position.page, index, attempt - 1);
        else if (index + 1 < trusted.length)
          nextCursor = encode(position.page, index + 1);
        else if (listing.workflow_runs.length === 5 && position.page < 200)
          nextCursor = encode(position.page + 1);
        else
          historyLimited = position.page === 200 && listing.total_count > 1000;
        break outer;
      }
    }
  }
  if (runs.length < 5 && listing.workflow_runs.length === 5) {
    if (position.page < 200) nextCursor = encode(position.page + 1);
    else historyLimited = listing.total_count > 1000;
  }
  return validateFeed({
    version: 1,
    configured: true,
    fetchedAt: new Date().toISOString(),
    stale: false,
    runs: orderRuns(runs),
    nextCursor,
    historyLimited,
  });
}
export function historyRouter(
  config: HistoryConfig | null,
  load = fetchHistory,
) {
  const router = Router();
  const reportCache = new Map<string, { until: number; evidence: Evidence }>();
  const cache = new Map<
    string,
    { cached?: TelemetryFeed; next: number; pending?: Promise<void> }
  >();
  router.get("/api/test-history", async (req, res) => {
    res.set("Cache-Control", "no-store");
    let cursor: string | undefined;
    try {
      if (
        Object.keys(req.query).some((k) => k !== "cursor") ||
        (req.query.cursor !== undefined && typeof req.query.cursor !== "string")
      )
        throw Error();
      cursor = req.query.cursor as string | undefined;
      if (cursor !== undefined && !cursor.length) throw Error();
      historyCursor(cursor);
    } catch {
      return res.status(400).json({ error: "Invalid history page." });
    }
    if (!config)
      return res.json({
        version: 1,
        configured: false,
        fetchedAt: new Date().toISOString(),
        stale: false,
        runs: [],
        nextCursor: null,
      });
    const key = cursor || "latest";
    if (!cache.has(key)) {
      if (cache.size >= 100) {
        const available = [...cache].find(([, v]) => !v.pending);
        if (!available)
          return res
            .status(429)
            .json({ error: "History is busy. Retry shortly." });
        cache.delete(available[0]);
      }
      cache.set(key, { next: 0 });
    }
    const entry = cache.get(key)!;
    try {
      if (Date.now() >= entry.next) {
        entry.pending ??= load(config, fetch, cursor, reportCache)
          .then((result) => {
            entry.cached = validateFeed(result);
          })
          .finally(() => {
            entry.pending = undefined;
            entry.next = Date.now() + (cursor ? 60000 : 15000);
          });
        await entry.pending;
      }
      if (!entry.cached) throw Error();
      return res.json(entry.cached);
    } catch {
      if (entry.cached) {
        entry.cached = { ...entry.cached, stale: true };
        return res.json(entry.cached);
      }
      return res.status(502).json({
        error: "Test history could not be retrieved. Please retry shortly.",
      });
    }
  });
  return router;
}
