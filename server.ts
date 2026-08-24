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

async function fetchYahooFinanceChart(symbol: string, range: string, interval: string) {
  const yahooSym = getYahooSymbol(symbol);
  const urls = [
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?range=${range}&interval=${interval}&includePrePost=false`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?range=${range}&interval=${interval}&includePrePost=false`,
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
            const chart = await fetchYahooFinanceChart(sym, '1d', '15m');
            const meta = chart.meta || {};
            const quote = chart.indicators?.quote?.[0] || {};
            const closes: (number | null)[] = (quote.close || []).filter((c: any) => typeof c === 'number' && c !== null);

            const currentPrice = meta.regularMarketPrice || (closes.length > 0 ? closes[closes.length - 1] : 0);
            const prevClose = meta.chartPreviousClose || meta.previousClose || (closes.length > 0 ? closes[0] : currentPrice);
            const change = Number((currentPrice - prevClose).toFixed(2));
            const changePercent = Number((((currentPrice - prevClose) / (prevClose || 1)) * 100).toFixed(2));

            return {
              symbol: sym,
              price: currentPrice,
              change,
              changePercent,
              prevClose,
              open: meta.regularMarketOpen || prevClose,
              dayHigh: meta.regularMarketDayHigh || currentPrice,
              dayLow: meta.regularMarketDayLow || currentPrice,
              volume: meta.regularMarketVolume || 0,
              fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
              fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
              marketCap: meta.marketCap,
              currency: meta.currency || 'USD',
              exchangeName: meta.exchangeName,
              sparkline: closes.length >= 6 ? closes.slice(-24) : [prevClose, currentPrice],
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

      // Filter and format clean points
      const points: Array<{
        date: string;
        label: string;
        price: number;
        volume?: number;
        timestamp: number;
      }> = [];

      for (let i = 0; i < timestamps.length; i++) {
        const closePrice = rawCloses[i];
        if (closePrice !== null && closePrice !== undefined && !isNaN(closePrice)) {
          const unixTime = timestamps[i] * 1000;
          const dateObj = new Date(unixTime);

          let label = '';
          if (timeframe === '1D') {
            const hours = dateObj.getHours();
            const mins = dateObj.getMinutes();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            const h = hours % 12 === 0 ? 12 : hours % 12;
            const m = mins < 10 ? `0${mins}` : mins;
            label = `${h}:${m} ${ampm}`;
          } else if (timeframe === '1W') {
            const day = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
            const hours = dateObj.getHours();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            const h = hours % 12 === 0 ? 12 : hours % 12;
            const m = minsToString(dateObj.getMinutes());
            label = `${day} ${h}:${m} ${ampm}`;
          } else if (timeframe === '1M') {
            label = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          } else if (timeframe === 'YTD' || timeframe === '1Y') {
            label = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
          } else {
            label = dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          }

          points.push({
            date: label,
            label,
            price: Number(closePrice.toFixed(2)),
            volume: rawVolumes[i] || undefined,
            timestamp: unixTime,
          });
        }
      }

      function minsToString(m: number) {
        return m < 10 ? `0${m}` : `${m}`;
      }

      if (points.length === 0) {
        return res.status(404).json({ error: `No candle data points parsed for ${symbol}` });
      }

      const currentPrice = meta.regularMarketPrice || points[points.length - 1].price;
      const startPrice = meta.chartPreviousClose || meta.previousClose || points[0].price;
      const prices = points.map(p => p.price);
      const high = meta.regularMarketDayHigh || Math.max(...prices);
      const low = meta.regularMarketDayLow || Math.min(...prices);
      const change = Number((currentPrice - startPrice).toFixed(2));
      const changePercent = Number((((currentPrice - startPrice) / (startPrice || 1)) * 100).toFixed(2));

      const payload = {
        symbol,
        timeframe,
        points,
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

