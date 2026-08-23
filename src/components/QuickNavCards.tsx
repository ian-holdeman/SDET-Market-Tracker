import React from 'react';
import { 
  Layers, 
  Terminal, 
  User, 
  ArrowRight, 
  CheckCircle2, 
  Activity, 
  Cpu, 
  LineChart, 
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { PageView } from '../types';

interface QuickNavCardsProps {
  onNavigate: (page: PageView) => void;
}

export const QuickNavCards: React.FC<QuickNavCardsProps> = ({ onNavigate }) => {
  return (
    <section id="quick-nav-section" className="mt-8 sm:mt-12 w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-5 gap-2">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>Explore Platform Architecture</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Single-click access to the live watchlist board, automated test telemetry, and system design.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Card 1: The Board */}
        <div 
          id="card-the-board"
          onClick={() => onNavigate('board')}
          className="group relative bg-[#0F141E] hover:bg-[#131A28] border border-slate-800/90 hover:border-blue-500/50 rounded-2xl p-6 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-2xl hover:shadow-blue-950/30 flex flex-col justify-between"
        >
          <div className="absolute top-4 right-4 text-slate-600 group-hover:text-blue-400 transition-colors">
            <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
          </div>

          <div>
            <div className="w-12 h-12 rounded-xl bg-blue-950/60 border border-blue-800/50 flex items-center justify-center text-blue-400 mb-4 group-hover:scale-105 transition-transform">
              <Layers className="w-6 h-6" />
            </div>

            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-bold text-white group-hover:text-blue-300 transition-colors">
                The Board
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-950 text-blue-400 border border-blue-800/50">
                Watchlist
              </span>
            </div>

            <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
              Curated watchlist tracking key US equities, broad ETFs, and sector allocations with high-contrast live quotes.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-mono">12+ Tracked Tickers</span>
            <span className="text-blue-400 font-medium group-hover:underline flex items-center gap-1">
              Open Board <ArrowRight className="w-3.5 h-3.5 inline" />
            </span>
          </div>
        </div>

        {/* Card 2: The Tests (SDET Core Highlight) */}
        <div 
          id="card-the-tests"
          onClick={() => onNavigate('tests')}
          className="group relative bg-[#0F141E] hover:bg-[#131A28] border border-slate-800/90 hover:border-emerald-500/50 rounded-2xl p-6 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-2xl hover:shadow-emerald-950/30 flex flex-col justify-between"
        >
          <div className="absolute top-4 right-4 text-slate-600 group-hover:text-emerald-400 transition-colors">
            <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
          </div>

          <div>
            <div className="w-12 h-12 rounded-xl bg-emerald-950/60 border border-emerald-800/50 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-105 transition-transform">
              <Terminal className="w-6 h-6" />
            </div>

            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
                The Tests
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/50 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                SDET Live
              </span>
            </div>

            <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
              Real-time telemetry and automated test run visualizer verifying API contract integrity, calculation precision, and edge-cases.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs">
            <span className="text-emerald-400/90 font-mono font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              142/142 Passing (98.4%)
            </span>
            <span className="text-emerald-400 font-medium group-hover:underline flex items-center gap-1">
              View Feed <ArrowRight className="w-3.5 h-3.5 inline" />
            </span>
          </div>
        </div>

        {/* Card 3: About */}
        <div 
          id="card-the-about"
          onClick={() => onNavigate('about')}
          className="group relative bg-[#0F141E] hover:bg-[#131A28] border border-slate-800/90 hover:border-purple-500/50 rounded-2xl p-6 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-2xl hover:shadow-purple-950/30 flex flex-col justify-between"
        >
          <div className="absolute top-4 right-4 text-slate-600 group-hover:text-purple-400 transition-colors">
            <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
          </div>

          <div>
            <div className="w-12 h-12 rounded-xl bg-purple-950/60 border border-purple-800/50 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-105 transition-transform">
              <User className="w-6 h-6" />
            </div>

            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors">
                About & SDET Craft
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-950 text-purple-400 border border-purple-800/50">
                Profile
              </span>
            </div>

            <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
              Architectural breakdown, test automation philosophy, clean code standards, and Ian's SDET engineering background.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-mono">Documentation & Bio</span>
            <span className="text-purple-400 font-medium group-hover:underline flex items-center gap-1">
              Read Story <ArrowRight className="w-3.5 h-3.5 inline" />
            </span>
          </div>
        </div>

      </div>
    </section>
  );
};
