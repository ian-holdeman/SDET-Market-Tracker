import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Header } from './components/Header';
import { MarketTickerTape } from './components/MarketTickerTape';
import { VtiSnapshotCard } from './components/VtiSnapshotCard';
import { TestSnapshotCard } from './components/TestSnapshotCard';
import { TheBoard } from './components/TheBoard';
import { TheTests } from './components/TheTests';
import { Footer } from './components/Footer';
import { PagePlaceholder } from './components/PagePlaceholder';
import { AuthModal } from './components/AuthModal';
import { AuthProvider } from './context/AuthContext';
import { INITIAL_VTI_DATA, POPULAR_TICKERS } from './data/marketData';
import { PageView, MarketIndexData, TickerSummary } from './types';
import { fetchProxyQuotes, fetchProxyCandles } from './services/yahooMarket';

function AppContent() {
  const [currentPage, setCurrentPage] = useState<PageView>('home');
  const [vtiData, setVtiData] = useState<MarketIndexData>(INITIAL_VTI_DATA);
  const [tickers, setTickers] = useState<TickerSummary[]>(POPULAR_TICKERS);

  // Sync real-world broad market data & VTI candle timeline from server proxy
  useEffect(() => {
    let isMounted = true;

    async function syncRealMarketHomeData() {
      try {
        // 1. Fetch real quotes for tickers & VTI
        const symbols = ['VTI', 'VOO', 'QQQM', 'NVDA', 'GOOGL', 'BTC', 'SCHD', 'VXUS'];
        const quotes = await fetchProxyQuotes(symbols);

        if (isMounted && quotes && quotes.length > 0) {
          // Update ticker tape
          setTickers((prev) =>
            prev.map((t) => {
              const match = quotes.find((q) => q.symbol === t.symbol);
              if (!match) return t;
              return {
                ...t,
                price: match.price,
                change: match.change,
                changePercent: match.changePercent,
              };
            })
          );

          // Update VTI live quote
          const vtiQuote = quotes.find((q) => q.symbol === 'VTI');
          if (vtiQuote) {
            setVtiData((prev) => ({
              ...prev,
              currentPrice: vtiQuote.price,
              change: vtiQuote.change,
              changePercent: vtiQuote.changePercent,
              stats: {
                ...prev.stats,
                previousClose: vtiQuote.prevClose || prev.stats.previousClose,
                openPrice: vtiQuote.open || prev.stats.openPrice,
                daysRange: {
                  low: vtiQuote.dayLow || prev.stats.daysRange.low,
                  high: vtiQuote.dayHigh || prev.stats.daysRange.high,
                },
                fiftyTwoWeekRange: {
                  low: vtiQuote.fiftyTwoWeekLow || prev.stats.fiftyTwoWeekRange.low,
                  high: vtiQuote.fiftyTwoWeekHigh || prev.stats.fiftyTwoWeekRange.high,
                },
              },
            }));
          }
        }

        // 2. Fetch real 1D candle series for VTI
        const vti1DCandles = await fetchProxyCandles('VTI', '1D');
        if (isMounted && vti1DCandles && vti1DCandles.points.length > 3) {
          const formattedPoints = vti1DCandles.points.map((p) => ({
            timestamp: p.timeUnix ? new Date(p.timeUnix).toISOString() : new Date().toISOString(),
            timeLabel: p.label,
            price: p.price,
          }));

          setVtiData((prev) => ({
            ...prev,
            timeframeData: {
              ...prev.timeframeData,
              '1D': formattedPoints,
            },
          }));
        }
      } catch (err) {
        console.warn('Unable to sync home VTI market data:', err);
      }
    }

    syncRealMarketHomeData();
    const interval = setInterval(syncRealMarketHomeData, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0B0E14] text-slate-100 flex flex-col font-sans selection:bg-blue-600/30 selection:text-white antialiased">
      {/* Top Header Navigation */}
      <Header
        currentPage={currentPage}
        onNavigate={(page) => {
          setCurrentPage(page);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Auth Modal for Pseudonymous Sign-in & Registration */}
      <AuthModal />

      {/* Horizontal Market Ticker Ribbon (Only on The Board) */}
      <AnimatePresence>
        {currentPage === 'board' && (
          <motion.div
            key="market-ticker-ribbon"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <MarketTickerTape tickers={tickers} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area with Smooth View Animation */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 py-4 sm:py-12 overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-full"
          >
            {currentPage === 'home' ? (
              <div className="w-full space-y-8 sm:space-y-12">
                {/* Centered Page Title & Subtitle */}
                <div className="w-full text-center max-w-3xl mx-auto space-y-3 pb-2">
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                    Ian's Market Tracker
                    <span className="block text-xl sm:text-2xl lg:text-3xl font-bold text-slate-400 mt-2 font-sans tracking-normal">
                      (and Test Automation Suite!)
                    </span>
                  </h1>
                  
                  <p className="mt-3 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
                    A dual-purpose financial platform providing real-time broad market surveillance and a live visual showcase of automated SDET test execution and API contract validation.
                  </p>
                </div>

                {/* Dual Cards Grid: Market Tracking (VTI) & SDET Testing */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-stretch max-w-6xl mx-auto">
                  {/* Left Card: VTI Market Surveillance */}
                  <div className="w-full flex justify-center">
                    <VtiSnapshotCard
                      data={vtiData}
                      onExploreBoard={() => {
                        setCurrentPage('board');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    />
                  </div>

                  {/* Right Card: SDET Test Execution Telemetry */}
                  <div className="w-full flex justify-center">
                    <TestSnapshotCard
                      onExploreTests={() => {
                        setCurrentPage('tests');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : currentPage === 'board' ? (
              <TheBoard />
            ) : currentPage === 'tests' ? (
              <TheTests />
            ) : (
              <PagePlaceholder
                page={currentPage}
                onBackToHome={() => {
                  setCurrentPage('home');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

