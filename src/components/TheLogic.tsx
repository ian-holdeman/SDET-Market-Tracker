import React from 'react';
import { motion } from 'motion/react';
import {
  Brain,
  Layers,
  Terminal,
  Cpu,
  ShieldCheck,
  Workflow,
  CheckCircle2,
  ArrowRight,
  Code2,
  Gauge,
  Sparkles,
  GitBranch,
  Search,
  Database
} from 'lucide-react';
import { PageView } from '../types';

interface TheLogicProps {
  onNavigate: (page: PageView) => void;
}

export const TheLogic: React.FC<TheLogicProps> = ({ onNavigate }) => {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-12 sm:space-y-16 py-4">
      {/* 1. Page Header with Brain Icon */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/60 border border-blue-800/60 text-blue-400 text-xs font-semibold">
          <Brain className="w-4 h-4 text-blue-400" />
          <span>System Philosophy & SDET Craft</span>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
          The Logic
        </h1>

        {/* Subtle dual-accent gradient underline */}
        <div className="h-[2px] w-32 sm:w-48 bg-gradient-to-r from-transparent via-blue-500/70 via-emerald-400/70 to-transparent rounded-full mx-auto my-2" />

        <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Why this platform is built the way it is. A breakdown of intentional engineering, market-data validation, and the rigorous SDET testing framework designed to detect regressions.
        </p>
      </div>

      {/* 2. Core Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pillar 1: Dual Purpose Architecture */}
        <div className="bg-[#0F141E] border border-slate-800/90 rounded-2xl p-6 flex flex-col justify-between hover:border-blue-500/40 transition-colors">
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-950/60 border border-blue-800/50 flex items-center justify-center text-blue-400 mb-4">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Dual-Purpose Vision</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Combining a live financial market surveillance engine with an interactive, transparent SDET test telemetry suite — showing evidence of frontend behavior and backend authorization.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center text-blue-400 text-xs font-semibold">
            <span>Market Surveillance + Quality Assurance</span>
          </div>
        </div>

        {/* Pillar 2: SDET Testing Excellence */}
        <div className="bg-[#0F141E] border border-slate-800/90 rounded-2xl p-6 flex flex-col justify-between hover:border-emerald-500/40 transition-colors">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-800/50 flex items-center justify-center text-emerald-400 mb-4">
              <Terminal className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">SDET-First Engineering</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Testing is not an afterthought; it is built into the core. Strict Page Object Models (POM), contract validation, deterministic fixtures, and validated GitHub Actions evidence.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center text-emerald-400 text-xs font-semibold">
            <span>Playwright POM • Zero Flakiness</span>
          </div>
        </div>

        {/* Pillar 3: Intentional UI/UX Design */}
        <div className="bg-[#0F141E] border border-slate-800/90 rounded-2xl p-6 flex flex-col justify-between hover:border-purple-500/40 transition-colors">
          <div>
            <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-800/50 flex items-center justify-center text-purple-400 mb-4">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Intentional Minimalism</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every layout, font pairing, status indicator, and transition has a mathematical purpose. High-contrast typography and real-time feedback without visual clutter.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center text-purple-400 text-xs font-semibold">
            <span>Clean Contrast • Accessible Polish</span>
          </div>
        </div>
      </div>

      {/* 3. Deep-Dive Section 1: The SDET Testing Strategy */}
      <div className="bg-[#0F141E]/90 border border-slate-800/90 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-800/50 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              The Test Automation Framework & Quality Strategy
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Crossing every 't' and dotting every 'i' in end-to-end reliability.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
          <div className="bg-[#121824] border border-slate-800/70 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <Code2 className="w-4 h-4" />
              <span>Strict Page Object Model (POM)</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Decoupling locators from test logic ensures high maintainability. Page classes represent UI surfaces cleanly, preventing brittle tests and simplifying future refactors.
            </p>
          </div>

          <div className="bg-[#121824] border border-slate-800/70 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <Workflow className="w-4 h-4" />
              <span>Automated Telemetry Ingestion</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Every Playwright execution ingests real-time JSON test results directly into the UI dashboard via custom ingestion scripts (`scripts/ingest-test-results.ts`), providing instant visual status.
            </p>
          </div>

          <div className="bg-[#121824] border border-slate-800/70 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <Gauge className="w-4 h-4" />
              <span>Deterministic Assertions</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Avoiding arbitrary sleep delays by relying on state-based wait assertions (`waitFor`, `toBeVisible`, and network boundary signals) to eliminate flaky test runs.
            </p>
          </div>

          <div className="bg-[#121824] border border-slate-800/70 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <GitBranch className="w-4 h-4" />
              <span>Continuous Integration Ready</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Engineered to run seamlessly across headless CI pipelines, local headed runs, and interactive UI visualizers with standard npm scripts (`npm run test:e2e`).
            </p>
          </div>
        </div>
      </div>

      {/* 4. Deep-Dive Section 2: Market Data Architecture */}
      <div className="bg-[#0F141E]/90 border border-slate-800/90 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-950/60 border border-blue-800/50 flex items-center justify-center text-blue-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Data Ingestion & State Architecture
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              High-throughput market feeds with resilient fallback mechanisms.
            </p>
          </div>
        </div>

        <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
          <p>
            The Board polls a server-side Yahoo Finance proxy. Responses are validated before use; regular-session quotes and historical samples retain provider timestamps. Missing metrics remain unavailable, and failed refreshes mark retained observations stale. Provider data may be delayed.
          </p>
          <p className="text-slate-400">
            All market updates, test histories, and watchlist favorites are managed through reactive React 19 hooks and local state caches, ensuring instant page navigation with zero layout shift.
          </p>
        </div>
      </div>

      {/* 5. Navigation Call to Action */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-blue-950/40 via-slate-900 to-emerald-950/40 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-base font-bold text-white">Experience the System Live</h4>
          <p className="text-xs text-slate-400 mt-1">
            Explore the real-time stock board or inspect published test execution evidence.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => onNavigate('board')}
            className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-blue-950/50"
          >
            <Layers className="w-4 h-4" />
            <span>The Board</span>
          </button>

          <button
            onClick={() => onNavigate('tests')}
            className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950/50"
          >
            <Terminal className="w-4 h-4" />
            <span>The Tests</span>
          </button>
        </div>
      </div>
    </div>
  );
};
