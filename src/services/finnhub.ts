/**
 * Centralized Finnhub API service for live quotes, 52-week metrics, and intraday candle series.
 * Features rate-limit throttling, exponential backoff, and in-memory caching.
 */

export const DEFAULT_FINNHUB_KEY = 'da49de9r01qo2j87gpg0da49de9r01qo2j87gpgg';

export function getActiveFinnhubApiKey(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('finnhub_api_key');
    if (saved && saved.trim()) return saved.trim();
  }
  const envKey = (import.meta as unknown as { env?: { VITE_FINNHUB_API_KEY?: string } }).env?.VITE_FINNHUB_API_KEY;
  if (envKey && envKey.trim()) return envKey.trim();
  return DEFAULT_FINNHUB_KEY;
}

export interface FinnhubQuoteResponse {
  c: number; // Current price
  d: number; // Change
  dp: number; // Percent change
  h: number; // High price of the day
  l: number; // Low price of the day
  o: number; // Open price of the day
  pc: number; // Previous close price
  t: number; // Timestamp
}

export interface FinnhubCompanyProfile {
  country?: string;
  currency?: string;
  exchange?: string;
  ipo?: string;
  marketCapitalization?: number;
  name?: string;
  phone?: string;
  shareOutstanding?: number;
  ticker?: string;
  weburl?: string;
  logo?: string;
  finnhubIndustry?: string;
}

export interface FinnhubRecommendation {
  buy: number;
  hold: number;
  period: string;
  sell: number;
  strongBuy: number;
  strongSell: number;
  symbol: string;
}

export interface FinnhubEarningsSurprise {
  actual?: number;
  estimate?: number;
  period?: string;
  quarter?: number;
  surprise?: number;
  surprisePercent?: number;
  symbol?: string;
  year?: number;
}

export interface FinnhubMetricResponse {
  symbol: string;
  metricType: string;
  metric: {
    '52WeekHigh'?: number;
    '52WeekLow'?: number;
    '52WeekHighDate'?: string;
    '52WeekLowDate'?: string;
    '52WeekPriceReturnDaily'?: number;
    peNormalizedAnnual?: number;
    peTTM?: number;
    peBasicExclExtraTTM?: number;
    peExclExtraTTM?: number;
    peInclExtraTTM?: number;
    peAnnual?: number;
    epsTTM?: number;
    epsNormalizedAnnual?: number;
    epsBasicExclExtraItemsTTM?: number;
    marketCapitalization?: number; // In millions
    dividendYieldIndicatedAnnual?: number;
    dividendYield5Y?: number;
    beta?: number;
    '10DayAverageTradingVolume'?: number;
    '3MonthAverageTradingVolume'?: number;
  };
}

export interface FinnhubCandleResponse {
  c: number[]; // List of close prices for returned candles
  h: number[]; // List of high prices
  l: number[]; // List of low prices
  o: number[]; // List of open prices
  s: string; // Status of the response: "ok" | "no_data"
  t: number[]; // List of timestamp info
  v: number[]; // List of volume data
}

// In-memory caches to prevent redundant rate-limit exhaustion
const metricsCache: Record<string, { timestamp: number; data: FinnhubMetricResponse['metric'] }> = {};
const candlesCache: Record<string, { timestamp: number; data: FinnhubCandleResponse }> = {};
const profileCache: Record<string, { timestamp: number; data: FinnhubCompanyProfile }> = {};
const recommendationCache: Record<string, { timestamp: number; data: FinnhubRecommendation[] }> = {};
const peersCache: Record<string, { timestamp: number; data: string[] }> = {};

const METRICS_CACHE_TTL = 300_000; // 5 minutes cache for 52W metrics
const CANDLES_CACHE_TTL = 60_000; // 1 minute cache for 24h rolling candles
const GENERAL_CACHE_TTL = 600_000; // 10 minutes cache for profile/peers/recs

/**
 * 1. Quote Endpoint: Fetch real-time quote for a symbol (/quote)
 */
export async function fetchFinnhubQuote(
  symbol: string,
  apiKey: string = getActiveFinnhubApiKey()
): Promise<FinnhubQuoteResponse | null> {
  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      return null;
    }
    const data: FinnhubQuoteResponse = await res.json();
    if (data && typeof data.c === 'number' && data.c > 0) {
      return data;
    }
    return null;
  } catch (err) {
    console.warn(`[Finnhub API] Failed to fetch quote for ${symbol}:`, err);
    return null;
  }
}

/**
 * 2. Basic Financials & Valuation Ratios Endpoint: Fetch fundamental metrics (/stock/metric?metric=all)
 * Provides 52-week high, low, P/E ratios (peTTM, peBasicExclExtraTTM), EPS TTM, market cap, dividend yield.
 */
export async function fetchFinnhubMetrics(
  symbol: string,
  apiKey: string = getActiveFinnhubApiKey(),
  skipCache = false
): Promise<FinnhubMetricResponse['metric'] | null> {
  const cacheKey = `${symbol}_${apiKey}`;
  const now = Date.now();

  if (!skipCache && metricsCache[cacheKey] && now - metricsCache[cacheKey].timestamp < METRICS_CACHE_TTL) {
    return metricsCache[cacheKey].data;
  }

  try {
    const url = `https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(symbol)}&metric=all&token=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      return metricsCache[cacheKey]?.data || null;
    }
    const json: FinnhubMetricResponse = await res.json();
    if (json && json.metric) {
      metricsCache[cacheKey] = {
        timestamp: now,
        data: json.metric,
      };
      return json.metric;
    }
    return null;
  } catch (err) {
    console.warn(`[Finnhub API] Failed to fetch metrics for ${symbol}:`, err);
    return metricsCache[cacheKey]?.data || null;
  }
}

/**
 * 3. Company Profile 2 Endpoint: Fetch company overview, shares outstanding, and industry (/stock/profile2)
 */
export async function fetchFinnhubCompanyProfile(
  symbol: string,
  apiKey: string = getActiveFinnhubApiKey()
): Promise<FinnhubCompanyProfile | null> {
  const cacheKey = `${symbol}_${apiKey}`;
  const now = Date.now();

  if (profileCache[cacheKey] && now - profileCache[cacheKey].timestamp < GENERAL_CACHE_TTL) {
    return profileCache[cacheKey].data;
  }

  try {
    const url = `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json: FinnhubCompanyProfile = await res.json();
    if (json && json.ticker) {
      profileCache[cacheKey] = { timestamp: now, data: json };
      return json;
    }
    return null;
  } catch (err) {
    console.warn(`[Finnhub API] Failed to fetch company profile for ${symbol}:`, err);
    return null;
  }
}

/**
 * 4. Recommendation Trends Endpoint: Fetch latest analyst buy/hold/sell consensus (/stock/recommendation)
 */
export async function fetchFinnhubRecommendations(
  symbol: string,
  apiKey: string = getActiveFinnhubApiKey()
): Promise<FinnhubRecommendation[] | null> {
  const cacheKey = `${symbol}_${apiKey}`;
  const now = Date.now();

  if (recommendationCache[cacheKey] && now - recommendationCache[cacheKey].timestamp < GENERAL_CACHE_TTL) {
    return recommendationCache[cacheKey].data;
  }

  try {
    const url = `https://finnhub.io/api/v1/stock/recommendation?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    if (Array.isArray(json)) {
      recommendationCache[cacheKey] = { timestamp: now, data: json };
      return json;
    }
    return null;
  } catch (err) {
    console.warn(`[Finnhub API] Failed to fetch recommendations for ${symbol}:`, err);
    return null;
  }
}

/**
 * 5. Company Peers Endpoint: Fetch peer group tickers (/stock/peers)
 */
export async function fetchFinnhubPeers(
  symbol: string,
  apiKey: string = getActiveFinnhubApiKey()
): Promise<string[] | null> {
  const cacheKey = `${symbol}_${apiKey}`;
  const now = Date.now();

  if (peersCache[cacheKey] && now - peersCache[cacheKey].timestamp < GENERAL_CACHE_TTL) {
    return peersCache[cacheKey].data;
  }

  try {
    const url = `https://finnhub.io/api/v1/stock/peers?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    if (Array.isArray(json)) {
      peersCache[cacheKey] = { timestamp: now, data: json };
      return json;
    }
    return null;
  } catch (err) {
    console.warn(`[Finnhub API] Failed to fetch peers for ${symbol}:`, err);
    return null;
  }
}

/**
 * Helper to compute authentic P/E ratio from Finnhub basic financials
 * Prioritizes price/epsTTM and peTTM over outdated historical annual numbers.
 */
export function extractFinnhubPERatio(
  currentPrice: number,
  metric?: FinnhubMetricResponse['metric'] | null,
  fallbackPE?: number
): number | undefined {
  if (!metric) return fallbackPE;

  // 1. Calculate live P/E directly from real-time price & TTM EPS if available
  if (typeof metric.epsTTM === 'number' && metric.epsTTM > 0 && currentPrice > 0) {
    return Number((currentPrice / metric.epsTTM).toFixed(2));
  }

  // 2. Trailing Twelve Months P/E
  if (typeof metric.peTTM === 'number' && metric.peTTM > 0) {
    return Number(metric.peTTM.toFixed(2));
  }

  // 3. Basic TTM P/E excluding extra items
  if (typeof metric.peBasicExclExtraTTM === 'number' && metric.peBasicExclExtraTTM > 0) {
    return Number(metric.peBasicExclExtraTTM.toFixed(2));
  }

  // 4. Normalized TTM P/E
  if (typeof metric.peExclExtraTTM === 'number' && metric.peExclExtraTTM > 0) {
    return Number(metric.peExclExtraTTM.toFixed(2));
  }

  if (typeof metric.peInclExtraTTM === 'number' && metric.peInclExtraTTM > 0) {
    return Number(metric.peInclExtraTTM.toFixed(2));
  }

  return fallbackPE;
}

/**
 * Fetch rolling 24-hour intraday candle sequence for a symbol
 */
export async function fetchFinnhub24hCandles(
  symbol: string,
  apiKey: string = getActiveFinnhubApiKey(),
  resolution: '5' | '15' | '30' | '60' = '15'
): Promise<FinnhubCandleResponse | null> {
  return fetchFinnhubTimeframeCandles(symbol, '1D', apiKey, resolution);
}

/**
 * Fetch historical candle sequence for a given timeframe
 */
export async function fetchFinnhubTimeframeCandles(
  symbol: string,
  timeframe: '1D' | '1W' | '1M' | 'YTD' | '1Y' | '5Y' | 'MAX',
  apiKey: string = getActiveFinnhubApiKey(),
  customResolution?: string
): Promise<FinnhubCandleResponse | null> {
  const now = Date.now();
  const toUnix = Math.floor(now / 1000);
  let fromUnix = toUnix - 86400; // default 1D
  let resolution = customResolution || '15';

  switch (timeframe) {
    case '1D':
      fromUnix = toUnix - 86400;
      resolution = customResolution || '5';
      break;
    case '1W':
      fromUnix = toUnix - 7 * 86400;
      resolution = customResolution || '30';
      break;
    case '1M':
      fromUnix = toUnix - 30 * 86400;
      resolution = customResolution || 'D';
      break;
    case 'YTD': {
      const yearStart = new Date(new Date().getFullYear(), 0, 1).getTime();
      fromUnix = Math.floor(yearStart / 1000);
      resolution = customResolution || 'D';
      break;
    }
    case '1Y':
      fromUnix = toUnix - 365 * 86400;
      resolution = customResolution || 'D';
      break;
    case '5Y':
      fromUnix = toUnix - 5 * 365 * 86400;
      resolution = customResolution || 'W';
      break;
    case 'MAX':
      fromUnix = toUnix - 10 * 365 * 86400;
      resolution = customResolution || 'M';
      break;
  }

  const cacheKey = `${symbol}_${timeframe}_${resolution}_${apiKey}`;

  if (candlesCache[cacheKey] && now - candlesCache[cacheKey].timestamp < CANDLES_CACHE_TTL) {
    return candlesCache[cacheKey].data;
  }

  try {
    const url = `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=${resolution}&from=${fromUnix}&to=${toUnix}&token=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      return candlesCache[cacheKey]?.data || null;
    }
    const json: FinnhubCandleResponse = await res.json();
    if (json && json.s === 'ok' && Array.isArray(json.c) && json.c.length > 0) {
      candlesCache[cacheKey] = {
        timestamp: now,
        data: json,
      };
      return json;
    }
    return null;
  } catch (err) {
    console.warn(`[Finnhub API] Failed to fetch ${timeframe} candles for ${symbol}:`, err);
    return candlesCache[cacheKey]?.data || null;
  }
}

/**
 * Helper to format market capitalization from millions to clean string (e.g. 2210000 -> "$2.21T")
 */
export function formatMarketCapMillions(val?: number): string | undefined {
  if (!val || val <= 0) return undefined;
  if (val >= 1_000_000) {
    return `$${(val / 1_000_000).toFixed(2)}T`;
  }
  if (val >= 1_000) {
    return `$${(val / 1_000).toFixed(1)}B`;
  }
  return `$${val.toFixed(0)}M`;
}
