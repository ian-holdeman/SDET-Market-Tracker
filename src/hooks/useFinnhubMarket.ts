import { useState, useEffect, useRef, useCallback } from 'react';
import { BoardStock } from '../types';
import { INITIAL_BOARD_STOCKS } from '../data/marketData';
import {
  fetchFinnhubMetrics,
  formatMarketCapMillions,
  extractFinnhubPERatio,
  DEFAULT_FINNHUB_KEY,
  getActiveFinnhubApiKey,
} from '../services/finnhub';
import { fetchProxyQuotes, ProxyQuoteItem } from '../services/yahooMarket';

export type SocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';
export type FeedMode = 'websocket' | 'synced_rest' | 'offline_error';

export function useFinnhubMarket() {
  const [stocks, setStocks] = useState<BoardStock[]>(INITIAL_BOARD_STOCKS);
  const [socketStatus, setSocketStatus] = useState<SocketStatus>('connecting');
  const [feedMode, setFeedMode] = useState<FeedMode>('synced_rest');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [lastTickTime, setLastTickTime] = useState<string | null>(null);
  const [totalTicks, setTotalTicks] = useState<number>(0);
  const [lastUpdatedSymbol, setLastUpdatedSymbol] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>(getActiveFinnhubApiKey);
  const [isLoadingLiveMetrics, setIsLoadingLiveMetrics] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(false);

  const socketRef = useRef<WebSocket | null>(null);
  const tickClearTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const lastWsTradeTimeRef = useRef<number>(0);

  // Update & persist custom API key
  const saveApiKey = useCallback((newKey: string) => {
    const cleaned = newKey.trim();
    if (cleaned) {
      localStorage.setItem('finnhub_api_key', cleaned);
      setApiKey(cleaned);
    } else {
      localStorage.removeItem('finnhub_api_key');
      setApiKey(DEFAULT_FINNHUB_KEY);
    }
  }, []);

  // 1. Primary Live Sync: Fetch 100% accurate quotes via server Yahoo proxy & enrich with Finnhub metrics
  const fetchLiveMarketData = useCallback(async () => {
    setIsLoadingLiveMetrics(true);
    const symbols = INITIAL_BOARD_STOCKS.map((s) => s.symbol);

    try {
      // 1. Fetch real batch quotes from server Yahoo Finance proxy
      const proxyQuotes: ProxyQuoteItem[] | null = await fetchProxyQuotes(symbols);

      if (!proxyQuotes || proxyQuotes.length === 0) {
        throw new Error('No quote data returned from market data proxy');
      }

      const quoteMap = new Map<string, ProxyQuoteItem>();
      proxyQuotes.forEach((q) => quoteMap.set(q.symbol, q));

      const nowTimeStr = new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });

      // 2. Apply fresh real-world quotes to state
      setStocks((prevStocks) =>
        prevStocks.map((stock) => {
          const live = quoteMap.get(stock.symbol);
          if (!live) return stock;

          const currentPrice = live.price;
          const prevClose = live.prevClose || stock.prevClose || currentPrice;
          const change = live.change;
          const changePercent = live.changePercent;
          const dayHigh = live.dayHigh;
          const dayLow = live.dayLow;
          const open = live.open;
          const fiftyTwoHigh = live.fiftyTwoWeekHigh || stock.fiftyTwoWeekHigh;
          const fiftyTwoLow = live.fiftyTwoWeekLow || stock.fiftyTwoWeekLow;

          // Format market cap
          let formattedMarketCap = stock.marketCap;
          if (live.marketCap && live.marketCap > 0) {
            if (live.marketCap >= 1e12) {
              formattedMarketCap = `$${(live.marketCap / 1e12).toFixed(2)}T`;
            } else if (live.marketCap >= 1e9) {
              formattedMarketCap = `$${(live.marketCap / 1e9).toFixed(1)}B`;
            } else if (live.marketCap >= 1e6) {
              formattedMarketCap = `$${(live.marketCap / 1e6).toFixed(1)}M`;
            }
          }

          const sparkline =
            live.sparkline && live.sparkline.length >= 4
              ? live.sparkline
              : stock.sparkline && stock.sparkline.length > 0
              ? stock.sparkline
              : [prevClose, currentPrice];

          return {
            ...stock,
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
            volume: live.volume || stock.volume,
            sparkline,
            lastUpdated: nowTimeStr,
          };
        })
      );

      setLastSyncTime(nowTimeStr);
      setIsOffline(false);
      setErrorMessage(null);
      setFeedMode((prev) => (prev === 'websocket' ? 'websocket' : 'synced_rest'));

      // 3. Staggered background enrichment of P/E ratios and dividends via Finnhub
      const activeKey = apiKey || DEFAULT_FINNHUB_KEY;
      for (const sym of symbols) {
        try {
          const metric = await fetchFinnhubMetrics(sym, activeKey);
          if (metric) {
            setStocks((prev) =>
              prev.map((s) => {
                if (s.symbol !== sym) return s;
                const peRatio = extractFinnhubPERatio(s.price, metric, s.peRatio);
                const dividendYield =
                  metric.dividendYieldIndicatedAnnual ||
                  metric.dividendYield5Y ||
                  s.dividendYield;
                const mCap =
                  formatMarketCapMillions(metric.marketCapitalization) || s.marketCap;

                return {
                  ...s,
                  peRatio: peRatio && peRatio > 0 ? Number(peRatio.toFixed(1)) : s.peRatio,
                  dividendYield:
                    dividendYield && dividendYield > 0
                      ? Number(dividendYield.toFixed(2))
                      : s.dividendYield,
                  marketCap: mCap || s.marketCap,
                };
              })
            );
          }
        } catch {
          // Non-critical background metric failure
        }
        await new Promise((resolve) => setTimeout(resolve, 40));
      }
    } catch (err: any) {
      console.warn('[Market Feed] Error syncing market data:', err?.message || err);
      setIsOffline(true);
      setFeedMode('offline_error');
      setErrorMessage(
        'Market data feed connection interrupted. Showing last confirmed market data.'
      );
    } finally {
      setIsLoadingLiveMetrics(false);
    }
  }, [apiKey]);

  // 2. Establish persistent Finnhub WebSocket connection for live tick execution
  const connectWebSocket = useCallback(() => {
    try {
      if (socketRef.current) {
        socketRef.current.close();
      }

      setSocketStatus('connecting');
      const activeKey = apiKey || DEFAULT_FINNHUB_KEY;
      const wsUrl = `wss://ws.finnhub.io?token=${activeKey}`;
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setSocketStatus('connected');
        INITIAL_BOARD_STOCKS.forEach((stock) => {
          ws.send(JSON.stringify({ type: 'subscribe', symbol: stock.symbol }));
        });
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          if (payload.type === 'trade' && Array.isArray(payload.data) && payload.data.length > 0) {
            lastWsTradeTimeRef.current = Date.now();
            setFeedMode('websocket');
            const nowTime = new Date().toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              second: '2-digit',
              hour12: true,
            });
            setLastTickTime(nowTime);
            setTotalTicks((prev) => prev + payload.data.length);

            payload.data.forEach((trade: { s: string; p: number; v?: number; t?: number }) => {
              const symbol = trade.s;
              const newPrice = Number(trade.p.toFixed(2));
              const tradeVolume = trade.v || 0;

              setLastUpdatedSymbol(symbol);

              setStocks((currentStocks) => {
                return currentStocks.map((stock) => {
                  if (stock.symbol !== symbol) return stock;

                  const oldPrice = stock.price;
                  const tickDir: 'up' | 'down' | 'none' =
                    newPrice > oldPrice ? 'up' : newPrice < oldPrice ? 'down' : 'none';

                  const prevClose = stock.prevClose || (newPrice - stock.change);
                  const change = Number((newPrice - prevClose).toFixed(2));
                  const changePercent = Number((((newPrice - prevClose) / prevClose) * 100).toFixed(2));
                  const dayHigh = Math.max(stock.dayHigh, newPrice);
                  const dayLow = Math.min(stock.dayLow, newPrice);
                  const fiftyTwoWeekHigh = Math.max(stock.fiftyTwoWeekHigh, newPrice);
                  const fiftyTwoWeekLow = Math.min(stock.fiftyTwoWeekLow, newPrice);
                  const newVolume = stock.volume + tradeVolume;

                  if (tickClearTimers.current[symbol]) {
                    clearTimeout(tickClearTimers.current[symbol]);
                  }

                  tickClearTimers.current[symbol] = setTimeout(() => {
                    setStocks((latest) =>
                      latest.map((s) => (s.symbol === symbol ? { ...s, lastTickDirection: 'none' } : s))
                    );
                  }, 1000);

                  const newTradeTick = {
                    price: newPrice,
                    volume: tradeVolume,
                    timestamp: trade.t || Date.now(),
                    timeStr: nowTime,
                    direction: tickDir,
                  };

                  const updatedTrades = [newTradeTick, ...(stock.recentTrades || [])].slice(0, 10);
                  const currentSparkline =
                    stock.sparkline && stock.sparkline.length > 0 ? stock.sparkline : [oldPrice];
                  const updatedSparkline = [...currentSparkline.slice(-24), newPrice];

                  return {
                    ...stock,
                    price: newPrice,
                    change,
                    changePercent,
                    dayHigh,
                    dayLow,
                    fiftyTwoWeekHigh,
                    fiftyTwoWeekLow,
                    volume: newVolume,
                    lastTickDirection: tickDir,
                    tickCount: stock.tickCount + 1,
                    lastUpdated: nowTime,
                    sparkline: updatedSparkline,
                    recentTrades: updatedTrades,
                  };
                });
              });
            });
          } else if (payload.type === 'ping') {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'pong' }));
            }
          }
        } catch (parseErr) {
          console.error('Failed to parse WebSocket message:', parseErr);
        }
      };

      ws.onerror = (error) => {
        console.warn('Finnhub WebSocket error:', error);
        setSocketStatus('error');
      };

      ws.onclose = () => {
        setSocketStatus('disconnected');
      };
    } catch (err) {
      console.error('Error connecting Finnhub WebSocket:', err);
      setSocketStatus('error');
    }
  }, [apiKey]);

  // Initial mount & periodic background quote refresh every 30s
  useEffect(() => {
    fetchLiveMarketData();
    connectWebSocket();

    const refreshTimer = setInterval(() => {
      fetchLiveMarketData();
    }, 30000);

    return () => {
      clearInterval(refreshTimer);
      if (socketRef.current) {
        socketRef.current.close();
      }
      Object.values(tickClearTimers.current).forEach(clearTimeout);
    };
  }, [fetchLiveMarketData, connectWebSocket]);

  return {
    stocks,
    socketStatus,
    feedMode,
    lastSyncTime,
    lastTickTime,
    totalTicks,
    lastUpdatedSymbol,
    apiKey,
    saveApiKey,
    isLoadingLiveMetrics,
    errorMessage,
    isOffline,
    reconnect: () => {
      connectWebSocket();
      fetchLiveMarketData();
    },
    refreshQuotes: fetchLiveMarketData,
  };
}
