import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Info, 
  PieChart, 
  Shield, 
  BarChart3, 
  ArrowUpRight, 
  Sparkles,
  Layers,
  Clock
} from 'lucide-react';
import { MarketIndexData, Timeframe, ChartDataPoint } from '../types';

interface VtiIndexHeroProps {
  data: MarketIndexData;
  onExploreBoard: () => void;
}

export const VtiIndexHero: React.FC<VtiIndexHeroProps> = ({ data, onExploreBoard }) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('1D');
  const [hoveredPoint, setHoveredPoint] = useState<ChartDataPoint | null>(null);

  const activeSeries = data.timeframeData[selectedTimeframe];

  // Calculate high/low for SVG scaling
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

  // Chart coordinates calculation (SVG ViewBox 0 0 800 280)
  const svgWidth = 800;
  const svgHeight = 280;
  const paddingX = 20;
  const paddingY = 30;

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

  // Handle pointer tracking over SVG chart
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

  // Day range slider percentage
  const dayRangePct = Math.min(
    100,
    Math.max(
      0,
      ((data.currentPrice - data.stats.daysRange.low) /
        (data.stats.daysRange.high - data.stats.daysRange.low || 1)) *
        100
    )
  );

  // 52-week range slider percentage
  const fiftyTwoWeekPct = Math.min(
    100,
    Math.max(
      0,
      ((data.currentPrice - data.stats.fiftyTwoWeekRange.low) /
        (data.stats.fiftyTwoWeekRange.high - data.stats.fiftyTwoWeekRange.low || 1)) *
        100
    )
  );

  const timeframes: Timeframe[] = ['1D', '1W', '1M', '1Y', 'ALL'];

  return (
    <section id="vti-index-hero-section" className="relative w-full">
      {/* Background ambient glow effect */}
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-3/4 h-64 bg-blue-900/15 blur-[120px] pointer-events-none rounded-full" />

      {/* Main Total Stock Market Card */}
      <div className="relative bg-[#0F141E] border border-slate-800/90 rounded-2xl sm:rounded-3xl p-5 sm:p-7 md:p-9 shadow-2xl shadow-black/60 overflow-hidden">
        
        {/* Subtle grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#94A3B8_1px,transparent_1px)] [background-size:16px_16px]" 
        />

        {/* Top Header Row: Symbol, Issuer, and Category */}
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
          <div className="flex items-start sm:items-center space-x-4">
            {/* Vanguard Icon / Broad Index Symbol Stamp */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-red-950/80 via-slate-900 to-blue-950 border border-slate-700/80 flex flex-col items-center justify-center p-2 shadow-inner shrink-0">
              <span className="text-xs font-black tracking-widest text-red-400">VTI</span>
              <span className="text-[9px] uppercase font-mono tracking-tighter text-slate-400">US ALL-CAP</span>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
                  Vanguard Total Stock Market ETF
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-900/40 text-blue-300 border border-blue-700/50">
                  Core Benchmark
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 flex items-center gap-2">
                <span>{data.issuer}</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-300 font-medium">100% US Investable Equities</span>
              </p>
            </div>
          </div>

          {/* Core Index Highlight Badge */}
          <div className="flex items-center gap-3 self-start md:self-auto bg-[#141B28] px-3.5 py-2 rounded-xl border border-slate-800">
            <div className="p-2 rounded-lg bg-blue-950/80 text-blue-400">
              <PieChart className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Fund Composition</div>
              <div className="text-xs font-semibold text-slate-200">3,680+ Holdings (CRSP Index)</div>
            </div>
          </div>
        </div>

        {/* Hero Price & Live Metric readout */}
        <div className="mt-6 flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
          <div>
            <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight font-mono">
              ${displayPrice.toFixed(2)}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 sm:gap-3 text-sm font-semibold">
              <div
                className={`inline-flex items-center px-2.5 py-0.5 rounded-md font-mono text-sm ${
                  isDisplayPositive
                    ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                    : 'bg-red-950/60 text-red-400 border border-red-500/30'
                }`}
              >
                {isDisplayPositive ? (
                  <TrendingUp className="w-4 h-4 mr-1 text-emerald-400 inline" />
                ) : (
                  <TrendingDown className="w-4 h-4 mr-1 text-red-400 inline" />
                )}
                <span>
                  {isDisplayPositive ? '+' : ''}${Math.abs(displayDiff).toFixed(2)} ({isDisplayPositive ? '+' : ''}
                  {displayDiffPct}%)
                </span>
              </div>
              <span className="text-xs font-normal text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                {displayLabel}
              </span>
            </div>
          </div>

          {/* Timeframe Switcher (Robinhood/Sofi Style) */}
          <div 
            id="timeframe-selector-group"
            className="flex items-center space-x-1 bg-[#141A26] p-1 rounded-xl border border-slate-800/90 self-start sm:self-auto"
          >
            {timeframes.map((tf) => (
              <button
                key={tf}
                id={`timeframe-btn-${tf}`}
                onClick={() => {
                  setSelectedTimeframe(tf);
                  setHoveredPoint(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedTimeframe === tf
                    ? isPositive
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                      : 'bg-blue-600/30 text-blue-200 border border-blue-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Smooth SVG Line & Area Chart */}
        <div className="relative mt-4 w-full h-56 sm:h-72 select-none group">
          <svg
            className="w-full h-full cursor-crosshair overflow-visible"
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            preserveAspectRatio="none"
            onMouseMove={handleMouseMove}
            onTouchMove={handleTouchMove}
            onMouseLeave={() => setHoveredPoint(null)}
          >
            <defs>
              {/* Green Gradient Fill */}
              <linearGradient id="positiveFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.28" />
                <stop offset="60%" stopColor="#10B981" stopOpacity="0.06" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.00" />
              </linearGradient>
              {/* Red Gradient Fill */}
              <linearGradient id="negativeFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EF4444" stopOpacity="0.28" />
                <stop offset="60%" stopColor="#EF4444" stopOpacity="0.06" />
                <stop offset="100%" stopColor="#EF4444" stopOpacity="0.00" />
              </linearGradient>
            </defs>

            {/* Subtle horizontal baseline grid */}
            <line 
              x1={paddingX} 
              y1={svgHeight - paddingY} 
              x2={svgWidth - paddingX} 
              y2={svgHeight - paddingY} 
              stroke="#1E293B" 
              strokeDasharray="4 4" 
              strokeWidth="1" 
            />
            <line 
              x1={paddingX} 
              y1={paddingY} 
              x2={svgWidth - paddingX} 
              y2={paddingY} 
              stroke="#1E293B" 
              strokeDasharray="4 4" 
              strokeWidth="1" 
            />

            {/* Gradient Area under curve */}
            {areaPointsString && (
              <polygon
                points={areaPointsString}
                fill={isPositive ? 'url(#positiveFill)' : 'url(#negativeFill)'}
                className="transition-all duration-300"
              />
            )}

            {/* Main Price Line */}
            {pointsString && (
              <polyline
                points={pointsString}
                fill="none"
                stroke={isPositive ? '#10B981' : '#EF4444'}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-200 drop-shadow-[0_2px_8px_rgba(16,185,129,0.3)]"
              />
            )}

            {/* Hover Crosshair line and indicator point */}
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
                    {/* Vertical tracking line */}
                    <line
                      x1={hx}
                      y1={paddingY - 10}
                      x2={hx}
                      y2={svgHeight}
                      stroke="#64748B"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                    {/* Outer glowing halo ring */}
                    <circle
                      cx={hx}
                      cy={hy}
                      r="7"
                      fill={isPositive ? '#10B981' : '#EF4444'}
                      fillOpacity="0.25"
                      className="animate-ping"
                    />
                    {/* Inner solid dot */}
                    <circle
                      cx={hx}
                      cy={hy}
                      r="4.5"
                      fill="#FFFFFF"
                      stroke={isPositive ? '#10B981' : '#EF4444'}
                      strokeWidth="2"
                    />
                  </g>
                );
              })()
            )}
          </svg>

          {/* Chart interaction helper hint */}
          <div className="absolute bottom-2 right-2 text-[10px] text-slate-500 font-mono hidden sm:block">
            {hoveredPoint ? 'Release to lock current' : 'Hover / drag along curve to inspect intraday quotes'}
          </div>
        </div>

        {/* Broad Market Fundamentals & Ranges */}
        <div className="mt-8 pt-6 border-t border-slate-800/80">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
              Index Fundamentals & Market Breadth
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">Updated Real-Time</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {/* Stat 1: Expense Ratio (Highlight for VTI) */}
            <div className="bg-[#131926] p-3 rounded-xl border border-slate-800/90 hover:border-slate-700 transition-colors">
              <div className="text-[11px] text-slate-400">Expense Ratio</div>
              <div className="text-sm sm:text-base font-bold text-emerald-400 font-mono mt-0.5">
                {data.stats.expenseRatio}%
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Ultra-low fee</div>
            </div>

            {/* Stat 2: Total AUM */}
            <div className="bg-[#131926] p-3 rounded-xl border border-slate-800/90 hover:border-slate-700 transition-colors">
              <div className="text-[11px] text-slate-400">Net Assets (AUM)</div>
              <div className="text-sm sm:text-base font-bold text-white font-mono mt-0.5">
                {data.stats.aum}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Global mega-fund</div>
            </div>

            {/* Stat 3: Dividend Yield */}
            <div className="bg-[#131926] p-3 rounded-xl border border-slate-800/90 hover:border-slate-700 transition-colors">
              <div className="text-[11px] text-slate-400">Dividend Yield</div>
              <div className="text-sm sm:text-base font-bold text-white font-mono mt-0.5">
                {data.stats.dividendYield}%
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Quarterly payout</div>
            </div>

            {/* Stat 4: P/E Ratio */}
            <div className="bg-[#131926] p-3 rounded-xl border border-slate-800/90 hover:border-slate-700 transition-colors">
              <div className="text-[11px] text-slate-400">Price / Earnings (P/E)</div>
              <div className="text-sm sm:text-base font-bold text-white font-mono mt-0.5">
                {data.stats.peRatio}x
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Weighted avg</div>
            </div>

            {/* Stat 5: Prev Close */}
            <div className="bg-[#131926] p-3 rounded-xl border border-slate-800/90 hover:border-slate-700 transition-colors">
              <div className="text-[11px] text-slate-400">Previous Close</div>
              <div className="text-sm sm:text-base font-bold text-slate-200 font-mono mt-0.5">
                ${data.stats.previousClose.toFixed(2)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Open: ${data.stats.openPrice.toFixed(2)}</div>
            </div>

            {/* Stat 6: Total Holdings */}
            <div className="bg-[#131926] p-3 rounded-xl border border-slate-800/90 hover:border-slate-700 transition-colors">
              <div className="text-[11px] text-slate-400">Total Equities</div>
              <div className="text-sm sm:text-base font-bold text-blue-400 font-mono mt-0.5">
                {data.stats.holdingsCount.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">100% US coverage</div>
            </div>
          </div>

          {/* Range Gauges (Day Range & 52-Week Range) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {/* Day Range Bar */}
            <div className="bg-[#131926] p-3.5 rounded-xl border border-slate-800">
              <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                <span className="font-medium">Today's Range</span>
                <span className="font-mono text-white">
                  ${data.stats.daysRange.low.toFixed(2)} - ${data.stats.daysRange.high.toFixed(2)}
                </span>
              </div>
              <div className="relative w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-emerald-400 rounded-full"
                  style={{ width: `${dayRangePct}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                <span>Low: ${data.stats.daysRange.low.toFixed(2)}</span>
                <span>Current: ${data.currentPrice.toFixed(2)}</span>
                <span>High: ${data.stats.daysRange.high.toFixed(2)}</span>
              </div>
            </div>

            {/* 52-Week Range Bar */}
            <div className="bg-[#131926] p-3.5 rounded-xl border border-slate-800">
              <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                <span className="font-medium">52-Week Range</span>
                <span className="font-mono text-white">
                  ${data.stats.fiftyTwoWeekRange.low.toFixed(2)} - ${data.stats.fiftyTwoWeekRange.high.toFixed(2)}
                </span>
              </div>
              <div className="relative w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-slate-600 via-blue-500 to-emerald-400 rounded-full"
                  style={{ width: `${fiftyTwoWeekPct}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                <span>52W Low: ${data.stats.fiftyTwoWeekRange.low.toFixed(2)}</span>
                <span>High: ${data.stats.fiftyTwoWeekRange.high.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Top Weighted Holdings in Index */}
          <div className="mt-5 bg-[#131926]/70 p-4 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-between mb-2.5">
              <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                Top Holdings Driving VTI Performance
              </div>
              <button
                id="hero-explore-board-link"
                onClick={onExploreBoard}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium transition-colors"
              >
                <span>View Full Watchlist on The Board</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {data.stats.topHoldings.map((h) => (
                <div
                  key={h.ticker}
                  className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg bg-[#0B0E14] border border-slate-800 text-xs hover:border-slate-700 transition-colors"
                >
                  <span className="font-mono font-bold text-white">{h.ticker}</span>
                  <span className="text-slate-400 text-[11px] hidden sm:inline">{h.name}</span>
                  <span className="px-1.5 py-0.2 rounded bg-blue-950 text-blue-300 font-mono text-[10px] font-semibold">
                    {h.weight}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
