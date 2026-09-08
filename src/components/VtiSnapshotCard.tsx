import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown,
  ArrowUpRight
} from 'lucide-react';
import { MarketIndexData, Timeframe, ChartDataPoint } from '../types';


interface VtiSnapshotCardProps {
  data: MarketIndexData;
  onExploreBoard: () => void;
}

export const VtiSnapshotCard: React.FC<VtiSnapshotCardProps> = ({ data, onExploreBoard }) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('1D');
  const [hoveredPoint, setHoveredPoint] = useState<ChartDataPoint | null>(null);

  const activeSeries = data.timeframeData[selectedTimeframe];

  // Calculate pricing dynamics for chart
  const { minPrice, maxPrice, startPrice, endPrice, isPositive, priceChange, percentChange } = useMemo(() => {
    if (!activeSeries || activeSeries.length === 0) {
      return {
        minPrice: 0,
        maxPrice: 1,
        startPrice: data.currentPrice,
        endPrice: data.currentPrice,
        isPositive: true,
        priceChange: data.change,
        percentChange: data.changePercent,
      };
    }

    const prices = activeSeries.map(p => p.price);
    const min = Math.min(...prices) * 0.998;
    const max = Math.max(...prices) * 1.002;
    const start = activeSeries[0].price;
    const end = activeSeries[activeSeries.length - 1].price;
    const diff = Number((end - start).toFixed(2));
    const pct = Number(((diff / start) * 100).toFixed(2));

    return {
      minPrice: min,
      maxPrice: max,
      startPrice: start,
      endPrice: end,
      isPositive: diff >= 0,
      priceChange: diff,
      percentChange: pct,
    };
  }, [activeSeries, data]);

  // Current display price (either hovered or active latest)
  const displayPrice = hoveredPoint ? hoveredPoint.price : endPrice;
  const displayLabel = hoveredPoint ? hoveredPoint.timeLabel : data.asOf;
  const displayDiff = hoveredPoint 
    ? Number((hoveredPoint.price - startPrice).toFixed(2)) 
    : priceChange;
  const displayDiffPct = hoveredPoint 
    ? Number(((displayDiff / startPrice) * 100).toFixed(2)) 
    : percentChange;
  const isDisplayPositive = displayDiff >= 0;

  // SVG dimensions for compact preview
  const svgWidth = 460;
  const svgHeight = 150;
  const paddingX = 12;
  const paddingY = 16;

  const pointsString = useMemo(() => {
    if (!activeSeries || activeSeries.length < 2) return '';
    const spanX = svgWidth - paddingX * 2;
    const spanY = svgHeight - paddingY * 2;
    const priceRange = maxPrice - minPrice || 1;

    return activeSeries.map((p, index) => {
      const x = paddingX + (index / (activeSeries.length - 1)) * spanX;
      const y = svgHeight - paddingY - ((p.price - minPrice) / priceRange) * spanY;
      return `${x},${y}`;
    }).join(' ');
  }, [activeSeries, minPrice, maxPrice]);

  const areaPointsString = useMemo(() => {
    if (!pointsString) return '';
    const firstPoint = pointsString.split(' ')[0];
    const lastPoint = pointsString.split(' ').slice(-1)[0];
    const [firstX] = firstPoint.split(',');
    const [lastX] = lastPoint.split(',');
    return `${pointsString} ${lastX},${svgHeight} ${firstX},${svgHeight}`;
  }, [pointsString]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const relativeX = Math.max(0, Math.min(1, mouseX / rect.width));
    const targetIndex = Math.round(relativeX * (activeSeries.length - 1));
    if (activeSeries[targetIndex]) {
      setHoveredPoint(activeSeries[targetIndex]);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (!e.touches[0]) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    const relativeX = Math.max(0, Math.min(1, touchX / rect.width));
    const targetIndex = Math.round(relativeX * (activeSeries.length - 1));
    if (activeSeries[targetIndex]) {
      setHoveredPoint(activeSeries[targetIndex]);
    }
  };

  const timeframes: Timeframe[] = ['1D', '1W', '1M', '1Y', 'ALL'];

  return (
    <div 
      id="vti-snapshot-card"
      className="relative w-full bg-[#0F141E] border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl shadow-black/40 overflow-hidden group hover:border-slate-700/80 transition-all duration-300 flex flex-col justify-between"
    >
      {/* Subtle top-right ambient glow */}
      <div className="absolute -top-10 -right-10 w-36 h-36 bg-blue-600/10 blur-2xl rounded-full pointer-events-none" />

      {/* Snapshot Header: Logo, Ticker, Category */}
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div className="flex items-center space-x-3">
          {/* Stylized Vanguard / VTI Badge with Imagery Icon */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-950 via-slate-900 to-blue-950 border border-slate-700/70 flex items-center justify-center shadow-inner shrink-0">
            <span className="text-[11px] font-black tracking-wider text-red-400">VTI</span>
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-white tracking-tight">
                Vanguard Total Stock
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-950 text-blue-300 border border-blue-800/40">
                ETF
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Total US Stock Market Index</p>
          </div>
        </div>

        <button
          id="snapshot-view-board-btn"
          onClick={onExploreBoard}
          className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium transition-colors group/btn py-1 px-2 rounded-lg hover:bg-slate-800/50"
        >
          <span>The Board</span>
          <ArrowUpRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
        </button>
      </div>

      {/* Compact Price & Timeframe Bar */}
      <div className="mt-4 flex items-baseline justify-between gap-2">
        <div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
            ${displayPrice.toFixed(2)}
          </div>
          <div className="mt-0.5 flex items-center space-x-2">
            <span
              className={`inline-flex items-center font-mono text-xs font-semibold ${
                isDisplayPositive ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {isDisplayPositive ? (
                <TrendingUp className="w-3.5 h-3.5 mr-0.5 inline" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 mr-0.5 inline" />
              )}
              {isDisplayPositive ? '+' : ''}${Math.abs(displayDiff).toFixed(2)} ({isDisplayPositive ? '+' : ''}
              {displayDiffPct}%)
            </span>
            <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
              • {displayLabel}
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
                setHoveredPoint(null);
              }}
              className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                selectedTimeframe === tf
                  ? isPositive
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-blue-600/30 text-blue-200 border border-blue-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Compact Sparkline / Area Chart */}
      <div className="relative mt-3 w-full h-36 select-none">
        <svg
          className="w-full h-full cursor-crosshair overflow-visible"
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          preserveAspectRatio="none"
          onMouseMove={handleMouseMove}
          onTouchMove={handleTouchMove}
          onMouseLeave={() => setHoveredPoint(null)}
        >
          <defs>
            <linearGradient id="snapshotPositiveFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.00" />
            </linearGradient>
            <linearGradient id="snapshotNegativeFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EF4444" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#EF4444" stopOpacity="0.00" />
            </linearGradient>
          </defs>

          {/* Area under curve */}
          {areaPointsString && (
            <polygon
              points={areaPointsString}
              fill={isPositive ? 'url(#snapshotPositiveFill)' : 'url(#snapshotNegativeFill)'}
            />
          )}

          {/* Main Price Line */}
          {pointsString && (
            <polyline
              points={pointsString}
              fill="none"
              stroke={isPositive ? '#10B981' : '#EF4444'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Pulsing Beacon at Tip of Line only when VTI is actively trading */}


          {/* Hover Crosshair Point */}
          {hoveredPoint && activeSeries.length > 1 && (
            (() => {
              const index = activeSeries.findIndex(p => p.timestamp === hoveredPoint.timestamp);
              if (index === -1) return null;
              const spanX = svgWidth - paddingX * 2;
              const spanY = svgHeight - paddingY * 2;
              const priceRange = maxPrice - minPrice || 1;
              const hx = paddingX + (index / (activeSeries.length - 1)) * spanX;
              const hy = svgHeight - paddingY - ((hoveredPoint.price - minPrice) / priceRange) * spanY;

              return (
                <g>
                  <line
                    x1={hx}
                    y1={paddingY}
                    x2={hx}
                    y2={svgHeight}
                    stroke="#64748B"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                  <circle
                    cx={hx}
                    cy={hy}
                    r="4"
                    fill="#FFFFFF"
                    stroke={isPositive ? '#10B981' : '#EF4444'}
                    strokeWidth="2"
                  />
                </g>
              );
            })()
          )}
        </svg>
      </div>

      {/* 3 High-Level Benchmark Highlights (P/E Ratio, 52W High, 52W Low) */}
      <div className="mt-3 pt-3 border-t border-slate-800/70 grid grid-cols-3 gap-2 text-center">
        <div className="bg-[#131926]/60 py-1.5 px-2 rounded-lg border border-slate-800/50">
          <div className="text-[10px] text-slate-400">P/E Ratio</div>
          <div className="text-xs font-bold text-white font-mono">{data.stats.peRatio}x</div>
        </div>
        <div className="bg-[#131926]/60 py-1.5 px-2 rounded-lg border border-slate-800/50">
          <div className="text-[10px] text-slate-400">52W High</div>
          <div className="text-xs font-bold text-emerald-400 font-mono">${data.stats.fiftyTwoWeekRange.high.toFixed(2)}</div>
        </div>
        <div className="bg-[#131926]/60 py-1.5 px-2 rounded-lg border border-slate-800/50">
          <div className="text-[10px] text-slate-400">52W Low</div>
          <div className="text-xs font-bold text-red-400 font-mono">${data.stats.fiftyTwoWeekRange.low.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
};
