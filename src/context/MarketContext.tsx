import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { BoardStock } from '../types';
import { INITIAL_BOARD_STOCKS } from '../data/marketData';
import { fetchProxyQuotes, ProxyQuoteItem, preloadProxyCandles } from '../services/yahooMarket';
import { preloadTickerLogos } from '../components/TickerLogo';
import { useAuth } from './AuthContext';
import { getSupabase } from '../lib/supabase';

export type SocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';
export type FeedMode = 'synced_rest' | 'offline_error';

export interface MarketContextType {
  stocks: BoardStock[];
  curatedSymbols: string[];
  curationError: string | null;
  changeCuration: (symbol: string, add: boolean) => Promise<void>;
  socketStatus: SocketStatus;
  feedMode: FeedMode;
  lastSyncTime: string | null;
  lastTickTime: string | null;
  totalTicks: number;
  lastUpdatedSymbol: string | null;
  isLoadingLiveMetrics: boolean;
  errorMessage: string | null;
  isOffline: boolean;
  latencyMs: number | null;
  reconnect: () => void;
  refreshQuotes: () => Promise<void>;
  fetchSingleAssetQuote: (symbol: string) => Promise<BoardStock | null>;
  addWatchlistStock: (stock: BoardStock) => void;
  removeWatchlistStock: (symbol: string) => void;
  isInitialLoadComplete: boolean;
}

const MarketContext = createContext<MarketContextType | undefined>(undefined);

const CACHE_KEY = 'imt_cached_market_stocks_v6';

function getInitialCachedStocks(): BoardStock[] {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const cachedMap = new Map<string, BoardStock>(parsed.map((s: BoardStock) => [s.symbol, s]));
        // Reconcile with INITIAL_BOARD_STOCKS so only the curated 50 are initialized
        return INITIAL_BOARD_STOCKS.map((init) => cachedMap.get(init.symbol) || init);
      }
    }
  } catch {
    // Ignore cache errors
  }
  return INITIAL_BOARD_STOCKS;
}

export const MarketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [curatedSymbols, setCuratedSymbols] = useState(INITIAL_BOARD_STOCKS.map((s) => s.symbol));
  const [curationError, setCurationError] = useState<string | null>(null);
  const curatedStocks = useMemo(() => curatedSymbols.map((symbol): BoardStock =>
    INITIAL_BOARD_STOCKS.find((s) => s.symbol === symbol) || {
      symbol, name: symbol, assetType: 'Stock', price: 0, change: 0, changePercent: 0,
      prevClose: 0, open: 0, dayHigh: 0, dayLow: 0, fiftyTwoWeekHigh: 0,
      fiftyTwoWeekLow: 0, volume: 0, sparkline: [], lastUpdated: '', tickCount: 0,
    }), [curatedSymbols]);
  const reloadCuration = useCallback(async () => {
    const result = await getSupabase().from('curated_assets').select('symbol').order('symbol');
    if (result.error) throw new Error('Curated Board membership could not be loaded. Displaying the last available list.');
    setCuratedSymbols(result.data.map((row) => row.symbol));
    setCurationError(null);
  }, []);
  useEffect(() => {
    try { getSupabase(); } catch { return; }
    const refresh = () => { void reloadCuration().catch((err) => setCurationError(err.message)); };
    refresh();
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [reloadCuration]);
  const changeCuration = async (symbol: string, add: boolean) => {
    const client = getSupabase();
    const result = add
      ? await client.from('curated_assets').insert({ symbol }).select('symbol')
      : await client.from('curated_assets').delete().eq('symbol', symbol).select('symbol');
    if (result.error || result.data?.length !== 1) throw new Error('Curated membership change was not confirmed. Check your permissions and whether the asset is in the catalog.');
    await reloadCuration();
  };
  const universe = useMemo(() => ({}), [curatedStocks, user?.id, JSON.stringify(user?.watchlist)]);
  const universeRef = useRef(universe);
  universeRef.current = universe;
  const [stocks, setStocks] = useState<BoardStock[]>(getInitialCachedStocks);
  const [socketStatus, setSocketStatus] = useState<SocketStatus>('connected');
  const [feedMode, setFeedMode] = useState<FeedMode>('synced_rest');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [lastTickTime, setLastTickTime] = useState<string | null>(null);
  const [totalTicks, setTotalTicks] = useState<number>(0);
  const [lastUpdatedSymbol, setLastUpdatedSymbol] = useState<string | null>(null);
  const [isLoadingLiveMetrics, setIsLoadingLiveMetrics] = useState<boolean>(false);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const tickClearTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const isFetchingRef = useRef<boolean>(false);

  // Primary Live Sync: Fetch quotes via server Yahoo proxy
  const fetchLiveMarketData = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLoadingLiveMetrics(true);
    const currentUniverse = universe;
    const startTime = Date.now();
    const symbols = Array.from(new Set([
      ...curatedStocks.map((s) => s.symbol),
      ...(user?.watchlist || []),
    ]));

    try {
      // 1. Fetch real batch quotes from server Yahoo Finance proxy
      const proxyQuotes: ProxyQuoteItem[] | null = await fetchProxyQuotes(symbols);
      if (universeRef.current !== currentUniverse) return;
      const measuredLatency = Date.now() - startTime;
      setLatencyMs(measuredLatency);

      if (!proxyQuotes || proxyQuotes.length === 0) {
        setIsInitialLoadComplete(true);
        return;
      }

      const quoteMap = new Map<string, ProxyQuoteItem>();
      proxyQuotes.forEach((q) => quoteMap.set(q.symbol, q));

      const nowTimeStr = new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });

      // Reconcile and atomic state update containing quotes
      setStocks((prevStocks) => {
        const prevMap = new Map(prevStocks.map((s) => [s.symbol, s]));
        // Reconcile with curatedStocks as authoritative base
        const baseStocks = curatedStocks.map((init) => prevMap.get(init.symbol) || init);
        // Also preserve any active custom watchlist symbols for the current user
        if (user && Array.isArray(user.watchlist)) {
          user.watchlist.forEach((sym) => {
            if (!baseStocks.some((b) => b.symbol === sym)) {
              const existing = prevMap.get(sym);
              if (existing) {
                baseStocks.push(existing);
              }
            }
          });
        }

        const updated = baseStocks.map((stock) => {
          const live = quoteMap.get(stock.symbol);
          if (!live) return stock;

          const currentPrice = live.price;
          const prevClose = live.prevClose || stock.prevClose || currentPrice;
          const change = live.change;
          const changePercent = live.changePercent;
          const dayHigh = live.dayHigh || stock.dayHigh;
          const dayLow = live.dayLow || stock.dayLow;
          const open = live.open || stock.open;
          const fiftyTwoHigh = live.fiftyTwoWeekHigh || stock.fiftyTwoWeekHigh;
          const fiftyTwoLow = live.fiftyTwoWeekLow || stock.fiftyTwoWeekLow;

          // Format market cap
          const formattedMarketCap = live.marketCap || stock.marketCap;

          const rawSparkline =
            live.sparkline && live.sparkline.length >= 2
              ? live.sparkline
              : stock.sparkline && stock.sparkline.length > 0
              ? stock.sparkline
              : [prevClose, currentPrice];

          const sparkline =
            prevClose > 0 && Math.abs(rawSparkline[0] - prevClose) > 0.001
              ? [prevClose, ...rawSparkline]
              : rawSparkline;

          const peRatio = live.peRatio !== undefined ? live.peRatio : stock.peRatio;
          const dividendYield = live.dividendYield !== undefined ? live.dividendYield : stock.dividendYield;
          const targetPrice1Y = live.targetPrice1Y || stock.targetPrice1Y;
          const assetType = live.assetType || stock.assetType || 'Stock';

          return {
            ...stock,
            name: stock.name === stock.symbol ? live.name || stock.name : stock.name,
            price: currentPrice,
            change,
            changePercent,
            prevClose,
            open,
            dayHigh,
            dayLow,
            fiftyTwoWeekHigh: fiftyTwoHigh,
            fiftyTwoWeekLow: fiftyTwoLow,
            marketCap: formattedMarketCap,
            peRatio,
            dividendYield,
            targetPrice1Y,
            assetType,
            volume: live.volume || stock.volume,
            sparkline,
            lastUpdated: nowTimeStr,
          };
        });

        // Cache in sessionStorage only for the curated 50
        try {
          const baseOnly = updated.filter((s) => curatedStocks.some((b) => b.symbol === s.symbol));
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(baseOnly));
        } catch {
          // Ignore storage overflow
        }

        return updated;
      });

      setLastSyncTime(nowTimeStr);
      setLastTickTime(nowTimeStr);
      setTotalTicks((prev) => prev + proxyQuotes.length);
      setIsOffline(false);
      setSocketStatus('connected');
      setErrorMessage(null);
      setFeedMode('synced_rest');
      setIsInitialLoadComplete(true);

      // Pre-warm 1D intraday candles in background so card expansions render charts with 0ms latency
      setTimeout(() => {
        symbols.forEach((sym, idx) => {
          setTimeout(() => preloadProxyCandles(sym, '1D'), idx * 60);
        });
      }, 200);
    } catch (err: any) {
      console.warn('[Market Feed] Error syncing market data:', err?.message || err);
      setIsOffline(true);
      setSocketStatus('error');
      setFeedMode('offline_error');
      setErrorMessage('Market data feed connection interrupted. Showing last confirmed market data.');
      setIsInitialLoadComplete(true);
    } finally {
      isFetchingRef.current = false;
      setIsLoadingLiveMetrics(false);
    }
  }, [user?.watchlist, curatedStocks, universe]);

  // Fetch a single asset quote on demand from the universal proxy without mutating board state
  const fetchSingleAssetQuote = useCallback(async (symbol: string): Promise<BoardStock | null> => {
    const cleanSym = symbol.trim().toUpperCase();
    if (!cleanSym) return null;

    try {
      const quotes = await fetchProxyQuotes([cleanSym]);
      if (!quotes || quotes.length === 0) return null;
      const q = quotes[0];

      const nowTimeStr = new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });

      const newStock: BoardStock = {
        symbol: q.symbol,
        name: q.name || q.symbol,
        assetType: q.assetType || 'Stock',
        category: q.assetType === 'Crypto' ? 'Cryptocurrency' : q.assetType === 'ETF' ? 'Exchange Traded Fund' : q.assetType === 'Index' ? 'Index Benchmark' : 'Equities',
        price: q.price,
        change: q.change,
        changePercent: q.changePercent,
        prevClose: q.prevClose,
        open: q.open,
        dayHigh: q.dayHigh,
        dayLow: q.dayLow,
        fiftyTwoWeekHigh: q.fiftyTwoWeekHigh || Number((q.price * 1.2).toFixed(2)),
        fiftyTwoWeekLow: q.fiftyTwoWeekLow || Number((q.price * 0.8).toFixed(2)),
        volume: q.volume,
        peRatio: q.peRatio,
        marketCap: q.marketCap || '—',
        dividendYield: q.dividendYield || 0,
        sparkline: q.sparkline && q.sparkline.length > 0 ? q.sparkline : [q.prevClose, q.price],
        lastUpdated: nowTimeStr,
        tickCount: 0,
        targetPrice1Y: q.targetPrice1Y,
      };

      // Warm 1D candles for immediate expansion
      preloadProxyCandles(cleanSym, '1D');

      return newStock;
    } catch (err) {
      console.warn(`Failed to fetch quote for ${cleanSym}:`, err);
      return null;
    }
  }, []);

  // Explicitly promote an asset to the board stocks list (when watchlisted)
  const addWatchlistStock = useCallback((stock: BoardStock) => {
    setStocks((prev) => {
      if (prev.some((s) => s.symbol === stock.symbol)) return prev;
      return [...prev, stock];
    });
  }, []);

  // Remove a custom asset from board stocks (when un-watchlisted)
  const removeWatchlistStock = useCallback((symbol: string) => {
    const isBaseStock = curatedStocks.some((b) => b.symbol === symbol);
    if (isBaseStock) return; // Never remove curated base stocks
    setStocks((prev) => prev.filter((s) => s.symbol !== symbol));
  }, [curatedStocks]);

  // Cancel late quote responses when the authenticated UUID or membership changes.
  useEffect(() => {
    let active = true;
    const wanted = new Set([...curatedSymbols, ...(user?.watchlist || [])]);
    setStocks((prev) => prev.filter((stock) => wanted.has(stock.symbol)));
    const custom = (user?.watchlist || []).filter((symbol) => !curatedSymbols.includes(symbol));
    void Promise.all(custom.map(fetchSingleAssetQuote)).then((quotes) => {
      if (!active) return;
      setStocks((prev) => {
        const next = new Map(prev.map((stock) => [stock.symbol, stock]));
        quotes.forEach((stock) => { if (stock && wanted.has(stock.symbol)) next.set(stock.symbol, stock); });
        return [...next.values()];
      });
    });
    return () => { active = false; };
  }, [user?.id, JSON.stringify(user?.watchlist), curatedSymbols, fetchSingleAssetQuote]);

  // Initial root mount and continuous background refresh (15s interval)
  useEffect(() => {
    // Eagerly preload all ticker logo assets across the board universe into the browser cache
    preloadTickerLogos(curatedStocks.map(s => s.symbol));

    fetchLiveMarketData();

    const refreshTimer = setInterval(() => {
      fetchLiveMarketData();
    }, 15000);

    return () => {
      clearInterval(refreshTimer);
      Object.values(tickClearTimers.current).forEach(clearTimeout);
    };
  }, [fetchLiveMarketData]);

  const value: MarketContextType = {
    stocks,
    curatedSymbols, curationError, changeCuration,
    socketStatus,
    feedMode,
    lastSyncTime,
    lastTickTime,
    totalTicks,
    lastUpdatedSymbol,
    isLoadingLiveMetrics,
    errorMessage,
    isOffline,
    latencyMs,
    reconnect: fetchLiveMarketData,
    refreshQuotes: fetchLiveMarketData,
    fetchSingleAssetQuote,
    addWatchlistStock,
    removeWatchlistStock,
    isInitialLoadComplete,
  };

  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>;
};

export function useMarket(): MarketContextType {
  const context = useContext(MarketContext);
  if (!context) {
    throw new Error('useMarket must be used within a MarketProvider');
  }
  return context;
}

