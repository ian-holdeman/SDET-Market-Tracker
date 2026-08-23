import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Terminal, 
  ArrowUpRight, 
  Clock, 
  ShieldCheck, 
  Activity 
} from 'lucide-react';
import { Timeframe } from '../types';

export interface TestRunDataPoint {
  timestamp: string;
  timeLabel: string;
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  passRate: number;
}

const TEST_HISTORY_DATA: Record<Timeframe, TestRunDataPoint[]> = {
  '1D': [
    { timestamp: '09:30', timeLabel: '09:30 AM', total: 142, passed: 142, failed: 0, durationMs: 420, passRate: 100 },
    { timestamp: '10:30', timeLabel: '10:30 AM', total: 142, passed: 142, failed: 0, durationMs: 410, passRate: 100 },
    { timestamp: '11:30', timeLabel: '11:30 AM', total: 142, passed: 140, failed: 2, durationMs: 510, passRate: 98.6 },
    { timestamp: '12:30', timeLabel: '12:30 PM', total: 142, passed: 142, failed: 0, durationMs: 395, passRate: 100 },
    { timestamp: '01:30', timeLabel: '01:30 PM', total: 142, passed: 142, failed: 0, durationMs: 405, passRate: 100 },
    { timestamp: '02:30', timeLabel: '02:30 PM', total: 142, passed: 142, failed: 0, durationMs: 388, passRate: 100 },
    { timestamp: '03:30', timeLabel: '03:30 PM', total: 142, passed: 141, failed: 1, durationMs: 430, passRate: 99.3 },
    { timestamp: '04:00', timeLabel: '04:00 PM', total: 142, passed: 142, failed: 0, durationMs: 392, passRate: 100 },
  ],
  '1W': [
    { timestamp: 'Thu', timeLabel: 'Thu (8/13)', total: 142, passed: 142, failed: 0, durationMs: 415, passRate: 100 },
    { timestamp: 'Fri', timeLabel: 'Fri (8/14)', total: 142, passed: 142, failed: 0, durationMs: 402, passRate: 100 },
    { timestamp: 'Mon', timeLabel: 'Mon (8/17)', total: 142, passed: 139, failed: 3, durationMs: 460, passRate: 97.9 },
    { timestamp: 'Tue', timeLabel: 'Tue (8/18)', total: 142, passed: 142, failed: 0, durationMs: 390, passRate: 100 },
    { timestamp: 'Wed', timeLabel: 'Wed (8/19)', total: 142, passed: 142, failed: 0, durationMs: 385, passRate: 100 },
  ],
  '1M': [
    { timestamp: 'Jul 20', timeLabel: 'Jul 20', total: 138, passed: 138, failed: 0, durationMs: 430, passRate: 100 },
    { timestamp: 'Jul 27', timeLabel: 'Jul 27', total: 138, passed: 136, failed: 2, durationMs: 480, passRate: 98.5 },
    { timestamp: 'Aug 03', timeLabel: 'Aug 03', total: 140, passed: 140, failed: 0, durationMs: 410, passRate: 100 },
    { timestamp: 'Aug 10', timeLabel: 'Aug 10', total: 140, passed: 140, failed: 0, durationMs: 400, passRate: 100 },
    { timestamp: 'Aug 17', timeLabel: 'Aug 17', total: 142, passed: 142, failed: 0, durationMs: 390, passRate: 100 },
    { timestamp: 'Today', timeLabel: 'Today', total: 142, passed: 142, failed: 0, durationMs: 385, passRate: 100 },
  ],
  '1Y': [
    { timestamp: 'Q3 25', timeLabel: 'Q3 2025', total: 120, passed: 118, failed: 2, durationMs: 520, passRate: 98.3 },
    { timestamp: 'Q4 25', timeLabel: 'Q4 2025', total: 128, passed: 128, failed: 0, durationMs: 490, passRate: 100 },
    { timestamp: 'Q1 26', timeLabel: 'Q1 2026', total: 132, passed: 132, failed: 0, durationMs: 440, passRate: 100 },
    { timestamp: 'Q2 26', timeLabel: 'Q2 2026', total: 138, passed: 137, failed: 1, durationMs: 410, passRate: 99.3 },
    { timestamp: 'Q3 26', timeLabel: 'Q3 2026', total: 142, passed: 142, failed: 0, durationMs: 385, passRate: 100 },
  ],
  'ALL': [
    { timestamp: '2023', timeLabel: '2023 Init', total: 64, passed: 63, failed: 1, durationMs: 650, passRate: 98.4 },
    { timestamp: '2024', timeLabel: '2024 CI/CD', total: 96, passed: 96, failed: 0, durationMs: 530, passRate: 100 },
    { timestamp: '2025', timeLabel: '2025 Suite', total: 128, passed: 128, failed: 0, durationMs: 460, passRate: 100 },
    { timestamp: '2026', timeLabel: '2026 Current', total: 142, passed: 142, failed: 0, durationMs: 385, passRate: 100 },
  ],
};

interface TestSnapshotCardProps {
  onExploreTests: () => void;
}

export const TestSnapshotCard: React.FC<TestSnapshotCardProps> = ({ onExploreTests }) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('1D');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const activeSeries = TEST_HISTORY_DATA[selectedTimeframe];
  const timeframes: Timeframe[] = ['1D', '1W', '1M', '1Y', 'ALL'];

  const latestRun = activeSeries[activeSeries.length - 1];
  const activeRun = hoveredIndex !== null ? activeSeries[hoveredIndex] : latestRun;

  // Chart dimensions
  const svgWidth = 460;
  const svgHeight = 150;
  const chartPaddingTop = 16;
  const chartPaddingBottom = 24;
  const availableHeight = svgHeight - chartPaddingTop - chartPaddingBottom;

  const barCount = activeSeries.length;
  const barSpacing = svgWidth / barCount;
  const barWidth = Math.min(36, Math.max(18, barSpacing * 0.52));

  return (
    <div
      id="sdet-test-snapshot-card"
      className="relative w-full bg-[#0F141E] border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl shadow-black/40 overflow-hidden group hover:border-slate-700/80 transition-all duration-300 flex flex-col justify-between"
    >
      {/* Subtle top-right ambient glow */}
      <div className="absolute -top-10 -right-10 w-36 h-36 bg-emerald-600/10 blur-2xl rounded-full pointer-events-none" />

      {/* Snapshot Header: Logo, Title, Category & Quick Link to The Tests */}
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div className="flex items-center space-x-3">
          {/* Stylized SDET Suite Badge */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 border border-slate-700/70 flex items-center justify-center shadow-inner shrink-0">
            <Terminal className="w-5 h-5 text-emerald-400" />
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-white tracking-tight">
                SDET Test Execution
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800/40 font-mono">
                CI/CD
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Automated Pipeline & API Contracts</p>
          </div>
        </div>

        <button
          id="snapshot-view-tests-btn"
          onClick={onExploreTests}
          className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium transition-colors group/btn py-1 px-2 rounded-lg hover:bg-slate-800/50"
        >
          <span>The Tests</span>
          <ArrowUpRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
        </button>
      </div>

      {/* Compact Status & Timeframe Bar */}
      <div className="mt-4 flex items-baseline justify-between gap-2">
        <div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight flex items-baseline space-x-2">
            <span>{activeRun.passed}/{activeRun.total}</span>
            <span className="text-xs text-slate-400 font-sans font-normal">Passed</span>
          </div>
          <div className="mt-0.5 flex items-center space-x-2">
            <span
              className={`inline-flex items-center font-mono text-xs font-semibold ${
                activeRun.failed === 0 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {activeRun.failed === 0 ? (
                <CheckCircle2 className="w-3.5 h-3.5 mr-0.5 inline" />
              ) : (
                <XCircle className="w-3.5 h-3.5 mr-0.5 inline" />
              )}
              {activeRun.passRate.toFixed(1)}% Pass Rate
              {activeRun.failed > 0 && ` (${activeRun.failed} failed)`}
            </span>
            <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
              • {activeRun.timeLabel} • {activeRun.durationMs}ms
            </span>
          </div>
        </div>

        {/* Minimalist Timeframe Switcher */}
        <div className="flex items-center space-x-1 bg-[#131926] p-0.5 rounded-lg border border-slate-800">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => {
                setSelectedTimeframe(tf);
                setHoveredIndex(null);
              }}
              className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                selectedTimeframe === tf
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Bar Chart representing test results over time */}
      <div className="relative mt-3 w-full h-36 select-none">
        <svg
          className="w-full h-full cursor-pointer overflow-visible"
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {/* Subtle horizontal grid lines */}
          <line
            x1="0"
            y1={chartPaddingTop}
            x2={svgWidth}
            y2={chartPaddingTop}
            stroke="#1E293B"
            strokeDasharray="2 2"
            strokeWidth="1"
          />
          <line
            x1="0"
            y1={chartPaddingTop + availableHeight / 2}
            x2={svgWidth}
            y2={chartPaddingTop + availableHeight / 2}
            stroke="#1E293B"
            strokeDasharray="2 2"
            strokeWidth="1"
          />
          <line
            x1="0"
            y1={svgHeight - chartPaddingBottom}
            x2={svgWidth}
            y2={svgHeight - chartPaddingBottom}
            stroke="#334155"
            strokeWidth="1"
          />

          {/* Bar groups */}
          {activeSeries.map((item, index) => {
            const centerX = barSpacing * index + barSpacing / 2;
            const x = centerX - barWidth / 2;
            const passPct = item.passed / item.total;
            const barHeight = availableHeight * (item.total / 150); // Normalized scale
            const y = svgHeight - chartPaddingBottom - barHeight;
            
            const isHovered = hoveredIndex === index;
            const hasFailures = item.failed > 0;

            const passedHeight = barHeight * passPct;
            const failedHeight = barHeight * (1 - passPct);

            return (
              <g
                key={item.timestamp + index}
                onMouseEnter={() => setHoveredIndex(index)}
                className="cursor-pointer transition-opacity"
              >
                {/* Background bar highlight on hover */}
                {isHovered && (
                  <rect
                    x={centerX - barSpacing / 2 + 2}
                    y={chartPaddingTop - 4}
                    width={barSpacing - 4}
                    height={availableHeight + 8}
                    fill="#1E293B"
                    opacity="0.4"
                    rx="4"
                  />
                )}

                {/* Passed segment (bottom) */}
                <rect
                  x={x}
                  y={y + failedHeight}
                  width={barWidth}
                  height={passedHeight}
                  fill={isHovered ? '#34D399' : '#10B981'}
                  opacity={isHovered ? 1 : 0.85}
                  rx={hasFailures ? 0 : 3}
                  className="transition-colors"
                />

                {/* Failed segment (top, if any) */}
                {hasFailures && (
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={failedHeight}
                    fill="#EF4444"
                    rx="3"
                  />
                )}

                {/* X-axis label */}
                <text
                  x={centerX}
                  y={svgHeight - 8}
                  textAnchor="middle"
                  fill={isHovered ? '#FFFFFF' : '#64748B'}
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight={isHovered ? 'bold' : 'normal'}
                >
                  {item.timestamp}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* 3 High-Level Benchmark Highlights (Uniform with VTI card) */}
      <div className="mt-3 pt-3 border-t border-slate-800/70 grid grid-cols-3 gap-2 text-center">
        <div className="bg-[#131926]/60 py-1.5 px-2 rounded-lg border border-slate-800/50">
          <div className="text-[10px] text-slate-400">Coverage</div>
          <div className="text-xs font-bold text-white font-mono">98.4%</div>
        </div>
        <div className="bg-[#131926]/60 py-1.5 px-2 rounded-lg border border-slate-800/50">
          <div className="text-[10px] text-slate-400">Test Suites</div>
          <div className="text-xs font-bold text-emerald-400 font-mono">18 Suites</div>
        </div>
        <div className="bg-[#131926]/60 py-1.5 px-2 rounded-lg border border-slate-800/50">
          <div className="text-[10px] text-slate-400">Avg Latency</div>
          <div className="text-xs font-bold text-blue-400 font-mono">385ms</div>
        </div>
      </div>
    </div>
  );
};
