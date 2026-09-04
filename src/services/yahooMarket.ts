import { BoardTimeframe } from '../types';
import { ChartPoint, TimeframeSummary } from '../utils/timeframeData';

export interface ProxyCandlesResponse {
  symbol: string;
  timeframe: string;
  points: Array<{
    date: string;
    label: string;
    price: number;
    volume?: number;
    timestamp: number;
  }>;
  startPrice: number;
  currentPrice: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  previousClose: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  marketCap?: number;
  currency?: string;
  source: string;
}

export interface ProxyQuoteItem {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  prevClose: number;
  open: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  marketCap?: number;
  currency: string;
  exchangeName?: string;
  sparkline?: number[];
}

const candleMemoryCache = new Map<string, { timestamp: number; data: TimeframeSummary }>();
const CLIENT_CACHE_TTL = 15 * 1000; // 15 seconds

/**
 * Fetch 100% accurate real-world market candles from backend Yahoo Finance proxy.
 */
export async function fetchProxyCandles(
  symbol: string,
  timeframe: BoardTimeframe
): Promise<TimeframeSummary | null> {
  const cacheKey = `${symbol.toUpperCase()}_${timeframe}`;
  const cached = candleMemoryCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CLIENT_CACHE_TTL) {
    return cached.data;
  }

  try {
    const res = await fetch(`/api/candles?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`);
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.includes('application/json')) {
      return null;
    }

    const data: ProxyCandlesResponse = await res.json();
    if (!data.points || data.points.length === 0) {
      return null;
    }

    const points: ChartPoint[] = data.points.map((p) => ({
      date: p.date,
      label: p.label,
      price: p.price,
      timeUnix: p.timestamp,
    }));

    const summary: TimeframeSummary = {
      points,
      startPrice: data.startPrice,
      currentPrice: data.currentPrice,
      change: data.change,
      changePercent: data.changePercent,
      high: data.high,
      low: data.low,
    };

    candleMemoryCache.set(cacheKey, { timestamp: Date.now(), data: summary });
    return summary;
  } catch (err) {
    console.warn(`[Proxy Candles] Unable to fetch proxy candles for ${symbol} (${timeframe}):`, err);
    return null;
  }
}

/**
 * Fetch real-time batch quotes for multiple symbols from backend Yahoo Finance proxy.
 */
export async function fetchProxyQuotes(symbols: string[]): Promise<ProxyQuoteItem[] | null> {
  if (!symbols || symbols.length === 0) return null;
  try {
    const symParam = encodeURIComponent(symbols.join(','));
    const res = await fetch(`/api/quotes?symbols=${symParam}`);
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.includes('application/json')) {
      return null;
    }
    const data = await res.json();
    if (data && Array.isArray(data.quotes) && data.quotes.length > 0) {
      return data.quotes;
    }
    return null;
  } catch (err) {
    console.warn('[Proxy Quotes] Unable to fetch batch quotes:', err);
    return null;
  }
}
