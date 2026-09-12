import { Router } from "express";
import type { HistoryConfig } from "./test-history";
export async function fetchTestActivity(
  config: HistoryConfig,
  request: typeof fetch = fetch,
) {
  const response = await request(
    "https://api.github.com/repos/" +
      config.repository +
      "/actions/workflows/playwright.yml/runs?status=in_progress&branch=" +
      encodeURIComponent(config.branch) +
      "&per_page=100",
    {
      headers: {
        Authorization: "Bearer " + config.token,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      signal: AbortSignal.timeout(10000),
      redirect: "error",
    },
  );
  if (!response.ok) throw Error("Activity unavailable");
  const body = await response.json();
  if (!Array.isArray(body.workflow_runs) || body.workflow_runs.length > 100)
    throw Error("Invalid activity");
  return body.workflow_runs.some(
    (r: any) =>
      r.status === "in_progress" &&
      r.conclusion === null &&
      r.head_branch === config.branch &&
      r.head_repository?.full_name === config.repository &&
      r.path === ".github/workflows/playwright.yml" &&
      ["push", "workflow_dispatch", "schedule"].includes(r.event),
  );
}
export function testActivityRouter(
  config: HistoryConfig | null,
  load = fetchTestActivity,
  clock = Date.now,
) {
  const router = Router();
  let next = 0,
    value: { active: boolean; checkedAt: string } | null = null,
    pending: Promise<void> | null = null;
  router.get("/api/test-activity", async (_req, res) => {
    res.set("Cache-Control", "no-store");
    if (!config)
      return res.json({
        active: false,
        checkedAt: new Date(clock()).toISOString(),
      });
    if (clock() >= next) {
      pending ??= load(config)
        .then((active) => {
          value = { active, checkedAt: new Date(clock()).toISOString() };
        })
        .catch(() => {
          value = null;
        })
        .finally(() => {
          next = clock() + 15000;
          pending = null;
        });
      await pending;
    }
    if (!value) return res.status(502).json({ error: "Activity unavailable" });
    return res.json(value);
  });
  return router;
}
