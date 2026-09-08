import { finite, fixed, priceLabel, fullPriceLabel } from '../utils/marketValues';
import React, { useMemo, useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { useMarket } from '../context/MarketContext';
import { TickerLogo } from './TickerLogo';
import { BoardStock } from '../types';
import { getAssetShorthandName } from '../utils/shorthandNames';

import { formatMarketUpdateTime } from '../utils/timeFormat';

interface BoardSnapshotCardProps {
  onExploreBoard: (symbol?: string) => void;
}

export const BoardSnapshotCard: React.FC<BoardSnapshotCardProps> = ({ onExploreBoard }) => {
  const { stocks, lastSyncTime, isOffline } = useMarket();
  const risers = useMemo(() => {
    return [...stocks]
      .filter((s) => s.dataStatus === 'available' && finite(s.price) && finite(s.changePercent))
      .filter(s => s.changePercent > 0).sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, 5);
  }, [stocks]);

  const fallers = useMemo(() => {
    return [...stocks]
      .filter((s) => s.dataStatus === 'available' && finite(s.price) && finite(s.changePercent))
      .filter(s => s.changePercent < 0).sort((a, b) => a.changePercent - b.changePercent)
      .slice(0, 5);
  }, [stocks]);

  const handleStockClick = (symbol: string) => {
    onExploreBoard(symbol);
  };

  const isLiveTrading = false;
  const displayUpdateTime = formatMarketUpdateTime(lastSyncTime);

  return (
    <div
      id="market-board-snapshot-card"
      className="relative w-full bg-panel border border-line rounded-2xl p-5 sm:p-6 shadow-xl shadow-shade/40 overflow-hidden group hover:border-line-strong/80 transition-all duration-300 flex flex-col justify-between"
    >
      {/* Ambient subtle glow */}
      <div className="absolute -top-10 -left-10 w-36 h-36 bg-info-600/10 blur-2xl rounded-full pointer-events-none" />

      {/* Top-Right Clickable Corner Gradient (Flush to Card Corner, Seamless Fade) */}
      <button
        id="snapshot-view-board-btn"
        type="button"
        aria-label="The Board Card"
        onClick={() => onExploreBoard()}
        className="absolute top-0 right-0 z-10 pt-4 pr-5 pb-4 pl-10 flex items-center gap-1.5 text-xs sm:text-sm font-bold text-info-ink-300 hover:text-ink-heading transition-all duration-300 cursor-pointer group/corner"
      >
        {/* Seamless radial gradient background fading smoothly into header */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(59,130,246,0.30)_0%,_rgba(99,102,241,0.14)_35%,_rgba(15,20,30,0)_70%)] group-hover/corner:bg-[radial-gradient(ellipse_at_top_right,_rgba(59,130,246,0.48)_0%,_rgba(99,102,241,0.22)_45%,_rgba(15,20,30,0)_75%)] transition-all duration-300 pointer-events-none -z-10" />

        <span className="relative z-10">The Board</span>
        <ArrowUpRight className="relative z-10 w-4 h-4 text-info-ink-400 group-hover/corner:text-ink-heading group-hover/corner:translate-x-0.5 group-hover/corner:-translate-y-0.5 transition-transform" />
      </button>

      {/* 1. Header: Board Icon + Single-Line Clean Title "Market Movers" */}
      <div className="flex items-center justify-between gap-2 pb-4 pr-24 sm:pr-28 border-b border-line/80">
        <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-indigo-surface-950 via-surface-900 to-info-surface-950 border border-line-strong/70 flex items-center justify-center shadow-inner shrink-0">
            <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-info-ink-400" />
          </div>

          <h3 className="text-base sm:text-lg lg:text-2xl font-bold text-ink-heading tracking-tight truncate whitespace-nowrap">
            Market Movers
          </h3>
        </div>
      </div>

      {/* 2. Dual Columns: Risers (Left) & Fallers (Right) */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5 flex-1">

        {/* Left Column: Risers */}
        <div
          id="board-card-risers-column"
          className="bg-inset/80 border border-line/80 rounded-xl p-3.5 sm:p-4 flex flex-col justify-between hover:border-line-strong/70 transition-colors"
        >
          {/* Header: Text on Left, Arrow on Right */}
          <div className="flex items-center justify-between pb-2.5 border-b border-line/60">
            <span className="text-base sm:text-lg font-extrabold text-positive-ink-400 tracking-wide">
              Risers
            </span>
            <TrendingUp className="w-5 h-5 text-positive-ink-400" />
          </div>

          <div className="space-y-2 mt-3 flex-1">
            {risers.map((item: BoardStock, idx: number) => {
              const isPos = item.changePercent >= 0;

              return (
                <div
                  key={`riser-${item.symbol}-${idx}`}
                  onClick={() => handleStockClick(item.symbol)}
                  className="flex items-center justify-between p-1.5 sm:p-2 -mx-1 rounded-lg hover:bg-surface-800/60 transition-colors cursor-pointer group/row"
                >
                  <div className="flex items-center space-x-2 sm:space-x-2.5 min-w-0 pr-2">
                    <TickerLogo symbol={item.symbol} size="sm" className="shrink-0" />
                    <div className="min-w-0">
                      <div className="font-mono font-bold text-sm sm:text-base text-ink-heading group-hover/row:text-info-ink-300 transition-colors">
                        {item.symbol}
                      </div>
                      {/* Subtext Shorthand Name */}
                      <div className="hidden sm:block text-xs text-ink-muted truncate max-w-[110px] md:max-w-[130px] leading-tight">
                        {getAssetShorthandName(item.symbol, item.name)}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono text-xs sm:text-sm font-semibold text-ink-strong">
                      <span title={fullPriceLabel(item.price, item.currency, item.assetType)}>{priceLabel(item.price, item.currency, item.assetType)}</span>
                    </div>
                    <div className={`font-mono text-xs sm:text-sm font-bold inline-flex items-center px-1.5 py-0.5 rounded ${
                      isPos
                        ? 'text-positive-ink-400 bg-positive-500/10 border border-positive-500/20'
                        : 'text-danger-ink-400 bg-danger-500/10 border border-danger-500/20'
                    }`}>
                      {isPos ? '+' : ''}{fixed(item.changePercent)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Fallers */}
        <div
          id="board-card-fallers-column"
          className="bg-inset/80 border border-line/80 rounded-xl p-3.5 sm:p-4 flex flex-col justify-between hover:border-line-strong/70 transition-colors"
        >
          {/* Header: Text on Left, Arrow on Right */}
          <div className="flex items-center justify-between pb-2.5 border-b border-line/60">
            <span className="text-base sm:text-lg font-extrabold text-danger-ink-400 tracking-wide">
              Fallers
            </span>
            <TrendingDown className="w-5 h-5 text-danger-ink-400" />
          </div>

          <div className="space-y-2 mt-3 flex-1">
            {fallers.map((item: BoardStock, idx: number) => {
              const isPos = item.changePercent >= 0;

              return (
                <div
                  key={`faller-${item.symbol}-${idx}`}
                  onClick={() => handleStockClick(item.symbol)}
                  className="flex items-center justify-between p-1.5 sm:p-2 -mx-1 rounded-lg hover:bg-surface-800/60 transition-colors cursor-pointer group/row"
                >
                  <div className="flex items-center space-x-2 sm:space-x-2.5 min-w-0 pr-2">
                    <TickerLogo symbol={item.symbol} size="sm" className="shrink-0" />
                    <div className="min-w-0">
                      <div className="font-mono font-bold text-sm sm:text-base text-ink-heading group-hover/row:text-info-ink-300 transition-colors">
                        {item.symbol}
                      </div>
                      {/* Subtext Shorthand Name */}
                      <div className="hidden sm:block text-xs text-ink-muted truncate max-w-[110px] md:max-w-[130px] leading-tight">
                        {getAssetShorthandName(item.symbol, item.name)}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono text-xs sm:text-sm font-semibold text-ink-strong">
                      <span title={fullPriceLabel(item.price, item.currency, item.assetType)}>{priceLabel(item.price, item.currency, item.assetType)}</span>
                    </div>
                    <div className={`font-mono text-xs sm:text-sm font-bold inline-flex items-center px-1.5 py-0.5 rounded ${
                      isPos
                        ? 'text-positive-ink-400 bg-positive-500/10 border border-positive-500/20'
                        : 'text-danger-ink-400 bg-danger-500/10 border border-danger-500/20'
                    }`}>
                      {isPos ? '+' : ''}{fixed(item.changePercent)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* 3. Bottom Card Metadata: Pulsing when live trading, static when closed + Subtle timestamp */}
      <div className="mt-4 pt-3.5 border-t border-line/70 flex items-center justify-between text-[11px] text-ink-muted font-mono">
        <div className="flex items-center space-x-2 truncate">
          <span className="relative flex h-2 w-2 shrink-0">
            {isLiveTrading && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-positive-400 opacity-75" />
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isLiveTrading ? 'bg-positive-500' : 'bg-positive-500/80'}`} />
          </span>
          <span className="text-ink-secondary font-medium truncate">
            {isOffline ? 'Market update failed' : lastSyncTime ? 'Provider data • may be delayed' : 'Awaiting data'}
          </span>
        </div>

        <div className="text-ink-subtle text-[11px] shrink-0 font-mono pl-2">
          Updated {displayUpdateTime}
        </div>
      </div>
    </div>
  );
};
