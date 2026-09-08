import React, { useState } from "react";
import { RefreshCw, ArrowUpRight, AlertTriangle } from "lucide-react";
import { AutomationMark } from "./AutomationMark";
import { useTestHistory } from "../../services/testRunsService";
import type { PublishedRun } from "../../telemetry/contract";
import {
  recentResults,
  runLabel,
  usableResults,
  latestNotice,
} from "../../telemetry/presentation";
import {
  ResultDialog,
  RunReport,
  RunTable,
  Metrics,
  RefreshStatus,
  StatusBadge,
  Exceptions,
} from "./RunPresentation";
export { RunReport } from "./RunPresentation";
export const TestingDashboardPlus: React.FC = () => {
  const { feed, loading, error, refresh, loadMore, moreLoading, moreError } =
    useTestHistory(true);
  const [history, setHistory] = useState(false),
    [report, setReport] = useState<PublishedRun | null>(null);
  const runs = feed?.runs || [],
    recent = recentResults(runs),
    latest = runs[0],
    active = recent[0];
  const noLatest = latest && !usableResults(latest);
  return (
    <div
      id="finance-automation-dashboard"
      data-testid="test-dashboard"
      className="rounded-2xl border border-slate-800 bg-[#0F141E] shadow-xl shadow-black/20 overflow-hidden"
    >
      <header className="px-5 py-5 sm:px-7 flex items-center justify-between gap-3 border-b border-slate-800/80">
        <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2.5">
          <AutomationMark />
          Automation Dashboard
        </h2>
        <button
          onClick={refresh}
          disabled={loading}
          aria-label="Refresh test history"
          title="Refresh results"
          className="rounded-lg p-2.5 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-40"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </header>
      <div className="p-5 sm:p-7 space-y-5">
        {error && (
          <p role="alert" className="text-sm text-amber-300">
            {error}
          </p>
        )}
        <RefreshStatus
          updating={loading || !!feed?.refreshing}
          snapshot={feed?.snapshot}
          fetchedAt={feed?.fetchedAt}
        />
        {!loading && !feed?.refreshing && !error && !latest && (
          <p role="status" className="text-sm text-slate-400">
            No verified runs yet.
          </p>
        )}
        {(active || latest) && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1.5">
                  {noLatest && active ? "Previous results" : "Latest run"}
                </p>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-lg font-bold text-white">
                    {runLabel(active || latest)}
                  </span>
                  <StatusBadge run={active || latest} />
                </div>
              </div>
              <button
                onClick={(event) => {
                  event.currentTarget.focus();
                  setReport(active || latest);
                }}
                className="flex items-center gap-1.5 rounded-lg px-3.5 py-2.5 bg-slate-800/70 text-sm font-semibold text-slate-200 hover:bg-slate-700/70"
              >
                View Report
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
        {!latest && <div aria-hidden="true" className="h-[54px]" />}
        <Metrics
          run={active || latest}
          pending={!latest && (loading || !!feed?.refreshing)}
        />
        {(active || latest) && <Exceptions run={active || latest} />}
        {noLatest && (
          <div
            role="status"
            className="flex items-start gap-2.5 rounded-xl bg-amber-500/5 border border-amber-500/15 p-3.5 text-sm text-amber-200"
          >
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              {latestNotice(latest)}
              {active && (
                <span className="text-slate-400">
                  {" "}
                  Showing previous results below.
                </span>
              )}{" "}
              <button
                onClick={(event) => {
                  event.currentTarget.focus();
                  setReport(latest);
                }}
                className="underline underline-offset-4"
              >
                Details
              </button>
            </div>
          </div>
        )}
      </div>
      <section className="border-t border-slate-800/80 px-3 pb-3 sm:px-5 sm:pb-5">
        <div className="flex items-center justify-between gap-3 px-2 sm:px-2 pt-5 pb-2">
          <h3 className="text-sm font-semibold text-slate-300">Recent runs</h3>
          <button
            onClick={(event) => {
              event.currentTarget.focus();
              setHistory(true);
            }}
            className="text-xs sm:text-sm text-blue-300 hover:text-blue-200 hover:underline underline-offset-4 min-h-10"
          >
            Show run history
          </button>
        </div>
        {recent.length ? (
          <RunTable runs={recent} details={setReport} />
        ) : (
          <p className="px-2 py-5 text-sm text-slate-500">
            {loading
              ? "Finding recent results…"
              : "No completed test results yet."}
          </p>
        )}
      </section>
      {history && (
        <ResultDialog title="Run history" close={() => setHistory(false)}>
          <p className="text-xs text-slate-500">
            Retained runs, including incomplete attempts. Detailed results
            expire after 90 days.
          </p>
          <RunTable runs={runs} details={setReport} />
          {!runs.length && (
            <p className="text-sm text-slate-400">No verified runs yet.</p>
          )}
          {moreError && (
            <p role="alert" className="text-sm text-amber-300">
              {moreError}
            </p>
          )}
          {feed?.nextCursor && (
            <button
              disabled={moreLoading || loading}
              onClick={() => void loadMore()}
              className="w-full rounded-xl border border-slate-700 py-3 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
            >
              {moreLoading
                ? "Loading…"
                : moreError
                  ? "Retry older runs"
                  : "Load older runs"}
            </button>
          )}
          {feed?.historyLimited && (
            <p className="text-xs text-slate-500">
              GitHub’s history limit has been reached. Older runs may be
              available on GitHub.
            </p>
          )}
        </ResultDialog>
      )}
      {report && <RunReport run={report} close={() => setReport(null)} />}
    </div>
  );
};
