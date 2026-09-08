import { finite, fixed, priceLabel, fullPriceLabel, rangePriceLabel } from '../utils/marketValues';
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  RefreshCw,
  Layers,
  WifiOff,
  TrendingUp,
  TrendingDown,
  Maximize2,
  Minimize2,
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
  X,
  Radio,
  Star,
  LogIn,
  ChevronDown,
  Check
} from 'lucide-react';
import { BoardStock, BoardSortField, SortDirection, AssetType } from '../types';
import { useMarket } from '../context/MarketContext';
import { BoardStockDetailCard } from './BoardStockDetailCard';
import { TickerLogo, preloadTickerLogos } from './TickerLogo';
import { useAuth } from '../context/AuthContext';
import { searchProxyAssets } from '../services/yahooMarket';

interface TheBoardProps {
  initialExpandedSymbol?: string;
  onSelectStock?: (symbol?: string) => void;
}

const CATEGORY_OPTIONS: { id: 'ALL' | AssetType; label: string; shortLabel: string }[] = [
  { id: 'ALL', label: 'All Categories', shortLabel: 'All' },
  { id: 'Stock', label: 'Stocks', shortLabel: 'Stocks' },
  { id: 'ETF', label: 'ETFs', shortLabel: 'ETFs' },
  { id: 'Index', label: 'Indexes', shortLabel: 'Indexes' },
  { id: 'Crypto', label: 'Crypto', shortLabel: 'Crypto' },
  { id: 'Commodity', label: 'Commodities', shortLabel: 'Commodities' },
  { id: 'Bond Yield', label: 'Bonds & Yields', shortLabel: 'Bonds' },
];

interface BoardTableRowProps {
  stock: BoardStock;
  isExpanded: boolean;
  isLastRow: boolean;
  isWatching?: boolean;
  onToggleExpand: (symbol: string) => void;
}

// Memoized Table Row to prevent unnecessary re-renders of sparklines and range math
const BoardTableRow = React.memo<BoardTableRowProps>(({
  stock,
  isExpanded,
  isLastRow,
  isWatching = false,
  onToggleExpand,
}) => {
  const isPositive = stock.change >= 0;

  // Calculate percentage position of current price within 52-week range
  const fiftyTwoLow = stock.fiftyTwoWeekLow;
  const fiftyTwoHigh = stock.fiftyTwoWeekHigh;
  const fiftyTwoSpan = fiftyTwoHigh - fiftyTwoLow;
  const fiftyTwoWeekPct = fiftyTwoSpan > 0
    ? Math.max(0, Math.min(100, ((stock.price - fiftyTwoLow) / fiftyTwoSpan) * 100))
    : 50;

  // Intraday / Today's Trendline coordinates
  // Visual stability: Anchor vertical bounds using dayLow, dayHigh, prevClose/open, and a minimum percentage buffer
  // so individual penny ticks do not cause the SVG curve to jump drastically.
  const todayTrendData = useMemo(() => {
    const points = (stock.sparkline ?? []).filter(finite);
    const allValues = [...points, stock.dayLow, stock.dayHigh, stock.price].filter(v => finite(v));
    const refLow = Math.min(...allValues);
    const refHigh = Math.max(...allValues);

    // Guarantee a stable minimum vertical range (at least 0.75% of price) so micro-ticks don't bounce drastically
    const naturalSpan = refHigh - refLow;
    const minBufferSpan = (stock.price || 100) * 0.0075;
    const effectiveSpan = Math.max(naturalSpan, minBufferSpan);

    const midPoint = (refLow + refHigh) / 2;
    const min = midPoint - effectiveSpan / 2;
    const max = midPoint + effectiveSpan / 2;
    const range = max - min || 1;

    const width = 84;
    const height = 26;
    const paddingY = 3.5;
    const effectiveHeight = height - paddingY * 2;

    const coords = points.map((val, i) => {
      const x = points.length > 1 ? (i / (points.length - 1)) * (width - 8) + 4 : width / 2;
      const normalizedY = Math.max(0, Math.min(1, (val - min) / range));
      const y = height - paddingY - normalizedY * effectiveHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return {
      pathD: coords.length > 1 ? `M ${coords.join(' L ')}` : '',
      lastCoord: (coords[coords.length - 1] || `${width / 2},${height / 2}`).split(','),
      strokeColor: isPositive ? 'var(--color-chart-positive)' : 'var(--color-chart-negative)',
    };
  }, [stock.sparkline, stock.dayLow, stock.dayHigh, stock.prevClose, stock.price, isPositive]);

  return (
    <>
      <tr
        id={`board-row-${stock.symbol.toLowerCase()}`}
        role="button"
        tabIndex={0}
        aria-label={`${stock.symbol} ${stock.name} details`}
        data-market-status={stock.dataStatus}
        title={stock.dataStatus === 'stale' ? 'Stale market data: update failed' : stock.dataStatus === 'unavailable' ? 'Market data unavailable' : undefined}
        onClick={() => onToggleExpand(stock.symbol)}
        style={{ WebkitTapHighlightColor: 'transparent' }}
        className={`group cursor-pointer select-none transition-colors duration-150 border-l-2 outline-none focus:outline-none scroll-mt-28 sm:scroll-mt-32 ${
          isExpanded
            ? 'bg-selected-row border-l-info-500'
            : 'border-l-transparent hover:border-l-info-500/70 hover:bg-hover-row active:bg-pressed-row'
        }`}
      >
        {/* 1. Name & Asset Icon (Column 1 on mobile & desktop) */}
        <td className={`py-3.5 sm:py-4 pl-3.5 sm:pl-6 pr-1 sm:pr-3 ${!isExpanded && !isLastRow ? 'border-b border-line/60' : ''}`}>
          <div className="flex items-center space-x-2.5 sm:space-x-3.5">
            {/* Symbol Logo / Brand Icon */}
            <TickerLogo
              symbol={stock.symbol}
              assetType={stock.assetType}
              logoUrl={stock.logoUrl}
              size="md"
              className={isExpanded ? 'border-info-500 shadow-info-shadow-950/50' : ''}
            />

            <div className="flex flex-col min-w-0">
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <span className={`font-bold sm:font-extrabold tracking-tight transition-colors font-mono text-base sm:text-lg ${
                  isExpanded ? 'text-info-ink-400' : 'text-ink-heading group-hover:text-info-ink-400'
                }`}>
                  {stock.symbol}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-semibold font-mono ${
                  stock.assetType === 'ETF' || stock.assetType === 'Index'
                    ? 'bg-info-surface-950/90 text-info-ink-400 border border-info-surface-800/50 uppercase'
                    : stock.assetType === 'Crypto'
                    ? 'bg-warning-surface-950/90 text-warning-ink-400 border border-warning-surface-800/50 uppercase'
                    : stock.assetType === 'Commodity'
                    ? 'bg-commodity-surface/90 text-commodity-ink border border-commodity-line/50 uppercase'
                    : stock.assetType === 'Bond Yield'
                    ? 'bg-positive-surface-950/90 text-positive-ink-400 border border-positive-surface-800/50 uppercase'
                    : 'bg-surface-800 text-ink-secondary border border-line-strong'
                }`}>
                  {stock.symbol === 'AGG' ? 'Bonds' : (stock.assetType || 'Stock')}
                </span>
                {isWatching && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-semibold font-mono bg-accent-surface-950/90 text-accent-ink-400 border border-accent-surface-800/50">
                    Watching
                  </span>
                )}
              </div>
              <span className="text-xs text-ink-muted max-w-[140px] sm:max-w-xs truncate hidden sm:block">
                {stock.name}
              </span>
            </div>
          </div>
        </td>

        {/* 2. Today's Trendline (Desktop Only) */}
        <td className={`hidden md:table-cell py-3.5 sm:py-4 px-4 text-center ${!isExpanded && !isLastRow ? 'border-b border-line/60' : ''}`}>
          <div className="w-20 h-6 mx-auto flex items-center justify-center">
            <svg className="w-[80px] h-[24px] overflow-visible" viewBox="0 0 84 26">
              <path
                d={todayTrendData.pathD}
                fill="none"
                stroke={todayTrendData.strokeColor}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-300 ease-out"
              />
              <circle
                cx={todayTrendData.lastCoord[0]}
                cy={todayTrendData.lastCoord[1]}
                r={stock.sparkline?.length ? "2.5" : "0"}
                fill={todayTrendData.strokeColor}
                className="transition-all duration-300 ease-out"
              />
            </svg>
          </div>
        </td>

        {/* 3. Last Price (Desktop Only) */}
        <td className={`hidden md:table-cell py-3.5 sm:py-4 px-4 text-right ${!isExpanded && !isLastRow ? 'border-b border-line/60' : ''}`}>
          <div className="inline-flex flex-col items-end">
            <span className="font-mono text-base sm:text-lg font-bold sm:font-extrabold text-ink-heading">
              <span title={fullPriceLabel(stock.price, stock.currency, stock.assetType)}>{priceLabel(stock.price, stock.currency, stock.assetType)}</span>
            </span>
          </div>
        </td>

        {/* 4. Today's Change / Mobile 2nd Column with Price & Change */}
        <td className={`py-3.5 sm:py-4 px-2 sm:px-4 pr-3.5 sm:pr-4 text-right md:text-center ${!isExpanded && !isLastRow ? 'border-b border-line/60' : ''}`}>
          {/* Mobile View: Price on top (bigger, colored to match direction), Change underneath */}
          <div className="md:hidden flex flex-col items-end">
            <span className={`font-mono text-base sm:text-lg font-bold sm:font-extrabold ${
              isPositive ? 'text-positive-ink-400' : 'text-danger-ink-400'
            }`}>
              <span title={fullPriceLabel(stock.price, stock.currency, stock.assetType)}>{priceLabel(stock.price, stock.currency, stock.assetType)}</span>
            </span>
            <span className={`inline-flex items-center font-mono text-xs font-semibold mt-0.5 ${
              isPositive ? 'text-positive-ink-400/90' : 'text-danger-ink-400/90'
            }`}>
              {isPositive ? '+' : ''}{fixed(stock.changePercent)}%
            </span>
          </div>

          {/* Desktop View: Center-aligned in column with $ change snapped to the right edge of % box */}
          <div className="hidden md:flex flex-col items-center justify-center">
            <div className="inline-flex flex-col items-end">
              <span
                className={`inline-flex items-center justify-center font-mono text-sm font-bold px-3 py-1 rounded border ${
                  isPositive
                    ? 'bg-positive-surface-950/70 text-positive-ink-300 border-positive-surface-800/50'
                    : 'bg-danger-surface-950/70 text-danger-ink-300 border-danger-surface-800/50'
                }`}
              >
                {isPositive ? '+' : ''}{fixed(stock.changePercent)}%
              </span>

              <div className="mt-1 w-full text-right pr-0.5">
                <span
                  className={`text-[13px] font-mono font-semibold ${
                    isPositive ? 'text-positive-ink-400' : 'text-danger-ink-400'
                  }`}
                >
                  <span title={fullPriceLabel(stock.change, stock.currency, stock.assetType)}>{priceLabel(stock.change, stock.currency, stock.assetType)}</span>
                </span>
              </div>
            </div>
          </div>
        </td>

        {/* 5. 52W Range (Desktop Only) - Balanced 3-column grid for stable centering despite digit length variations */}
        <td className={`hidden md:table-cell py-3.5 sm:py-4 px-4 text-center ${!isExpanded && !isLastRow ? 'border-b border-line/60' : ''}`}>
          <div className="flex flex-col items-center max-w-[175px] mx-auto">
            <div className="w-full grid grid-cols-3 items-center text-[11px] font-mono mb-1">
              <span className="font-semibold text-ink-strong text-left"><span title={fullPriceLabel(fiftyTwoLow, stock.currency, stock.assetType)}>{rangePriceLabel(fiftyTwoLow, stock.currency, stock.assetType)}</span></span>
              <span className="text-[10px] text-ink-muted text-center tracking-wide">52W</span>
              <span className="font-semibold text-ink-strong text-right"><span title={fullPriceLabel(fiftyTwoHigh, stock.currency, stock.assetType)}>{rangePriceLabel(fiftyTwoHigh, stock.currency, stock.assetType)}</span></span>
            </div>
            {/* Range track */}
            <div className="w-full h-1.5 bg-surface-800/90 rounded-full overflow-hidden relative">
              <div
                className="h-full bg-info-500/40 rounded-full"
                style={{ width: '100%' }}
              />
              {/* Marker */}
              <div
                className="absolute top-0 bottom-0 w-2 bg-info-400 rounded-full shadow-sm transition-all duration-300 ease-out"
                style={{ visibility: finite(fiftyTwoLow) && finite(fiftyTwoHigh) && finite(stock.price) ? 'visible' : 'hidden', left: `calc(${fiftyTwoWeekPct}% - 4px)` }}
              />
            </div>
          </div>
        </td>
      </tr>

      {/* Expandable Drill-Down Detail Card Row */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <tr
            key={`expanded-${stock.symbol}`}
            className={`bg-chart-surface outline-none ${!isLastRow ? 'border-b border-line/60' : ''}`}
          >
            <td colSpan={5} className="p-0 border-none outline-none bg-chart-surface">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{
                  height: 'auto',
                  opacity: 1,
                  transition: {
                    height: { duration: 0.24, ease: [0.25, 1, 0.5, 1] },
                    opacity: { duration: 0.18, delay: 0.02 }
                  }
                }}
                exit={{
                  height: 0,
                  opacity: 0,
                  transition: {
                    height: { duration: 0.2, ease: [0.25, 1, 0.5, 1] },
                    opacity: { duration: 0.1 }
                  }
                }}
                className="overflow-hidden m-0 p-0 bg-chart-surface"
              >
                <div className="px-1.5 sm:px-5 pt-1 pb-3 sm:pb-5 bg-chart-surface">
                  <BoardStockDetailCard
                    stock={stock}
                    onClose={() => onToggleExpand(stock.symbol)}
                  />
                </div>
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  );
});

BoardTableRow.displayName = 'BoardTableRow';

export const TheBoard: React.FC<TheBoardProps> = ({ initialExpandedSymbol, onSelectStock }) => {
  const {
    stocks, curationError, feedMode,
    latencyMs,
    lastSyncTime,
    totalTicks,
    isLoadingLiveMetrics,
    errorMessage,
    isOffline,
    reconnect,
    refreshQuotes,
    fetchSingleAssetQuote
  } = useMarket();

  const { user, isSymbolInWatchlist, isAdmin, openAuthModal } = useAuth();

  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isSearchingUniverse, setIsSearchingUniverse] = useState(false);
  const [ephemeralSearchResults, setEphemeralSearchResults] = useState<BoardStock[]>([]);

  // Debounced Universal Asset Search for any symbol or company outside the default curated 50
  useEffect(() => {
    const query = searchQuery.trim();
    if (!query || query.length < 1) {
      setEphemeralSearchResults([]);
      setIsSearchingUniverse(false);
      return;
    }

    const cleanUpper = query.toUpperCase();
    const isAlreadyInPool = stocks.some((s) => s.symbol.toUpperCase() === cleanUpper) ||
                           ephemeralSearchResults.some((e) => e.symbol.toUpperCase() === cleanUpper);

    if (isAlreadyInPool) {
      setIsSearchingUniverse(false);
      return;
    }

    let isCancelled = false;
    setIsSearchingUniverse(true);

    const timer = setTimeout(async () => {
      try {
        setSearchError(null);
        // 1. Direct exact ticker lookup if typed format matches
        if (cleanUpper.length <= 10 && /^[A-Z0-9.\-^=]+$/.test(cleanUpper)) {
          const directQuote = await fetchSingleAssetQuote(cleanUpper);
          if (!isCancelled && directQuote) {
            setEphemeralSearchResults((prev) => {
              const filtered = prev.filter((p) => p.symbol !== directQuote.symbol);
              return [directQuote, ...filtered];
            });
            if (!isCancelled) {
              setIsSearchingUniverse(false);
            }
            return;
          }
        }

        // 2. Query universal search endpoint for broader matches
        if (query.length >= 2) {
          const results = await searchProxyAssets(query);
          if (!isCancelled && results && results.length > 0) {
            const topMatch = results.find((r) => r.symbol.toUpperCase() === cleanUpper) || results[0];
            if (topMatch && !stocks.some((s) => s.symbol === topMatch.symbol)) {
              const quote = await fetchSingleAssetQuote(topMatch.symbol);
              if (!quote) throw new Error('Quote unavailable');
              if (!isCancelled && quote) {
                setEphemeralSearchResults((prev) => {
                  const filtered = prev.filter((p) => p.symbol !== quote.symbol);
                  return [quote, ...filtered];
                });
              }
            }
          }
        }
      } catch (err) {
        if (!isCancelled) setSearchError('Asset search or quote data is unavailable. Please retry.');
      } finally {
        if (!isCancelled) {
          setIsSearchingUniverse(false);
        }
      }
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
      setIsSearchingUniverse(false);
    };
  }, [searchQuery, stocks, ephemeralSearchResults.length, fetchSingleAssetQuote]);

  // Default tab logic:
  // 1. If direct asset navigation provided (initialExpandedSymbol) -> 'ALL'
  // 2. If user has any items in their watchlist -> 'WATCHLIST'
  // 3. Otherwise (not logged in or empty watchlist) -> 'ALL'
  const [assetFilter, setAssetFilter] = useState<'ALL' | 'WATCHLIST'>(() => {
    if (initialExpandedSymbol) return 'ALL';
    if (user?.watchlist && user.watchlist.length > 0) return 'WATCHLIST';
    return 'ALL';
  });
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | AssetType>('ALL');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close category dropdown on click outside or escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsCategoryDropdownOpen(false);
      }
    };

    if (isCategoryDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCategoryDropdownOpen]);

  // Aggregate category counts and watched counts for dynamic badges and pill labels
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: stocks.length };
    const watchedCounts: Record<string, number> = { ALL: 0 };

    stocks.forEach((stock) => {
      const type = stock.assetType || 'Stock';
      counts[type] = (counts[type] || 0) + 1;
      if (isSymbolInWatchlist(stock.symbol)) {
        watchedCounts.ALL = (watchedCounts.ALL || 0) + 1;
        watchedCounts[type] = (watchedCounts[type] || 0) + 1;
      }
    });

    return { counts, watchedCounts };
  }, [stocks, isSymbolInWatchlist]);

  const watchedCountForCategory = selectedCategory === 'ALL'
    ? (categoryCounts.watchedCounts.ALL || 0)
    : (categoryCounts.watchedCounts[selectedCategory] || 0);

  const [sortField, setSortField] = useState<BoardSortField>('price');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedSymbols, setExpandedSymbols] = useState<Set<string>>(() => {
    return initialExpandedSymbol ? new Set([initialExpandedSymbol.toUpperCase()]) : new Set();
  });

  // Track initial symbol handling so clicking cards while on The Board does not flip the current tab to ALL
  const initialHandledRef = useRef<string | null>(null);

  // Automatically expand, switch to 'ALL', and smoothly snap-scroll ONLY when arriving with initialExpandedSymbol from outside (e.g. Home card)
  useEffect(() => {
    // Preload all ticker logo assets on entering The Board so images show instantly
    if (stocks && stocks.length > 0) {
      preloadTickerLogos(stocks.map(s => s.symbol));
    }
  }, [stocks]);

  useEffect(() => {
    if (initialExpandedSymbol && initialHandledRef.current !== initialExpandedSymbol) {
      initialHandledRef.current = initialExpandedSymbol;
      setAssetFilter('ALL');
      const upper = initialExpandedSymbol.toUpperCase();
      setExpandedSymbols(prev => {
        const next = new Set(prev);
        next.add(upper);
        return next;
      });

      // Robust multi-stage scroll snapping function
      let isCancelled = false;
      const snapToRow = (attempt = 0) => {
        if (isCancelled) return;
        const rowElem = document.getElementById(`board-row-${upper.toLowerCase()}`);
        if (rowElem) {
          const rect = rowElem.getBoundingClientRect();
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop || 0;
          // Calculate offset relative to sticky header & ribbon
          const headerHeight = window.innerWidth < 640 ? 76 : 105;
          const targetY = rect.top + scrollTop - headerHeight;

          window.scrollTo({
            top: Math.max(0, targetY),
            behavior: attempt === 0 ? 'auto' : 'smooth',
          });

          // Re-verify after accordion animation expands
          if (attempt < 4) {
            setTimeout(() => snapToRow(attempt + 1), 150);
          }
        } else if (attempt < 12) {
          // Retry polling if DOM node is still animating into view
          setTimeout(() => snapToRow(attempt + 1), 60);
        }
      };

      // Launch scroll snapping
      snapToRow(0);

      return () => {
        isCancelled = true;
      };
    }
  }, [initialExpandedSymbol]);

  // Feed diagnostics modal state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latency?: number } | null>(null);

  // Toggle single stock drilldown expansion
  const toggleExpand = useCallback((symbol: string) => {
    const next = new Set(expandedSymbols);
    if (next.has(symbol)) next.delete(symbol);
    else next.add(symbol);
    // The route describes an open card, never the last card that was closed.
    const selected = [...next].at(-1);
    initialHandledRef.current = selected ?? null;
    setExpandedSymbols(next);
    onSelectStock?.(selected);
  }, [expandedSymbols, onSelectStock]);

  // Bulk expansion has no single-card destination; clear any stale deep link.
  const toggleExpandAll = () => {
    setExpandedSymbols(expandedSymbols.size > 0
      ? new Set() : new Set(processedStocks.map(s => s.symbol)));
    initialHandledRef.current = null;
    onSelectStock?.(undefined);
  };

  // Handle manual refresh click
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshQuotes();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  // Toggle sort field & direction
  const handleSort = (field: BoardSortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      if (field === 'symbol' || field === 'name') {
        setSortDirection('asc');
      } else {
        setSortDirection('desc');
      }
    }
  };

  // Test live connection to backend Yahoo Finance engine
  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setTestResult(null);
    const start = Date.now();
    try {
      const res = await fetch('/api/quotes?symbols=SPY');
      const elapsed = Date.now() - start;
      if (!res.ok) {
        throw new Error(`Proxy returned HTTP ${res.status}`);
      }
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0 && typeof data[0].price === 'number') {
        setTestResult({
          success: true,
          latency: elapsed,
          message: `Yahoo returned a quote for SPY at $${data[0].price.toFixed(2)} with ${elapsed}ms round-trip latency.`,
        });
      } else {
        setTestResult({
          success: false,
          message: 'Backend proxy responded but returned an empty quote set.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Connection check failed: ${err?.message || 'Network error'}`,
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Filter & Sort stocks - O(N log N) with instant O(1) tab switching and O(N) filtering
  // Watched assets are displayed under the Watchlist tab, and sorted with the rest under other tabs without forced pinning.
  const processedStocks = useMemo(() => {
    const hasSearch = Boolean(searchQuery.trim());
    const q = searchQuery.toLowerCase().trim();
    const cleanUpper = searchQuery.toUpperCase().trim();

    // When searching, merge active stocks with ephemeral search results without mutating the main board list
    const pool = hasSearch
      ? [
          ...stocks,
          ...ephemeralSearchResults.filter((es) => !stocks.some((s) => s.symbol === es.symbol)),
        ]
      : stocks;

    return pool
      .filter((stock) => {
        // Tab & Category filtering:
        // If there is an active search query, search globally so typed assets are never hidden
        if (!hasSearch) {
          // 1. Check Product Category
          if (selectedCategory !== 'ALL' && stock.assetType !== selectedCategory) {
            return false;
          }

          // 2. Check Watchlist Tab
          if (assetFilter === 'WATCHLIST') {
            if (!isSymbolInWatchlist(stock.symbol)) {
              return false;
            }
          }

          return true;
        }

        const symUpper = stock.symbol.toUpperCase();

        // Exact ticker match check
        if (symUpper === cleanUpper) {
          return true;
        }

        // If an exact ticker match exists in the pool for this cleanUpper query (e.g. "PLTR", "BTC"), restrict strictly to that ticker
        const hasExactMatchInPool = pool.some((s) => s.symbol.toUpperCase() === cleanUpper);
        if (hasExactMatchInPool) {
          return symUpper === cleanUpper;
        }

        // Otherwise match ticker prefix, full name, or category
        return (
          stock.symbol.toLowerCase().includes(q) ||
          stock.name.toLowerCase().includes(q) ||
          (stock.category && stock.category.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        // If searching, exact matches float to the top
        if (hasSearch) {
          const aExact = a.symbol.toUpperCase() === cleanUpper;
          const bExact = b.symbol.toUpperCase() === cleanUpper;
          if (aExact && !bExact) return -1;
          if (!aExact && bExact) return 1;
        }

        if (sortField === 'name' || sortField === 'symbol') {
          const valA = sortField === 'symbol' ? a.symbol : a.name;
          const valB = sortField === 'symbol' ? b.symbol : b.name;
          return sortDirection === 'asc'
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        }

        if (sortField === 'peRatio') {
          const numA = typeof a.peRatio === 'number' ? a.peRatio : (sortDirection === 'asc' ? 999999 : -999999);
          const numB = typeof b.peRatio === 'number' ? b.peRatio : (sortDirection === 'asc' ? 999999 : -999999);
          return sortDirection === 'asc' ? numA - numB : numB - numA;
        }

        const valA: any = a[sortField];
        const valB: any = b[sortField];

        if (!finite(valA)) return finite(valB) ? 1 : 0;
        if (!finite(valB)) return -1;
        if (finite(valA) && finite(valB)) {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }

        return 0;
      });
  }, [stocks, ephemeralSearchResults, searchQuery, selectedCategory, assetFilter, sortField, sortDirection, isSymbolInWatchlist]);

  // Render sort icon for table headers
  const renderSortIcon = (field: BoardSortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-ink-faint group-hover:text-ink-muted inline ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-info-ink-400 inline ml-1" />
    ) : (
      <ArrowDown className="w-3 h-3 text-info-ink-400 inline ml-1" />
    );
  };

  return (
    <div id="the-board-page" className="w-full space-y-5">
      {curationError && <p role="alert" className="text-sm text-warning-ink-300">{curationError}</p>}

      {/* Top Header & Surveillance Telemetry Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl sm:text-3xl font-black text-ink-heading tracking-tight flex items-center gap-2.5">
              <Layers className="w-7 h-7 text-info-ink-500" />
              <span>The Board</span>
            </h1>
          </div>
        </div>

        {searchError && <p role="alert" className="text-xs text-warning-ink-400">{searchError}</p>}
        {/* Live Stream Telemetry Pill & Refresh Action */}
        <div className="flex items-center space-x-2.5 self-start md:self-auto flex-wrap">
          {/* Feed Status Display: Clickable diagnostic button for all users */}
          <button
            id="board-feed-status-btn"
            onClick={() => setShowSettingsModal(true)}
            title="Click to view live Yahoo Finance engine sync diagnostics & telemetry"
            className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-panel hover:bg-hover-panel border border-line hover:border-line-strong font-mono text-xs shadow-inner transition-all group cursor-pointer"
          >
            {isOffline ? (
              <>
                <span className="w-2 h-2 rounded-full bg-danger-500" />
                <span className="text-danger-ink-400 font-semibold">Feed Offline</span>
                <span className="text-ink-faint">|</span>
                <span className="text-ink-muted text-[11px]">Last Known Data</span>
              </>
            ) : isLoadingLiveMetrics ? (
              <>
                <span className="w-2 h-2 rounded-full bg-warning-400 animate-pulse" />
                <span className="text-warning-ink-400">Syncing Quotes...</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-positive-400 animate-pulse" />
                <span className="text-positive-ink-400 font-semibold">{lastSyncTime ? 'Provider data • may be delayed' : 'Awaiting data'}</span>
                {lastSyncTime && (
                  <>
                    <span className="text-ink-faint">|</span>
                    <span className="text-ink-muted text-[11px]">{lastSyncTime}</span>
                  </>
                )}
              </>
            )}
            <SlidersHorizontal className="w-3 h-3 text-ink-subtle group-hover:text-info-ink-400 ml-1 transition-colors" />
          </button>

          {/* Quick Refresh Button */}
          <button
            id="board-refresh-btn"
            aria-label="Refresh market quotes"
            onClick={handleRefresh}
            title="Refresh latest quotes from Yahoo Finance backend proxy"
            className="p-2 rounded-xl bg-panel hover:bg-surface-800 border border-line hover:border-line-strong text-ink-muted hover:text-ink-heading transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing || isLoadingLiveMetrics ? 'animate-spin text-info-ink-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Prominent Connection Loss Notification Banner */}
      {isOffline && (
        <div
          id="board-offline-alert"
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-danger-surface-950/40 border border-danger-surface-800/60 text-danger-ink-200 text-xs font-mono shadow-lg"
        >
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="w-4 h-4 text-danger-ink-400 shrink-0" />
            <div>
              <span className="font-bold text-danger-ink-300">{feedMode === 'synced_rest' ? 'Partial Market Update: ' : 'Connection Interrupted: '}</span>
              <span className="text-ink-secondary">
                {errorMessage || 'Market update unavailable.'}
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              reconnect();
              refreshQuotes();
            }}
            className="px-3 py-1.5 rounded-lg bg-danger-surface-900/80 hover:bg-danger-surface-800 border border-danger-700 text-ink-heading font-mono text-xs font-bold transition-all shrink-0 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reconnect & Sync</span>
          </button>
        </div>
      )}

      {/* Main Horizontal Roll Table with Seamless Render Architecture */}
      <div className="relative z-10 w-full min-h-[320px] sm:min-h-[380px] bg-panel border border-line rounded-xl sm:rounded-2xl shadow-2xl backdrop-blur-sm">
        {/* Top Controls Toolbar on a single horizontal axis touching the table */}
        <div className="relative z-30 flex items-center justify-between gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 bg-chart-surface/90 rounded-t-xl sm:rounded-t-2xl">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            {/* 1. Desktop View: Always Expanded Search Bar */}
            <div className="hidden lg:flex relative items-center w-52 xl:w-64">
              <Search className="w-3.5 h-3.5 text-ink-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="board-search-input-desktop"
                type="text"
                aria-label="Search market assets"
                placeholder="Search any asset or ticker..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setSearchQuery('');
                  }
                }}
                className="w-full pl-8 pr-7 py-1.5 bg-panel border border-line focus:border-info-500/80 rounded-xl text-xs text-ink-heading placeholder-ink-subtle outline-none transition-all font-sans shadow-sm"
              />
              {isSearchingUniverse && (
                <RefreshCw className="w-3 h-3 text-info-ink-400 animate-spin absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none" />
              )}
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  title="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-ink-muted hover:text-ink-heading transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 2. Mobile & Tablet View: Toggle Button or Expandable Input */}
            <div className="lg:hidden flex items-center">
              {isSearchExpanded || searchQuery ? (
                <div className="relative flex items-center w-28 xs:w-32 sm:w-44 md:w-56 transition-all">
                  <Search className="w-3.5 h-3.5 text-ink-muted absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="board-search-input"
                    type="text"
                    aria-label="Search market assets"
                    autoFocus
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setSearchQuery('');
                        setIsSearchExpanded(false);
                      }
                    }}
                    className="w-full pl-7 pr-6 py-1 sm:py-1.5 bg-panel border border-info-500/80 rounded-xl text-xs text-ink-heading placeholder-ink-subtle outline-none transition-all font-sans shadow-sm"
                  />
                  {isSearchingUniverse && (
                    <RefreshCw className="w-3 h-3 text-info-ink-400 animate-spin absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  )}
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setIsSearchExpanded(false);
                    }}
                    title="Clear and close search"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-ink-muted hover:text-ink-heading transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  id="board-search-toggle-btn"
                  aria-label="Search market assets"
                  onClick={() => setIsSearchExpanded(true)}
                  title="Search any asset or ticker"
                  className="p-1.5 sm:p-2 rounded-xl bg-panel hover:bg-surface-800 border border-line hover:border-line-strong text-ink-muted hover:text-ink-heading transition-all shadow-sm shrink-0 flex items-center justify-center"
                >
                  <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              )}
            </div>

            {/* Soft, connected category & watchlist toggle pill with subtle dropdown menu */}
            <div
              ref={dropdownRef}
              id="board-asset-type-toggle"
              className="relative inline-flex items-center p-0.5 rounded-xl bg-panel border border-line shadow-inner select-none shrink-0 gap-0.5"
            >
              {/* Category Segmented Control with Separate Label and Dropdown Arrow Hit Areas */}
              <div
                className={`relative z-10 inline-flex items-center rounded-lg transition-all duration-150 ${
                  assetFilter === 'ALL'
                    ? 'text-ink-heading font-semibold'
                    : 'text-ink-muted'
                }`}
              >
                {assetFilter === 'ALL' && (
                  <motion.div
                    layoutId="boardAssetFilterPill"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    className="absolute inset-0 bg-surface-800 border border-line-strong/80 rounded-lg shadow-sm -z-10"
                  />
                )}

                {/* 1. Category Label: Switches view to overall category */}
                <button
                  id="board-category-main-btn"
                  onClick={() => {
                    setAssetFilter('ALL');
                    setIsCategoryDropdownOpen(false);
                  }}
                  className={`pl-2.5 sm:pl-3 pr-1.5 py-1 text-[11px] sm:text-xs font-mono font-medium rounded-l-lg transition-colors cursor-pointer flex items-center ${
                    assetFilter === 'ALL'
                      ? 'text-ink-heading hover:text-info-ink-200'
                      : 'text-ink-muted hover:text-ink-strong hover:bg-surface-800/50'
                  }`}
                  title={`View all ${selectedCategory === 'ALL' ? 'assets' : (CATEGORY_OPTIONS.find((c) => c.id === selectedCategory)?.shortLabel || selectedCategory)}`}
                >
                  <span>
                    {selectedCategory === 'ALL'
                      ? 'All'
                      : (CATEGORY_OPTIONS.find((c) => c.id === selectedCategory)?.shortLabel || selectedCategory)}
                  </span>
                </button>

                {/* 2. Dropdown Arrow: Toggles category popover menu to navigate categories */}
                <button
                  id="board-category-dropdown-arrow-btn"
                  aria-label="Change asset category"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCategoryDropdownOpen((prev) => !prev);
                  }}
                  className={`pl-1 pr-2 sm:pr-2.5 py-1 rounded-r-lg transition-colors cursor-pointer flex items-center justify-center border-l ${
                    assetFilter === 'ALL'
                      ? 'border-line-strong/60 text-ink-secondary hover:text-ink-heading hover:bg-surface-700/50'
                      : 'border-line/80 text-ink-muted hover:text-ink-strong hover:bg-surface-800/70'
                  }`}
                  title={assetFilter === 'WATCHLIST' ? 'Filter Watchlist by Category' : 'Change Asset Category'}
                >
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      isCategoryDropdownOpen ? 'rotate-180 text-info-ink-400' : 'text-ink-muted group-hover:text-ink-strong'
                    }`}
                  />
                </button>
              </div>

              {/* Watchlist Pill Button */}
              <button
                id="board-tab-watchlist"
                aria-label="Show watchlist"
                onClick={() => {
                  setAssetFilter('WATCHLIST');
                  setIsCategoryDropdownOpen(false);
                }}
                className={`relative z-10 px-2.5 sm:px-3.5 py-1 text-[11px] sm:text-xs font-mono font-medium rounded-lg transition-all duration-150 flex items-center gap-1.5 cursor-pointer ${
                  assetFilter === 'WATCHLIST'
                    ? 'text-ink-heading font-semibold'
                    : 'text-ink-muted hover:text-ink-strong hover:bg-surface-800/30'
                }`}
                title={`Watchlist (${selectedCategory === 'ALL' ? 'All categories' : (CATEGORY_OPTIONS.find((c) => c.id === selectedCategory)?.shortLabel || selectedCategory)})`}
              >
                {assetFilter === 'WATCHLIST' && (
                  <motion.div
                    layoutId="boardAssetFilterPill"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    className="absolute inset-0 bg-surface-800 border border-line-strong/80 rounded-lg shadow-sm -z-10"
                  />
                )}
                <span>Watchlist</span>
                {watchedCountForCategory > 0 && (
                  <span
                    id="board-watchlist-count-badge"
                    className={`text-[10px] sm:text-[11px] font-bold font-mono px-1.5 py-0.5 rounded-full leading-none transition-colors border ${
                      assetFilter === 'WATCHLIST' ? 'bg-warning-400/25 text-warning-ink-300 border-warning-400/40' : 'bg-surface-800 text-ink-secondary border-line-strong'
                    }`}
                  >
                    {watchedCountForCategory}
                  </span>
                )}
              </button>

              {/* Subtle Dropdown Menu Floating Popover */}
              <AnimatePresence>
                {isCategoryDropdownOpen && (
                  <motion.div
                    id="board-category-dropdown-menu"
                    initial={{ opacity: 0, y: -4, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.96 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute left-0 top-full mt-1.5 z-50 w-max min-w-[180px] sm:min-w-[210px] max-w-[calc(100vw-2rem)] p-1 sm:p-1.5 bg-popover/98 backdrop-blur-xl border border-line-strong/80 rounded-xl shadow-2xl shadow-shade/90 font-sans"
                  >
                    <div className="px-2 py-1 flex items-center justify-between text-[9px] sm:text-[10px] font-mono font-bold text-ink-muted tracking-wider uppercase border-b border-line/80 pb-1 mb-0.5">
                      <span>{assetFilter === 'WATCHLIST' ? 'Watchlist Category' : 'Product Category'}</span>
                      {selectedCategory !== 'ALL' && (
                        <button
                          id="btn-reset-category-filter"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCategory('ALL');
                            setIsCategoryDropdownOpen(false);
                          }}
                          className="text-[9px] text-info-ink-400 hover:text-info-ink-300 normal-case font-medium hover:underline cursor-pointer"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      {CATEGORY_OPTIONS.map((opt) => {
                        const isSelected = selectedCategory === opt.id;
                        const count = opt.id === 'ALL'
                          ? stocks.length
                          : (categoryCounts.counts[opt.id] || 0);
                        const watchedCount = opt.id === 'ALL'
                          ? categoryCounts.watchedCounts.ALL
                          : (categoryCounts.watchedCounts[opt.id] || 0);

                        return (
                          <button
                            key={opt.id}
                            id={`board-category-opt-${opt.id.toLowerCase().replace(/\s+/g, '-')}`}
                            onClick={() => {
                              setSelectedCategory(opt.id);
                              setIsCategoryDropdownOpen(false);
                            }}
                            className={`w-full px-2 py-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-mono flex items-center justify-between transition-colors cursor-pointer text-left ${
                              isSelected
                                ? 'bg-info-600/15 text-info-ink-300 font-semibold border border-info-500/30'
                                : 'text-ink-secondary hover:bg-surface-800/70 hover:text-ink-heading border border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              {isSelected ? (
                                <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-info-ink-400 shrink-0" />
                              ) : (
                                <span className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                              )}
                              <span>{opt.label}</span>
                            </div>
                            <span className={`text-[10px] sm:text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md shrink-0 ml-2 border ${
                              isSelected
                                ? 'bg-info-500/25 text-info-ink-200 border-info-400/40'
                                : 'bg-surface-800 text-ink-strong border-line-strong/80'
                            }`}>
                              {assetFilter === 'WATCHLIST' ? watchedCount : count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Expand / Collapse All Button (Icon on mobile/tablet, Text + Icon on desktop) */}
          <div className="flex items-center shrink-0">
            <button
              id="board-expand-all-btn"
              aria-label={expandedSymbols.size > 0 ? 'Collapse all assets' : 'Expand all assets'}
              onClick={toggleExpandAll}
              title={expandedSymbols.size > 0 ? 'Collapse All' : 'Expand All'}
              className="p-1.5 sm:p-2 lg:px-3 lg:py-1.5 rounded-xl bg-panel hover:bg-surface-800 border border-line hover:border-line-strong text-ink-secondary hover:text-ink-heading transition-all shadow-sm flex items-center justify-center gap-1.5 active:scale-95 text-xs font-mono font-medium cursor-pointer"
            >
              {expandedSymbols.size > 0 ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-info-ink-400" />
                  <span className="hidden lg:inline text-info-ink-400">Collapse all</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-ink-muted" />
                  <span className="hidden lg:inline text-ink-secondary">Expand all</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="w-full overflow-hidden rounded-b-xl sm:rounded-b-2xl">
          <table className="w-full table-fixed md:table-auto text-left border-separate border-spacing-0">
            {/* Table Header with Clickable Sorting */}
            <thead>
              <tr className="bg-inset/90 text-[11px] font-mono text-ink-muted uppercase tracking-wider select-none">

                {/* 1. Name (Sortable) */}
                <th
                  onClick={() => handleSort('name')}
                  className="py-3 pl-3.5 sm:pl-6 pr-1 sm:pr-3 cursor-pointer hover:text-ink-heading transition-colors group w-[52%] sm:w-[56%] md:w-auto border-b border-line"
                >
                  <span className="flex items-center">
                    <span>Name</span>
                    {renderSortIcon('name')}
                  </span>
                </th>

                {/* 2. Today's Trendline (Not Sortable - Desktop Only) */}
                <th className="hidden md:table-cell py-3.5 px-4 text-center border-b border-line">
                  <span>Today's Trend</span>
                </th>

                {/* 3. Last Price (Sortable - Desktop Only) */}
                <th
                  onClick={() => handleSort('price')}
                  className="hidden md:table-cell py-3.5 px-4 text-right cursor-pointer hover:text-ink-heading transition-colors group border-b border-line"
                >
                  <span className="flex items-center justify-end">
                    Last Price
                    {renderSortIcon('price')}
                  </span>
                </th>

                {/* 4. Today's Change (Desktop) / Price & Change Sort Switcher (Mobile) */}
                <th
                  onClick={() => {
                    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
                      handleSort('changePercent');
                    }
                  }}
                  className="py-2.5 sm:py-3.5 px-2 sm:px-4 pr-3.5 sm:pr-4 text-right md:text-center md:cursor-pointer hover:text-ink-heading transition-colors group w-[48%] sm:w-[44%] md:w-auto border-b border-line"
                >
                  {/* Desktop: Centered "Today's Change" */}
                  <span className="hidden md:flex items-center justify-center">
                    <span>Today's Change</span>
                    {renderSortIcon('changePercent')}
                  </span>

                  {/* Mobile View: Minimalist animated segmented toggle for Price vs % */}
                  <div className="md:hidden flex items-center justify-end">
                    <div
                      id="mobile-board-sort-toggle"
                      className="relative inline-flex items-center p-0.5 rounded-xl bg-chart-surface border border-line shadow-inner select-none"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {[
                        { id: 'price' as BoardSortField, label: 'Price' },
                        { id: 'changePercent' as BoardSortField, label: '%' },
                      ].map((item) => {
                        const isActive = sortField === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            id={`mobile-sort-${item.id.toLowerCase()}-btn`}
                            onClick={() => handleSort(item.id)}
                            className={`relative z-10 px-2.5 py-1 text-xs font-mono font-semibold rounded-lg transition-colors duration-200 flex items-center gap-1 cursor-pointer antialiased ${
                              isActive
                                ? 'text-info-ink-400 font-bold'
                                : 'text-ink-muted hover:text-ink-strong font-medium'
                            }`}
                          >
                            {isActive && (
                              <motion.div
                                layoutId="mobileBoardSortPill"
                                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                                className="absolute inset-0 bg-surface-800 border border-line-strong/80 rounded-lg shadow-sm -z-10"
                              />
                            )}
                            <span className="leading-none">{item.label}</span>
                            {isActive && (
                              sortDirection === 'asc' ? (
                                <ArrowUp className="w-3 h-3 text-info-ink-400 stroke-[2.5]" />
                              ) : (
                                <ArrowDown className="w-3 h-3 text-info-ink-400 stroke-[2.5]" />
                              )
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </th>

                {/* 5. 52W Range (Not Sortable - Desktop Only) */}
                <th className="hidden md:table-cell py-3.5 px-4 text-center border-b border-line">
                  <span className="flex items-center justify-center">52W Range</span>
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="font-sans text-sm bg-panel">
              {processedStocks.length > 0 ? (
                processedStocks.map((stock, index) => (
                  <BoardTableRow
                    key={stock.symbol}
                    stock={stock}
                    isExpanded={expandedSymbols.has(stock.symbol)}
                    isLastRow={index === processedStocks.length - 1}
                    isWatching={isSymbolInWatchlist(stock.symbol)}
                    onToggleExpand={toggleExpand}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 px-4 text-center text-ink-subtle">
                    {assetFilter === 'WATCHLIST' ? (
                      <div className="max-w-md mx-auto space-y-3.5">
                        <div className="w-11 h-11 rounded-2xl bg-warning-surface-950/40 border border-warning-surface-800/40 flex items-center justify-center text-warning-ink-400 mx-auto shadow-inner">
                          <Star className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-ink-strong">
                            {!user
                              ? 'Sign In to View Watchlist'
                              : (user.watchlist?.length || 0) === 0
                              ? 'Your Watchlist is Empty'
                              : `No Watched ${selectedCategory === 'ALL' ? 'Assets' : (CATEGORY_OPTIONS.find(c => c.id === selectedCategory)?.shortLabel || selectedCategory)} Found`}
                          </p>
                          <p className="text-xs text-ink-muted leading-relaxed max-w-sm mx-auto">
                            {!user
                              ? 'Sign in to save your personal watchlist and synchronize custom tickers across sessions.'
                              : (user.watchlist?.length || 0) === 0
                              ? 'Click the star icon on any asset detail card on The Board to add it to your personal watchlist.'
                              : `You have items in your watchlist, but none in the ${selectedCategory === 'ALL' ? 'selected' : (CATEGORY_OPTIONS.find(c => c.id === selectedCategory)?.shortLabel || selectedCategory)} category.`}
                          </p>
                        </div>
                        <div className="pt-1 flex items-center justify-center gap-2 flex-wrap">
                          {user ? (
                            <>
                              {selectedCategory !== 'ALL' && categoryCounts.watchedCounts.ALL > 0 && (
                                <button
                                  id="btn-show-all-watched-categories"
                                  onClick={() => setSelectedCategory('ALL')}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-surface-800 hover:bg-surface-700 text-ink-strong text-xs font-semibold border border-line-strong transition-colors cursor-pointer"
                                >
                                  <span>View All Watched ({categoryCounts.watchedCounts.ALL})</span>
                                </button>
                              )}
                              <button
                                id="btn-explore-all-from-empty-watchlist"
                                onClick={() => setAssetFilter('ALL')}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-info-600/20 hover:bg-info-600/30 text-info-ink-400 text-xs font-semibold border border-info-500/30 transition-colors cursor-pointer"
                              >
                                <span>Browse All {selectedCategory === 'ALL' ? 'Assets' : (CATEGORY_OPTIONS.find(c => c.id === selectedCategory)?.shortLabel || selectedCategory)}</span>
                              </button>
                            </>
                          ) : (
                            <button
                              id="btn-signin-from-empty-watchlist"
                              onClick={() => openAuthModal('login')}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-info-600 hover:bg-info-500 text-on-action text-xs font-semibold transition-colors cursor-pointer shadow-md shadow-info-shadow-950/50"
                            >
                              <LogIn className="w-3.5 h-3.5" />
                              <span>Sign In / Register</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ) : searchQuery ? (
                      <div className="space-y-2">
                        <p className="text-sm">No assets match your search "{searchQuery}"</p>
                        <button
                          onClick={() => setSearchQuery('')}
                          className="mt-1 text-xs text-info-ink-400 hover:text-info-ink-300 underline font-medium cursor-pointer"
                        >
                          Clear search
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm">No assets available in this category.</p>
                        {selectedCategory !== 'ALL' && (
                          <button
                            id="btn-empty-reset-category"
                            onClick={() => setSelectedCategory('ALL')}
                            className="mt-1 text-xs text-info-ink-400 hover:text-info-ink-300 underline font-medium cursor-pointer"
                          >
                            Show all categories
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Summary */}
        <div className="px-3.5 sm:px-6 py-2.5 border-t border-line bg-inset/60 flex items-center text-xs text-ink-muted">
          <span>Showing <strong className="text-ink-heading font-mono">{processedStocks.length}</strong> of <strong className="text-ink-heading font-mono">{stocks.length}</strong> assets</span>
        </div>
      </div>

      {/* Feed Diagnostics & Live Telemetry Modal */}
      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg max-h-[calc(100dvh-1.5rem)] sm:max-h-[88vh] bg-panel border border-line-strong/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-line flex items-center justify-between bg-inset/70 shrink-0">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-xl bg-info-500/10 border border-info-500/20 text-info-ink-400 shrink-0">
                    <Radio className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-ink-heading font-mono">Market Provider Polling</h3>
                    <p className="text-xs text-ink-muted">Yahoo Finance Backend Engine</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="p-1.5 rounded-lg text-ink-muted hover:text-ink-heading hover:bg-surface-800 transition-colors shrink-0 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-5 space-y-4 text-xs text-ink-secondary overflow-y-auto flex-1 overscroll-contain">

                {/* Live Stream Telemetry Overview - Mobile Friendly 1-col on tiny screens, 3-col on sm+ */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="p-3 bg-canvas border border-line rounded-xl flex sm:flex-col justify-between sm:justify-start items-center sm:items-start">
                    <span className="text-[10px] uppercase font-mono text-ink-subtle block">Feed Engine</span>
                    <span className={`font-mono font-bold flex items-center gap-1.5 text-xs sm:text-sm sm:mt-1 ${
                      isOffline ? 'text-danger-ink-400' : 'text-positive-ink-400'
                    }`}>
                      <span className={`w-2 h-2 rounded-full shrink-0 ${isOffline ? 'bg-danger-500' : 'bg-positive-400 animate-pulse'}`} />
                      <span>{isOffline ? 'Update failed' : lastSyncTime ? 'Yahoo proxy responded' : 'Awaiting data'}</span>
                    </span>
                  </div>

                  <div className="p-3 bg-canvas border border-line rounded-xl flex sm:flex-col justify-between sm:justify-start items-center sm:items-start">
                    <span className="text-[10px] uppercase font-mono text-ink-subtle block">Round-Trip Latency</span>
                    <span className="font-mono font-bold text-ink-heading text-xs sm:text-sm sm:mt-1">
                      {finite(latencyMs) ? `${latencyMs}ms` : 'Unavailable'}
                    </span>
                  </div>

                  <div className="p-3 bg-canvas border border-line rounded-xl flex sm:flex-col justify-between sm:justify-start items-center sm:items-start">
                    <span className="text-[10px] uppercase font-mono text-ink-subtle block">Last Market Sync</span>
                    <span className="font-mono font-bold text-info-ink-400 text-xs sm:text-sm sm:mt-1">
                      {lastSyncTime || 'Syncing...'}
                    </span>
                  </div>
                </div>

                {/* Test Result Message */}
                {testResult && (
                  <div className={`p-3 rounded-xl border text-xs leading-relaxed flex items-start gap-2 ${
                    testResult.success
                      ? 'bg-positive-surface-950/40 border-positive-surface-800 text-positive-ink-300'
                      : 'bg-danger-surface-950/40 border-danger-surface-800 text-danger-ink-300'
                  }`}>
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-positive-ink-400 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-danger-ink-400 mt-0.5" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="p-4 sm:p-5 border-t border-line bg-inset/70 flex items-center justify-between gap-3 shrink-0">
                <button
                  onClick={handleTestConnection}
                  disabled={isTestingConnection}
                  className="px-3.5 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-ink-heading font-mono text-xs transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingConnection ? 'animate-spin text-info-ink-400' : ''}`} />
                  <span>{isTestingConnection ? 'Pinging Yahoo Engine...' : 'Ping Engine Diagnostics'}</span>
                </button>

                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 rounded-xl bg-info-600 hover:bg-info-500 text-on-action font-mono text-xs font-bold transition-all shadow-lg shadow-info-shadow-900/30 cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
