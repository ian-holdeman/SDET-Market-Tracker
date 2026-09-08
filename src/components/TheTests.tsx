import React from "react";
import { Terminal } from "lucide-react";
import { TestingDashboardPlus } from "./the-tests/TestingDashboardPlus";
import { RecordedShowcase } from "./the-tests/RecordedShowcase";
import { PipelineTimeline } from "./the-tests/PipelineTimeline";
export const TheTests: React.FC = () => (
  <div id="the-tests-page" className="w-full space-y-6 sm:space-y-8">
    <h1 className="text-2xl sm:text-3xl font-black text-ink-heading tracking-tight flex items-center gap-2.5">
      <Terminal className="w-7 h-7 text-positive-ink-400" />
      The Tests
    </h1>
    <section>
      <TestingDashboardPlus />
    </section>
    <RecordedShowcase />
    <PipelineTimeline />
  </div>
);
