import React, { useState } from "react";
import { ArrowUpRight, Terminal } from "lucide-react";
import { useTestHistory } from "../services/testRunsService";
import {
  runLabel,
  usableResults,
  latestNotice,
  recentResults,
} from "../telemetry/presentation";
import {
  Metrics,
  RefreshStatus,
  StatusBadge,
  Exceptions,
  RunReport,
} from "./the-tests/RunPresentation";
export const TestSnapshotCard: React.FC<{ onExploreTests: () => void }> = ({
  onExploreTests,
}) => {
  const { feed, loading, error } = useTestHistory();
  const run = feed?.runs[0];
  const metricsRun = recentResults(feed?.runs || [])[0] || run;
  const [open, setOpen] = useState(false);
  return (
    <>
      <div
        id="sdet-test-snapshot-card"
        data-testid="test-snapshot"
        className="relative w-full bg-[#0F141E] border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl shadow-black/40 overflow-hidden group hover:border-slate-700/80 transition-all duration-300 flex flex-col justify-between gap-5"
      >
        <div className="absolute -top-10 -left-10 w-36 h-36 bg-emerald-600/10 blur-2xl pointer-events-none" />
        <button
          id="snapshot-view-tests-btn"
          aria-label="The Tests Card"
          onClick={onExploreTests}
          className="absolute top-0 right-0 z-10 pt-4 pr-5 pb-4 pl-10 flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-300 hover:text-white transition-colors group/corner"
        >
          <span className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(16,185,129,0.30)_0%,_rgba(20,184,166,0.14)_35%,_rgba(15,20,30,0)_70%)] group-hover/corner:bg-[radial-gradient(ellipse_at_top_right,_rgba(16,185,129,0.48)_0%,_rgba(20,184,166,0.22)_45%,_rgba(15,20,30,0)_75%)] -z-10" />
          The Tests
          <ArrowUpRight
            aria-hidden="true"
            className="relative z-10 w-4 h-4 text-emerald-400 group-hover/corner:text-white group-hover/corner:translate-x-0.5 group-hover/corner:-translate-y-0.5 transition-transform motion-reduce:transform-none"
          />
        </button>
        <header className="pb-4 pr-24 sm:pr-28 border-b border-slate-800/80 flex items-center gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 border border-slate-700/70 flex items-center justify-center shadow-inner shrink-0">
              <Terminal className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
            </div>
            <h3 className="text-base sm:text-lg lg:text-2xl font-bold text-white tracking-tight truncate whitespace-nowrap">
              Latest Test Run
            </h3>
          </div>
        </header>
        <RefreshStatus
          updating={loading || !!feed?.refreshing}
          snapshot={feed?.snapshot}
          fetchedAt={feed?.fetchedAt}
        />
        {error && (
          <p role="alert" className="text-sm text-amber-300">
            {error}
          </p>
        )}
        {!loading && !feed?.refreshing && !error && !run && (
          <p role="status" className="text-sm text-slate-400">
            No verified runs yet.
          </p>
        )}
        <div className="min-h-4 text-xs text-slate-400">
          {run && metricsRun !== run
            ? `Previous results · ${runLabel(metricsRun)}`
            : "\u00a0"}
        </div>
        <Metrics
          run={metricsRun}
          compact
          snapshot
          pending={!run && (loading || !!feed?.refreshing)}
        />
        {!run && <div aria-hidden="true" className="min-h-[49px]" />}
        {run && (
          <>
            <Exceptions run={metricsRun} />
            {!usableResults(run) && (
              <p className="text-sm text-amber-300">{latestNotice(run)}</p>
            )}
            <footer className="pt-3 border-t border-slate-800/70 flex justify-between items-center text-xs">
              <div className="flex items-center gap-2.5">
                <StatusBadge run={run} />
                <span className="font-mono text-slate-400">
                  Run {runLabel(run)}
                </span>
              </div>
              <button
                id="test-card-report-box"
                onClick={(event) => {
                  event.currentTarget.focus();
                  setOpen(true);
                }}
                className="text-blue-300 hover:underline min-h-9"
              >
                View Report
              </button>
            </footer>
          </>
        )}
      </div>
      {open && run && <RunReport run={run} close={() => setOpen(false)} />}
    </>
  );
};
