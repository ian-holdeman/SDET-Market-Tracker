import React, { useEffect, useId, useRef } from "react";
import { X, Check, AlertTriangle, XCircle, LoaderCircle } from "lucide-react";
import { type PublishedRun, testOutcome } from "../../telemetry/contract";
import {
  runLabel,
  runMetrics,
  durationLabel,
  statusLabel,
} from "../../telemetry/presentation";
import { Dialog as ResultDialog } from '../Dialog';
export { Dialog as ResultDialog } from '../Dialog';
export const statusTone = (status: string) =>
  status === "passed"
    ? "text-positive-ink-400 bg-positive-500/10 border-positive-500/20"
    : status === "failed"
      ? "text-danger-ink-400 bg-danger-500/10 border-danger-500/20"
      : "text-warning-ink-300 bg-warning-500/10 border-warning-500/20";
export function StatusBadge({ run }: { run: PublishedRun }) {
  const Icon =
    run.status === "passed"
      ? Check
      : run.status === "failed"
        ? XCircle
        : run.status === "running"
          ? LoaderCircle
          : AlertTriangle;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${statusTone(run.status)}`}
    >
      <Icon
        aria-hidden="true"
        className={`h-3.5 w-3.5 ${run.status === "running" ? "animate-spin" : ""}`}
      />
      {statusLabel(run)}
    </span>
  );
}
export function Metrics({
  run,
  compact = false,
  snapshot = false,
  pending = false,
}: {
  run?: PublishedRun;
  compact?: boolean;
  snapshot?: boolean;
  pending?: boolean;
}) {
  const { summary, durationMs } = runMetrics(run);
  const metrics = [
    [
      "pass-rate",
      "Pass Rate",
      summary?.passRate == null ? "—" : `${summary.passRate}%`,
    ],
    ["total-tests", "Total Tests", summary?.total ?? "—"],
    ["duration", "Duration", durationLabel(durationMs)],
    ["flaky-tests", "Flaky Tests", summary?.flaky ?? "—"],
  ];
  return (
    <div
      data-testid="run-metrics"
      className={`grid grid-cols-2 ${compact ? "gap-3.5" : "lg:grid-cols-4 gap-3 sm:gap-4"}`}
    >
      {metrics.map(([key, label, value]) => (
        <div
          key={key}
          data-testid={`run-metric-${key}`}
          data-metric={label}
          className={`min-w-0 rounded-xl border border-line/80 bg-inset/80 ${compact ? "p-4" : "p-4 sm:p-5"} ${snapshot ? "lg:aspect-[4/3] lg:flex lg:flex-col lg:items-center lg:justify-center lg:text-center" : ""}`}
        >
          <p
            data-testid="metric-label"
            className={`text-xs font-medium text-ink-muted ${snapshot ? "lg:text-lg lg:font-semibold lg:text-ink-strong" : ""}`}
          >
            {label}
          </p>
          <p
            data-testid="metric-value"
            className={`mt-3 font-mono font-black tracking-tight ${compact ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl"} ${snapshot ? "lg:text-4xl xl:text-5xl" : ""} ${label === "Flaky Tests" && Number(value) > 0 ? "text-warning-ink-300" : "text-ink-heading"}`}
          >
            {pending ? (
              <span
                data-testid="metric-skeleton"
                aria-label="Loading value"
                className="inline-block h-[1em] w-20 rounded bg-surface-700/40 motion-safe:animate-pulse align-middle"
              />
            ) : (
              <span key={String(value)} className="metric-reveal">
                {value}
              </span>
            )}
          </p>
        </div>
      ))}
    </div>
  );
}
export function Exceptions({ run }: { run: PublishedRun }) {
  const s = runMetrics(run).summary;
  const labels = s
    ? [
        s.failed && `${s.failed} failed`,
        s.skipped && `${s.skipped} skipped`,
        s.interrupted && `${s.interrupted} interrupted`,
        s.incomplete && `${s.incomplete} unfinished`,
      ].filter(Boolean)
    : [];
  return labels.length ? (
    <p
      className={`text-sm font-medium ${s?.failed ? "text-danger-ink-400" : "text-warning-ink-300"}`}
    >
      {labels.join(" · ")}
    </p>
  ) : null;
}
export function RunTable({
  runs,
  details,
}: {
  runs: PublishedRun[];
  details: (r: PublishedRun) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs sm:text-sm [&_svg]:hidden sm:[&_svg]:block [&_span]:text-[10px] sm:[&_span]:text-xs [&_span]:px-1.5 sm:[&_span]:px-2.5">
        <thead className="text-ink-subtle">
          <tr>
            {["Run", "Status", "Pass Rate", "Duration", "Details"].map(
              (label) => (
                <th
                  key={label}
                  className="px-1 py-3 sm:px-4 font-medium whitespace-nowrap"
                >
                  {label}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-line/60">
          {runs.map((run) => {
            const m = runMetrics(run);
            return (
              <tr
                key={`${run.id}:${run.attempt}`}
                className="hover:bg-surface-800/20"
              >
                <td className="px-1 py-4 sm:px-4 text-ink-secondary font-mono whitespace-nowrap">
                  {runLabel(run)}
                </td>
                <td className="px-1 py-4 sm:px-4">
                  <StatusBadge run={run} />
                </td>
                <td className="px-1 py-4 sm:px-4 text-ink-heading font-mono">
                  {m.summary?.passRate == null ? "—" : `${m.summary.passRate}%`}
                </td>
                <td className="px-1 py-4 sm:px-4 text-ink-secondary whitespace-nowrap font-mono">
                  {durationLabel(m.durationMs)}
                </td>
                <td className="px-1 py-4 sm:px-4">
                  <button
                    onClick={(event) => {
                      event.currentTarget.focus();
                      details(run);
                    }}
                    aria-label={`Details for run ${runLabel(run)}`}
                    className="min-h-10 text-info-ink-300 hover:text-info-ink-200 underline-offset-4 hover:underline"
                  >
                    Details
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
export function RunReport({
  run,
  close,
}: {
  run: PublishedRun;
  close: () => void;
}) {
  const e = run.evidence;
  return (
    <ResultDialog title={`Run ${runLabel(run)}`} close={close}>
      <div className="flex items-center justify-between gap-3">
        <StatusBadge run={run} />
        <a
          href={run.url}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-info-ink-300 hover:underline"
        >
          View on GitHub ↗
        </a>
      </div>
      <Metrics run={run} compact />
      <Exceptions run={run} />
      {!e?.tests.length ? (
        <p className="text-sm text-ink-muted">
          {run.evidenceState === "expired"
            ? "Results have expired."
            : "No test results were recorded."}
        </p>
      ) : (
        <>
          <p className="text-xs text-ink-subtle">
            Pass rate excludes retries and includes all collected tests.
          </p>
          <details className="text-xs text-ink-muted border-t border-line pt-4">
            <summary className="cursor-pointer py-1">
              Test results ({e.tests.length} recorded {e.tests.length === 1 ? "case" : "cases"})
            </summary>
            <div className="mt-3 space-y-3">
              {e.tests.map((t) => (
                <article
                  key={t.id}
                  className="rounded-xl border border-line bg-surface-950/30 p-4 space-y-2"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-ink-strong break-words min-w-0 flex-1">
                      {t.name}
                    </h3>
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs ${statusTone(testOutcome(t))}`}
                    >
                      {testOutcome(t)}
                    </span>
                  </div>
                  <p className="text-xs text-ink-subtle">{t.project}</p>
                  {t.attempts.map((a) => (
                    <p key={a.retry} className="text-xs text-ink-muted">
                      Attempt {a.retry + 1}: {a.status}{" "}
                      <span className="text-ink-faint">·</span>{" "}
                      {durationLabel(a.durationMs)}
                    </p>
                  ))}
                  {!t.attempts.length && (
                    <p className="text-xs text-warning-ink-300">No execution result.</p>
                  )}
                </article>
              ))}
            </div>
          </details>
        </>
      )}
      <details className="text-xs text-ink-muted border-t border-line pt-4">
        <summary className="cursor-pointer py-1">Run metadata</summary>
        <dl className="mt-3 space-y-2 break-all">
          <div>
            <dt className="text-ink-subtle">Commit</dt>
            <dd>{run.commitSha}</dd>
          </div>
          <div>
            <dt className="text-ink-subtle">Started</dt>
            <dd>{new Date(e?.startedAt || run.startedAt).toLocaleString()}</dd>
          </div>
          {e?.completedAt && (
            <div>
              <dt className="text-ink-subtle">Finished</dt>
              <dd>{new Date(e.completedAt).toLocaleString()}</dd>
            </div>
          )}
          <div>
            <dt className="text-ink-subtle">Workflow outcome</dt>
            <dd>{run.conclusion || "In progress"}</dd>
          </div>
          {!!e?.errorCount && (
            <div>
              <dt>Runner errors</dt>
              <dd>{e.errorCount}</dd>
            </div>
          )}
        </dl>
      </details>
    </ResultDialog>
  );
}

export function RefreshStatus({
  updating,
  snapshot,
  fetchedAt,
}: {
  updating: boolean;
  snapshot?: boolean;
  fetchedAt?: string;
}) {
  const age = fetchedAt && Date.parse(fetchedAt) > 0
    ? Math.max(0, Math.floor((Date.now() - Date.parse(fetchedAt)) / 60000)) : null;
  const ageLabel = age === null ? '' : age < 1 ? 'just checked' : age < 60 ? `${age}m old` : age < 1440 ? `${Math.floor(age / 60)}h old` : `${Math.floor(age / 1440)}d old`;
  return (
    <p
      data-testid="result-refresh-status"
      role="status"
      className="min-h-4 text-xs text-ink-muted"
      title={
        fetchedAt
          ? "Retrieved " + new Date(fetchedAt).toLocaleString()
          : undefined
      }
    >
      {updating
        ? ageLabel ? `${ageLabel} · Checking for updates.` : 'Loading results…'
        : snapshot ? `Saved results · ${ageLabel}` : " "}
    </p>
  );
}
