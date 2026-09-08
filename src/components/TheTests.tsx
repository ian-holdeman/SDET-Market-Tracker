import React from "react";
import { Terminal } from "lucide-react";
import { TestingDashboardPlus } from "./the-tests/TestingDashboardPlus";
const coverage = [
  [
    "Searched-asset watchlists",
    "Authenticated registration, provider validation, persistence, retry handling and denied cross-user writes.",
    "scripts/auth-tests/registration.test.ts",
  ],
  [
    "Database authorization",
    "Visitor reads, owner-only watchlists, trusted role assignment and curation independent of watchlist membership.",
    "supabase/tests/authorization.test.sql",
  ],
  [
    "Provider failures",
    "Unavailable and stale data, failed chart requests, legitimate zero values and searched-asset metrics.",
    "src/tests/specs/board/market-data.spec.ts",
  ],
  [
    "Financial calculations",
    "Calendar boundaries, missing history, invalid baselines and bounded cache behavior.",
    "scripts/tests/price-activity.test.ts",
  ],
];
export const TheTests: React.FC = () => (
  <div id="the-tests-page" className="w-full space-y-6 sm:space-y-8">
    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
      <Terminal className="w-7 h-7 text-emerald-400" />
      The Tests
    </h1>
    <section>
      <TestingDashboardPlus />
    </section>
    <section className="space-y-4">
      <div className="pb-2 border-b border-slate-800">
        <h2 className="text-xl font-bold text-white">Core workflow coverage</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Test source and rationale. Execution outcomes appear in verified run
          evidence above.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {coverage.map(([title, description, file]) => (
          <article
            key={file}
            className="bg-[#0b0f19] border border-slate-800 rounded-xl overflow-hidden shadow-xl"
          >
            <div className="bg-slate-900/80 border-b border-slate-800 px-5 py-3 text-white font-bold">
              {title}
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-slate-400">{description}</p>
              <p className="font-mono text-xs text-slate-500 break-all">
                {file}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
    <section className="bg-[#0b0f19] border border-slate-800 rounded-xl p-5 space-y-2">
      <h2 className="text-lg font-bold text-white">Execution demonstrations</h2>
      <p className="text-sm text-slate-400">
        Recordings are not available yet. Visitors can inspect published
        evidence; this site does not start test executions.
      </p>
    </section>
  </div>
);
