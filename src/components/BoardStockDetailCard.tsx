import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
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
  buildConfirmedStockTimeframeData, 
  ChartPoint, 
  TimeframeSummary, 
  isMarketTradingActive,
  isAssetActivelyTrading
} from '../utils/timeframeData';
import { 
  fetchFinnhubTimeframeCandles
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
  const rawSpan = Math.max(0.04, rawMax - rawMin);

  // Add 16% vertical padding to provide a zoomed-out, breathing view like SoFi
  const paddedMinCandidate = Math.max(0, rawMin - rawSpan * 0.16);
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

    if (!sStart || !sEnd || sEnd <= sStart) {
      const sessionDate = new Date(firstTime).toLocaleDateString('en-US', {
        timeZone: 'America/New_York',
      });
      sStart = new Date(`${sessionDate} 04:00:00 GMT-0400`).getTime();
      sEnd = new Date(`${sessionDate} 20:00:00 GMT-0400`).getTime();
    }

    if (firstTime < sStart) sStart = firstTime;
    if (lastTime > sEnd) sEnd = lastTime;

    const milestones = [
      { frac: 0.0, label: '4:00 AM' },
      { frac: 0.25, label: '8:00 AM' },
      { frac: 0.50, label: '12:00 PM' },
      { frac: 0.75, label: '4:00 PM' },
      { frac: 1.0, label: `8:00 PM ${tz}` },
    ];

    return milestones.map((m) => ({
      label: m.label,
      x: paddingLeft + m.frac * effectiveWidth,
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
  const { user, isSymbolInWatchlist, toggleWatchlistSymbol, openAuthModal } = useAuth();
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
  const [liveCandleSummary, setLiveCandleSummary] = useState<TimeframeSummary | null>(null);
  const [isLoadingCandles, setIsLoadingCandles] = useState<boolean>(false);
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

  // Format volume helper
  const formatVolume = (vol: number) => {
    if (!vol) return '—';
    if (vol >= 1_000_000_000) return `${(vol / 1_000_000_000).toFixed(2)}B`;
    if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(2)}M`;
    if (vol >= 1_000) return `${(vol / 1_000).toFixed(1)}K`;
    return vol.toLocaleString();
  };

  // Format expense ratio helper for ETFs
  const formatExpenseRatio = (expRatio?: number, symbol?: string) => {
    if (typeof expRatio === 'number') {
      const decimals = expRatio < 0.1 && (expRatio * 100) % 1 !== 0 ? 3 : 2;
      return `${expRatio.toFixed(decimals)}%`;
    }
    const knownRatios: Record<string, number> = {
      VTI: 0.03,
      VOO: 0.03,
      QQQM: 0.15,
      SPMO: 0.13,
      SCHD: 0.06,
      VXUS: 0.08,
      FCOM: 0.084,
      FDIS: 0.084,
      FSTA: 0.084,
      FENY: 0.084,
      FNCL: 0.084,
      FHLC: 0.084,
      FIDU: 0.084,
      FMAT: 0.084,
      FTEC: 0.084,
      FUTY: 0.084,
      IWM: 0.19,
      DIA: 0.16,
      SPY: 0.09,
      QQQ: 0.20,
      IVV: 0.03,
      VT: 0.07,
      VEA: 0.06,
      VWO: 0.08,
      BND: 0.03,
      AGG: 0.03,
      SMH: 0.35,
      XBI: 0.35,
      IBIT: 0.25,
      VNQ: 0.13,
      GLD: 0.40,
      IAU: 0.25,
    };
    if (symbol && knownRatios[symbol.toUpperCase()] !== undefined) {
      const val = knownRatios[symbol.toUpperCase()];
      const decimals = val < 0.1 && (val * 100) % 1 !== 0 ? 3 : 2;
      return `${val.toFixed(decimals)}%`;
    }
    return '0.03%';
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
  const isHovering = hoverIndex !== null && hoverIndex >= 0 && hoverIndex < points.length;
  const displayedPoint = isHovering ? points[hoverIndex] : (points[points.length - 1] || null);
  const activePrice = displayedPoint ? displayedPoint.price : currentPrice;
  const activeChange = activePrice - startPrice;
  const activeChangePercent = startPrice > 0 ? (activeChange / startPrice) * 100 : 0;
  const isPeriodPositive = activeChange >= 0;

  // Compute Even Y-Axis Ticks with startPrice included for balanced baseline framing
  const yAxisConfig = useMemo(() => {
    const prices = points.map((p) => p.price);
    if (startPrice && startPrice > 0) {
      prices.push(startPrice);
    }
    return computeEvenYAxis(prices);
  }, [points, startPrice]);

  const { ticks, paddedMin, paddedMax, formatTick } = yAxisConfig;
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
  const baselinePrice = startPrice > 0 ? startPrice : (points[0]?.price || 0);
  const baselineY = baselinePrice > 0 && totalRange > 0
    ? paddingTop + effectiveHeight - ((baselinePrice - paddedMin) / totalRange) * effectiveHeight
    : null;

  // Period High, Open/Start, and Low metrics for SoFi-style interactive reference lines
  const periodHigh = useMemo(() => {
    if (timeframeData.high && timeframeData.high > 0) return timeframeData.high;
    const prices = points.map(p => p.price);
    if (selectedTimeframe === '1D' && stock.dayHigh && stock.dayHigh > 0) prices.push(stock.dayHigh);
    return prices.length > 0 ? Math.max(...prices) : stock.price;
  }, [timeframeData.high, points, selectedTimeframe, stock.dayHigh, stock.price]);

  const periodLow = useMemo(() => {
    if (timeframeData.low && timeframeData.low > 0) return timeframeData.low;
    const prices = points.map(p => p.price);
    if (selectedTimeframe === '1D' && stock.dayLow && stock.dayLow > 0) prices.push(stock.dayLow);
    const valid = prices.filter(p => p > 0);
    return valid.length > 0 ? Math.min(...valid) : stock.price;
  }, [timeframeData.low, points, selectedTimeframe, stock.dayLow, stock.price]);

  const periodOpen = baselinePrice;

  const highY = periodHigh > 0 && totalRange > 0
    ? paddingTop + effectiveHeight - ((periodHigh - paddedMin) / totalRange) * effectiveHeight
    : null;

  const openY = baselineY;

  const lowY = periodLow > 0 && totalRange > 0
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

      if (!sStart || !sEnd || sEnd <= sStart) {
        const sessionDate = new Date(firstTime).toLocaleDateString('en-US', {
          timeZone: 'America/New_York',
        });
        sStart = new Date(`${sessionDate} 04:00:00 GMT-0400`).getTime();
        sEnd = new Date(`${sessionDate} 20:00:00 GMT-0400`).getTime();
      }

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

  // Wall Street 1Y Price Target for the first metric card
  const targetData = stock.targetPrice1Y;
  const targetMean = targetData?.targetMean || (stock.price * 1.12);
  const targetUpside = ((targetMean - stock.price) / stock.price) * 100;
  const isTargetPositive = targetUpside >= 0;

  // 52W Range calculations
  const fiftyTwoLow = stock.fiftyTwoWeekLow || (stock.dayLow * 0.82);
  const fiftyTwoHigh = stock.fiftyTwoWeekHigh || (stock.dayHigh * 1.18);

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
              ${activePrice.toFixed(2)}
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
              {isPeriodPositive ? '+' : ''}{activeChangePercent.toFixed(2)}%
              <span className="ml-1 text-[10px] sm:text-[11px] font-normal opacity-90">
                ({isPeriodPositive ? '+' : '-'}${Math.abs(activeChange).toFixed(2)})
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
        
        {/* Dedicated Timestamp Track above graph (Ensures 0 overlap with High Y-axis price badge) */}
        <div className="h-5 sm:h-6 relative w-full flex items-center select-none">
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
                  ${periodHigh.toFixed(2)}
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
                    ${periodOpen.toFixed(2)}
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
                  ${periodLow.toFixed(2)}
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
              fill="none" 
              stroke={strokeColor} 
              strokeWidth="3.4" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />

            {/* Pulsing Beacon at Current Price Tip only when this specific asset is actively trading */}
            {isAssetActivelyTrading(
              selectedTimeframe,
              points[points.length - 1]?.timeUnix,
              stock.assetType,
              stock.symbol
            ) && coords.length > 0 && (
              <g 
                id={`live-trading-beacon-${stock.symbol.toLowerCase()}`}
                className="pointer-events-none"
              >
                {/* Expanding, fading radar ripple ring */}
                <circle
                  cx={coords[coords.length - 1].x}
                  cy={coords[coords.length - 1].y}
                  r="5"
                  fill={strokeColor}
                >
                  <animate
                    attributeName="r"
                    values="4;15;20"
                    keyTimes="0;0.7;1"
                    dur="1.8s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.75;0.2;0"
                    keyTimes="0;0.7;1"
                    dur="1.8s"
                    repeatCount="indefinite"
                  />
                </circle>
                {/* Solid red or green indicator dot */}
                <circle
                  cx={coords[coords.length - 1].x}
                  cy={coords[coords.length - 1].y}
                  r="4"
                  fill={strokeColor}
                />
              </g>
            )}

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
            href={getGoogleFinanceQuoteUrl(stock)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono text-slate-400 hover:text-blue-400 inline-flex items-center gap-1.5 transition-colors font-medium hover:underline underline-offset-2 py-0.5 px-1.5 rounded hover:bg-slate-800/40"
          >
            <span>Google Finance</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
        </div>
      </div>

      {/* Core Statistics Grid: 1Y Target, P/E Ratio, 52W Range, Day's Range, Dividend Yield, Volume (Smooth borderless panels) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5 pt-1">
        {/* 1. Wall Street 1Y Price Target */}
        <div 
          id={`card-wallst-target-${stock.symbol.toLowerCase()}`}
          className="p-3 rounded-xl bg-[#111724] flex flex-col justify-between"
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
          className="p-3 rounded-xl bg-[#111724] flex flex-col justify-between"
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
          className="p-3 rounded-xl bg-[#111724] flex flex-col justify-between"
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
          className="p-3 rounded-xl bg-[#111724] flex flex-col justify-between"
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
          className="p-3 rounded-xl bg-[#111724] flex flex-col justify-between"
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

        {/* 6. Market Cap (for Stocks) / Expense Ratio (for ETFs) */}
        {stock.assetType === 'ETF' ? (
          <div 
            id={`card-expense-ratio-${stock.symbol.toLowerCase()}`}
            className="p-3 rounded-xl bg-[#111724] flex flex-col justify-between"
          >
            <span className="text-[11px] sm:text-xs font-mono text-slate-300 font-bold uppercase tracking-wider">
              Expense Ratio
            </span>
            <div className="mt-1.5 flex items-baseline justify-between">
              <span className="text-sm sm:text-base font-mono font-black text-slate-100">
                {formatExpenseRatio(stock.expenseRatio, stock.symbol)}
              </span>
              <span className="text-[10px] sm:text-xs font-mono font-medium text-slate-400">
                Annual
              </span>
            </div>
          </div>
        ) : (
          <div 
            id={`card-market-cap-${stock.symbol.toLowerCase()}`}
            className="p-3 rounded-xl bg-[#111724] flex flex-col justify-between"
          >
            <span className="text-[11px] sm:text-xs font-mono text-slate-300 font-bold uppercase tracking-wider">
              Market Cap
            </span>
            <div className="mt-1.5 flex items-baseline justify-between">
              <span className="text-sm sm:text-base font-mono font-black text-slate-100">
                {stock.marketCap || '—'}
              </span>
              <span className="text-[10px] sm:text-xs font-mono font-medium text-slate-400">
                USD
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
