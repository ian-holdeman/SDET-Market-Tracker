import express from "express";
import path from "path";
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import dotenv from 'dotenv';
import { configuredAccountRouter } from './server/account';

dotenv.config({ path: ['.env.local', '.env'], quiet: true });

interface CachedData {
  timestamp: number;
  data: any;
}

const cache = new Map<string, CachedData>();
const CACHE_TTL_MS = 15 * 1000; // 15-second cache for fresh market data

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
  const upper = sym.toUpperCase().trim();
  if (upper === 'BTC') return 'BTC-USD';
  if (upper === 'ETH') return 'ETH-USD';
  if (upper === 'SOL') return 'SOL-USD';
  if (upper === 'DOGE') return 'DOGE-USD';
  if (upper === 'SPX' || upper === 'SP500') return '^GSPC';
  if (upper === 'DOW' || upper === 'DJI') return '^DJI';
  if (upper === 'NDX' || upper === 'COMP') return '^IXIC';
  if (upper === 'RUT') return '^RUT';
  if (upper === 'GOLD') return 'GC=F';
  if (upper === 'OIL' || upper === 'CRUDE') return 'CL=F';
  if (upper === 'SILVER') return 'SI=F';
  return upper;
}

function inferAssetType(sym: string, quoteType?: string): 'Stock' | 'ETF' | 'Crypto' | 'Index' | 'Commodity' | 'Bond Yield' {
  const upper = sym.toUpperCase();
  const qType = (quoteType || '').toUpperCase();
  if (upper === '^TNX' || upper === 'AGG' || qType === 'YIELD') {
    return 'Bond Yield';
  }
  if (qType === 'CRYPTOCURRENCY' || upper.endsWith('-USD') || ['BTC', 'ETH', 'SOL', 'DOGE', 'XRP', 'ADA'].includes(upper)) {
    return 'Crypto';
  }
  if (['GLD', 'USO', 'GOLD', 'OIL', 'SILVER'].includes(upper) || qType === 'COMMODITY' || upper.endsWith('=F')) {
    return 'Commodity';
  }
  if (qType === 'ETF' || qType === 'MUTUALFUND') {
    return 'ETF';
  }
  if (qType === 'INDEX' || upper.startsWith('^') || ['SPX', 'DOW', 'NDX', 'RUT'].includes(upper)) {
    return 'Index';
  }
  return 'Stock';
}

function formatMarketCap(cap?: number): string | undefined {
  if (!cap || cap <= 0 || isNaN(cap)) return undefined;
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(1)}B`;
  if (cap >= 1e6) return `$${(cap / 1e6).toFixed(1)}M`;
  return `$${cap.toLocaleString()}`;
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

/**
 * Fetch rich quote fundamentals from Yahoo Finance v7 quote endpoint
 */
async function fetchYahooQuotesBatch(symbols: string[]): Promise<Map<string, any>> {
  const resultsMap = new Map<string, any>();
  if (symbols.length === 0) return resultsMap;

  const yahooSymbols = symbols.map(getYahooSymbol);
  const urls = [
    `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(yahooSymbols.join(','))}`,
    `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(yahooSymbols.join(','))}`,
  ];

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'application/json',
  };

  for (const url of urls) {
    try {
      const response = await fetch(url, { headers });
      if (response.ok) {
        const json: any = await response.json();
        const quoteList: any[] = json?.quoteResponse?.result || [];
        for (const item of quoteList) {
          if (item && item.symbol) {
            resultsMap.set(item.symbol.toUpperCase(), item);
          }
        }
        if (resultsMap.size > 0) {
          return resultsMap;
        }
      }
    } catch {
      // Try next mirror
    }
  }

  return resultsMap;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);
  if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  app.use(express.json());
  app.use(configuredAccountRouter(process.env));

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });

  // /api/quotes: Batch fetch real-world quotes & fundamentals for multiple symbols
  app.get("/api/quotes", async (req, res) => {
    try {
      const rawSymbols = String(req.query.symbols || 'VTI,SPY,QQQ,AAPL,GOOGL,MSFT,AMZN,NVDA,META,TSLA,SCHD,VXUS');
      const symbols = rawSymbols.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);

      const cacheKey = `QUOTES_${symbols.sort().join('_')}`;
      const cached = cache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return res.json({ quotes: cached.data, cached: true, timestamp: cached.timestamp });
      }

      // Fetch batch fundamentals from Yahoo v7 Quote API
      const richQuotesMap = await fetchYahooQuotesBatch(symbols);

      // Fetch chart 1d meta & sparklines for each symbol with concurrency chunking (10 at a time)
      const quotes: any[] = [];
      const CHUNK_SIZE = 10;
      for (let i = 0; i < symbols.length; i += CHUNK_SIZE) {
        const chunk = symbols.slice(i, i + CHUNK_SIZE);
        const chunkResults = await Promise.allSettled(
          chunk.map(async (sym) => {
            const yahooSym = getYahooSymbol(sym);
            const richQuote = richQuotesMap.get(yahooSym) || richQuotesMap.get(sym);

            let chart: any = null;
            try {
              chart = await fetchYahooFinanceChart(sym, '1d', '15m', true);
            } catch {
              // Non-fatal if richQuote has current numbers
            }

            const meta = chart?.meta || {};
            const quote = chart?.indicators?.quote?.[0] || {};
            const closes: number[] = (quote.close || []).filter((c: unknown): c is number => typeof c === 'number');

            const prevClose = richQuote?.regularMarketPreviousClose || meta.chartPreviousClose || meta.previousClose || (closes.length > 0 ? closes[0] : 0);
            const latestClose = closes.length > 0 ? closes[closes.length - 1] : prevClose;
            const currentPrice = richQuote?.regularMarketPrice || meta.postMarketPrice || meta.preMarketPrice || meta.regularMarketPrice || latestClose || prevClose;
            const change = richQuote?.regularMarketChange !== undefined ? Number(richQuote.regularMarketChange.toFixed(2)) : Number((currentPrice - prevClose).toFixed(2));
            const changePercent = richQuote?.regularMarketChangePercent !== undefined ? Number(richQuote.regularMarketChangePercent.toFixed(2)) : Number((((currentPrice - prevClose) / (prevClose || 1)) * 100).toFixed(2));

            // Prepend prevClose to sparkline for anchoring
            const rawSparkline = closes.length >= 6 ? closes.slice(-28) : closes;
            const sparkline = prevClose > 0 ? [prevClose, ...rawSparkline] : (rawSparkline.length > 0 ? rawSparkline : [currentPrice]);

            const assetType = inferAssetType(sym, richQuote?.quoteType || meta.instrumentType);
            const open = richQuote?.regularMarketOpen || meta.regularMarketOpen || prevClose;
            const dayHigh = Math.max(richQuote?.regularMarketDayHigh || meta.regularMarketDayHigh || currentPrice, currentPrice, ...closes);
            const dayLow = Math.min(richQuote?.regularMarketDayLow || meta.regularMarketDayLow || currentPrice, currentPrice, ...(closes.length > 0 ? closes : [currentPrice]));
            const volume = richQuote?.regularMarketVolume || meta.regularMarketVolume || 0;
            const fiftyTwoWeekHigh = richQuote?.fiftyTwoWeekHigh || meta.fiftyTwoWeekHigh;
            const fiftyTwoWeekLow = richQuote?.fiftyTwoWeekLow || meta.fiftyTwoWeekLow;
            const marketCapNum = richQuote?.marketCap || meta.marketCap;
            const marketCapFormatted = formatMarketCap(marketCapNum);

            // PE Ratio
            let peRatio: number | undefined = undefined;
            if (assetType === 'Stock' || assetType === 'ETF') {
              const pe = richQuote?.trailingPE || richQuote?.forwardPE;
              if (typeof pe === 'number' && pe > 0) {
                peRatio = Number(pe.toFixed(1));
              }
            }

            // Dividend Yield
            let dividendYield: number | undefined = undefined;
            if (richQuote?.dividendYield !== undefined && richQuote.dividendYield > 0) {
              dividendYield = Number(richQuote.dividendYield.toFixed(2));
            } else if (richQuote?.trailingAnnualDividendYield !== undefined && richQuote.trailingAnnualDividendYield > 0) {
              dividendYield = Number((richQuote.trailingAnnualDividendYield * 100).toFixed(2));
            }

            // Wall Street Price Target
            let targetPrice1Y: any = undefined;
            if (richQuote?.targetPriceMean || richQuote?.targetMeanPrice) {
              const mean = richQuote.targetPriceMean || richQuote.targetMeanPrice;
              const high = richQuote.targetPriceHigh || richQuote.targetHighPrice || mean * 1.15;
              const low = richQuote.targetPriceLow || richQuote.targetLowPrice || mean * 0.85;
              targetPrice1Y = {
                targetMean: Number(mean.toFixed(2)),
                targetHigh: Number(high.toFixed(2)),
                targetLow: Number(low.toFixed(2)),
                consensusRating: richQuote.averageAnalystRating || 'Moderate Buy',
                analystCount: richQuote.numberOfAnalystOpinions || 20,
              };
            }

            return {
              symbol: sym,
              name: richQuote?.longName || richQuote?.shortName || meta.longName || meta.shortName || undefined,
              assetType,
              price: currentPrice,
              change,
              changePercent,
              prevClose,
              open,
              dayHigh,
              dayLow,
              volume,
              fiftyTwoWeekHigh,
              fiftyTwoWeekLow,
              marketCap: marketCapFormatted,
              peRatio,
              dividendYield,
              targetPrice1Y,
              currency: richQuote?.currency || meta.currency || 'USD',
              exchangeName: richQuote?.fullExchangeName || meta.exchangeName,
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

  // /api/search: Universal asset search proxy using Yahoo Finance search (USD primary listings)
  app.get("/api/search", async (req, res) => {
    try {
      const q = String(req.query.q || '').trim();
      if (!q || q.length < 1) {
        return res.json({ results: [] });
      }

      const cleanUpper = q.toUpperCase();

      // Quick match for common crypto searches
      const cryptoMap: Record<string, { symbol: string; name: string }> = {
        BTC: { symbol: 'BTC', name: 'Bitcoin USD' },
        BITCOIN: { symbol: 'BTC', name: 'Bitcoin USD' },
        ETH: { symbol: 'ETH', name: 'Ethereum USD' },
        ETHEREUM: { symbol: 'ETH', name: 'Ethereum USD' },
        SOL: { symbol: 'SOL', name: 'Solana USD' },
        SOLANA: { symbol: 'SOL', name: 'Solana USD' },
        DOGE: { symbol: 'DOGE', name: 'Dogecoin USD' },
        DOGECOIN: { symbol: 'DOGE', name: 'Dogecoin USD' },
        XRP: { symbol: 'XRP', name: 'XRP USD' },
        ADA: { symbol: 'ADA', name: 'Cardano USD' },
        AVAX: { symbol: 'AVAX', name: 'Avalanche USD' },
        LINK: { symbol: 'LINK', name: 'Chainlink USD' },
      };

      if (cryptoMap[cleanUpper]) {
        const item = cryptoMap[cleanUpper];
        return res.json({
          results: [{
            symbol: item.symbol,
            name: item.name,
            exchange: 'Crypto (USD)',
            type: 'Cryptocurrency',
            assetType: 'Crypto',
          }]
        });
      }

      const cacheKey = `SEARCH_${cleanUpper}`;
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 60 * 1000) {
        return res.json({ results: cached.data });
      }

      const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=12&newsCount=0`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        return res.json({ results: [] });
      }

      const json: any = await response.json();
      const rawQuotes = json?.quotes || [];

      // Foreign exchange keywords to filter out foreign duplicates
      const foreignExchanges = [
        'toronto', 'swiss', 'milan', 'frankfurt', 'são paulo', 'sao paulo', 'set',
        'lse', 'tsx', 'bse', 'nse', 'asx', 'euronext', 'xetra', 'hong kong',
        'tokyo', 'paris', 'amsterdam', 'madrid', 'vienna', 'shanghai', 'shenzhen'
      ];

      const cleanQuotes = rawQuotes.filter((item: any) => {
        if (!item.symbol) return false;
        const sym = item.symbol.toUpperCase();
        // Allow clean US tickers without dots/colons, or standard crypto/index symbols
        if (sym.includes('.') || sym.includes(':') || sym.includes('=')) {
          return false;
        }
        const exch = (item.exchDisp || item.exchange || '').toLowerCase();
        if (foreignExchanges.some(fx => exch.includes(fx))) {
          return false;
        }
        return true;
      });

      // 1. Check for exact symbol match
      const exactMatch = cleanQuotes.find((item: any) => item.symbol.toUpperCase() === cleanUpper);
      if (exactMatch) {
        const result = [{
          symbol: exactMatch.symbol,
          name: exactMatch.shortname || exactMatch.longname || exactMatch.symbol,
          exchange: exactMatch.exchDisp || exactMatch.exchange || 'USD',
          type: exactMatch.typeDisp || exactMatch.quoteType,
          assetType: inferAssetType(exactMatch.symbol, exactMatch.quoteType),
        }];
        cache.set(cacheKey, { timestamp: Date.now(), data: result });
        return res.json({ results: result });
      }

      // 2. Otherwise return top clean US asset(s)
      const results = cleanQuotes.slice(0, 1).map((item: any) => ({
        symbol: item.symbol,
        name: item.shortname || item.longname || item.symbol,
        exchange: item.exchDisp || item.exchange || 'USD',
        type: item.typeDisp || item.quoteType,
        assetType: inferAssetType(item.symbol, item.quoteType),
      }));

      cache.set(cacheKey, { timestamp: Date.now(), data: results });
      return res.json({ results });
    } catch (err: any) {
      console.error('Error in search proxy:', err?.message || err);
      return res.json({ results: [] });
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
  if (process.argv.includes('--development')) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = fileURLToPath(new URL('../client/', import.meta.url));
    if (!existsSync(path.join(distPath, 'index.html'))) {
      throw new Error('Production client build is missing. Run npm run build before npm start.');
    }
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if ((path.extname(req.path) && !req.path.startsWith('/board/')) ||
          /(^|\/)\./.test(req.path) || /^\/(server|@vite|@fs|src)\//.test(req.path)) {
        res.sendStatus(404);
        return;
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

