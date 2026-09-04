import React, { useState, useMemo, useCallback } from 'react';
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
  Key,
  CheckCircle2,
  AlertCircle,
  X,
  Radio,
  Zap
} from 'lucide-react';
import { BoardStock, BoardSortField, SortDirection } from '../types';
import { useFinnhubMarket } from '../hooks/useFinnhubMarket';
import { BoardStockDetailCard } from './BoardStockDetailCard';
import { TickerLogo } from './TickerLogo';
import { useAuth } from '../context/AuthContext';

interface TheBoardProps {
  onSelectStock?: (symbol: string) => void;
}

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
  const fiftyTwoLow = Math.min(stock.fiftyTwoWeekLow, stock.price);
  const fiftyTwoHigh = Math.max(stock.fiftyTwoWeekHigh, stock.price);
  const fiftyTwoSpan = fiftyTwoHigh - fiftyTwoLow;
  const fiftyTwoWeekPct = fiftyTwoSpan > 0 
    ? Math.max(0, Math.min(100, ((stock.price - fiftyTwoLow) / fiftyTwoSpan) * 100))
    : 50;

  // Intraday / Today's Trendline coordinates
  // Visual stability: Anchor vertical bounds using dayLow, dayHigh, prevClose/open, and a minimum percentage buffer
  // so individual penny ticks do not cause the SVG curve to jump drastically.
  const todayTrendData = useMemo(() => {
    const rawPoints = stock.sparkline && stock.sparkline.length > 0 ? stock.sparkline : [stock.price];
    // Anchor point: if prevClose is available and distinct from rawPoints[0], ensure prevClose is at the start of points
    const points = stock.prevClose && stock.prevClose > 0 && Math.abs(rawPoints[0] - stock.prevClose) > 0.001
      ? [stock.prevClose, ...rawPoints]
      : rawPoints;

    const allValues = [...points, stock.dayLow, stock.dayHigh, stock.price].filter(v => typeof v === 'number' && !isNaN(v) && v > 0);
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
      pathD: coords.length > 1 ? `M ${coords.join(' L ')}` : `M 0,${height / 2} L ${width},${height / 2}`,
      lastCoord: (coords[coords.length - 1] || `${width / 2},${height / 2}`).split(','),
      strokeColor: isPositive ? '#10B981' : '#EF4444',
    };
  }, [stock.sparkline, stock.dayLow, stock.dayHigh, stock.prevClose, stock.price, isPositive]);

  return (
    <>
      <tr
        id={`board-row-${stock.symbol.toLowerCase()}`}
        onClick={() => onToggleExpand(stock.symbol)}
        style={{ WebkitTapHighlightColor: 'transparent' }}
        className={`group cursor-pointer select-none transition-colors duration-150 border-l-2 outline-none focus:outline-none ${
          isExpanded 
            ? 'bg-[#121A28] border-l-blue-500' 
            : 'border-l-transparent hover:border-l-blue-500/70 hover:bg-[#151F30] active:bg-[#192438]'
        }`}
      >
        {/* 1. Name & Asset Icon (Column 1 on mobile & desktop) */}
        <td className={`py-3.5 sm:py-4 pl-3.5 sm:pl-6 pr-1 sm:pr-3 ${!isExpanded && !isLastRow ? 'border-b border-slate-800/60' : ''}`}>
          <div className="flex items-center space-x-2.5 sm:space-x-3.5">
            {/* Symbol Logo / Brand Icon */}
            <TickerLogo 
              symbol={stock.symbol} 
              assetType={stock.assetType} 
              logoUrl={stock.logoUrl} 
              size="md" 
              className={isExpanded ? 'border-blue-500 shadow-blue-950/50' : ''}
            />

            <div className="flex flex-col min-w-0">
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <span className={`font-bold sm:font-extrabold tracking-tight transition-colors font-mono text-base sm:text-lg ${
                  isExpanded ? 'text-blue-400' : 'text-white group-hover:text-blue-400'
                }`}>
                  {stock.symbol}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-semibold font-mono ${
                  stock.assetType === 'ETF' 
                    ? 'bg-blue-950/90 text-blue-400 border border-blue-800/50 uppercase' 
                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}>
                  {stock.assetType === 'ETF' ? 'ETF' : 'Stock'}
                </span>
                {isWatching && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-semibold font-mono bg-purple-950/90 text-purple-400 border border-purple-800/50">
                    Watching
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-400 max-w-[140px] sm:max-w-xs truncate hidden sm:block">
                {stock.name}
              </span>
            </div>
          </div>
        </td>

        {/* 2. Today's Trendline (Desktop Only) */}
        <td className={`hidden md:table-cell py-3.5 sm:py-4 px-4 text-center ${!isExpanded && !isLastRow ? 'border-b border-slate-800/60' : ''}`}>
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
                r="2.5"
                fill={todayTrendData.strokeColor}
                className="transition-all duration-300 ease-out"
              />
            </svg>
          </div>
        </td>

        {/* 3. Last Price (Desktop Only) */}
        <td className={`hidden md:table-cell py-3.5 sm:py-4 px-4 text-right ${!isExpanded && !isLastRow ? 'border-b border-slate-800/60' : ''}`}>
          <div className="inline-flex flex-col items-end">
            <span className="font-mono text-base sm:text-lg font-bold sm:font-extrabold text-white">
              ${stock.price.toFixed(2)}
            </span>
          </div>
        </td>

        {/* 4. Today's Change / Mobile 2nd Column with Price & Change */}
        <td className={`py-3.5 sm:py-4 px-2 sm:px-4 pr-3.5 sm:pr-4 text-right md:text-center ${!isExpanded && !isLastRow ? 'border-b border-slate-800/60' : ''}`}>
          {/* Mobile View: Price on top (bigger, colored to match direction), Change underneath */}
          <div className="md:hidden flex flex-col items-end">
            <span className={`font-mono text-base sm:text-lg font-bold sm:font-extrabold ${
              isPositive ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              ${stock.price.toFixed(2)}
            </span>
            <span className={`inline-flex items-center font-mono text-xs font-semibold mt-0.5 ${
              isPositive ? 'text-emerald-400/90' : 'text-rose-400/90'
            }`}>
              {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
            </span>
          </div>

          {/* Desktop View: Center-aligned in column with $ change snapped to the right edge of % box */}
          <div className="hidden md:flex flex-col items-center justify-center">
            <div className="inline-flex flex-col items-end">
              <span
                className={`inline-flex items-center justify-center font-mono text-sm font-bold px-3 py-1 rounded border ${
                  isPositive
                    ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/50'
                    : 'bg-rose-950/70 text-rose-300 border-rose-800/50'
                }`}
              >
                {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
              </span>

              <div className="mt-1 w-full text-right pr-0.5">
                <span
                  className={`text-[13px] font-mono font-semibold ${
                    isPositive ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {isPositive ? '+' : '-'}${Math.abs(stock.change).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </td>

        {/* 5. 52W Range (Desktop Only) - Balanced 3-column grid for stable centering despite digit length variations */}
        <td className={`hidden md:table-cell py-3.5 sm:py-4 px-4 text-center ${!isExpanded && !isLastRow ? 'border-b border-slate-800/60' : ''}`}>
          <div className="flex flex-col items-center max-w-[175px] mx-auto">
            <div className="w-full grid grid-cols-3 items-center text-[11px] font-mono mb-1">
              <span className="font-semibold text-slate-200 text-left">${fiftyTwoLow.toFixed(2)}</span>
              <span className="text-[10px] text-slate-400 text-center tracking-wide">52W</span>
              <span className="font-semibold text-slate-200 text-right">${fiftyTwoHigh.toFixed(2)}</span>
            </div>
            {/* Range track */}
            <div className="w-full h-1.5 bg-slate-800/90 rounded-full overflow-hidden relative">
              <div
                className="h-full bg-blue-500/40 rounded-full"
                style={{ width: '100%' }}
              />
              {/* Marker */}
              <div
                className="absolute top-0 bottom-0 w-2 bg-blue-400 rounded-full shadow-sm transition-all duration-300 ease-out"
                style={{ left: `calc(${fiftyTwoWeekPct}% - 4px)` }}
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
            className={`bg-[#0B0F17] outline-none ${!isLastRow ? 'border-b border-slate-800/60' : ''}`}
          >
            <td colSpan={5} className="p-0 border-none outline-none bg-[#0B0F17]">
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
                className="overflow-hidden m-0 p-0 bg-[#0B0F17]"
              >
                <div className="px-2.5 sm:px-5 pt-2 pb-3.5 sm:pb-5 bg-[#0B0F17]">
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

export const TheBoard: React.FC<TheBoardProps> = ({ onSelectStock }) => {
  const { 
    stocks, 
    socketStatus, 
    feedMode,
    lastSyncTime,
    lastTickTime, 
    totalTicks, 
    apiKey,
    saveApiKey,
    isLoadingLiveMetrics,
    errorMessage,
    isOffline,
    reconnect, 
    refreshQuotes 
  } = useFinnhubMarket();

  const { isSymbolInWatchlist, isAdmin } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [assetFilter, setAssetFilter] = useState<'ALL' | 'ETF' | 'Stock'>('ALL');
  const [sortField, setSortField] = useState<BoardSortField>('price');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedSymbols, setExpandedSymbols] = useState<Set<string>>(new Set());
  
  // Feed settings modal state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [keyInputValue, setKeyInputValue] = useState(apiKey);
  const [keySaveMessage, setKeySaveMessage] = useState<string | null>(null);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Toggle single stock drilldown expansion
  const toggleExpand = useCallback((symbol: string) => {
    setExpandedSymbols(prev => {
      const next = new Set(prev);
      if (next.has(symbol)) {
        next.delete(symbol);
      } else {
        next.add(symbol);
      }
      return next;
    });
    if (onSelectStock) {
      onSelectStock(symbol);
    }
  }, [onSelectStock]);

  // Toggle all stocks expansion
  const toggleExpandAll = () => {
    if (expandedSymbols.size === processedStocks.length) {
      setExpandedSymbols(new Set());
    } else {
      setExpandedSymbols(new Set(processedStocks.map(s => s.symbol)));
    }
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

  // Save custom API key
  const handleSaveKey = () => {
    saveApiKey(keyInputValue);
    setKeySaveMessage('API key updated and saved to local storage!');
    setTimeout(() => setKeySaveMessage(null), 3000);
    reconnect();
    refreshQuotes();
  };

  // Test Finnhub key with live REST quote
  const handleTestKey = async () => {
    setIsTestingKey(true);
    setTestResult(null);
    try {
      const testKey = keyInputValue.trim() || apiKey;
      const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=AAPL&token=${testKey}`);
      if (!res.ok) {
        throw new Error(`Finnhub returned HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data && typeof data.c === 'number' && data.c > 0) {
        setTestResult({
          success: true,
          message: `Key is valid! Received live quote for AAPL: $${data.c.toFixed(2)} (Previous Close: $${data.pc?.toFixed(2) || '—'})`,
        });
      } else {
        setTestResult({
          success: false,
          message: 'Received empty response from Finnhub. Please verify token permissions.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Connection failed: ${err?.message || 'Invalid API token'}`,
      });
    } finally {
      setIsTestingKey(false);
    }
  };

  // Filter & Sort stocks - O(N log N) with instant O(1) tab switching and O(N) filtering
  // Assets marked as "Watching" in the user's watchlist sit at the top of the board, but follow the active sort order,
  // with remaining assets partitioned below them following the same sort order.
  const processedStocks = useMemo(() => {
    return stocks
      .filter((stock) => {
        if (assetFilter === 'ETF' && stock.assetType !== 'ETF') {
          return false;
        }
        if (assetFilter === 'Stock' && stock.assetType !== 'Stock') {
          return false;
        }
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        return (
          stock.symbol.toLowerCase().includes(q) ||
          stock.name.toLowerCase().includes(q) ||
          stock.category.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const isWatchA = isSymbolInWatchlist(a.symbol);
        const isWatchB = isSymbolInWatchlist(b.symbol);

        // Watching partition to top
        if (isWatchA !== isWatchB) {
          return isWatchA ? -1 : 1;
        }

        if (sortField === 'name' || sortField === 'symbol') {
          const valA = a.name || a.symbol;
          const valB = b.name || b.symbol;
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

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }

        return 0;
      });
  }, [stocks, searchQuery, assetFilter, sortField, sortDirection, isSymbolInWatchlist]);

  // Render sort icon for table headers
  const renderSortIcon = (field: BoardSortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-600 group-hover:text-slate-400 inline ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-blue-400 inline ml-1" />
    ) : (
      <ArrowDown className="w-3 h-3 text-blue-400 inline ml-1" />
    );
  };

  return (
    <div id="the-board-page" className="w-full space-y-5">
      
      {/* Top Header & Surveillance Telemetry Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Layers className="w-7 h-7 text-blue-500" />
              <span>The Board</span>
            </h1>
          </div>
        </div>

        {/* Live Stream Telemetry Pill & Refresh Action */}
        <div className="flex items-center space-x-2.5 self-start md:self-auto flex-wrap">
          {/* Feed Status Display: Admin gets clickable diagnostic button with slider icon; non-admin gets plain status text with no box */}
          {isAdmin ? (
            <button
              id="board-feed-status-btn"
              onClick={() => {
                setKeyInputValue(apiKey);
                setShowSettingsModal(true);
              }}
              title="Click to view feed diagnostics or configure custom Finnhub API Key"
              className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[#0F141E] hover:bg-[#161F2E] border border-slate-800 hover:border-slate-700 font-mono text-xs shadow-inner transition-all group cursor-pointer"
            >
              {isOffline ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="text-rose-400 font-semibold">Feed Offline</span>
                  <span className="text-slate-600">|</span>
                  <span className="text-slate-400 text-[11px]">Last Known Data</span>
                </>
              ) : feedMode === 'websocket' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-400 font-semibold">WebSocket Live</span>
                  <span className="text-slate-600">|</span>
                  <span className="text-slate-400 text-[11px]">
                    {totalTicks > 0 ? `${totalTicks} ticks` : 'Active'}
                  </span>
                </>
              ) : feedMode === 'synced_rest' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-emerald-400 font-semibold">Live Synced</span>
                  {lastSyncTime && (
                    <>
                      <span className="text-slate-600">|</span>
                      <span className="text-slate-400 text-[11px]">{lastSyncTime}</span>
                    </>
                  )}
                </>
              ) : socketStatus === 'connecting' || isLoadingLiveMetrics ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-amber-400">Syncing Quotes...</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-slate-400 underline text-[11px]">Reconnect</span>
                </>
              )}
              <SlidersHorizontal className="w-3 h-3 text-slate-500 group-hover:text-blue-400 ml-1 transition-colors" />
            </button>
          ) : (
            <div
              id="board-feed-status-text"
              className="flex items-center space-x-2 px-1 py-1.5 font-mono text-xs text-slate-300 select-none"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <span className="text-emerald-400 font-semibold">Live Synced</span>
              {lastSyncTime && (
                <>
                  <span className="text-slate-600">|</span>
                  <span className="text-slate-400 text-[11px]">{lastSyncTime}</span>
                </>
              )}
            </div>
          )}

          {/* Quick Refresh Button - Only visible and accessible to Admin users to protect token limits */}
          {isAdmin && (
            <button
              id="board-refresh-btn"
              onClick={handleRefresh}
              title="Refresh latest quotes from server proxy"
              className="p-2 rounded-xl bg-[#0F141E] hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing || isLoadingLiveMetrics ? 'animate-spin text-blue-400' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Prominent Connection Loss Notification Banner */}
      {isOffline && (
        <div 
          id="board-offline-alert"
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-200 text-xs font-mono shadow-lg"
        >
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <div>
              <span className="font-bold text-rose-300">Connection Interrupted: </span>
              <span className="text-slate-300">
                {errorMessage || 'Market feed disconnected.'} Displaying last confirmed market data{lastSyncTime ? ` from ${lastSyncTime}` : ''}.
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              reconnect();
              refreshQuotes();
            }}
            className="px-3 py-1.5 rounded-lg bg-rose-900/80 hover:bg-rose-800 border border-rose-700 text-white font-mono text-xs font-bold transition-all shrink-0 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reconnect & Sync</span>
          </button>
        </div>
      )}

      {/* Main Horizontal Roll Table with Seamless Render Architecture */}
      <div className="w-full bg-[#0F141E] border border-slate-800 rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden backdrop-blur-sm">
        {/* Top Controls Toolbar on a single horizontal axis touching the table */}
        <div className="flex items-center justify-between gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 bg-[#0B0F17]/90">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            {/* 1. Desktop View: Always Expanded Search Bar */}
            <div className="hidden lg:flex relative items-center w-52 xl:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="board-search-input-desktop"
                type="text"
                placeholder="Search stocks & ETFs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setSearchQuery('');
                  }
                }}
                className="w-full pl-8 pr-7 py-1.5 bg-[#0F141E] border border-slate-800 focus:border-blue-500/80 rounded-xl text-xs text-white placeholder-slate-500 outline-none transition-all font-sans shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  title="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 2. Mobile & Tablet View: Toggle Button or Expandable Input */}
            <div className="lg:hidden flex items-center">
              {isSearchExpanded || searchQuery ? (
                <div className="relative flex items-center w-36 xs:w-44 sm:w-56 transition-all">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="board-search-input"
                    type="text"
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
                    className="w-full pl-8 pr-7 py-1.5 bg-[#0F141E] border border-blue-500/80 rounded-xl text-xs text-white placeholder-slate-500 outline-none transition-all font-sans shadow-sm"
                  />
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setIsSearchExpanded(false);
                    }}
                    title="Clear and close search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  id="board-search-toggle-btn"
                  onClick={() => setIsSearchExpanded(true)}
                  title="Search stocks & ETFs"
                  className="p-1.5 sm:p-2 rounded-xl bg-[#0F141E] hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all shadow-sm shrink-0 flex items-center justify-center"
                >
                  <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              )}
            </div>

            {/* Soft, connected 3-toggle button with smooth sliding pill transition */}
            <div 
              id="board-asset-type-toggle"
              className="relative inline-flex items-center p-0.5 rounded-xl bg-[#0F141E] border border-slate-800 shadow-inner select-none shrink-0"
            >
              {[
                { id: 'ALL', label: 'All' },
                { id: 'ETF', label: 'ETFs' },
                { id: 'Stock', label: 'Stocks' },
              ].map((tab) => {
                const isActive = assetFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setAssetFilter(tab.id as 'ALL' | 'ETF' | 'Stock')}
                    className={`relative z-10 px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-mono font-medium rounded-lg transition-colors duration-200 ${
                      isActive
                        ? 'text-white font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="boardAssetFilterPill"
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                        className="absolute inset-0 bg-slate-800 border border-slate-700/80 rounded-lg shadow-sm -z-10"
                      />
                    )}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Expand / Collapse All Button (Icon on mobile/tablet, Text + Icon on desktop) */}
          <div className="flex items-center shrink-0">
            <button
              id="board-expand-all-btn"
              onClick={toggleExpandAll}
              title={expandedSymbols.size === processedStocks.length && processedStocks.length > 0 ? 'Collapse All' : 'Expand All'}
              className="p-1.5 sm:p-2 lg:px-3 lg:py-1.5 rounded-xl bg-[#0F141E] hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all shadow-sm flex items-center justify-center gap-1.5 active:scale-95 text-xs font-mono font-medium"
            >
              {expandedSymbols.size === processedStocks.length && processedStocks.length > 0 ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
                  <span className="hidden lg:inline text-blue-400">Collapse all</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
                  <span className="hidden lg:inline text-slate-300">Expand all</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="w-full overflow-hidden">
          <table className="w-full table-fixed md:table-auto text-left border-separate border-spacing-0">
            {/* Table Header with Clickable Sorting */}
            <thead>
              <tr className="bg-[#131926]/90 text-[11px] font-mono text-slate-400 uppercase tracking-wider select-none">
                
                {/* 1. Name (Sortable) */}
                <th 
                  onClick={() => handleSort('name')}
                  className="py-3 pl-3.5 sm:pl-6 pr-1 sm:pr-3 cursor-pointer hover:text-white transition-colors group w-[52%] sm:w-[56%] md:w-auto border-b border-slate-800"
                >
                  <span className="flex items-center">
                    <span>Name</span>
                    {renderSortIcon('name')}
                  </span>
                </th>

                {/* 2. Today's Trendline (Not Sortable - Desktop Only) */}
                <th className="hidden md:table-cell py-3.5 px-4 text-center border-b border-slate-800">
                  <span>Today's Trend</span>
                </th>

                {/* 3. Last Price (Sortable - Desktop Only) */}
                <th 
                  onClick={() => handleSort('price')}
                  className="hidden md:table-cell py-3.5 px-4 text-right cursor-pointer hover:text-white transition-colors group border-b border-slate-800"
                >
                  <span className="flex items-center justify-end">
                    Last Price
                    {renderSortIcon('price')}
                  </span>
                </th>

                {/* 4. Today's Change (Desktop) / Price (Mobile) (Sortable) */}
                <th 
                  onClick={() => {
                    if (typeof window !== 'undefined' && window.innerWidth < 768) {
                      handleSort('price');
                    } else {
                      handleSort('changePercent');
                    }
                  }}
                  className="py-3.5 px-2 sm:px-4 pr-3.5 sm:pr-4 text-right md:text-center cursor-pointer hover:text-white transition-colors group w-[48%] sm:w-[44%] md:w-auto border-b border-slate-800"
                >
                  <span className="flex items-center justify-end md:justify-center">
                    <span className="md:hidden">Price</span>
                    <span className="hidden md:inline">Today's Change</span>
                    <span className="md:hidden">{renderSortIcon('price')}</span>
                    <span className="hidden md:inline">{renderSortIcon('changePercent')}</span>
                  </span>
                </th>

                {/* 5. 52W Range (Not Sortable - Desktop Only) */}
                <th className="hidden md:table-cell py-3.5 px-4 text-center border-b border-slate-800">
                  <span className="flex items-center justify-center">52W Range</span>
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="font-sans text-sm bg-[#0F141E]">
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
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <p className="text-sm">No assets match your search "{searchQuery}"</p>
                    <button
                      onClick={() => setSearchQuery('')}
                      className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline font-medium"
                    >
                      Clear search
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Summary */}
        <div className="px-3.5 sm:px-6 py-2.5 border-t border-slate-800 bg-[#131926]/60 flex items-center text-xs text-slate-400">
          <span>Showing <strong className="text-white font-mono">{processedStocks.length}</strong> of <strong className="text-white font-mono">{stocks.length}</strong> assets</span>
        </div>
      </div>

      {/* Feed Diagnostics & API Key Configuration Modal - Admin Access Only */}
      <AnimatePresence>
        {showSettingsModal && isAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg max-h-[calc(100dvh-1.5rem)] sm:max-h-[88vh] bg-[#0F141E] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-[#131926]/70 shrink-0">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0">
                    <Radio className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white font-mono">Market Feed & Finnhub Key</h3>
                    <p className="text-xs text-slate-400">Live stream diagnostics & API key configuration</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body with seamless vertical scrolling */}
              <div className="p-4 sm:p-6 space-y-5 text-xs text-slate-300 overflow-y-auto flex-1 overscroll-contain">
                
                {/* Live Stream Telemetry Overview */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div className="p-3 bg-[#0B0E14] border border-slate-800 rounded-xl">
                    <span className="text-[10px] uppercase font-mono text-slate-500 block">Status</span>
                    <span className={`font-mono font-bold flex items-center gap-1.5 mt-0.5 ${
                      isOffline ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${isOffline ? 'bg-rose-500' : 'bg-emerald-400 animate-pulse'}`} />
                      {isOffline ? 'Offline' : socketStatus === 'connected' ? 'Connected' : socketStatus}
                    </span>
                  </div>
                  <div className="p-3 bg-[#0B0E14] border border-slate-800 rounded-xl">
                    <span className="text-[10px] uppercase font-mono text-slate-500 block">Total WS Ticks</span>
                    <span className="font-mono font-bold text-white mt-0.5 block">{totalTicks} ticks</span>
                  </div>
                  <div className="p-3 bg-[#0B0E14] border border-slate-800 rounded-xl col-span-2 sm:col-span-1">
                    <span className="text-[10px] uppercase font-mono text-slate-500 block">Last Quote Sync</span>
                    <span className="font-mono font-bold text-blue-400 mt-0.5 block">{lastSyncTime || 'Syncing...'}</span>
                  </div>
                </div>

                {/* API Key Form */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-200 font-mono flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-blue-400" />
                      Finnhub API Key / Token
                    </span>
                    <button
                      onClick={() => setKeyInputValue('da49de9r01qo2j87gpg0da49de9r01qo2j87gpgg')}
                      className="text-[11px] text-blue-400 hover:text-blue-300 underline font-normal cursor-pointer"
                    >
                      Use Default Key
                    </button>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={keyInputValue}
                      onChange={(e) => setKeyInputValue(e.target.value)}
                      placeholder="Enter Finnhub API Key (e.g. da49de9r01...)"
                      className="w-full px-3 py-2 bg-[#080B10] border border-slate-700 focus:border-blue-500 rounded-xl font-mono text-xs text-white placeholder-slate-600 outline-none transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Used for live tick execution via WebSocket and company profile metrics. Historical 5-minute candles and verified broad market quotes are proxied directly from Yahoo Finance.
                  </p>
                </div>

                {/* Feed Accuracy Note */}
                <div className="p-3 bg-blue-950/30 border border-blue-800/40 rounded-xl text-[11px] text-slate-300 leading-relaxed space-y-1">
                  <div className="font-bold text-blue-400 flex items-center gap-1.5 font-mono">
                    <Zap className="w-3.5 h-3.5" />
                    Market Feed Integrity & Connection Handling
                  </div>
                  <p>
                    All market quotes, 5-minute intraday intervals, and historical timelines are sourced directly from real-world feeds. If your network or feed drops, the app preserves last known data with exact timestamps rather than generating theoretical numbers.
                  </p>
                </div>

                {/* Test Result Message */}
                {testResult && (
                  <div className={`p-3 rounded-xl border text-xs leading-relaxed flex items-start gap-2 ${
                    testResult.success 
                      ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' 
                      : 'bg-rose-950/40 border-rose-800 text-rose-300'
                  }`}>
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                )}

                {/* Save Confirmation Message */}
                {keySaveMessage && (
                  <div className="p-2.5 rounded-xl bg-emerald-950/50 border border-emerald-700/60 text-emerald-300 text-xs font-mono flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{keySaveMessage}</span>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="p-4 sm:p-5 border-t border-slate-800 bg-[#131926]/70 flex items-center justify-between gap-3 shrink-0">
                <button
                  onClick={handleTestKey}
                  disabled={isTestingKey}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingKey ? 'animate-spin' : ''}`} />
                  <span>{isTestingKey ? 'Testing...' : 'Test Connection'}</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowSettingsModal(false)}
                    className="px-3.5 py-2 rounded-xl bg-transparent hover:bg-slate-800 text-slate-300 font-mono text-xs transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleSaveKey}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold transition-all shadow-lg shadow-blue-900/30 cursor-pointer"
                  >
                    Save & Connect
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
