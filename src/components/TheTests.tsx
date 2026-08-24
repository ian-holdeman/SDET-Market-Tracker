import React from 'react';
import { Terminal, CheckCircle2 } from 'lucide-react';
import { TestingDashboardPlus } from './the-tests/TestingDashboardPlus';
import { TestCard } from './the-tests/TestCard';
import { ParallelMatrixRunner } from './the-tests/ParallelMatrixRunner';
import { FEATURED_TEST_SUITES } from './the-tests/testSuiteData';

export const TheTests: React.FC = () => {
  return (
    <div id="the-tests-page" className="w-full space-y-8 sm:space-y-10">
      {/* Top Section: Title & Testing Telemetry Dashboard */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Column: Heading & Key Principles */}
        <div className="lg:col-span-5 space-y-4">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 text-xs font-mono">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span>Test Suite Telemetry</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              The Tests
            </h1>

            <p className="text-sm text-slate-400 leading-relaxed max-w-lg">
              Automated Playwright test suite for validating UI components, routing, search filtering, and state persistence.
            </p>
          </div>

          {/* Clean 3-bullet core architecture notes */}
          <div className="space-y-2 pt-2 text-xs text-slate-300">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Page Object Model (POM) structure</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Deterministic locators with zero-flakiness assertions</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Parallel multi-worker execution</span>
            </div>
          </div>
        </div>

        {/* Right Column: Testing Dashboard */}
        <div className="lg:col-span-7">
          <TestingDashboardPlus />
        </div>
      </section>

      {/* Middle Section: Featured Test Suites */}
      <section className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Playwright Test Suites
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Interactive test runs and TypeScript spec inspection.
            </p>
          </div>

          <div className="text-xs font-mono text-slate-500">
            4 Suites • 100% Passing
          </div>
        </div>

        {/* 2x2 Grid on Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {FEATURED_TEST_SUITES.map((suite) => (
            <TestCard key={suite.id} suite={suite} />
          ))}
        </div>
      </section>

      {/* Bottom Section: Parallel Runner */}
      <section className="pt-2">
        <ParallelMatrixRunner />
      </section>
    </div>
  );
};
