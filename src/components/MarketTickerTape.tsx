import React from 'react';
import { useHourlyMovers } from '../hooks/useHourlyMovers';

interface MarketTickerTapeProps {
  onSelectSymbol?: (symbol: string) => void;
}

export const MarketTickerTape: React.FC<MarketTickerTapeProps> = ({ onSelectSymbol }) => {
  const { gainers, losers } = useHourlyMovers();

  const moverGroup = [...gainers, ...losers];
  const crawlItems = [...moverGroup, ...moverGroup];

  return (
    <div
      id="ticker-tape-container"
      className="w-full bg-[#080B10] border-y border-slate-800/80 select-none overflow-hidden relative"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center h-9 sm:h-10 relative">
        {/* Minimalist Pinned Label */}
        <div className="flex items-center space-x-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest shrink-0 z-10 bg-[#080B10] pr-4 sm:pr-6 border-r border-slate-800/80">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
          <span className="font-mono">Market Feed</span>
        </div>

        {/* Slow Side-Scrolling Track */}
        <div className="flex-1 overflow-hidden relative pl-4 sm:pl-6 mask-fade">
          <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-[#080B10] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#080B10] to-transparent z-10 pointer-events-none" />

          <div className="animate-ticker-crawl items-center space-x-8 sm:space-x-12">
            {crawlItems.map((item, idx) => {
              const isPos = item.changePercent >= 0;

              return (
                <div
                  key={`${item.symbol}-${idx}`}
                  onClick={() => onSelectSymbol?.(item.symbol)}
                  className={`flex items-center space-x-2 text-xs shrink-0 ${
                    onSelectSymbol ? 'cursor-pointer hover:opacity-80 transition-opacity' : 'cursor-default'
                  }`}
                >
                  <span className="font-mono font-bold text-slate-200">{item.symbol}</span>
                  <span className="font-mono text-slate-300">${item.price.toFixed(2)}</span>
                  <span
                    className={`font-mono text-[11px] font-semibold flex items-center ${
                      isPos ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {isPos ? '+' : ''}
                    {item.changePercent.toFixed(2)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
