import { BoardTimeframe, WallStreetPriceTarget, AssetType } from '../types';
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
  sessionStartUnix?: number;
  sessionEndUnix?: number;
  startPrice: number;
  currentPrice: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  previousClose: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  marketCap?: string | number;
  currency?: string;
  source: string;
}

export interface ProxyQuoteItem {
  symbol: string;
  name?: string;
  assetType?: AssetType;
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
  marketCap?: string;
  peRatio?: number;
  dividendYield?: number;
  targetPrice1Y?: WallStreetPriceTarget;
  currency: string;
  exchangeName?: string;
  sparkline?: number[];
}

const candleMemoryCache = new Map<string, { timestamp: number; data: TimeframeSummary }>();

export function getCachedProxyCandles(
  symbol: string,
  timeframe: BoardTimeframe
): TimeframeSummary | null {
  const cacheKey = `${symbol.toUpperCase()}_${timeframe}`;
  const cached = candleMemoryCache.get(cacheKey);
  return cached ? cached.data : null;
}

/**
 * Fetch 100% accurate real-world market candles from backend Yahoo Finance proxy.
 */
export async function fetchProxyCandles(
  symbol: string,
  timeframe: BoardTimeframe
): Promise<TimeframeSummary | null> {
  const cacheKey = `${symbol.toUpperCase()}_${timeframe}`;
  const cached = candleMemoryCache.get(cacheKey);
  const ttl = timeframe === '1D' ? 30 * 1000 : 300 * 1000;

  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }

  try {
    const res = await fetch(`/api/candles?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`);
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.includes('application/json')) {
      return cached ? cached.data : null;
    }

    const data: ProxyCandlesResponse = await res.json();
    if (!data.points || data.points.length === 0) {
      return cached ? cached.data : null;
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
      sessionStartUnix: data.sessionStartUnix,
      sessionEndUnix: data.sessionEndUnix,
    };

    candleMemoryCache.set(cacheKey, { timestamp: Date.now(), data: summary });
    return summary;
  } catch (err) {
    console.warn(`[Proxy Candles] Unable to fetch proxy candles for ${symbol} (${timeframe}):`, err);
    return cached ? cached.data : null;
  }
}

export async function preloadProxyCandles(symbol: string, timeframe: BoardTimeframe = '1D'): Promise<void> {
  try {
    await fetchProxyCandles(symbol, timeframe);
  } catch {
    // Non-blocking preload
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

export interface UniversalSearchResult {
  symbol: string;
  name: string;
  exchange?: string;
  type?: string;
  assetType?: AssetType;
}

export async function searchProxyAssets(query: string): Promise<UniversalSearchResult[]> {
  const q = query.trim();
  if (!q) return [];
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.results) ? data.results : [];
  } catch {
    return [];
  }
}
