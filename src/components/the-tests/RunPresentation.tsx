import React, { useEffect, useId, useRef } from "react";
import { X, Check, AlertTriangle, XCircle, LoaderCircle } from "lucide-react";
import { type PublishedRun, testOutcome } from "../../telemetry/contract";
import {
  runLabel,
  runMetrics,
  durationLabel,
  statusLabel,
} from "../../telemetry/presentation";
export function ResultDialog({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    heading = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current!;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={heading}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onKeyDown={(e) => {
        if (e.key !== "Tab") return;
        const items = Array.from(
          e.currentTarget.querySelectorAll<HTMLElement>(
            'button, a[href], summary, [tabindex="0"]',
          ),
        ).filter(
          (el) =>
            el.getClientRects().length > 0 && !el.hasAttribute("disabled"),
        );
        const first = items[0],
          last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            close();
        }
      }}
      className="m-auto w-[calc(100%-1.5rem)] max-w-3xl max-h-[88dvh] p-0 rounded-2xl border border-slate-700/70 bg-[#0F141E] text-slate-200 shadow-2xl backdrop:bg-black/75 backdrop:backdrop-blur-sm"
    >
      <div className="flex max-h-[88dvh] flex-col overflow-hidden">
        <header className="flex items-center justify-between gap-3 border-b border-slate-800 px-5 py-4 sm:px-6">
          <h2 id={heading} className="text-lg font-bold text-white">
            {title}
          </h2>
          <button
            autoFocus
            onClick={close}
            aria-label={`Close ${title}`}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-5">
          {children}
        </div>
      </div>
    </dialog>
  );
}
export const statusTone = (status: string) =>
  status === "passed"
    ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
    : status === "failed"
      ? "text-rose-400 bg-rose-500/10 border-rose-500/20"
      : "text-amber-300 bg-amber-500/10 border-amber-500/20";
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
          className={`min-w-0 rounded-xl border border-slate-800/80 bg-[#131926]/80 ${compact ? "p-4" : "p-4 sm:p-5"} ${snapshot ? "lg:aspect-[4/3] lg:flex lg:flex-col lg:items-center lg:justify-center lg:text-center" : ""}`}
        >
          <p
            data-testid="metric-label"
            className={`text-xs font-medium text-slate-400 ${snapshot ? "lg:text-lg lg:font-semibold lg:text-slate-200" : ""}`}
          >
            {label}
          </p>
          <p
            data-testid="metric-value"
            className={`mt-3 font-mono font-black tracking-tight ${compact ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl"} ${snapshot ? "lg:text-4xl xl:text-5xl" : ""} ${label === "Flaky Tests" && Number(value) > 0 ? "text-amber-300" : "text-white"}`}
          >
            {pending ? (
              <span
                data-testid="metric-skeleton"
                aria-label="Loading value"
                className="inline-block h-[1em] w-20 rounded bg-slate-700/40 motion-safe:animate-pulse align-middle"
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
      className={`text-sm font-medium ${s?.failed ? "text-rose-400" : "text-amber-300"}`}
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
        <thead className="text-slate-500">
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
        <tbody className="divide-y divide-slate-800/60">
          {runs.map((run) => {
            const m = runMetrics(run);
            return (
              <tr
                key={`${run.id}:${run.attempt}`}
                className="hover:bg-slate-800/20"
              >
                <td className="px-1 py-4 sm:px-4 text-slate-300 font-mono whitespace-nowrap">
                  {runLabel(run)}
                </td>
                <td className="px-1 py-4 sm:px-4">
                  <StatusBadge run={run} />
                </td>
                <td className="px-1 py-4 sm:px-4 text-white font-mono">
                  {m.summary?.passRate == null ? "—" : `${m.summary.passRate}%`}
                </td>
                <td className="px-1 py-4 sm:px-4 text-slate-300 whitespace-nowrap font-mono">
                  {durationLabel(m.durationMs)}
                </td>
                <td className="px-1 py-4 sm:px-4">
                  <button
                    onClick={(event) => {
                      event.currentTarget.focus();
                      details(run);
                    }}
                    aria-label={`Details for run ${runLabel(run)}`}
                    className="min-h-10 text-blue-300 hover:text-blue-200 underline-offset-4 hover:underline"
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
          className="text-sm text-blue-300 hover:underline"
        >
          View on GitHub ↗
        </a>
      </div>
      <Metrics run={run} compact />
      <Exceptions run={run} />
      {!e?.planned ? (
        <p className="text-sm text-slate-400">
          {run.evidenceState === "expired"
            ? "Results have expired."
            : "No test results were recorded."}
        </p>
      ) : (
        <>
          <p className="text-xs text-slate-500">
            Pass rate excludes retries and includes all collected tests.
          </p>
          <div className="space-y-3">
            {e.tests.map((t) => (
              <article
                key={t.id}
                className="rounded-xl border border-slate-800 bg-slate-950/30 p-4 space-y-2"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-200 break-words min-w-0 flex-1">
                    {t.name}
                  </h3>
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs ${statusTone(testOutcome(t))}`}
                  >
                    {testOutcome(t)}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{t.project}</p>
                {t.attempts.map((a) => (
                  <p key={a.retry} className="text-xs text-slate-400">
                    Attempt {a.retry + 1}: {a.status}{" "}
                    <span className="text-slate-600">·</span>{" "}
                    {durationLabel(a.durationMs)}
                  </p>
                ))}
                {!t.attempts.length && (
                  <p className="text-xs text-amber-300">No execution result.</p>
                )}
              </article>
            ))}
          </div>
        </>
      )}
      <details className="text-xs text-slate-400 border-t border-slate-800 pt-4">
        <summary className="cursor-pointer py-1">Run metadata</summary>
        <dl className="mt-3 space-y-2 break-all">
          <div>
            <dt className="text-slate-500">Commit</dt>
            <dd>{run.commitSha}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Started</dt>
            <dd>{new Date(e?.startedAt || run.startedAt).toLocaleString()}</dd>
          </div>
          {e?.completedAt && (
            <div>
              <dt className="text-slate-500">Finished</dt>
              <dd>{new Date(e.completedAt).toLocaleString()}</dd>
            </div>
          )}
          <div>
            <dt className="text-slate-500">Workflow outcome</dt>
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
  return (
    <p
      data-testid="result-refresh-status"
      role="status"
      className="min-h-4 text-xs text-slate-400"
      title={
        fetchedAt
          ? "Retrieved " + new Date(fetchedAt).toLocaleString()
          : undefined
      }
    >
      {updating ? "Updating…" : snapshot ? "Saved results" : " "}
    </p>
  );
}
