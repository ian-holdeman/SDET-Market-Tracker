import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Terminal, 
  Clock, 
  ShieldCheck, 
  Activity, 
  Cpu 
} from 'lucide-react';
import { Timeframe } from '../../types';

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
    { timestamp: '2023', timeLabel: '2023', total: 64, passed: 63, failed: 1, durationMs: 650, passRate: 98.4 },
    { timestamp: '2024', timeLabel: '2024', total: 96, passed: 96, failed: 0, durationMs: 530, passRate: 100 },
    { timestamp: '2025', timeLabel: '2025', total: 128, passed: 128, failed: 0, durationMs: 460, passRate: 100 },
    { timestamp: '2026', timeLabel: '2026', total: 142, passed: 142, failed: 0, durationMs: 385, passRate: 100 },
  ],
};

export const TestingDashboardPlus: React.FC = () => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('1D');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const activeSeries = TEST_HISTORY_DATA[selectedTimeframe];
  const timeframes: Timeframe[] = ['1D', '1W', '1M', '1Y', 'ALL'];

  const latestRun = activeSeries[activeSeries.length - 1];
  const activeRun = hoveredIndex !== null ? activeSeries[hoveredIndex] : latestRun;

  // SVG Chart dimensions
  const svgWidth = 460;
  const svgHeight = 130;
  const chartPaddingTop = 12;
  const chartPaddingBottom = 22;
  const availableHeight = svgHeight - chartPaddingTop - chartPaddingBottom;

  const barCount = activeSeries.length;
  const barSpacing = svgWidth / barCount;
  const barWidth = Math.min(28, Math.max(14, barSpacing * 0.44));

  return (
    <div
      id="testing-dashboard-plus"
      className="w-full bg-[#0F141E] border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col justify-between"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Test Health & History
            </h3>
            <p className="text-xs text-slate-400">Playwright automated execution status</p>
          </div>
        </div>

        {/* Timeframe Switcher */}
        <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => {
                setSelectedTimeframe(tf);
                setHoveredIndex(null);
              }}
              className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors ${
                selectedTimeframe === tf
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Main KPI Row */}
      <div className="mt-4 flex items-baseline justify-between">
        <div>
          <div className="text-2xl sm:text-3xl font-bold text-white font-mono tracking-tight flex items-baseline space-x-2">
            <span>{activeRun.passed}/{activeRun.total}</span>
            <span className="text-xs text-slate-400 font-sans font-normal">Passed</span>
          </div>
          <div className="mt-1 flex items-center space-x-2 text-xs">
            <span
              className={`font-semibold flex items-center gap-1 ${
                activeRun.failed === 0 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {activeRun.failed === 0 ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <XCircle className="w-3.5 h-3.5" />
              )}
              {activeRun.passRate.toFixed(1)}% Pass Rate
              {activeRun.failed > 0 && ` (${activeRun.failed} failed)`}
            </span>
            <span className="text-slate-500 font-mono">
              • {activeRun.timeLabel} • {activeRun.durationMs}ms
            </span>
          </div>
        </div>
      </div>

      {/* SVG Bar Chart */}
      <div className="relative mt-3 w-full h-32 select-none">
        <svg
          className="w-full h-full cursor-pointer overflow-visible"
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          onMouseLeave={() => setHoveredIndex(null)}
        >
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

          {activeSeries.map((item, index) => {
            const centerX = barSpacing * index + barSpacing / 2;
            const x = centerX - barWidth / 2;
            const passPct = item.passed / item.total;
            const barHeight = availableHeight * (item.total / 150);
            const y = svgHeight - chartPaddingBottom - barHeight;
            
            const isHovered = hoveredIndex === index;
            const hasFailures = item.failed > 0;
            const passedHeight = barHeight * passPct;
            const failedHeight = barHeight * (1 - passPct);

            return (
              <g
                key={item.timestamp + index}
                onMouseEnter={() => setHoveredIndex(index)}
                className="cursor-pointer"
              >
                {isHovered && (
                  <rect
                    x={centerX - barSpacing / 2 + 2}
                    y={chartPaddingTop - 2}
                    width={barSpacing - 4}
                    height={availableHeight + 4}
                    fill="#1E293B"
                    opacity="0.4"
                    rx="3"
                  />
                )}

                <rect
                  x={x}
                  y={y + failedHeight}
                  width={barWidth}
                  height={passedHeight}
                  fill={isHovered ? '#34D399' : '#10B981'}
                  rx={hasFailures ? 0 : 2}
                />

                {hasFailures && (
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={failedHeight}
                    fill="#EF4444"
                    rx="2"
                  />
                )}

                <text
                  x={centerX}
                  y={svgHeight - 6}
                  textAnchor="middle"
                  fill={isHovered ? '#FFFFFF' : '#64748B'}
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {item.timestamp}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* 4 Metrics Row */}
      <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        <div className="bg-slate-900/60 py-2 px-2 rounded-lg border border-slate-800/80">
          <div className="text-[11px] text-slate-400">Coverage</div>
          <div className="text-xs font-bold text-white font-mono mt-0.5">98.4%</div>
        </div>

        <div className="bg-slate-900/60 py-2 px-2 rounded-lg border border-slate-800/80">
          <div className="text-[11px] text-slate-400">Flakiness</div>
          <div className="text-xs font-bold text-emerald-400 font-mono mt-0.5">0.0%</div>
        </div>

        <div className="bg-slate-900/60 py-2 px-2 rounded-lg border border-slate-800/80">
          <div className="text-[11px] text-slate-400">Avg Duration</div>
          <div className="text-xs font-bold text-white font-mono mt-0.5">385ms</div>
        </div>

        <div className="bg-slate-900/60 py-2 px-2 rounded-lg border border-slate-800/80">
          <div className="text-[11px] text-slate-400">Parallel Workers</div>
          <div className="text-xs font-bold text-white font-mono mt-0.5">4x</div>
        </div>
      </div>
    </div>
  );
};
