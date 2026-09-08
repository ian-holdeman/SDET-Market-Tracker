import { emptyStock, applyQuote } from '../utils/marketValues';
import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { BoardStock } from '../types';
import { INITIAL_BOARD_STOCKS } from '../data/marketData';
import { fetchProxyQuotes, ProxyQuoteItem } from '../services/yahooMarket';
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

const getInitialCachedStocks = () => INITIAL_BOARD_STOCKS;

export const MarketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [curatedSymbols, setCuratedSymbols] = useState(INITIAL_BOARD_STOCKS.map((s) => s.symbol));
  const [curationError, setCurationError] = useState<string | null>(null);
  const curatedStocks = useMemo(() => curatedSymbols.map((symbol): BoardStock =>
    INITIAL_BOARD_STOCKS.find((s) => s.symbol === symbol) || emptyStock(symbol)), [curatedSymbols]);
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
  const [socketStatus, setSocketStatus] = useState<SocketStatus>('connecting');
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

      if (!proxyQuotes?.length) throw new Error('No quotes received');

      const quoteMap = new Map<string, ProxyQuoteItem>();
      proxyQuotes.forEach((q) => quoteMap.set(q.symbol, q));

      const nowTimeStr = new Date(Math.min(...proxyQuotes.map(q => Date.parse(q.fetchedAt)))).toLocaleString();
      const partial = symbols.some(symbol => !proxyQuotes.some(q => q.symbol === symbol));
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
          return live ? applyQuote(stock, live) : { ...stock, dataStatus: stock.asOf ? 'stale' as const : 'unavailable' as const };
        });

        return updated;
      });

      setLastSyncTime(nowTimeStr);
      setLastTickTime(nowTimeStr);
      setTotalTicks((prev) => prev + proxyQuotes.length);
      setIsOffline(partial);
      setSocketStatus(partial ? 'error' : 'connected');
      setErrorMessage(partial ? 'Some assets could not be updated. Their previous data is marked stale.' : null);
      setFeedMode('synced_rest');
      setIsInitialLoadComplete(true);

    } catch (err: any) {
      if (universeRef.current !== currentUniverse) return;
      setStocks(prev => prev.map(s => ({ ...s, dataStatus: s.asOf ? 'stale' : 'unavailable' })));
      console.warn('[Market Feed] Error syncing market data:', err?.message || err);
      setIsOffline(true);
      setSocketStatus('error');
      setFeedMode('offline_error');
      setErrorMessage('Market update failed. Previous observations are stale; assets without data remain unavailable.');
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
      const q = quotes.find(q => q.symbol === cleanSym);
      if (!q) return null;

      const newStock = applyQuote(emptyStock(cleanSym), q);
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
    setStocks((prev) => { const existing = new Map(prev.map(stock => [stock.symbol, stock])); return [...wanted].map(symbol => existing.get(symbol) ?? emptyStock(symbol)); });
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

