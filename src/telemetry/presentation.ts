import { orderRuns, summarize, type PublishedRun } from "./contract";
export const runKey = (run: PublishedRun) => `${run.id}:${run.attempt}`;
export const runLabel = (run: PublishedRun) =>
  `#${run.number}${run.attempt > 1 ? ` · ${run.attempt}` : ""}`;
export function usableResults(run: PublishedRun) {
  return Boolean(
    run.completed &&
      run.evidence?.completedAt &&
      run.evidence.tests.some((t) =>
        t.attempts.some((a) => a.status !== "skipped"),
      ),
  );
}
export function recentResults(runs: PublishedRun[]) {
  return orderRuns(runs).filter(usableResults).slice(0, 5);
}
export function runMetrics(run?: PublishedRun) {
  const e = run?.evidence;
  const summary = e && e.planned > 0 ? summarize(e) : null;
  const durationMs = e?.completedAt
    ? Date.parse(e.completedAt) - Date.parse(e.startedAt)
    : null;
  return { summary, durationMs };
}
export function durationLabel(ms: number | null) {
  if (ms === null) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}
export function statusLabel(run: PublishedRun) {
  return run.status[0].toUpperCase() + run.status.slice(1);
}
export function latestNotice(run: PublishedRun) {
  if (run.status === "running") return `Run ${runLabel(run)} is in progress.`;
  if (["failure", "timed_out"].includes(run.conclusion || ""))
    return `Run ${runLabel(run)} failed without complete test results.`;
  return `Run ${runLabel(run)} ${run.status === "cancelled" ? "was cancelled" : "has no complete test results"}.`;
}
