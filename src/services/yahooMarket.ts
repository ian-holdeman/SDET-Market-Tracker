import { finite } from '../utils/marketValues';
import { BoardTimeframe, WallStreetPriceTarget, AssetType } from '../types';
import { ChartPoint, TimeframeSummary } from '../utils/timeframeData';

export interface ProxyCandlesResponse {
  asOf: string;
  fetchedAt: string;
  symbol: string;
  timeframe: string;
  points: Array<{
    date: string;
    label: string;
    price: number | null;
    volume?: number;
    timestamp: number;
  }>;
  sessionStartUnix?: number;
  sessionEndUnix?: number;
  startPrice: number | null;
  currentPrice: number | null;
  change: number | null;
  changePercent: number | null;
  high: number | null;
  low: number | null;
  previousClose: number | null;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  marketCap?: string | number;
  currency?: string;
  source: string;
}

export interface ProxyQuoteItem {
  asOf: string;
  fetchedAt: string;
  symbol: string;
  name?: string;
  assetType?: AssetType;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  prevClose: number | null;
  open: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  volume: number | null;
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
  return cached ? { ...cached.data, stale: true } : null;
}

/**
 * Fetch provider-reported market candles from backend Yahoo Finance proxy.
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
    const res = await fetch(`/api/candles?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`, { signal: AbortSignal.timeout(15000) });
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.includes('application/json')) {
      return cached ? { ...cached.data, stale: true } : null;
    }

    const data: ProxyCandlesResponse = await res.json();
    if (data.symbol !== symbol.toUpperCase() || data.timeframe !== timeframe || !Array.isArray(data.points) || !data.points.length || !Number.isFinite(Date.parse(data.fetchedAt)) || !Number.isFinite(Date.parse(data.asOf)) || data.points.some(p => !finite(p.price) || !finite(p.timestamp))) {
      return cached ? { ...cached.data, stale: true } : null;
    }

    const points: ChartPoint[] = data.points.map((p) => ({
      date: p.date,
      label: p.label,
      price: p.price,
      timeUnix: p.timestamp,
    }));

    const summary: TimeframeSummary = {
      points, asOf: data.asOf, fetchedAt: data.fetchedAt, stale: false,
      startPrice: data.startPrice,
      currentPrice: data.currentPrice,
      change: data.change,
      changePercent: data.changePercent,
      high: data.high,
      low: data.low,
      sessionStartUnix: data.sessionStartUnix,
      sessionEndUnix: data.sessionEndUnix,
    };

    if (candleMemoryCache.size >= 100) candleMemoryCache.delete(candleMemoryCache.keys().next().value!);
    candleMemoryCache.set(cacheKey, { timestamp: Date.parse(data.fetchedAt), data: summary });
    return summary;
  } catch (err) {
    console.warn(`[Proxy Candles] Unable to fetch proxy candles for ${symbol} (${timeframe}):`, err);
    return cached ? { ...cached.data, stale: true } : null;
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
 * Fetch regular-session batch quotes for multiple symbols from backend Yahoo Finance proxy.
 */
export async function fetchProxyQuotes(symbols: string[]): Promise<ProxyQuoteItem[] | null> {
  if (!symbols || symbols.length === 0) return null;
  try {
    const symParam = encodeURIComponent(symbols.join(','));
    const res = await fetch(`/api/quotes?symbols=${symParam}`, { signal: AbortSignal.timeout(15000) });
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.includes('application/json')) {
      throw new Error('Quote provider unavailable');
    }
    const data = await res.json();
    if (data && Array.isArray(data.quotes) && data.quotes.length > 0) {
      return data.quotes.filter((q: ProxyQuoteItem) => symbols.includes(q.symbol) && finite(q.price) && Number.isFinite(Date.parse(q.asOf)) && Number.isFinite(Date.parse(q.fetchedAt)));
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
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error('Asset search is unavailable. Please retry.');
    const data = await res.json();
    return Array.isArray(data?.results) ? data.results : [];
  } catch {
    throw new Error('Asset search is unavailable. Please retry.');
  }
}
export interface PriceActivity {
  symbol: string;
  month: { changePercent: number | null; baselineDate: string | null };
  year: { changePercent: number | null; baselineDate: string | null };
  asOf: string;
  fetchedAt: string;
  stale: boolean;
}
const activityCache = new Map<string, PriceActivity>();
const activityPending = new Map<string, Promise<PriceActivity | null>>();
export function fetchPriceActivity(symbol: string): Promise<PriceActivity | null> {
  const key = symbol.toUpperCase();
  const cached = activityCache.get(key);
  if (cached && Date.now() - Date.parse(cached.fetchedAt) < 300000) return Promise.resolve(cached);
  const pending = activityPending.get(key);
  if (pending) return pending;
  const request = (async () => {
    try {
      const res = await fetch(`/api/price-activity?symbol=${encodeURIComponent(key)}`, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error('History unavailable');
      const data: PriceActivity = await res.json();
      if (data.symbol !== key || !Number.isFinite(Date.parse(data.asOf)) || !Number.isFinite(Date.parse(data.fetchedAt)) ||
          [data.month, data.year].some(p => !p || (p.changePercent !== null && !finite(p.changePercent)))) throw new Error('Invalid history');
      if (activityCache.size >= 100) activityCache.delete(activityCache.keys().next().value!);
      const result = { ...data, stale: false };
      activityCache.set(key, result); return result;
    } catch { return cached ? { ...cached, stale: true } : null; }
    finally { activityPending.delete(key); }
  })();
  activityPending.set(key, request); return request;
}
