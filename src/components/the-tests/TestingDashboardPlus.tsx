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
      className="rounded-2xl border border-line bg-panel shadow-xl shadow-shade/20 overflow-hidden"
    >
      <header className="px-5 py-5 sm:px-7 flex items-center justify-between gap-3 border-b border-line/80">
        <h2 className="text-base sm:text-lg font-bold text-ink-heading flex items-center gap-2.5">
          <AutomationMark />
          Automation Dashboard
        </h2>
        <button
          onClick={refresh}
          disabled={loading}
          aria-label="Refresh test history"
          title="Refresh results"
          className="rounded-lg p-2.5 text-ink-muted hover:bg-surface-800 hover:text-ink-heading disabled:opacity-40"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </header>
      <div className="p-5 sm:p-7 space-y-5">
        {error && (
          <p role="alert" className="text-sm text-warning-ink-300">
            {error}
          </p>
        )}
        <RefreshStatus
          updating={loading || !!feed?.refreshing}
          snapshot={feed?.snapshot}
          fetchedAt={feed?.fetchedAt}
        />
        {!loading && !feed?.refreshing && !error && !latest && (
          <p role="status" className="text-sm text-ink-muted">
            No verified runs yet.
          </p>
        )}
        {(active || latest) && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-ink-subtle mb-1.5">
                  {noLatest && active ? "Previous results" : "Latest run"}
                </p>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-lg font-bold text-ink-heading">
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
                className="flex items-center gap-1.5 rounded-lg px-3.5 py-2.5 bg-surface-800/70 text-sm font-semibold text-ink-strong hover:bg-surface-700/70"
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
            className="flex items-start gap-2.5 rounded-xl bg-warning-500/5 border border-warning-500/15 p-3.5 text-sm text-warning-ink-200"
          >
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              {latestNotice(latest)}
              {active && (
                <span className="text-ink-muted">
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
      <section className="border-t border-line/80 px-3 pb-3 sm:px-5 sm:pb-5">
        <div className="flex items-center justify-between gap-3 px-2 sm:px-2 pt-5 pb-2">
          <h3 className="text-sm font-semibold text-ink-secondary">Recent runs</h3>
          <button
            onClick={(event) => {
              event.currentTarget.focus();
              setHistory(true);
            }}
            className="text-xs sm:text-sm text-info-ink-300 hover:text-info-ink-200 hover:underline underline-offset-4 min-h-10"
          >
            Show run history
          </button>
        </div>
        {recent.length ? (
          <RunTable runs={recent} details={setReport} />
        ) : (
          <p className="px-2 py-5 text-sm text-ink-subtle">
            {loading
              ? "Finding recent results…"
              : "No completed test results yet."}
          </p>
        )}
      </section>
      {history && (
        <ResultDialog title="Run history" close={() => setHistory(false)}>
          <p className="text-xs text-ink-subtle">
            Retained runs, including incomplete attempts. Detailed results
            expire after 90 days.
          </p>
          <RunTable runs={runs} details={setReport} />
          {!runs.length && (
            <p className="text-sm text-ink-muted">No verified runs yet.</p>
          )}
          {moreError && (
            <p role="alert" className="text-sm text-warning-ink-300">
              {moreError}
            </p>
          )}
          {feed?.nextCursor && (
            <button
              disabled={moreLoading || loading}
              onClick={() => void loadMore()}
              className="w-full rounded-xl border border-line-strong py-3 text-sm text-ink-secondary hover:bg-surface-800 disabled:opacity-50"
            >
              {moreLoading
                ? "Loading…"
                : moreError
                  ? "Retry older runs"
                  : "Load older runs"}
            </button>
          )}
          {feed?.historyLimited && (
            <p className="text-xs text-ink-subtle">
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
