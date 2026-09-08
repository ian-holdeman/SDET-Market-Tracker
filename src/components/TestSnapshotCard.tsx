import React, { useState } from "react";
import { Terminal, ArrowUpRight } from "lucide-react";
import { useTestHistory } from "../services/testRunsService";
import { summarize } from "../telemetry/contract";
import { RunReport } from "./the-tests/TestingDashboardPlus";
export const TestSnapshotCard: React.FC<{ onExploreTests: () => void }> = ({
  onExploreTests,
}) => {
  const { feed, loading, error } = useTestHistory();
  const [open, setOpen] = useState(false);
  const run = feed?.runs[0];
  const summary = run?.evidence ? summarize(run.evidence) : null;
  return (
    <>
      <div
        id="sdet-test-snapshot-card"
        className="relative w-full bg-[#0F141E] border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl shadow-black/40 flex flex-col justify-between gap-4"
      >
        <div className="flex justify-between items-center gap-3 pb-4 border-b border-slate-800/80">
          <h3 className="text-base sm:text-lg font-bold text-white flex gap-2">
            <Terminal className="w-5 h-5 text-emerald-400" />
            Latest Test Run
          </h3>
          <button
            id="snapshot-view-tests-btn"
            aria-label="The Tests Card"
            onClick={onExploreTests}
            className="text-emerald-300 text-sm flex gap-1"
          >
            The Tests
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
        {loading && (
          <p role="status" className="text-sm text-slate-400">
            Loading verified test history…
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-amber-400">
            {error}
          </p>
        )}
        {!run && !loading && !error && (
          <p role="status" className="text-sm text-slate-400">
            No verified runs yet.
          </p>
        )}
        {run && (
          <>
            <div className="grid grid-cols-2 gap-3.5 flex-1">
              {[
                [
                  "Clean pass rate",
                  summary?.passRate == null ? "—" : summary.passRate + "%",
                ],
                ["Collected tests", summary?.total ?? "—"],
                [
                  "Flaky / failed",
                  summary ? `${summary.flaky} / ${summary.failed}` : "—",
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="bg-[#131926]/80 border border-slate-800/80 rounded-xl p-4"
                >
                  <span className="text-xs text-slate-400">{label}</span>
                  <div className="text-2xl font-black text-white font-mono mt-2">
                    {value}
                  </div>
                </div>
              ))}
              <button
                id="test-card-report-box"
                onClick={() => setOpen(true)}
                className="bg-[#131926]/80 border border-slate-800/80 rounded-xl p-4 text-sm text-blue-400"
              >
                View evidence
              </button>
            </div>
            <p
              className={`text-xs font-mono ${run.status === "passed" ? "text-emerald-400" : "text-amber-400"}`}
            >
              #{run.number}.{run.attempt} · {run.status} ·{" "}
              {run.commitSha.slice(0, 7)}
            </p>
          </>
        )}
      </div>
      {open && run && <RunReport run={run} close={() => setOpen(false)} />}
    </>
  );
};
