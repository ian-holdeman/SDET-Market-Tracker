import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  ExternalLink,
  Calendar,
  Loader2,
  AlertTriangle,
  RotateCw,
  CheckCircle2,
  Star
} from 'lucide-react';
import { BoardStock, BoardTimeframe } from '../types';
import { buildConfirmedStockTimeframeData, ChartPoint, TimeframeSummary } from '../utils/timeframeData';
import { 
  fetchFinnhubTimeframeCandles,
  fetchFinnhubCompanyProfile,
  FinnhubCompanyProfile
} from '../services/finnhub';
import { fetchProxyCandles } from '../services/yahooMarket';
import { TickerLogo } from './TickerLogo';
import { useAuth } from '../context/AuthContext';
import { getGoogleFinanceQuoteUrl } from '../utils/financeLinks';

interface BoardStockDetailCardProps {
  stock: BoardStock;
  onClose?: () => void;
}

const TIMEFRAMES: BoardTimeframe[] = ['1D', '1W', '1M', 'YTD', '1Y', '5Y', 'MAX'];

/**
 * Computes human-friendly, perfectly even dollar increments for the chart Y-axis
 * producing 4 clean, evenly-spaced horizontal levels.
 */
function computeEvenYAxis(prices: number[]): {
  ticks: number[];
  paddedMin: number;
  paddedMax: number;
  step: number;
  formatTick: (val: number) => string;
} {
  if (!prices || prices.length === 0) {
    return {
      ticks: [0, 25, 50, 75, 100],
      paddedMin: 0,
      paddedMax: 100,
      step: 25,
      formatTick: (v) => `$${v}`,
    };
  }

  const rawMin = Math.min(...prices);
  const rawMax = Math.max(...prices);
  const rawSpan = Math.max(0.02, rawMax - rawMin);

  // Add 4% vertical padding to prevent curve from clipping top/bottom borders
  const paddedMinCandidate = Math.max(0, rawMin - rawSpan * 0.04);
  const paddedMaxCandidate = rawMax + rawSpan * 0.04;
  const targetSpan = paddedMaxCandidate - paddedMinCandidate;

  // Find optimal nice step
  const rawStep = targetSpan / 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / magnitude;

  let niceMultiplier = 1;
  if (normalized < 1.4) niceMultiplier = 1;
  else if (normalized < 2.4) niceMultiplier = 2;
  else if (normalized < 3.8) niceMultiplier = 2.5;
  else if (normalized < 7.5) niceMultiplier = 5;
  else niceMultiplier = 10;

  const step = niceMultiplier * magnitude;

  // Align start tick to even step boundary
  const startTick = Math.floor(paddedMinCandidate / step) * step;
  const ticks: number[] = [];

  for (let val = startTick; ; val += step) {
    const rounded = Number(val.toFixed(2));
    ticks.push(rounded);
    if (rounded >= rawMax && ticks.length >= 4) {
      break;
    }
    if (ticks.length > 7) break;
  }

  // Ensure minimum 4 ticks
  while (ticks.length < 4) {
    const nextVal = Number((ticks[ticks.length - 1] + step).toFixed(2));
    ticks.push(nextVal);
  }

  const paddedMin = ticks[0];
  const paddedMax = ticks[ticks.length - 1];

  const formatTick = (val: number) => {
    if (step >= 1 && Number.isInteger(val)) {
      return `$${Math.round(val)}`;
    }
    if (step >= 0.5 && Number.isInteger(val * 2)) {
      return `$${val.toFixed(2)}`;
    }
    return `$${val.toFixed(2)}`;
  };

  return {
    ticks,
    paddedMin,
    paddedMax,
    step,
    formatTick,
  };
}

/**
 * Dynamically determines whether Eastern Time is currently in EST (Standard Time) or EDT (Daylight Saving Time).
 */
export function getEasternTimezoneAbbr(date: Date = new Date()): 'EST' | 'EDT' {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      timeZoneName: 'short',
    }).formatToParts(date);
    const tzPart = parts.find((p) => p.type === 'timeZoneName');
    if (tzPart && (tzPart.value === 'EST' || tzPart.value === 'EDT')) {
      return tzPart.value;
    }
  } catch {
    // fallback based on daylight savings approximate months
  }
  const month = date.getMonth(); // 0-indexed: March (2) to Nov (10) is EDT
  return month >= 2 && month <= 10 ? 'EDT' : 'EST';
}

/**
 * Returns clean, evenly spaced X-axis interval labels and their relative positions (0 to 1)
 * tailored to each specific timeframe.
 */
function getEvenXAxisTicks(timeframe: BoardTimeframe, pointsCount: number): { label: string; index: number }[] {
  if (pointsCount <= 1) return [];

  if (timeframe === '1D') {
    const tz = getEasternTimezoneAbbr();
    // 5 even trading day time intervals with dynamic Eastern Timezone (EST/EDT) on the axis:
    const intervals = [
      { label: '9:30 AM', frac: 0 },
      { label: '11:00 AM', frac: 0.23 },
      { label: '12:30 PM', frac: 0.46 },
      { label: '2:00 PM', frac: 0.69 },
      { label: `4:00 PM ${tz}`, frac: 1.0 }
    ];
    return intervals.map(item => ({
      label: item.label,
      index: Math.min(pointsCount - 1, Math.round(item.frac * (pointsCount - 1)))
    }));
  }

  if (timeframe === '1W') {
    // 5 trading days: Mon, Tue, Wed, Thu, Fri
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    return days.map((d, i) => ({
      label: d,
      index: Math.min(pointsCount - 1, Math.round((i / (days.length - 1)) * (pointsCount - 1)))
    }));
  }

  if (timeframe === '1M') {
    // 5 evenly spaced weekly points
    const count = 5;
    const result = [];
    const now = new Date();
    for (let i = 0; i < count; i++) {
      const frac = i / (count - 1);
      const idx = Math.min(pointsCount - 1, Math.round(frac * (pointsCount - 1)));
      const daysAgo = Math.round((1 - frac) * 28);
      const d = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      result.push({
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        index: idx
      });
    }
    return result;
  }

  if (timeframe === 'YTD') {
    const months = ['Jan', 'Mar', 'May', 'Jul', 'Aug'];
    return months.map((m, i) => ({
      label: m,
      index: Math.min(pointsCount - 1, Math.round((i / (months.length - 1)) * (pointsCount - 1)))
    }));
  }

  if (timeframe === '1Y') {
    const intervals = ['Aug \'25', 'Nov \'25', 'Feb \'26', 'May \'26', 'Aug \'26'];
    return intervals.map((lbl, i) => ({
      label: lbl,
      index: Math.min(pointsCount - 1, Math.round((i / (intervals.length - 1)) * (pointsCount - 1)))
    }));
  }

  if (timeframe === '5Y') {
    const years = ['2021', '2022', '2023', '2024', '2025', '2026'];
    return years.map((y, i) => ({
      label: y,
      index: Math.min(pointsCount - 1, Math.round((i / (years.length - 1)) * (pointsCount - 1)))
    }));
  }

  // MAX
  const maxYears = ['2016', '2018', '2020', '2022', '2024', '2026'];
  return maxYears.map((y, i) => ({
    label: y,
    index: Math.min(pointsCount - 1, Math.round((i / (maxYears.length - 1)) * (pointsCount - 1)))
  }));
}

export const BoardStockDetailCard: React.FC<BoardStockDetailCardProps> = ({ stock, onClose }) => {
  const { user, isSymbolInWatchlist, toggleWatchlistSymbol, openAuthModal } = useAuth();
  const isWatching = isSymbolInWatchlist(stock.symbol);

  const [selectedTimeframe, setSelectedTimeframe] = useState<BoardTimeframe>('1D');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [liveCandleSummary, setLiveCandleSummary] = useState<TimeframeSummary | null>(null);
  const [isLoadingCandles, setIsLoadingCandles] = useState<boolean>(false);
  const [profile, setProfile] = useState<FinnhubCompanyProfile | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const handleWatchToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      openAuthModal('login', 'You must be logged in to add items to your watchlist.');
      return;
    }
    const added = await toggleWatchlistSymbol(stock.symbol);
    if (!added && onClose) {
      onClose();
    }
  };

  // Fetch Finnhub Company Profile
  useEffect(() => {
    let isMounted = true;
    if (stock.assetType !== 'ETF') {
      fetchFinnhubCompanyProfile(stock.symbol).then((prof) => {
        if (isMounted && prof) setProfile(prof);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [stock.symbol, stock.assetType]);

  // Format volume helper
  const formatVolume = (vol: number) => {
    if (!vol) return '—';
    if (vol >= 1_000_000_000) return `${(vol / 1_000_000_000).toFixed(2)}B`;
    if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(2)}M`;
    if (vol >= 1_000) return `${(vol / 1_000).toFixed(1)}K`;
    return vol.toLocaleString();
  };

  const [candleError, setCandleError] = useState<string | null>(null);

  // Fetch real market candles from backend Yahoo Finance proxy
  const loadCandleData = useCallback(async () => {
    setIsLoadingCandles(true);
    setCandleError(null);

    try {
      // 1. Try server-side Yahoo Finance Proxy (100% real historical & 5m data)
      const proxyData = await fetchProxyCandles(stock.symbol, selectedTimeframe);

      if (proxyData && proxyData.points && proxyData.points.length > 2) {
        if (stock.price > 0) {
          proxyData.points[proxyData.points.length - 1].price = stock.price;
          proxyData.currentPrice = stock.price;
          proxyData.change = Number((stock.price - proxyData.startPrice).toFixed(2));
          proxyData.changePercent = Number((((stock.price - proxyData.startPrice) / (proxyData.startPrice || 1)) * 100).toFixed(2));
        }
        setLiveCandleSummary(proxyData);
        setCandleError(null);
        return;
      }

      // 2. Secondary fallback: Finnhub Candle API
      const candles = await fetchFinnhubTimeframeCandles(stock.symbol, selectedTimeframe);

      if (candles && candles.s === 'ok' && Array.isArray(candles.c) && candles.c.length > 5) {
        const points: ChartPoint[] = candles.c.map((price, i) => {
          const unixTime = candles.t && candles.t[i] ? candles.t[i] * 1000 : Date.now();
          const dateObj = new Date(unixTime);
          
          let label = '';
          if (selectedTimeframe === '1D') {
            label = dateObj.toLocaleTimeString('en-US', {
              timeZone: 'America/New_York',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            });
          } else if (selectedTimeframe === '1W') {
            const day = dateObj.toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'short' });
            const timeStr = dateObj.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit', hour12: true });
            label = `${day} ${timeStr}`;
          } else if (selectedTimeframe === '1M') {
            label = dateObj.toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric' });
          } else if (selectedTimeframe === 'YTD' || selectedTimeframe === '1Y') {
            label = dateObj.toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', year: '2-digit' });
          } else {
            label = dateObj.toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'short', year: 'numeric' });
          }

          return {
            date: label,
            label,
            price: Number(price.toFixed(2)),
            timeUnix: unixTime,
          };
        });

        if (points.length > 0 && stock.price > 0) {
          points[points.length - 1].price = stock.price;
        }

        const startPrice = points[0].price;
        const currentPrice = stock.price;
        const prices = points.map((p) => p.price);
        const high = Math.max(...prices, stock.dayHigh);
        const low = Math.min(...prices, stock.dayLow);
        const change = Number((currentPrice - startPrice).toFixed(2));
        const changePercent = Number((((currentPrice - startPrice) / (startPrice || 1)) * 100).toFixed(2));

        setLiveCandleSummary({
          points,
          startPrice,
          currentPrice,
          change,
          changePercent,
          high,
          low,
        });
        setCandleError(null);
      } else {
        setLiveCandleSummary(null);
        setCandleError(`Historical chart feed unavailable for ${stock.symbol} (${selectedTimeframe}). Showing confirmed quote metrics.`);
      }
    } catch (err: any) {
      console.warn(`Could not load candles for ${stock.symbol}:`, err);
      setLiveCandleSummary(null);
      setCandleError(`Connection interrupted. Showing last confirmed market quote.`);
    } finally {
      setIsLoadingCandles(false);
    }
  }, [stock.symbol, stock.price, stock.dayHigh, stock.dayLow, selectedTimeframe]);

  useEffect(() => {
    loadCandleData();
  }, [loadCandleData]);

  // Use real candles or fall back to confirmed quote baseline (NO theoretical synthetic waves)
  const timeframeData = useMemo(() => {
    if (liveCandleSummary && liveCandleSummary.points.length > 5) {
      return liveCandleSummary;
    }
    return buildConfirmedStockTimeframeData(stock, selectedTimeframe);
  }, [stock, selectedTimeframe, liveCandleSummary]);

  const { points, startPrice, currentPrice } = timeframeData;

  // Selected or hovered point
  const activePoint = hoverIndex !== null && points[hoverIndex] ? points[hoverIndex] : points[points.length - 1];
  const activePrice = activePoint ? activePoint.price : currentPrice;
  const activeChange = activePrice - startPrice;
  const activeChangePercent = startPrice > 0 ? (activeChange / startPrice) * 100 : 0;
  const isPeriodPositive = activeChange >= 0;

  // Compute Even Y-Axis Ticks
  const yAxisConfig = useMemo(() => {
    const prices = points.map((p) => p.price);
    return computeEvenYAxis(prices);
  }, [points]);

  const { ticks, paddedMin, paddedMax, formatTick } = yAxisConfig;
  const totalRange = paddedMax - paddedMin || 1;

  // SVG dimensions
  const chartHeight = 220;
  const chartWidth = 720;
  const paddingLeft = 56; // Clean left margin for Y-axis dollar numbers
  const paddingRight = 16;
  const paddingTop = 18;
  const paddingBottom = 26; // Space for X-axis time intervals

  const effectiveHeight = chartHeight - paddingTop - paddingBottom;
  const effectiveWidth = chartWidth - paddingLeft - paddingRight;

  // Calculate coordinates aligned with even Y-axis bounds
  const coords = useMemo(() => {
    return points.map((p, i) => {
      const x = paddingLeft + (i / Math.max(1, points.length - 1)) * effectiveWidth;
      const y = paddingTop + effectiveHeight - ((p.price - paddedMin) / totalRange) * effectiveHeight;
      return { x, y, point: p, index: i };
    });
  }, [points, paddedMin, totalRange, effectiveHeight, effectiveWidth, paddingLeft, paddingTop]);

  const pathD = useMemo(() => {
    if (coords.length === 0) return '';
    return `M ${coords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' L ')}`;
  }, [coords]);

  const areaD = useMemo(() => {
    if (coords.length === 0) return '';
    const first = coords[0];
    const last = coords[coords.length - 1];
    const bottomY = chartHeight - paddingBottom;
    return `${pathD} L ${last.x.toFixed(1)},${bottomY.toFixed(1)} L ${first.x.toFixed(1)},${bottomY.toFixed(1)} Z`;
  }, [coords, pathD, chartHeight, paddingBottom]);

  const strokeColor = isPeriodPositive ? '#10B981' : '#EF4444';

  // Compute clean, even X-axis ticks
  const xTicks = useMemo(() => {
    if (coords.length === 0) return [];
    const ticksDef = getEvenXAxisTicks(selectedTimeframe, coords.length);
    return ticksDef.map(td => ({
      label: td.label,
      coord: coords[td.index] || coords[0]
    }));
  }, [coords, selectedTimeframe]);

  // Handle mouse/touch movement over the SVG chart
  const updateHoverFromClientX = (clientX: number) => {
    if (!svgRef.current || coords.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const relativeX = (clientX - rect.left) / rect.width;
    const scaledX = Math.max(0, Math.min(1, relativeX)) * chartWidth;

    let closestIdx = 0;
    let minDistance = Infinity;

    coords.forEach((coord, idx) => {
      const dist = Math.abs(coord.x - scaledX);
      if (dist < minDistance) {
        minDistance = dist;
        closestIdx = idx;
      }
    });

    setHoverIndex(closestIdx);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    updateHoverFromClientX(e.clientX);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches && e.touches[0]) {
      updateHoverFromClientX(e.touches[0].clientX);
    }
  };

  const handleTouchEnd = () => {
    setHoverIndex(null);
  };

  const activeCoord = hoverIndex !== null && coords[hoverIndex] ? coords[hoverIndex] : coords[coords.length - 1];

  // Wall Street 1Y Price Target for the first metric card
  const targetData = stock.targetPrice1Y;
  const targetMean = targetData?.targetMean || (stock.price * 1.12);
  const targetUpside = ((targetMean - stock.price) / stock.price) * 100;
  const isTargetPositive = targetUpside >= 0;

  // 52W Range calculations
  const fiftyTwoLow = stock.fiftyTwoWeekLow || (stock.dayLow * 0.82);
  const fiftyTwoHigh = stock.fiftyTwoWeekHigh || (stock.dayHigh * 1.18);

  // Format elegant timeframe label next to calendar icon
  const timeframeLabel = useMemo(() => {
    switch (selectedTimeframe) {
      case '1D': return 'Today';
      case '1W': return '1W';
      case '1M': return '1M';
      case 'YTD': return 'YTD';
      case '1Y': return '1Y';
      case '5Y': return '5Y';
      case 'MAX': return 'MAX';
      default: return selectedTimeframe;
    }
  }, [selectedTimeframe]);

  return (
    <div 
      id={`drilldown-card-${stock.symbol.toLowerCase()}`}
      className="p-3 sm:p-5 bg-[#0B0F17] rounded-xl sm:rounded-2xl border border-slate-800 shadow-2xl space-y-3 sm:space-y-4 max-w-full overflow-hidden"
    >
      {/* Top Identity Header & Live Price / Period Return */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 pb-2.5 sm:pb-3.5 border-b border-slate-800/80">
        
        {/* Left: Ticker & Asset details */}
        <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0 flex-1">
          <TickerLogo 
            symbol={stock.symbol} 
            assetType={stock.assetType} 
            logoUrl={stock.logoUrl} 
            size="md" 
          />
          <div className="min-w-0 flex-1 flex flex-col justify-center">
            {/* Top row: Symbol, Watching Tag (if tracked), and Star Button in a fixed, consistent layout */}
            <div className="flex items-center space-x-1.5 sm:space-x-2 flex-wrap gap-y-1">
              <h2 className="text-base sm:text-lg font-bold text-white font-mono tracking-tight">
                {stock.symbol}
              </h2>
              {/* Watching Tag */}
              {isWatching && (
                <span 
                  id={`watching-tag-${stock.symbol.toLowerCase()}`}
                  className="px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-mono font-bold tracking-wider bg-purple-950/90 text-purple-400 border border-purple-800"
                >
                  Watching
                </span>
              )}
              {/* Star Button in consistent position next to symbol/badges for all tickers */}
              <button
                id={`watchlist-star-btn-${stock.symbol.toLowerCase()}`}
                type="button"
                onClick={handleWatchToggle}
                aria-label={isWatching ? `Remove ${stock.symbol} from Watchlist` : `Add ${stock.symbol} to Watchlist`}
                title={isWatching ? `Watching ${stock.symbol} - Click to remove from watchlist` : `Add ${stock.symbol} to Watchlist`}
                className={`p-1.5 rounded-lg border transition-all duration-150 inline-flex items-center justify-center shrink-0 active:scale-90 cursor-pointer ${
                  isWatching
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 hover:bg-amber-500/30 shadow-sm shadow-amber-950/40'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-amber-400 hover:border-slate-700'
                }`}
              >
                <Star
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-150 ${
                    isWatching ? 'fill-amber-400 text-amber-400' : 'text-slate-400'
                  }`}
                />
              </button>
            </div>

            {/* Bottom row: Full Company/ETF Name with clean multi-line wrapping */}
            <p className="text-xs sm:text-sm text-slate-400 font-medium leading-normal mt-0.5 break-words">
              {stock.name}
            </p>
          </div>
        </div>

        {/* Right: Selected Period Value & Return */}
        <div className="flex flex-col items-start sm:items-end w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-800/60 space-y-1">
          <div className="flex items-center space-x-2 sm:space-x-2.5 flex-wrap">
            <span className="text-xl sm:text-2xl font-black font-mono text-white tracking-tight">
              ${activePrice.toFixed(2)}
            </span>
            <span className={`inline-flex items-center font-mono text-[11px] sm:text-xs font-bold px-2 py-0.5 rounded-lg border ${
              isPeriodPositive
                ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/50'
                : 'bg-rose-950/70 text-rose-300 border-rose-800/50'
            }`}>
              {isPeriodPositive ? (
                <TrendingUp className="w-3.5 h-3.5 mr-1 shrink-0" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 mr-1 shrink-0" />
              )}
              {isPeriodPositive ? '+' : ''}{activeChangePercent.toFixed(2)}%
              <span className="ml-1 text-[10px] sm:text-[11px] font-normal opacity-90">
                ({isPeriodPositive ? '+' : '-'}${Math.abs(activeChange).toFixed(2)})
              </span>
            </span>
          </div>
          {/* Date and time icons under the price - hidden on mobile for minimalist view */}
          <div className="hidden sm:flex text-[11px] sm:text-xs font-mono text-slate-300 font-medium items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-white font-semibold">{timeframeLabel}</span>
            {activePoint && (
              <>
                <span className="text-slate-500">•</span>
                <span className="text-slate-300">{activePoint.label}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Focus: Big Multi-Timeframe Interactive Trendline with Even Left Y-Axis & Even Bottom X-Axis */}
      <div className="p-2 sm:p-4 rounded-lg sm:rounded-xl bg-[#0e131e]/90 border border-slate-800 space-y-2 sm:space-y-3">
        
        {/* Trendline Controls & Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-slate-800/70">
          <div className="flex items-center space-x-1.5 sm:space-x-2 flex-wrap">
            <span className="text-xs sm:text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
              Performance
            </span>
            <span className="text-[10px] sm:text-xs font-mono text-slate-400 font-medium">
              ({selectedTimeframe})
            </span>
            {isLoadingCandles ? (
              <span className="inline-flex items-center text-[10px] sm:text-xs text-blue-400 font-mono ml-1 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/40 font-medium">
                <Loader2 className="w-2.5 h-2.5 animate-spin mr-1" />
                Syncing Real Data...
              </span>
            ) : candleError ? (
              <button
                onClick={loadCandleData}
                title="Click to retry loading live market candles"
                className="inline-flex items-center text-[10px] sm:text-xs text-amber-400 hover:text-amber-300 font-mono ml-1 bg-amber-950/60 hover:bg-amber-900/60 px-2 py-0.5 rounded border border-amber-800/50 transition-colors font-medium"
              >
                <AlertTriangle className="w-2.5 h-2.5 mr-1 text-amber-400" />
                <span>Chart Offline (Showing Quote)</span>
                <RotateCw className="w-2.5 h-2.5 ml-1" />
              </button>
            ) : (
              <span className="inline-flex items-center text-[10px] sm:text-xs text-emerald-400 font-mono ml-1 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/40 font-medium">
                <CheckCircle2 className="w-2.5 h-2.5 mr-1 text-emerald-400" />
                Live Data
              </span>
            )}
          </div>

          {/* Timeframe Selector: 1D, 1W, 1M, YTD, 1Y, 5Y, MAX */}
          <div className="flex items-center space-x-0.5 sm:space-x-1 p-0.5 bg-[#080B10] rounded-lg border border-slate-800/90 overflow-x-auto scrollbar-none w-full sm:w-auto justify-between sm:justify-start">
            {TIMEFRAMES.map((tf) => {
              const isSelected = selectedTimeframe === tf;
              return (
                <button
                  key={tf}
                  id={`btn-timeframe-${stock.symbol.toLowerCase()}-${tf.toLowerCase()}`}
                  onClick={() => {
                    setSelectedTimeframe(tf);
                    setHoverIndex(null);
                  }}
                  className={`px-2 sm:px-3 py-1 text-[11px] sm:text-xs font-mono font-bold rounded transition-all duration-150 whitespace-nowrap text-center flex-1 sm:flex-initial ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  {tf}
                </button>
              );
            })}
          </div>
        </div>

        {/* Big Trendline SVG Canvas with Even Left Y-Axis & Even Bottom X-Axis */}
        <div className="relative w-full h-[160px] sm:h-[230px] select-none touch-pan-x">
          <svg
            ref={svgRef}
            className="w-full h-full cursor-crosshair overflow-visible"
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            preserveAspectRatio="none"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <defs>
              <linearGradient id={`trend-grad-${stock.symbol}-${selectedTimeframe}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={strokeColor} stopOpacity="0.22" />
                <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Even Y-Axis Dollar Increments: Grid Lines & Left Dollar Numbers (numbers hidden on mobile) */}
            {ticks.map((tickVal) => {
              const yPos = paddingTop + effectiveHeight - ((tickVal - paddedMin) / totalRange) * effectiveHeight;
              return (
                <g key={`y-tick-${tickVal}`}>
                  {/* Dashed Horizontal Gridline */}
                  <line 
                    x1={paddingLeft} 
                    y1={yPos} 
                    x2={chartWidth - paddingRight} 
                    y2={yPos} 
                    stroke="#1e293b" 
                    strokeDasharray="3 3" 
                    strokeWidth="1"
                  />
                  {/* Left-Aligned Y-Axis Dollar Number (Hidden on mobile for clean clutter-free view) */}
                  <text
                    x={paddingLeft - 8}
                    y={yPos + 3.5}
                    fill="#94a3b8"
                    fontSize="10"
                    fontFamily="ui-monospace, monospace"
                    fontWeight="500"
                    textAnchor="end"
                    className="hidden sm:inline"
                  >
                    {formatTick(tickVal)}
                  </text>
                </g>
              );
            })}

            {/* X-Axis Baseline */}
            <line
              x1={paddingLeft}
              y1={chartHeight - paddingBottom}
              x2={chartWidth - paddingRight}
              y2={chartHeight - paddingBottom}
              stroke="#334155"
              strokeWidth="1"
            />

            {/* Even X-Axis Days/Times Interval Labels (ticks and text hidden on mobile) */}
            {xTicks.map((xtick, i) => {
              let anchor: 'start' | 'middle' | 'end' = 'middle';
              if (i === 0) anchor = 'start';
              if (i === xTicks.length - 1) anchor = 'end';

              return (
                <g key={`x-tick-${i}-${xtick.label}`}>
                  {/* Small Tick Mark */}
                  <line
                    x1={xtick.coord.x}
                    y1={chartHeight - paddingBottom}
                    x2={xtick.coord.x}
                    y2={chartHeight - paddingBottom + 4}
                    stroke="#475569"
                    strokeWidth="1"
                    className="hidden sm:inline"
                  />
                  {/* Interval Text Label (Hidden on mobile for clean clutter-free view) */}
                  <text
                    x={xtick.coord.x}
                    y={chartHeight - paddingBottom + 16}
                    fill="#94a3b8"
                    fontSize="9.5"
                    fontFamily="ui-monospace, monospace"
                    fontWeight="500"
                    textAnchor={anchor}
                    className="hidden sm:inline"
                  >
                    {xtick.label}
                  </text>
                </g>
              );
            })}

            {/* Area Fill */}
            <path 
              d={areaD} 
              fill={`url(#trend-grad-${stock.symbol}-${selectedTimeframe})`} 
            />

            {/* High-Resolution 5-Minute Trendline Path */}
            <path 
              d={pathD} 
              fill="none" 
              stroke={strokeColor} 
              strokeWidth="2.25" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />

            {/* Crosshair & Active Hover Point (SoFi-inspired) */}
            {activeCoord && (
              <>
                {/* Vertical Crosshair Line */}
                <line
                  x1={activeCoord.x}
                  y1={paddingTop}
                  x2={activeCoord.x}
                  y2={chartHeight - paddingBottom}
                  stroke="#64748b"
                  strokeWidth="1.25"
                  strokeDasharray="3 3"
                />

                {/* Floating Timestamp directly at top of vertical crosshair */}
                <text
                  x={activeCoord.x}
                  y={Math.max(12, paddingTop - 4)}
                  fill="#94a3b8"
                  fontSize="9.5"
                  fontFamily="ui-monospace, monospace"
                  fontWeight="600"
                  textAnchor={
                    activeCoord.x < paddingLeft + 40 ? 'start' : activeCoord.x > chartWidth - 50 ? 'end' : 'middle'
                  }
                  className="hidden sm:inline"
                >
                  {activePoint.label}
                </text>

                {/* Horizontal Crosshair Line */}
                <line
                  x1={paddingLeft}
                  y1={activeCoord.y}
                  x2={chartWidth - paddingRight}
                  y2={activeCoord.y}
                  stroke="#475569"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />

                {/* Point Circle */}
                <circle
                  cx={activeCoord.x}
                  cy={activeCoord.y}
                  r="4"
                  fill="#0B0F17"
                  stroke={strokeColor}
                  strokeWidth="2.5"
                />
              </>
            )}
          </svg>

          {/* Floating Hover Label */}
          {hoverIndex !== null && activePoint && activeCoord && (
            <div 
              className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-full mb-2.5 bg-[#0c1017] border border-slate-700 px-2.5 py-1.5 rounded-lg shadow-xl text-center z-20"
              style={{
                left: `${(activeCoord.x / chartWidth) * 100}%`,
                top: `${(activeCoord.y / chartHeight) * 100}%`
              }}
            >
              <div className="text-xs sm:text-xs font-mono font-bold text-white">
                ${activePoint.price.toFixed(2)}
              </div>
              <div className="text-[10px] sm:text-[10px] font-mono text-slate-300 font-medium">
                {activePoint.label}
              </div>
            </div>
          )}
        </div>

        {/* Chart Window Bottom Bar with Google Finance Link */}
        <div className="flex items-center justify-end pt-1 sm:pt-1.5 border-t border-slate-800/60">
          <a
            href={getGoogleFinanceQuoteUrl(stock, profile)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono text-slate-400 hover:text-blue-400 inline-flex items-center gap-1.5 transition-colors font-medium hover:underline underline-offset-2 py-0.5 px-1.5 rounded hover:bg-slate-800/40"
          >
            <span>Google Finance</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
        </div>
      </div>

      {/* Core Statistics Grid: 1Y Target, P/E Ratio, 52W Range, Day's Range, Dividend Yield, Volume (Mobile-friendly, no subtext clutter) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5 pt-1.5">
        {/* 1. Wall Street 1Y Price Target */}
        <div 
          id={`card-wallst-target-${stock.symbol.toLowerCase()}`}
          className="p-2.5 sm:p-3 rounded-xl bg-[#131926]/90 border border-slate-800/90 flex flex-col justify-between"
        >
          <span className="text-[11px] sm:text-xs font-mono text-blue-400 font-bold uppercase tracking-wider">
            1Y Target
          </span>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-sm sm:text-base font-mono font-black text-white">
              ${targetMean.toFixed(2)}
            </span>
            <span className={`text-xs font-mono font-bold ${
              isTargetPositive ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {isTargetPositive ? '+' : ''}{targetUpside.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* 2. P/E Ratio */}
        <div 
          id={`card-pe-ratio-${stock.symbol.toLowerCase()}`}
          className="p-2.5 sm:p-3 rounded-xl bg-[#131926]/90 border border-slate-800/90 flex flex-col justify-between"
        >
          <span className="text-[11px] sm:text-xs font-mono text-slate-300 font-bold uppercase tracking-wider">
            P/E Ratio
          </span>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-sm sm:text-base font-mono font-black text-white">
              {typeof stock.peRatio === 'number' && stock.peRatio > 0 ? `${stock.peRatio.toFixed(1)}x` : 'N/A'}
            </span>
            <span className="text-[10px] sm:text-xs font-mono font-medium text-slate-400">
              {typeof stock.peRatio === 'number' && stock.peRatio > 0
                ? 'TTM'
                : stock.assetType === 'ETF'
                ? 'ETF'
                : 'Unprofitable'}
            </span>
          </div>
        </div>

        {/* 3. 52W Range */}
        <div 
          id={`card-52w-range-${stock.symbol.toLowerCase()}`}
          className="p-2.5 sm:p-3 rounded-xl bg-[#131926]/90 border border-slate-800/90 flex flex-col justify-between"
        >
          <span className="text-[11px] sm:text-xs font-mono text-slate-300 font-bold uppercase tracking-wider">
            52W Range
          </span>
          <div className="mt-1.5 flex items-center justify-between text-xs sm:text-sm font-mono font-bold text-slate-100">
            <span>${fiftyTwoLow.toFixed(2)}</span>
            <span className="text-slate-500 font-normal px-1">-</span>
            <span>${fiftyTwoHigh.toFixed(2)}</span>
          </div>
        </div>

        {/* 4. Day's Range */}
        <div 
          id={`card-day-range-${stock.symbol.toLowerCase()}`}
          className="p-2.5 sm:p-3 rounded-xl bg-[#131926]/90 border border-slate-800/90 flex flex-col justify-between"
        >
          <span className="text-[11px] sm:text-xs font-mono text-slate-300 font-bold uppercase tracking-wider">
            Day's Range
          </span>
          <div className="mt-1.5 flex items-center justify-between text-xs sm:text-sm font-mono font-bold text-slate-100">
            <span>${stock.dayLow.toFixed(2)}</span>
            <span className="text-slate-500 font-normal px-1">-</span>
            <span>${stock.dayHigh.toFixed(2)}</span>
          </div>
        </div>

        {/* 5. Dividend Yield */}
        <div 
          id={`card-dividend-yield-${stock.symbol.toLowerCase()}`}
          className="p-2.5 sm:p-3 rounded-xl bg-[#131926]/90 border border-slate-800/90 flex flex-col justify-between"
        >
          <span className="text-[11px] sm:text-xs font-mono text-slate-300 font-bold uppercase tracking-wider">
            Dividend Yield
          </span>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-sm sm:text-base font-mono font-black text-emerald-400">
              {stock.dividendYield !== undefined && stock.dividendYield > 0
                ? `${stock.dividendYield.toFixed(2)}%`
                : '0.00%'}
            </span>
            <span className="text-[10px] sm:text-xs font-mono font-medium text-slate-400">
              Annual
            </span>
          </div>
        </div>

        {/* 6. Today's Volume */}
        <div 
          id={`card-today-volume-${stock.symbol.toLowerCase()}`}
          className="p-2.5 sm:p-3 rounded-xl bg-[#131926]/90 border border-slate-800/90 flex flex-col justify-between"
        >
          <span className="text-[11px] sm:text-xs font-mono text-slate-300 font-bold uppercase tracking-wider">
            Today's Volume
          </span>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-sm sm:text-base font-mono font-black text-slate-100">
              {formatVolume(stock.volume)}
            </span>
            <span className="text-[10px] sm:text-xs font-mono font-medium text-slate-400">
              Shares
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
