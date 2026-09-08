import { finite, fixed, priceLabel, fullPriceLabel, rangePriceLabel } from '../utils/marketValues';
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { hasRecentSessionSample } from '../utils/chartSession';
import {
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Loader2,
  AlertTriangle,
  RotateCw,
  CheckCircle2,
  Star
} from 'lucide-react';
import { BoardStock, BoardTimeframe } from '../types';
import {
  EMPTY_TIMEFRAME,
  ChartPoint,
  TimeframeSummary,

} from '../utils/timeframeData';
import { fetchPriceActivity, PriceActivity, fetchProxyCandles, getCachedProxyCandles } from '../services/yahooMarket';
import { TickerLogo } from './TickerLogo';
import { useAuth } from '../context/AuthContext';
import { useMarket } from '../context/MarketContext';
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
} {
  if (!prices || prices.length === 0) {
    return {
      ticks: [],
      paddedMin: 0,
      paddedMax: 100,
      step: 25,
    };
  }

  const rawMin = Math.min(...prices);
  const rawMax = Math.max(...prices);
  const rawSpan = Math.max(Math.abs(rawMax) * 0.001, 0.00000001, rawMax - rawMin);

  // Add 16% vertical padding to provide a zoomed-out, breathing view like SoFi
  const paddedMinCandidate = rawMin - rawSpan * 0.16;
  const paddedMaxCandidate = rawMax + rawSpan * 0.16;
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
    const rounded = Number(val.toPrecision(12));
    ticks.push(rounded);
    if (rounded >= rawMax && ticks.length >= 4) {
      break;
    }
    if (ticks.length > 7) break;
  }

  // Ensure minimum 4 ticks
  while (ticks.length < 4) {
    const nextVal = Number((ticks[ticks.length - 1] + step).toPrecision(12));
    ticks.push(nextVal);
  }

  const paddedMin = ticks[0];
  const paddedMax = ticks[ticks.length - 1];

  return {
    ticks,
    paddedMin,
    paddedMax,
    step,
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
 * Returns clean, evenly spaced X-axis interval labels and their relative coordinates
 * dynamically derived from the real dataset points and their authentic Eastern Time timestamps.
 */
function getEvenXAxisTicks(
  timeframe: BoardTimeframe,
  points: ChartPoint[],
  sessionStartUnix?: number,
  sessionEndUnix?: number,
  paddingLeft = 56,
  effectiveWidth = 648
): { label: string; x: number }[] {
  if (!points || points.length === 0) return [];

  const tz = getEasternTimezoneAbbr();

  if (timeframe === '1D') {
    const firstTime = points[0]?.timeUnix || Date.now();
    const lastTime = points[points.length - 1]?.timeUnix || firstTime;

    let sStart = sessionStartUnix;
    let sEnd = sessionEndUnix;

    if (!sStart || !sEnd || sEnd <= sStart) { sStart = firstTime; sEnd = lastTime; }

    if (firstTime < sStart) sStart = firstTime;
    if (lastTime > sEnd) sEnd = lastTime;

    return [0, .25, .5, .75, 1].map(frac => ({
      label: new Date(sStart + frac * (sEnd - sStart)).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }),
      x: paddingLeft + frac * effectiveWidth,
    }));
  }

  const count = points.length;
  const tickCount = Math.min(5, count);
  const result: { label: string; x: number }[] = [];
  const chosenIndices: number[] = [];

  for (let i = 0; i < tickCount; i++) {
    const frac = i / (tickCount - 1 || 1);
    const idx = Math.min(count - 1, Math.round(frac * (count - 1)));
    if (!chosenIndices.includes(idx)) {
      chosenIndices.push(idx);
    }
  }

  chosenIndices.forEach((idx, i) => {
    const pt = points[idx];
    let label = pt.label || pt.date;

    if (pt.timeUnix) {
      const d = new Date(pt.timeUnix);
      if (timeframe === '1W') {
        const day = d.toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'short' });
        const timeStr = d.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: true });
        label = `${day} ${timeStr}`;
      } else if (timeframe === '1M') {
        label = d.toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric' });
      } else if (timeframe === 'YTD' || timeframe === '1Y') {
        label = d.toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'short', year: '2-digit' });
      } else if (timeframe === '5Y' || timeframe === 'MAX') {
        label = d.toLocaleDateString('en-US', { timeZone: 'America/New_York', year: 'numeric' });
      }
    }

    const frac = idx / (count - 1 || 1);
    result.push({
      label,
      x: paddingLeft + frac * effectiveWidth,
    });
  });

  return result;
}

export const BoardStockDetailCard: React.FC<BoardStockDetailCardProps> = ({ stock, onClose }) => {
  const financeUrl = getGoogleFinanceQuoteUrl(stock);
  const financeSearch = financeUrl.startsWith('https://www.google.com/search?');
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const [chartNow, setChartNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setChartNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);
  const { user, isAdmin, isSymbolInWatchlist, toggleWatchlistSymbol, openAuthModal } = useAuth();
  const { addWatchlistStock, removeWatchlistStock, curatedSymbols, changeCuration } = useMarket();
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const isWatching = isSymbolInWatchlist(stock.symbol);

  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 640;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [selectedTimeframe, setSelectedTimeframe] = useState<BoardTimeframe>('1D');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [liveCandleSummary, setLiveCandleSummary] = useState<TimeframeSummary | null>(() => {
    return getCachedProxyCandles(stock.symbol, '1D');
  });
  const [isLoadingCandles, setIsLoadingCandles] = useState<boolean>(() => {
    return !getCachedProxyCandles(stock.symbol, '1D');
  });
  const svgRef = useRef<SVGSVGElement | null>(null);

  const handleWatchToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      openAuthModal('login', 'You must be logged in to add items to your watchlist.');
      return;
    }
    setActionError(null); setActionPending(true);
    try {
    const added = await toggleWatchlistSymbol(stock.symbol);
    if (added) {
      addWatchlistStock(stock);
    } else {
      removeWatchlistStock(stock.symbol);
      if (onClose) {
        onClose();
      }
    }
    } catch (err) { setActionError(err instanceof Error ? err.message : 'The change was not confirmed.'); }
    finally { setActionPending(false); }
  };

  // Format volume helper
  const formatVolume = (vol: number) => {
    if (!finite(vol)) return '—';
    if (vol >= 1_000_000_000) return `${(vol / 1_000_000_000).toFixed(2)}B`;
    if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(2)}M`;
    if (vol >= 1_000) return `${(vol / 1_000).toFixed(1)}K`;
    return vol.toLocaleString();
  };

  const [activity, setActivity] = useState<PriceActivity | null>(null);
  const [activityLoading, setActivityLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setActivity(null); setActivityLoading(true);
    const update = async () => {
      const result = await fetchPriceActivity(stock.symbol);
      if (active) { setActivity(result); setActivityLoading(false); }
    };
    void update();
    const timer = setInterval(() => void update(), 300000);
    return () => { active = false; clearInterval(timer); };
  }, [stock.symbol]);
  const percentage = (value: number | null | undefined) => finite(value) ? (value > 0 ? '+' : '') + fixed(value) + '%' : '—';
  const historyTitle = (period: 'month' | 'year') => activityLoading ? 'Loading price history' : !activity ? 'Price history unavailable' :
    (activity.stale ? 'Stale history: refresh failed. ' : '') + 'Provider daily-close price change; not total return. ' +
    (activity[period].baselineDate ? 'From ' + activity[period].baselineDate.slice(0, 10) + ' through ' + activity.asOf.slice(0, 10) : 'Insufficient history for this period');

  const [candleError, setCandleError] = useState<string | null>(null);

  const candleGeneration = useRef(0);
  const candleSummaryRef = useRef(liveCandleSummary);
  candleSummaryRef.current = liveCandleSummary;
  const loadCandleData = useCallback(async () => {
    const generation = ++candleGeneration.current;
    setIsLoadingCandles(!candleSummaryRef.current);
    const data = await fetchProxyCandles(stock.symbol, selectedTimeframe);
    if (generation !== candleGeneration.current) return;
    setChartNow(Date.now());
    setLiveCandleSummary(data);
    setCandleError(!data ? 'Historical data unavailable for this period.' : data.stale ? 'Chart update failed. Showing stale historical data.' : null);
    setIsLoadingCandles(false);
  }, [stock.symbol, selectedTimeframe]);
  useEffect(() => {
    setLiveCandleSummary(null);
    setHoverIndex(null);
    void loadCandleData();
    const timer = setInterval(() => void loadCandleData(), 30000);
    return () => { ++candleGeneration.current; clearInterval(timer); };
  }, [loadCandleData]);
  const timeframeData = liveCandleSummary ?? EMPTY_TIMEFRAME;

  const { points, startPrice, currentPrice } = timeframeData;

  // Selected or hovered point
  const isHovering = hoverIndex !== null && hoverIndex >= 0 && hoverIndex < points.length;
  const displayedPoint = isHovering ? points[hoverIndex] : (points[points.length - 1] || null);
  const activePrice = displayedPoint ? displayedPoint.price : currentPrice;
  const activeChange = finite(activePrice) && finite(startPrice) ? activePrice - startPrice : null;
  const activeChangePercent = finite(activeChange) && startPrice > 0 ? (activeChange / startPrice) * 100 : null;
  const isPeriodPositive = activeChange >= 0;

  // Compute Even Y-Axis Ticks with startPrice included for balanced baseline framing
  const yAxisConfig = useMemo(() => {
    const prices = points.map((p) => p.price);
    if (finite(startPrice)) {
      prices.push(startPrice);
    }
    return computeEvenYAxis(prices);
  }, [points, startPrice]);

  const { ticks, paddedMin, paddedMax } = yAxisConfig;
  const totalRange = paddedMax - paddedMin || 1;

  // SVG dimensions with responsive edge-to-edge margins for mobile
  const chartHeight = 240;
  const chartWidth = 720;
  const paddingLeft = isMobile ? 8 : 20; // Edge-to-edge on mobile
  const paddingRight = isMobile ? 8 : 20;
  const paddingTop = 36;
  const paddingBottom = 36;

  const effectiveHeight = chartHeight - paddingTop - paddingBottom;
  const effectiveWidth = chartWidth - paddingLeft - paddingRight;

  // Single Dotted Horizontal Baseline Y calculation (Day's Open / Previous Close / Period Start)
  const baselinePrice = startPrice;
  const baselineY = finite(baselinePrice) && totalRange > 0
    ? paddingTop + effectiveHeight - ((baselinePrice - paddedMin) / totalRange) * effectiveHeight
    : null;

  // Period High, Open/Start, and Low metrics for SoFi-style interactive reference lines
  const periodHigh = timeframeData.high;
  const periodLow = timeframeData.low;

  const periodOpen = baselinePrice;

  const highY = finite(periodHigh) && totalRange > 0
    ? paddingTop + effectiveHeight - ((periodHigh - paddedMin) / totalRange) * effectiveHeight
    : null;

  const openY = baselineY;

  const lowY = finite(periodLow) && totalRange > 0
    ? paddingTop + effectiveHeight - ((periodLow - paddedMin) / totalRange) * effectiveHeight
    : null;

  const is1D = selectedTimeframe === '1D';
  // Only draw the Open line/label if it sits strictly between Day's Low and Day's High
  const isOpenBetweenBounds = is1D && periodOpen > periodLow && periodOpen < periodHigh;

  // Calculate coordinates aligned with even Y-axis bounds and authentic intraday time progression
  const coords = useMemo(() => {
    if (points.length === 0) return [];

    if (is1D) {
      // Intraday session boundaries (4:00 AM ET pre-market to 8:00 PM ET after-hours close)
      const firstTime = points[0]?.timeUnix || Date.now();
      const lastTime = points[points.length - 1]?.timeUnix || firstTime;

      let sStart = timeframeData.sessionStartUnix;
      let sEnd = timeframeData.sessionEndUnix;

      if (!sStart || !sEnd || sEnd <= sStart) { sStart = firstTime; sEnd = lastTime; }

      if (firstTime < sStart) sStart = firstTime;
      if (lastTime > sEnd) sEnd = lastTime;

      const span = sEnd - sStart || 1;

      return points.map((p, i) => {
        const ptTime = p.timeUnix || firstTime;
        const progress = Math.max(0, Math.min(1, (ptTime - sStart) / span));
        const x = paddingLeft + progress * effectiveWidth;
        const y = paddingTop + effectiveHeight - ((p.price - paddedMin) / totalRange) * effectiveHeight;
        return { x, y, point: p, index: i };
      });
    }

    return points.map((p, i) => {
      const x = paddingLeft + (i / Math.max(1, points.length - 1)) * effectiveWidth;
      const y = paddingTop + effectiveHeight - ((p.price - paddedMin) / totalRange) * effectiveHeight;
      return { x, y, point: p, index: i };
    });
  }, [points, is1D, timeframeData.sessionStartUnix, timeframeData.sessionEndUnix, paddedMin, totalRange, effectiveHeight, effectiveWidth, paddingLeft, paddingTop]);

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
    return getEvenXAxisTicks(
      selectedTimeframe,
      points,
      timeframeData.sessionStartUnix,
      timeframeData.sessionEndUnix,
      paddingLeft,
      effectiveWidth
    );
  }, [coords, points, selectedTimeframe, timeframeData.sessionStartUnix, timeframeData.sessionEndUnix, paddingLeft, effectiveWidth]);

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

  const isHoveringCoord = hoverIndex !== null && hoverIndex >= 0 && hoverIndex < coords.length;
  const activeCoord = isHoveringCoord ? coords[hoverIndex] : null;

  // Non-overlapping Y-Axis Hover Price Badges (Collision-avoidance relaxation algorithm)
  const resolvedYAxisBadges = useMemo(() => {
    if (!activeCoord) return [];

    const rawBadges: Array<{ id: string; y: number; price: number }> = [];

    if (highY !== null) {
      rawBadges.push({ id: 'high', y: highY, price: periodHigh });
    }

    if (selectedTimeframe === '1D' && !isMobile && openY !== null) {
      rawBadges.push({ id: 'open', y: openY, price: periodOpen });
    }

    if (lowY !== null) {
      rawBadges.push({ id: 'low', y: lowY, price: periodLow });
    }

    if (rawBadges.length === 0) return [];

    // Sort top-to-bottom (smaller y values are physically higher up on the screen)
    rawBadges.sort((a, b) => a.y - b.y);

    // Remove duplicates if price and position are effectively identical
    const uniqueBadges = rawBadges.filter((item, index, self) =>
      index === self.findIndex((t) => t.id === item.id || (Math.abs(t.price - item.price) < 0.005 && Math.abs(t.y - item.y) < 2))
    );

    const minGap = 26; // Minimum vertical pixel clearance between centerpoints
    const minY = 14;
    const maxY = chartHeight - 14;

    const adjusted = uniqueBadges.map((b) => ({ ...b }));

    // Forward pass: push downstream items downward if they violate minGap
    for (let i = 0; i < adjusted.length; i++) {
      if (i === 0) {
        if (adjusted[i].y < minY) adjusted[i].y = minY;
      } else {
        if (adjusted[i].y < adjusted[i - 1].y + minGap) {
          adjusted[i].y = adjusted[i - 1].y + minGap;
        }
      }
    }

    // Backward pass: if bottom-most exceeded maxY bounds, push upstream items upward
    if (adjusted[adjusted.length - 1].y > maxY) {
      adjusted[adjusted.length - 1].y = maxY;
      for (let i = adjusted.length - 2; i >= 0; i--) {
        if (adjusted[i].y > adjusted[i + 1].y - minGap) {
          adjusted[i].y = adjusted[i + 1].y - minGap;
        }
      }
    }

    return adjusted;
  }, [activeCoord, highY, openY, lowY, periodHigh, periodOpen, periodLow, selectedTimeframe, isMobile, chartHeight]);

  // Format floating timestamp badge with explicit EST/EDT clarity for intraday and weekly views
  const formatFloatingTimestamp = (point: ChartPoint, tf: BoardTimeframe): string => {
    if (!point) return '';
    if (point.timeUnix) {
      const dateObj = new Date(point.timeUnix);
      if (tf === '1D') {
        return dateObj.toLocaleTimeString('en-US', {
          timeZone: 'America/New_York',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          timeZoneName: 'short',
        });
      }
      if (tf === '1W') {
        const day = dateObj.toLocaleDateString('en-US', {
          timeZone: 'America/New_York',
          weekday: 'short',
          month: 'numeric',
          day: 'numeric',
        });
        const time = dateObj.toLocaleTimeString('en-US', {
          timeZone: 'America/New_York',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          timeZoneName: 'short',
        });
        return `${day} · ${time}`;
      }
      if (tf === '1M') {
        return dateObj.toLocaleDateString('en-US', {
          timeZone: 'America/New_York',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }
      if (tf === 'YTD' || tf === '1Y') {
        return dateObj.toLocaleDateString('en-US', {
          timeZone: 'America/New_York',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }
      return dateObj.toLocaleDateString('en-US', {
        timeZone: 'America/New_York',
        month: 'short',
        year: 'numeric',
      });
    }

    // Fallback if point only has label string
    if (tf === '1D') {
      if (/E[DS]T|ET/i.test(point.label)) return point.label;
      return `${point.label} EDT`;
    }
    if (tf === '1W' && !/E[DS]T|ET/i.test(point.label)) {
      return `${point.label} EDT`;
    }
    return point.label;
  };

  return (
    <div
      id={`drilldown-card-${stock.symbol.toLowerCase()}`}
      className="p-1.5 sm:p-3.5 bg-[#0B0F17] space-y-1.5 sm:space-y-2.5 max-w-full overflow-hidden"
    >
      {actionError && <p role="alert" className="text-sm text-rose-300">{actionError}</p>}
      {isAdmin && <button disabled={actionPending} className="rounded-lg border border-blue-700 px-3 py-2 text-xs text-blue-300 disabled:opacity-50"
        onClick={async () => {
          setActionError(null); setActionPending(true);
          try { await changeCuration(stock.symbol, !curatedSymbols.includes(stock.symbol)); }
          catch (err) { setActionError(err instanceof Error ? err.message : 'The change was not confirmed.'); }
          finally { setActionPending(false); }
        }}>{curatedSymbols.includes(stock.symbol) ? 'Remove from curated Board' : 'Add to curated Board'}</button>}
      {/* Top Header & Controls: Left (Identity + Live Price/Return), Right (Timeframe Tabs & Sync) */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2.5 sm:gap-4 pb-0.5">

        {/* Left: Ticker & Asset details + Price / Return */}
        <div className="flex flex-col space-y-1 min-w-0">
          {/* Top row: Logo + Ticker + Watch Tag + Star */}
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
            <TickerLogo
              symbol={stock.symbol}
              assetType={stock.assetType}
              logoUrl={stock.logoUrl}
              size="md"
            />
            <div className="min-w-0 flex-1 flex flex-col justify-center">
              <div className="flex items-center space-x-1.5 sm:space-x-2 flex-wrap gap-y-1">
                <h2 className="text-base sm:text-lg font-bold text-white font-mono tracking-tight">
                  {stock.symbol}
                </h2>
                {/* Required Product Type Tag */}
                <span className={`px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-semibold font-mono ${
                  stock.assetType === 'ETF' || stock.assetType === 'Index'
                    ? 'bg-blue-950/90 text-blue-400 border border-blue-800/50 uppercase'
                    : stock.assetType === 'Crypto'
                    ? 'bg-amber-950/90 text-amber-400 border border-amber-800/50 uppercase'
                    : stock.assetType === 'Commodity'
                    ? 'bg-yellow-950/90 text-yellow-400 border border-yellow-800/50 uppercase'
                    : stock.assetType === 'Bond Yield'
                    ? 'bg-emerald-950/90 text-emerald-400 border border-emerald-800/50 uppercase'
                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}>
                  {stock.symbol === 'AGG' ? 'Bonds' : stock.assetType}
                </span>

                {isWatching && (
                  <span
                    id={`watching-tag-${stock.symbol.toLowerCase()}`}
                    className="px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-mono font-bold tracking-wider bg-purple-950/90 text-purple-400 border border-purple-800/60"
                  >
                    Watching
                  </span>
                )}
                <button
                  id={`watchlist-star-btn-${stock.symbol.toLowerCase()}`}
                  type="button"
                  onClick={handleWatchToggle}
                  disabled={actionPending}
                  aria-label={isWatching ? `Remove ${stock.symbol} from Watchlist` : `Add ${stock.symbol} to Watchlist`}
                  title={isWatching ? `Watching ${stock.symbol} - Click to remove from watchlist` : `Add ${stock.symbol} to Watchlist`}
                  className={`p-1.5 rounded-lg transition-all duration-150 inline-flex items-center justify-center shrink-0 active:scale-90 cursor-pointer ${
                    isWatching
                      ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                      : 'bg-slate-900/80 text-slate-400 hover:text-amber-400 hover:bg-slate-800'
                  }`}
                >
                  <Star
                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-150 ${
                      isWatching ? 'fill-amber-400 text-amber-400' : 'text-slate-400'
                    }`}
                  />
                </button>
              </div>

              <p className="text-xs sm:text-sm text-slate-400 font-medium leading-normal mt-0.5 break-words">
                {stock.name}
              </p>
            </div>
          </div>

          {/* Selected Period Value & Return (Stacked directly under asset details on the left) */}
          <div className="flex items-center space-x-2 sm:space-x-2.5 flex-wrap pt-0.5">
            <span className="text-xl sm:text-2xl font-black font-mono text-white tracking-tight">
              <span title={fullPriceLabel(activePrice, stock.currency, stock.assetType)}>{priceLabel(activePrice, stock.currency, stock.assetType)}</span>
            </span>
            <span className={`inline-flex items-center font-mono text-[11px] sm:text-xs font-bold px-2 py-0.5 rounded-lg ${
              isPeriodPositive
                ? 'bg-emerald-950/70 text-emerald-300'
                : 'bg-rose-950/70 text-rose-300'
            }`}>
              {isPeriodPositive ? (
                <TrendingUp className="w-3.5 h-3.5 mr-1 shrink-0" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 mr-1 shrink-0" />
              )}
              {isPeriodPositive ? '+' : ''}{fixed(activeChangePercent, 2)}%
              <span className="ml-1 text-[10px] sm:text-[11px] font-normal opacity-90">
                (<span title={fullPriceLabel(activeChange, stock.currency, stock.assetType)}>{priceLabel(activeChange, stock.currency, stock.assetType)}</span>)
              </span>
            </span>
          </div>
        </div>

        {/* Right: Timeframe Selector & Sync Status (Aligned horizontally on desktop) */}
        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto shrink-0 pt-1 sm:pt-0">
          {/* Status Indicator */}
          {isLoadingCandles ? (
            <span className="inline-flex items-center text-[10px] sm:text-xs text-blue-400 font-mono bg-blue-950/60 px-2 py-0.5 rounded font-medium">
              <Loader2 className="w-2.5 h-2.5 animate-spin mr-1" />
              Syncing...
            </span>
          ) : candleError ? (
            <button
              onClick={loadCandleData}
              title="Click to retry loading live market candles"
              className="inline-flex items-center text-[10px] sm:text-xs text-amber-400 hover:text-amber-300 font-mono bg-amber-950/60 hover:bg-amber-900/60 px-2 py-0.5 rounded transition-colors font-medium cursor-pointer"
            >
              <AlertTriangle className="w-2.5 h-2.5 mr-1 text-amber-400" />
              <span>Retry</span>
              <RotateCw className="w-2.5 h-2.5 ml-1" />
            </button>
          ) : null}

          {/* Timeframe Selector: 1D, 1W, 1M, YTD, 1Y, 5Y, MAX */}
          <div className="flex items-center space-x-0.5 sm:space-x-1 p-1 bg-[#101520] rounded-xl overflow-x-auto scrollbar-none w-full sm:w-auto justify-between sm:justify-start">
            {TIMEFRAMES.map((tf) => {
              const isSelected = selectedTimeframe === tf;
              return (
                <button
                  key={tf}
                  id={`btn-timeframe-${stock.symbol.toLowerCase()}-${tf.toLowerCase()}`}
                  onClick={() => {
                    if (tf === selectedTimeframe) return;
                    ++candleGeneration.current;
                    setLiveCandleSummary(null);
                    setSelectedTimeframe(tf);
                    setHoverIndex(null);
                  }}
                  className={`px-2.5 sm:px-3 py-1 text-xs font-mono font-bold rounded-lg transition-all duration-150 whitespace-nowrap text-center flex-1 sm:flex-initial cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  {tf}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Focus: Big Multi-Timeframe Interactive Trendline */}
      <div className="space-y-1 relative">

        {candleError && <p className="text-xs text-slate-400" role="status">{candleError}</p>}
        {/* Dedicated Timestamp Track above graph (Ensures 0 overlap with High Y-axis price badge) */}
        <div className="h-5 sm:h-6 relative w-full flex items-center select-none">
          {!activeCoord && is1D && points.length > 0 && <span data-testid="market-chart-session" className="text-[10px] sm:text-xs text-slate-400">
            {new Date(points[0].timeUnix!).toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', year: 'numeric' })}
            {' · '}{new Date(points.at(-1)!.timeUnix!).toLocaleDateString('en-US', { timeZone: 'America/New_York' }) === new Date(chartNow).toLocaleDateString('en-US', { timeZone: 'America/New_York' }) ? 'Intraday samples' : 'Previous session'}
          </span>}
          {activeCoord && (
            <div
              className="absolute top-1/2 pointer-events-none transform -translate-x-1/2 -translate-y-1/2 z-30 px-3 py-0.5 rounded-full bg-slate-800 text-xs sm:text-sm font-mono font-bold text-slate-100 shadow-md whitespace-nowrap border border-slate-700/60"
              style={{
                left: `${Math.max(14, Math.min(86, (activeCoord.x / chartWidth) * 100))}%`
              }}
            >
              {formatFloatingTimestamp(activeCoord.point || displayedPoint!, selectedTimeframe)}
            </div>
          )}
        </div>

        {/* Big Trendline SVG Canvas with Expanded Vertical Room & Clean Open Backdrop */}
        <div className="relative w-full h-[240px] sm:h-[240px] select-none touch-pan-x">

          {/* Crisp HTML Y-Axis Hover Price Labels (Right-aligned, no boxes, slate-300, bold & legible) */}
          {activeCoord && (
            <div className="pointer-events-none absolute inset-0 z-20 overflow-visible">
              {/* High: Sits clearly ABOVE the high line */}
              {highY !== null && (
                <div
                  id={`price-badge-high-${stock.symbol.toLowerCase()}`}
                  className="absolute right-2 sm:right-4 transform -translate-y-full -mt-1 text-sm font-mono font-bold text-slate-300 select-none whitespace-nowrap leading-none"
                  style={{ top: `${(highY / chartHeight) * 100}%` }}
                >
                  <span title={fullPriceLabel(periodHigh, stock.currency, stock.assetType)}>{priceLabel(periodHigh, stock.currency, stock.assetType)}</span>
                </div>
              )}

              {/* Open (Desktop 1D only): Only rendered if Open is strictly between High and Low */}
              {isOpenBetweenBounds && !isMobile && openY !== null && (() => {
                const distToHigh = Math.abs(periodOpen - periodHigh);
                const distToLow = Math.abs(periodOpen - periodLow);
                const isCloserToHigh = distToHigh <= distToLow;

                return (
                  <div
                    id={`price-badge-open-${stock.symbol.toLowerCase()}`}
                    className={`absolute right-2 sm:right-4 font-mono font-bold text-slate-300 select-none whitespace-nowrap text-sm leading-none ${
                      isCloserToHigh
                        ? 'transform translate-y-0 mt-1.5'
                        : 'transform -translate-y-full -mt-1.5'
                    }`}
                    style={{ top: `${(openY / chartHeight) * 100}%` }}
                  >
                    <span title={fullPriceLabel(periodOpen, stock.currency, stock.assetType)}>{priceLabel(periodOpen, stock.currency, stock.assetType)}</span>
                  </div>
                );
              })()}

              {/* Low: Sits clearly BELOW the low line */}
              {lowY !== null && (
                <div
                  id={`price-badge-low-${stock.symbol.toLowerCase()}`}
                  className="absolute right-2 sm:right-4 transform translate-y-0 mt-1.5 text-sm font-mono font-bold text-slate-300 select-none whitespace-nowrap leading-none"
                  style={{ top: `${(lowY / chartHeight) * 100}%` }}
                >
                  <span title={fullPriceLabel(periodLow, stock.currency, stock.assetType)}>{priceLabel(periodLow, stock.currency, stock.assetType)}</span>
                </div>
              )}
            </div>
          )}

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
                <stop offset="0%" stopColor={strokeColor} stopOpacity="0.18" />
                <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* 1D Open Line (Only drawn if Open sits strictly between Low and High) */}
            {isOpenBetweenBounds && openY !== null && openY >= paddingTop - 10 && openY <= chartHeight - paddingBottom + 10 && (
              <g id={`open-reference-line-${stock.symbol.toLowerCase()}`}>
                <line
                  x1={paddingLeft}
                  y1={openY}
                  x2={chartWidth - paddingRight}
                  y2={openY}
                  stroke="#475569"
                  strokeDasharray="4 4"
                  strokeWidth="1.25"
                  strokeOpacity="0.75"
                />
              </g>
            )}

            {/* High & Low Reference Lines (Shown strictly on hover) */}
            {activeCoord && (
              <g id={`sofi-reference-lines-${stock.symbol.toLowerCase()}`} className="pointer-events-none">
                {/* Period High Line */}
                {highY !== null && highY >= paddingTop - 10 && highY <= chartHeight - paddingBottom + 10 && (
                  <line
                    x1={paddingLeft}
                    y1={highY}
                    x2={chartWidth - paddingRight}
                    y2={highY}
                    stroke="#64748b"
                    strokeDasharray="3 3"
                    strokeWidth="1.25"
                    strokeOpacity="0.85"
                  />
                )}

                {/* Period Low Line */}
                {lowY !== null && lowY >= paddingTop - 10 && lowY <= chartHeight - paddingBottom + 10 && (
                  <line
                    x1={paddingLeft}
                    y1={lowY}
                    x2={chartWidth - paddingRight}
                    y2={lowY}
                    stroke="#64748b"
                    strokeDasharray="3 3"
                    strokeWidth="1.25"
                    strokeOpacity="0.85"
                  />
                )}
              </g>
            )}

            {/* Area Fill */}
            <path
              d={areaD}
              fill={`url(#trend-grad-${stock.symbol}-${selectedTimeframe})`}
            />

            {/* High-Resolution Bold Trendline Path (Crisp, High-Resolution SoFi Style) */}
            <path
              d={pathD}
              data-testid="market-chart-line"
              fill="none"
              stroke={strokeColor}
              strokeWidth="3.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {coords.length > 0 && <g data-testid="market-chart-endpoint">
              <circle cx={coords.at(-1)!.x} cy={coords.at(-1)!.y} r="4" fill={strokeColor} />
              {hasRecentSessionSample(timeframeData, selectedTimeframe, chartNow) && !reducedMotion &&
                <circle data-testid="market-chart-pulse" cx={coords.at(-1)!.x} cy={coords.at(-1)!.y} r="4" fill={strokeColor} opacity="0">
                  <title>Recent sample during the provider’s trading session. Data may be delayed.</title>
                  <animate attributeName="r" values="4;14" dur="1.8s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.65;0" dur="1.8s" repeatCount="indefinite" />
                </circle>}
            </g>}
            {/* Active Hover Point Circle on Trendline */}
            {activeCoord && (
              <>
                {/* Vertical Crosshair Line */}
                <line
                  x1={activeCoord.x}
                  y1={paddingTop - 4}
                  x2={activeCoord.x}
                  y2={chartHeight - paddingBottom}
                  stroke="#64748b"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />

                {/* Point Circle on Line */}
                <circle
                  cx={activeCoord.x}
                  cy={activeCoord.y}
                  r="5"
                  fill="#0B0F17"
                  stroke={strokeColor}
                  strokeWidth="3"
                />
              </>
            )}
          </svg>
        </div>

        {/* Chart Window Bottom Bar with Google Finance Link */}
        <div className="flex items-center justify-end pt-1">
          <a
            href={financeUrl}
            title={financeSearch ? `Search Google Finance for ${stock.name} (${stock.symbol}); direct listing unavailable` : `${stock.name} (${stock.symbol}) on Google Finance`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono text-slate-400 hover:text-blue-400 inline-flex items-center gap-1.5 transition-colors font-medium hover:underline underline-offset-2 py-0.5 px-1.5 rounded hover:bg-slate-800/40"
          >
            <span>{financeSearch ? 'Google Finance search' : 'Google Finance'}</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
        </div>
      </div>

      {/* Six price/activity metrics; preserve the existing responsive grid and spacing. */}
      <div id={`price-activity-${stock.symbol.toLowerCase()}`} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5 pt-1">
        {[
          { id: 'previous-close', label: 'Previous Close', value: priceLabel(stock.prevClose, stock.currency, stock.assetType), title: 'Previous close: ' + fullPriceLabel(stock.prevClose, stock.currency, stock.assetType) },
          { id: 'day-range', label: 'Day Range', value: <><span><span title={fullPriceLabel(stock.dayLow, stock.currency, stock.assetType)}>{rangePriceLabel(stock.dayLow, stock.currency, stock.assetType)}</span></span><span className="text-slate-500 font-normal px-1">–</span><span><span title={fullPriceLabel(stock.dayHigh, stock.currency, stock.assetType)}>{rangePriceLabel(stock.dayHigh, stock.currency, stock.assetType)}</span></span></>, title: 'Day range: ' + fullPriceLabel(stock.dayLow, stock.currency, stock.assetType) + ' – ' + fullPriceLabel(stock.dayHigh, stock.currency, stock.assetType) },
          { id: '52w-range', label: '52W Range', value: <><span><span title={fullPriceLabel(stock.fiftyTwoWeekLow, stock.currency, stock.assetType)}>{rangePriceLabel(stock.fiftyTwoWeekLow, stock.currency, stock.assetType)}</span></span><span className="text-slate-500 font-normal px-1">–</span><span><span title={fullPriceLabel(stock.fiftyTwoWeekHigh, stock.currency, stock.assetType)}>{rangePriceLabel(stock.fiftyTwoWeekHigh, stock.currency, stock.assetType)}</span></span></>, title: '52-week range: ' + fullPriceLabel(stock.fiftyTwoWeekLow, stock.currency, stock.assetType) + ' – ' + fullPriceLabel(stock.fiftyTwoWeekHigh, stock.currency, stock.assetType) },
          { id: 'volume', label: 'Volume', value: stock.assetType === 'Index' || stock.assetType === 'Bond Yield' ? 'N/A' : formatVolume(stock.volume), title: stock.assetType === 'Crypto' ? 'Provider-reported cryptocurrency volume; units are not assumed to be shares' : stock.assetType === 'Index' || stock.assetType === 'Bond Yield' ? 'This benchmark does not trade as shares' : 'Provider-reported trading volume' },
          { id: '1m-change', label: '1M Change', value: percentage(activity?.month.changePercent), title: historyTitle('month'), change: activity?.month.changePercent, stale: activity?.stale },
          { id: '1y-change', label: '1Y Change', value: percentage(activity?.year.changePercent), title: historyTitle('year'), change: activity?.year.changePercent, stale: activity?.stale },
        ].map(metric => (
          <div key={metric.id} id={`card-${metric.id}-${stock.symbol.toLowerCase()}`} title={metric.title} className="min-w-0 p-3 rounded-xl bg-[#111724] flex flex-col justify-between">
            <span className="text-[11px] sm:text-xs font-mono text-slate-300 font-bold uppercase tracking-wider">{metric.label}</span>
            <div className={`mt-1.5 flex items-center justify-between font-mono ${metric.id.endsWith('range') ? 'text-xs sm:text-sm font-bold' : 'text-sm sm:text-base font-black'} ${metric.stale ? 'text-amber-400' : finite(metric.change) ? metric.change >= 0 ? 'text-emerald-400' : 'text-rose-400' : 'text-slate-100'}`}>
              {metric.value}{metric.stale && <AlertTriangle className="w-3 h-3 shrink-0" aria-label="Stale historical data" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
