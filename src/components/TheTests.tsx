import React from 'react';
import { Terminal, CheckCircle2 } from 'lucide-react';
import { TestingDashboardPlus } from './the-tests/TestingDashboardPlus';
import { TestCard } from './the-tests/TestCard';
import { ParallelMatrixRunner } from './the-tests/ParallelMatrixRunner';
import { FEATURED_TEST_SUITES } from './the-tests/testSuiteData';

export const TheTests: React.FC = () => {
  return (
    <div id="the-tests-page" className="w-full space-y-6 sm:space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Terminal className="w-7 h-7 text-emerald-400" />
              <span>The Tests</span>
            </h1>
          </div>
        </div>
      </div>

      {/* Main CI/CD Automation Dashboard */}
      <section>
        <TestingDashboardPlus />
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
