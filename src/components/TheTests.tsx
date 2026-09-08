import React from "react";
import { Terminal } from "lucide-react";
import { TestingDashboardPlus } from "./the-tests/TestingDashboardPlus";
import { RecordedShowcase } from "./the-tests/RecordedShowcase";
export const TheTests: React.FC = () => (
  <div id="the-tests-page" className="w-full space-y-6 sm:space-y-8">
    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
      <Terminal className="w-7 h-7 text-emerald-400" />
      The Tests
    </h1>
    <section>
      <TestingDashboardPlus />
    </section>
    <RecordedShowcase />
    <section className="bg-[#0b0f19] border border-slate-800 rounded-xl p-5 space-y-2">
      <h2 className="text-lg font-bold text-white">Execution demonstrations</h2>
      <p className="text-sm text-slate-400">
        Recordings are not available yet. Visitors can inspect published
        evidence; this site does not start test executions.
      </p>
    </section>
  </div>
);
