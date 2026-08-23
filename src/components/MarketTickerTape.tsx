import React from 'react';
import { TickerSummary } from '../types';

interface MarketTickerTapeProps {
  tickers: TickerSummary[];
}

export const MarketTickerTape: React.FC<MarketTickerTapeProps> = ({ tickers }) => {
  // Duplicate ticker list for seamless 50% loop crawl
  const crawlItems = [...tickers, ...tickers];

  return (
    <div className="w-full bg-[#080B10] border-y border-slate-800/80 select-none overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center h-9 sm:h-10 relative">
        
        {/* Pinned Market Feed Label with soft fade */}
        <div className="flex items-center space-x-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest shrink-0 z-10 bg-[#080B10] pr-4 sm:pr-6 border-r border-slate-800/80">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0"></span>
          <span className="font-mono">Market Feed</span>
        </div>

        {/* Slow Side-Scrolling Asset Crawl Track */}
        <div className="flex-1 overflow-hidden relative pl-4 sm:pl-6 mask-fade">
          {/* Subtle edge fade overlays */}
          <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-[#080B10] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#080B10] to-transparent z-10 pointer-events-none" />

          <div className="animate-ticker-crawl items-center space-x-8 sm:space-x-12">
            {crawlItems.map((t, idx) => {
              const isPos = t.change >= 0;
              return (
                <div
                  key={`${t.symbol}-${idx}`}
                  className="flex items-center space-x-2 text-xs shrink-0 cursor-default"
                >
                  <span className="font-mono font-bold text-slate-200">{t.symbol}</span>
                  <span className="font-mono text-slate-300">${t.price.toFixed(2)}</span>
                  <span
                    className={`font-mono text-[11px] font-semibold flex items-center ${
                      isPos ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {isPos ? '+' : ''}
                    {t.changePercent.toFixed(2)}%
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

