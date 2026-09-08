import { Router } from 'express';
import { providerJson } from './provider-json';
import { chartSession } from '../src/utils/chartSession';

export const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const num = (v: unknown): number | null => finite(v) ? v : null;
const nonnegative = (v: unknown) => finite(v) && v >= 0 ? v : null;
const text = (v: unknown): string | null => typeof v === 'string' && v.trim() ? v : null;
const frames = { '1D': ['1d', '5m'], '1W': ['5d', '15m'], '1M': ['1mo', '1d'], YTD: ['ytd', '1d'], '1Y': ['1y', '1d'], '5Y': ['5y', '1wk'], MAX: ['max', '1mo'] };
export function providerSymbol(symbol: string): string {
  const aliases = { SPX: '^GSPC', SP500: '^GSPC', DOW: '^DJI', DJI: '^DJI', NDX: '^NDX', COMP: '^IXIC', RUT: '^RUT', GOLD: 'GC=F', OIL: 'CL=F', CRUDE: 'CL=F', SILVER: 'SI=F' };
  return aliases[symbol] ?? (/^(BTC|ETH|SOL|DOGE|XRP|ADA|AVAX|LINK)$/.test(symbol) ? `${symbol}-USD` : symbol);
}
export function changeFrom(price: number | null, baseline: number | null) {
  const change = finite(price) && finite(baseline) ? num(price - baseline) : null;
  return { change, changePercent: change !== null && baseline! > 0 ? num(change / baseline! * 100) : null };
}
function assetType(meta: any) {
  if (meta.symbol === '^TNX') return 'Bond Yield';
  return ({ ETF: 'ETF', EQUITY: 'Stock', INDEX: 'Index', CRYPTOCURRENCY: 'Crypto', FUTURE: 'Commodity', MUTUALFUND: 'Mutual Fund' })[meta.instrumentType ?? meta.quoteType] ?? null;
}
// Required identity, timestamp and price are fail-closed. Optional malformed metrics become null.
function chartResult(body: any, symbol: string) {
  const result = body?.chart?.result;
  if (body?.chart?.error || !Array.isArray(result) || result.length !== 1) throw new Error('Invalid chart envelope');
  const c = result[0];
  if (c?.meta?.symbol !== providerSymbol(symbol)) throw new Error('Provider symbol mismatch');
  return c;
}
export function validateChart(body: any, symbol: string, now = Date.now()) {
  const c = chartResult(body, symbol);
  const timestamp = c.timestamp;
  const close = c.indicators?.quote?.[0]?.close;
  if (!Array.isArray(timestamp) || !Array.isArray(close) || timestamp.length !== close.length || timestamp.length > 20000) throw new Error('Invalid candle arrays');
  let previous = 0;
  for (let i = 0; i < timestamp.length; i++) {
    const t = timestamp[i];
    if (!finite(t) || t <= previous || t * 1000 > now + 60000 || t <= 0) throw new Error('Invalid candle timestamp');
    if (close[i] !== null && !finite(close[i])) throw new Error('Invalid candle close');
    previous = t;
  }
  return c;
}
export function normalizeQuote(c: any, symbol: string, rich: any = {}, now = Date.now()) {
  const m = c.meta;
  // Keep regular-session price and previous close in the same session. Extended candles are separate.
  if (!finite(m.regularMarketPrice) || !finite(m.regularMarketTime) || m.regularMarketTime <= 0 || m.regularMarketTime * 1000 > now + 60000) throw new Error('Missing quote price or observation time');
  const prevClose = num(rich.regularMarketPreviousClose) ?? num(m.previousClose) ?? num(m.chartPreviousClose);
  let low = nonnegative(rich.fiftyTwoWeekLow) ?? nonnegative(m.fiftyTwoWeekLow);
  let high = nonnegative(rich.fiftyTwoWeekHigh) ?? nonnegative(m.fiftyTwoWeekHigh);
  if (low !== null && high !== null && low > high) low = high = null;
  let dayLow = num(m.regularMarketDayLow), dayHigh = num(m.regularMarketDayHigh);
  if (dayLow !== null && dayHigh !== null && dayLow > dayHigh) dayLow = dayHigh = null;
  const cap = nonnegative(rich.marketCap) ?? nonnegative(m.marketCap);
  return {
    symbol, name: text(m.longName) ?? text(m.shortName), assetType: assetType(m),
    price: m.regularMarketPrice, prevClose, ...changeFrom(m.regularMarketPrice, prevClose),
    open: num(rich.regularMarketOpen), dayHigh, dayLow, volume: nonnegative(m.regularMarketVolume),
    fiftyTwoWeekLow: low, fiftyTwoWeekHigh: high,
    marketCap: cap === null ? null : `${cap.toLocaleString('en-US')} ${text(m.currency) ?? ''}`.trim(),
    peRatio: num(rich.trailingPE), dividendYield: nonnegative(rich.dividendYield) ?? (nonnegative(rich.trailingAnnualDividendYield) === null ? null : rich.trailingAnnualDividendYield * 100),
    expenseRatio: null,
    targetPrice1Y: finite(rich.targetMeanPrice) ? { targetMean: rich.targetMeanPrice, targetHigh: num(rich.targetHighPrice), targetLow: num(rich.targetLowPrice), consensusRating: text(rich.recommendationKey), analystCount: nonnegative(rich.numberOfAnalystOpinions) } : null,
    currency: text(m.currency), exchangeName: text(m.exchangeName),
    sparkline: c.indicators.quote[0].close.filter(finite),
    asOf: new Date(m.regularMarketTime * 1000).toISOString(), fetchedAt: new Date(now).toISOString(), session: 'regular', source: 'Yahoo Finance',
  };
}
/** Quote metadata remains usable when a closed session has no chart samples. */
export function validateQuoteResponse(body: unknown, symbol: string, now = Date.now()) {
  const c = chartResult(body, symbol);
  let close: number[] = [];
  try { close = validateChart(body, symbol, now).indicators.quote[0].close.filter(finite); }
  catch { /* Optional chart data stays unavailable; quote identity/price/time are still required. */ }
  return normalizeQuote({ meta: c.meta, indicators: { quote: [{ close }] } }, symbol, {}, now);
}
export function normalizeCandles(c: any, symbol: string, timeframe: string, now = Date.now()) {
  const q = c.indicators.quote[0];
  const points = c.timestamp.flatMap((t: number, i: number) => q.close[i] === null ? [] : [{
    timestamp: t * 1000, date: new Date(t * 1000).toISOString(), label: new Date(t * 1000).toISOString(), price: q.close[i], volume: nonnegative(q.volume?.[i]),
  }]);
  if (!points.length) throw new Error('No valid candles');
  const startPrice = timeframe === '1D' ? num(c.meta.previousClose) ?? num(c.meta.chartPreviousClose) : points[0].price;
  const currentPrice = points.at(-1).price;
  const prices = points.map((p: any) => p.price);
  return { symbol, timeframe, points, startPrice, currentPrice, ...changeFrom(currentPrice, startPrice),
    // Sampled-close extrema, not intrabar high/low or a substituted current quote.
    high: Math.max(...prices), low: Math.min(...prices), previousClose: num(c.meta.previousClose) ?? num(c.meta.chartPreviousClose),
    ...chartSession(timeframe === '1D' ? c.meta.currentTradingPeriod : null, points[0].timestamp, points.at(-1).timestamp),
    currency: text(c.meta.currency), source: 'Yahoo Finance', asOf: points.at(-1).date, fetchedAt: new Date(now).toISOString(), stale: false,
  };
}


// Calendar periods anchored to the latest provider daily close, in UTC.
// Choose the close on/before the anniversary; never substitute a shorter listing history.
export function priceActivity(c: { timestamp: number[]; indicators: { quote: { close: (number | null)[] }[] } }, symbol: string, now = Date.now()) {
  const closes = c.indicators.quote[0].close;
  const points = c.timestamp.flatMap((t: number, i: number) => finite(closes[i]) ? [{ time: t * 1000, price: closes[i] }] : []);
  if (!points.length) throw new Error('No daily history');
  const latest = points.at(-1)!;
  const day = (time: number) => { const d = new Date(time); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); };
  function period(months: number) {
    const date = new Date(day(latest.time));
    const originalDay = date.getUTCDate();
    date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth() - months);
    const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
    date.setUTCDate(Math.min(originalDay, lastDay));
    const cutoff = date.getTime();
    const baseline = [...points].reverse().find((point: { time: number }) => day(point.time) <= cutoff);
    if (!baseline || cutoff - day(baseline.time) > 7 * 86400000) return { changePercent: null, baselineDate: null };
    return { changePercent: changeFrom(latest.price, baseline.price).changePercent, baselineDate: new Date(baseline.time).toISOString() };
  }
  return { symbol, month: period(1), year: period(12), asOf: new Date(latest.time).toISOString(), fetchedAt: new Date(now).toISOString(), stale: false };
}

export function marketRouter(fetcher: typeof fetch = fetch, clock = Date.now) {
  const router = Router();
  router.use('/api', (_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  const cache = new Map<string, { time: number; value: any }>();
  const pending = new Map<string, Promise<any>>();
  async function cached(key: string, load: () => Promise<any>, ttl = 15000) {
    const hit = cache.get(key);
    if (hit && clock() - hit.time < ttl) return hit.value;
    if (pending.has(key)) return pending.get(key);
    if (pending.size >= 128) throw new Error('Provider capacity reached');
    const promise = load().then(value => {
      if (cache.size >= 256) cache.delete(cache.keys().next().value!);
      cache.set(key, { time: clock(), value }); return value;
    }).finally(() => pending.delete(key));
    pending.set(key, promise); return promise;
  }
  async function yahoo(path: string, signal: AbortSignal) {
    for (const host of ['query1.finance.yahoo.com', 'query2.finance.yahoo.com']) {
      try {
        const response = await fetcher(`https://${host}${path}`, { signal, redirect: 'error', headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' } });
        if (!response.ok) throw new Error('Provider HTTP failure');
        return await providerJson(response);
      } catch { if (signal.aborted) break; }
    }
    throw new Error('Market provider unavailable');
  }
  function symbolInput(value: unknown) {
    if (typeof value !== 'string' || !/^[A-Za-z0-9^][A-Za-z0-9.^=\-]{0,19}$/.test(value)) throw new Error('Invalid symbol');
    return value.toUpperCase();
  }
  async function chart(symbol: string, timeframe: string, signal: AbortSignal) {
    const [range, interval] = frames[timeframe];
    return validateChart(await yahoo(`/v8/finance/chart/${encodeURIComponent(providerSymbol(symbol))}?range=${range}&interval=${interval}&includePrePost=true`, signal), symbol, clock());
  }
  router.get('/api/quotes', async (req, res) => {
    let symbols: string[];
    try {
      if (typeof req.query.symbols !== 'string') throw new Error();
      const inputs = req.query.symbols.split(',');
      if (!inputs.length || inputs.length > 100) throw new Error();
      symbols = [...new Set(inputs.map(s => symbolInput(s.trim())))];
    } catch { return res.status(400).json({ error: 'Supply 1–100 valid comma-separated symbols.' }); }
    const signal = AbortSignal.timeout(12000);
    const results: any[] = new Array(symbols.length);
    let index = 0;
    await Promise.all(Array.from({ length: Math.min(10, symbols.length) }, async () => {
      while (index < symbols.length) {
        const i = index++, symbol = symbols[i];
        try { results[i] = await cached(`q:${symbol}`, async () => {
          const body = await yahoo(`/v8/finance/chart/${encodeURIComponent(providerSymbol(symbol))}?range=1d&interval=5m&includePrePost=true`, signal);
          return validateQuoteResponse(body, symbol, clock());
        }); } catch { results[i] = null; }
      }
    }));
    const quotes = results.filter(Boolean), unavailable = symbols.filter((_, i) => !results[i]);
    res.status(quotes.length ? 200 : 502).json({ quotes, unavailable, status: !quotes.length ? 'unavailable' : unavailable.length ? 'partial' : 'available' });
  });
  router.get('/api/candles', async (req, res) => {
    let symbol: string, timeframe: string;
    try { symbol = symbolInput(req.query.symbol); timeframe = String(req.query.timeframe ?? '1D').toUpperCase(); if (!Object.hasOwn(frames, timeframe)) throw new Error(); }
    catch { return res.status(400).json({ error: 'Supply a valid symbol and timeframe.' }); }
    try { res.json(await cached(`c:${symbol}:${timeframe}`, async () => normalizeCandles(await chart(symbol, timeframe, AbortSignal.timeout(12000)), symbol, timeframe, clock()))); }
    catch { res.status(502).json({ error: 'Historical market data is unavailable. Retry later.' }); }
  });
  router.get('/api/price-activity', async (req, res) => {
    let symbol: string;
    try { symbol = symbolInput(req.query.symbol); } catch { return res.status(400).json({ error: 'Supply a valid symbol.' }); }
    try {
      const value = await cached('activity:' + symbol, async () => {
        const body = await yahoo('/v8/finance/chart/' + encodeURIComponent(providerSymbol(symbol)) + '?range=2y&interval=1d&includePrePost=false', AbortSignal.timeout(12000));
        return priceActivity(validateChart(body, symbol, clock()), symbol, clock());
      }, 300000);
      res.json(value);
    } catch { res.status(502).json({ error: 'Price history unavailable.' }); }
  });
  router.get('/api/search', async (req, res) => {
    const q = req.query.q;
    if (typeof q !== 'string' || q.trim().length > 80) return res.status(400).json({ error: 'Supply a search query of at most 80 characters.' });
    if (!q.trim()) return res.json({ results: [] });
    try {
      const results = await cached(`s:${q.trim().toUpperCase()}`, async () => {
        const body = await yahoo(`/v1/finance/search?q=${encodeURIComponent(q.trim())}&quotesCount=6&newsCount=0`, AbortSignal.timeout(12000));
        if (!body || typeof body !== 'object' || !('quotes' in body) || !Array.isArray(body.quotes)) throw new Error('Invalid search response');
        return body.quotes.flatMap((item: any) => {
          try { return [{ symbol: symbolInput(item.symbol), name: text(item.longname) ?? text(item.shortname) ?? item.symbol, exchange: text(item.exchDisp), assetType: assetType(item) }]; } catch { return []; }
        }).slice(0, 6);
      }, 60000);
      res.json({ results });
    } catch { res.status(502).json({ error: 'Asset search provider is unavailable.' }); }
  });
  return router;
}
