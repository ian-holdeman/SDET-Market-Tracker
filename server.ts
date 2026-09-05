import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

interface CachedData {
  timestamp: number;
  data: any;
}

const cache = new Map<string, CachedData>();
const CACHE_TTL_MS = 15 * 1000; // 15-second cache for fresh data

// Map timeframe to Yahoo Finance parameters
function mapTimeframeToYahooParams(timeframe: string): { range: string; interval: string } {
  switch (timeframe.toUpperCase()) {
    case '1D':
      return { range: '1d', interval: '5m' }; // 5-minute intervals for intraday
    case '1W':
      return { range: '5d', interval: '15m' };
    case '1M':
      return { range: '1mo', interval: '1d' };
    case 'YTD':
      return { range: 'ytd', interval: '1d' };
    case '1Y':
      return { range: '1y', interval: '1d' };
    case '5Y':
      return { range: '5y', interval: '1wk' };
    case 'MAX':
      return { range: 'max', interval: '1mo' };
    default:
      return { range: '1mo', interval: '1d' };
  }
}

function getYahooSymbol(sym: string): string {
  const upper = sym.toUpperCase();
  if (upper === 'BTC') return 'BTC-USD';
  return upper;
}

async function fetchYahooFinanceChart(symbol: string, range: string, interval: string, includePrePost: boolean = true) {
  const yahooSym = getYahooSymbol(symbol);
  const prePostParam = includePrePost ? 'true' : 'false';
  const urls = [
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?range=${range}&interval=${interval}&includePrePost=${prePostParam}`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?range=${range}&interval=${interval}&includePrePost=${prePostParam}`,
  ];

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'application/json',
  };

  let lastError: any = null;

  for (const url of urls) {
    try {
      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error(`Yahoo Finance responded with status ${response.status}`);
      }
      const json: any = await response.json();
      const result = json?.chart?.result?.[0];
      if (result) {
        return result;
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error(`No data found for symbol: ${symbol}`);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });

  // /api/quotes: Batch fetch real-world quotes for multiple symbols
  app.get("/api/quotes", async (req, res) => {
    try {
      const rawSymbols = String(req.query.symbols || 'VTI,SPY,QQQ,AAPL,GOOGL,MSFT,AMZN,NVDA,META,TSLA,SCHD,VXUS');
      const symbols = rawSymbols.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);

      const cacheKey = `QUOTES_${symbols.sort().join('_')}`;
      const cached = cache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return res.json({ quotes: cached.data, cached: true, timestamp: cached.timestamp });
      }

      // Fetch chart 1d meta for each symbol with concurrency chunking (10 at a time)
      const quotes: any[] = [];
      const CHUNK_SIZE = 10;
      for (let i = 0; i < symbols.length; i += CHUNK_SIZE) {
        const chunk = symbols.slice(i, i + CHUNK_SIZE);
        const chunkResults = await Promise.allSettled(
          chunk.map(async (sym) => {
            const chart = await fetchYahooFinanceChart(sym, '1d', '15m', true);
            const meta = chart.meta || {};
            const quote = chart.indicators?.quote?.[0] || {};
            const closes: (number | null)[] = (quote.close || []).filter((c: any) => typeof c === 'number' && c !== null);

            const prevClose = meta.chartPreviousClose || meta.previousClose || (closes.length > 0 ? closes[0] : 0);
            const latestClose = closes.length > 0 ? closes[closes.length - 1] : prevClose;
            const currentPrice = meta.postMarketPrice || meta.preMarketPrice || meta.regularMarketPrice || latestClose || prevClose;
            const change = Number((currentPrice - prevClose).toFixed(2));
            const changePercent = Number((((currentPrice - prevClose) / (prevClose || 1)) * 100).toFixed(2));

            // Prepend prevClose to the beginning of the sparkline so it always has the baseline anchor
            const rawSparkline = closes.length >= 6 ? closes.slice(-28) : closes;
            const sparkline = prevClose > 0 ? [prevClose, ...rawSparkline] : (rawSparkline.length > 0 ? rawSparkline : [currentPrice]);

            return {
              symbol: sym,
              price: currentPrice,
              change,
              changePercent,
              prevClose,
              open: meta.regularMarketOpen || prevClose,
              dayHigh: Math.max(meta.regularMarketDayHigh || currentPrice, currentPrice, ...closes),
              dayLow: Math.min(meta.regularMarketDayLow || currentPrice, currentPrice, ...(closes.length > 0 ? closes : [currentPrice])),
              volume: meta.regularMarketVolume || 0,
              fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
              fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
              marketCap: meta.marketCap,
              currency: meta.currency || 'USD',
              exchangeName: meta.exchangeName,
              sparkline,
            };
          })
        );

        chunkResults.forEach((res) => {
          if (res.status === 'fulfilled' && res.value && res.value.price > 0) {
            quotes.push(res.value);
          }
        });
      }

      if (quotes.length > 0) {
        cache.set(cacheKey, { timestamp: Date.now(), data: quotes });
      }

      return res.json({ quotes, timestamp: Date.now() });
    } catch (err: any) {
      console.error('Error fetching quotes from Yahoo proxy:', err?.message || err);
      return res.status(500).json({
        error: 'Failed to fetch market quotes',
        message: err?.message || String(err),
      });
    }
  });

  // /api/candles: Server-side Yahoo Finance proxy for historical and high-resolution chart series
  app.get("/api/candles", async (req, res) => {
    try {
      const symbol = String(req.query.symbol || 'GOOGL').trim().toUpperCase();
      const timeframe = String(req.query.timeframe || '1D').trim().toUpperCase();
      const { range, interval } = mapTimeframeToYahooParams(timeframe);

      const cacheKey = `${symbol}_${timeframe}_${range}_${interval}`;
      const cached = cache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return res.json(cached.data);
      }

      const result = await fetchYahooFinanceChart(symbol, range, interval);
      const meta = result.meta || {};
      const timestamps: number[] = result.timestamp || [];
      const quote = result.indicators?.quote?.[0] || {};
      const rawCloses: (number | null)[] = quote.close || [];
      const rawVolumes: (number | null)[] = quote.volume || [];

      // Helper to format timestamps strictly in American Eastern Time (America/New_York)
      const formatTimeET = (unixTime: number, tf: string): string => {
        // Round to the nearest 5-minute candle interval for 1D/1W so session closing ticks like 7:59 PM display cleanly as 8:00 PM and 3:59 PM as 4:00 PM
        const normalizedUnixTime = (tf === '1D' || tf === '1W')
          ? Math.round(unixTime / (5 * 60 * 1000)) * (5 * 60 * 1000)
          : unixTime;

        const dateObj = new Date(normalizedUnixTime);
        if (tf === '1D') {
          return dateObj.toLocaleTimeString('en-US', {
            timeZone: 'America/New_York',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          });
        }
        if (tf === '1W') {
          const weekday = dateObj.toLocaleDateString('en-US', {
            timeZone: 'America/New_York',
            weekday: 'short',
          });
          const timeStr = dateObj.toLocaleTimeString('en-US', {
            timeZone: 'America/New_York',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          });
          return `${weekday} ${timeStr}`;
        }
        if (tf === '1M') {
          return dateObj.toLocaleDateString('en-US', {
            timeZone: 'America/New_York',
            month: 'short',
            day: 'numeric',
          });
        }
        if (tf === 'YTD' || tf === '1Y') {
          return dateObj.toLocaleDateString('en-US', {
            timeZone: 'America/New_York',
            month: 'short',
            day: 'numeric',
            year: '2-digit',
          });
        }
        return dateObj.toLocaleDateString('en-US', {
          timeZone: 'America/New_York',
          month: 'short',
          year: 'numeric',
        });
      };

      // Filter and format clean points
      const rawPoints: Array<{
        price: number;
        volume?: number;
        timestamp: number;
      }> = [];

      for (let i = 0; i < timestamps.length; i++) {
        const closePrice = rawCloses[i];
        if (closePrice !== null && closePrice !== undefined && !isNaN(closePrice)) {
          const unixTime = timestamps[i] * 1000;
          rawPoints.push({
            price: Number(closePrice.toFixed(2)),
            volume: rawVolumes[i] || undefined,
            timestamp: unixTime,
          });
        }
      }

      if (rawPoints.length === 0) {
        return res.status(404).json({ error: `No candle data points parsed for ${symbol}` });
      }

      let points: Array<{
        date: string;
        label: string;
        price: number;
        volume?: number;
        timestamp: number;
      }> = [];

      const baselinePrevClose = meta.chartPreviousClose || meta.previousClose || rawPoints[0].price;
      let sessionStartUnix: number | undefined;
      let sessionEndUnix: number | undefined;

      if (timeframe === '1D' && rawPoints.length > 0) {
        // Determine full trading day session boundary in Eastern Time (America/New_York)
        // Standard full extended trading day spans 4:00 AM ET (pre-market) to 8:00 PM ET (after-hours close)
        const sessionDate = new Date(rawPoints[0].timestamp).toLocaleDateString('en-US', {
          timeZone: 'America/New_York',
        });

        const preStartSec = meta.tradingPeriods?.pre?.[0]?.[0]?.start
          || meta.tradingPeriods?.regular?.[0]?.[0]?.start
          || Math.floor(new Date(`${sessionDate} 04:00:00 GMT-0400`).getTime() / 1000);

        const postEndSec = meta.tradingPeriods?.post?.[0]?.[0]?.end
          || meta.tradingPeriods?.regular?.[0]?.[0]?.end
          || Math.floor(new Date(`${sessionDate} 20:00:00 GMT-0400`).getTime() / 1000);

        sessionStartUnix = preStartSec * 1000;
        sessionEndUnix = postEndSec * 1000;

        // Map authentic points that have actually occurred so far (no filling flat fake data into future hours)
        points = rawPoints.map((pt) => {
          const label = formatTimeET(pt.timestamp, '1D');
          return {
            date: label,
            label,
            price: pt.price,
            volume: pt.volume,
            timestamp: pt.timestamp,
          };
        });
      } else {
        points = rawPoints.map((pt) => {
          const label = formatTimeET(pt.timestamp, timeframe);
          return {
            date: label,
            label,
            price: pt.price,
            volume: pt.volume,
            timestamp: pt.timestamp,
          };
        });
      }

      const latestPointPrice = points[points.length - 1].price;
      const currentPrice = meta.postMarketPrice || meta.preMarketPrice || meta.regularMarketPrice || latestPointPrice;
      const startPrice = meta.chartPreviousClose || meta.previousClose || points[0].price;
      const prices = points.map(p => p.price);
      const high = Math.max(meta.regularMarketDayHigh || 0, ...prices, currentPrice);
      const low = Math.min(meta.regularMarketDayLow || Infinity, ...prices, currentPrice);
      const change = Number((currentPrice - startPrice).toFixed(2));
      const changePercent = Number((((currentPrice - startPrice) / (startPrice || 1)) * 100).toFixed(2));

      const payload = {
        symbol,
        timeframe,
        points,
        sessionStartUnix,
        sessionEndUnix,
        startPrice,
        currentPrice,
        change,
        changePercent,
        high,
        low,
        previousClose: meta.previousClose || startPrice,
        fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
        marketCap: meta.marketCap,
        currency: meta.currency || 'USD',
        exchangeName: meta.exchangeName,
        source: 'yahoo-finance-proxy',
      };

      cache.set(cacheKey, { timestamp: Date.now(), data: payload });
      return res.json(payload);
    } catch (err: any) {
      console.error('Error fetching candles from Yahoo proxy:', err?.message || err);
      return res.status(500).json({ 
        error: 'Failed to fetch historical market data', 
        message: err?.message || String(err) 
      });
    }
  });

  // Explicit JSON 404 for any unmatched /api/* route so it never falls through to HTML SPA
  app.all('/api/*', (_req, res) => {
    res.status(404).json({ error: 'API route not found' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

