import React, { useState } from "react";
import { RefreshCw, Terminal, X, FileCode } from "lucide-react";
import { useTestHistory } from "../../services/testRunsService";
import {
  summarize,
  testOutcome,
  type PublishedRun,
} from "../../telemetry/contract";

const color = (status: string) =>
  status === "passed"
    ? "text-emerald-400"
    : ["failed", "cancelled"].includes(status)
      ? "text-rose-400"
      : "text-amber-400";
export function RunReport({
  run,
  close,
}: {
  run: PublishedRun;
  close: () => void;
}) {
  const summary = run.evidence ? summarize(run.evidence) : null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Test evidence report"
    >
      <div className="bg-[#0f1422] border border-slate-700/80 rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden font-mono text-xs">
        <div className="px-5 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <span className="flex gap-2 text-white">
            <FileCode className="w-4 h-4" />
            Test evidence — #{run.number} · attempt {run.attempt}
          </span>
          <button aria-label="Close report" onClick={close}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto space-y-4 text-slate-300">
          <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800">
            <div>
              Status: <span className={color(run.status)}>{run.status}</span>
            </div>
            <div>Workflow: {run.conclusion || "in progress"}</div>
            <div className="break-all">Commit: {run.commitSha}</div>
            <div>Branch: {run.branch}</div>
          </div>
          <a
            className="text-blue-400 underline"
            href={run.url}
            target="_blank"
            rel="noreferrer"
          >
            View source workflow attempt ↗
          </a>
          <p>
            GitHub Actions · Browser tests against the local production build.
            Public evidence excludes logs, screenshots and traces.
          </p>
          {summary ? (
            <>
              <p>
                Collected tests: {summary.total} · clean passes:{" "}
                {summary.passed} · flaky: {summary.flaky} · failed:{" "}
                {summary.failed} · skipped: {summary.skipped} · interrupted:{" "}
                {summary.interrupted} · incomplete: {summary.incomplete}
              </p>
              <p>
                Clean pass rate:{" "}
                {summary.passRate === null ? "—" : summary.passRate + "%"} —
                first-attempt passes divided by all collected tests, including
                skipped and unexecuted cases.
              </p>
              <p>
                Started: {run.evidence!.startedAt}
                <br />
                Finished: {run.evidence!.completedAt || "Not confirmed"}
                <br />
                Runner errors: {run.evidence!.errorCount}
              </p>
              {run.evidence!.tests.map((t) => (
                <div
                  key={t.id}
                  className="p-3 bg-slate-950 border border-slate-800 rounded space-y-1"
                >
                  <div className="flex justify-between gap-3">
                    <span>{t.name}</span>
                    <span className={color(testOutcome(t))}>
                      {testOutcome(t)}
                    </span>
                  </div>
                  <div className="text-slate-400 break-all">
                    {t.file} · {t.project}
                  </div>
                  {t.attempts.map((a) => (
                    <div key={a.retry}>
                      Attempt {a.retry + 1}: {a.status} · {a.durationMs}ms ·{" "}
                      {a.startedAt}
                    </div>
                  ))}
                  {!t.attempts.length && (
                    <div>No execution result received.</div>
                  )}
                </div>
              ))}
            </>
          ) : (
            <p>
              Test evidence {run.evidenceState}. The workflow state is known,
              but test counts and success rates cannot be established.
            </p>
          )}
        </div>
        <div className="px-5 py-3 bg-slate-900 border-t border-slate-800 text-right">
          <button
            onClick={close}
            className="px-4 py-1.5 rounded bg-slate-800 text-white"
          >
            Close report
          </button>
        </div>
      </div>
    </div>
  );
}
export const TestingDashboardPlus: React.FC = () => {
  const { feed, loading, error, refresh } = useTestHistory();
  const [selected, setSelected] = useState<string | null>(null);
  const [report, setReport] = useState<PublishedRun | null>(null);
  const runs = feed?.runs || [];
  const active =
    runs.find((r) => `${r.id}:${r.attempt}` === selected) || runs[0];
  const latestCompleted = runs.find((r) => r.completed);
  const summary = active?.evidence ? summarize(active.evidence) : null;
  return (
    <div id="finance-automation-dashboard" className="w-full space-y-6">
      <div className="bg-[#0b0f19] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="px-4 py-3 sm:px-6 bg-slate-900/80 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <span className="font-mono text-xs sm:text-sm font-bold tracking-wider text-slate-100 flex gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            AUTOMATION DASHBOARD
          </span>
          <button
            onClick={refresh}
            disabled={loading}
            aria-label="Refresh test history"
            className="text-slate-300 text-xs flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh results
          </button>
        </div>
        <div className="px-4 py-3 sm:px-6 text-xs text-slate-400 font-mono space-y-2">
          {loading && <p role="status">Loading verified test history…</p>}
          {error && (
            <p role="alert" className="text-amber-400">
              {error}
            </p>
          )}
          {feed && !error && (
            <p>
              Retrieved {new Date(feed.fetchedAt).toLocaleString()} · GitHub
              Actions evidence
            </p>
          )}
          {!loading && !error && !runs.length && (
            <p role="status">No verified runs yet.</p>
          )}
          {!!runs.length && (
            <p>
              Latest attempt: #{runs[0].number}.{runs[0].attempt} —{" "}
              {runs[0].status}. Latest completed workflow attempt:{" "}
              {latestCompleted
                ? `#${latestCompleted.number}.${latestCompleted.attempt} — ${latestCompleted.status}`
                : "none retained"}
              .
            </p>
          )}
        </div>
        {active && (
          <>
            <div className="px-4 py-4 sm:px-6 border-t border-slate-800 flex flex-wrap justify-between gap-2 font-mono text-xs">
              <div>
                <strong className={color(active.status)}>
                  #{active.number}.{active.attempt} ·{" "}
                  {active.status.toUpperCase()}
                </strong>
                <p className="text-slate-400 mt-2">
                  {active.branch} · {active.commitSha.slice(0, 7)}
                </p>
              </div>
              <a
                href={active.url}
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 underline"
              >
                Source workflow ↗
              </a>
            </div>
            <div className="px-4 pb-5 sm:px-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                [
                  "Clean pass rate",
                  summary?.passRate == null ? "—" : `${summary.passRate}%`,
                ],
                ["Collected tests", summary?.total ?? "—"],
                [
                  "Flaky / failed",
                  summary ? `${summary.flaky} / ${summary.failed}` : "—",
                ],
                [
                  "Skipped / unfinished",
                  summary
                    ? `${summary.skipped} / ${summary.interrupted + summary.incomplete}`
                    : "—",
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="bg-[#111724] border border-slate-800/80 rounded-lg p-4 font-mono"
                >
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className="text-2xl font-black text-white mt-2">{value}</p>
                </div>
              ))}
            </div>
            <div className="px-4 pb-5 sm:px-6 font-mono text-xs text-slate-400">
              {summary
                ? "Clean passes exclude every retried test. Missing executions remain in the denominator."
                : `Test evidence ${active.evidenceState}; no success rate can be established.`}
              <button
                onClick={() => setReport(active)}
                className="ml-3 text-blue-400 underline"
              >
                Inspect evidence
              </button>
            </div>
            <div className="border-t border-slate-800 bg-[#090d16]">
              <div className="px-4 py-3 sm:px-6 text-xs font-mono text-slate-300">
                RECENT BUILDS · retained workflow attempts
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-slate-900/40 text-slate-400">
                    <tr>
                      {[
                        "Build",
                        "Status",
                        "Commit",
                        "Clean passes",
                        "Flaky",
                        "Failed",
                        "Report",
                      ].map((h) => (
                        <th key={h} className="p-3 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {runs.map((r) => {
                      const s = r.evidence ? summarize(r.evidence) : null;
                      return (
                        <tr
                          key={`${r.id}:${r.attempt}`}
                          className="hover:bg-slate-900/50"
                        >
                          <td className="p-3">
                            <button
                              className="text-blue-400"
                              onClick={() =>
                                setSelected(`${r.id}:${r.attempt}`)
                              }
                            >
                              #{r.number}.{r.attempt}
                            </button>
                          </td>
                          <td className={`p-3 ${color(r.status)}`}>
                            {r.status}
                          </td>
                          <td className="p-3 text-slate-300">
                            {r.commitSha.slice(0, 7)}
                          </td>
                          <td className="p-3 text-slate-300">
                            {s ? `${s.passed}/${s.total}` : "—"}
                          </td>
                          <td className="p-3 text-amber-400">
                            {s?.flaky ?? "—"}
                          </td>
                          <td className="p-3 text-rose-400">
                            {s?.failed ?? "—"}
                          </td>
                          <td className="p-3">
                            <button
                              className="text-blue-400"
                              onClick={() => setReport(r)}
                            >
                              View evidence
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
      {report && <RunReport run={report} close={() => setReport(null)} />}
    </div>
  );
};
