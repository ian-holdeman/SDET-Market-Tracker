import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Header } from './components/Header';
import { MarketTickerTape } from './components/MarketTickerTape';
import { BoardSnapshotCard } from './components/BoardSnapshotCard';
import { TestSnapshotCard } from './components/TestSnapshotCard';
import { TheBoard } from './components/TheBoard';
import { TheTests } from './components/TheTests';
import { TheLogic } from './components/TheLogic';
import { UserSettings } from './components/UserSettings';
import { Footer } from './components/Footer';
import { ContactModal } from './components/ContactModal';
import { PrivacyModal } from './components/PrivacyModal';
import { PrivacyPage } from './components/PrivacyNotice';
import { PagePlaceholder } from './components/PagePlaceholder';
import { AuthModal } from './components/AuthModal';
import { AuthProvider } from './context/AuthContext';
import { MarketProvider } from './context/MarketContext';
import { PageView } from './types';
import { parseRouteFromLocation, syncRouteUrl } from './utils/navigation';

function AppContent() {
  const [currentPage, setCurrentPage] = useState<PageView>(() => {
    return parseRouteFromLocation().page;
  });

  const [selectedStockSymbol, setSelectedStockSymbol] = useState<string | undefined>(() => {
    return parseRouteFromLocation().symbol;
  });

  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  // Keep state in sync with browser back / forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const route = parseRouteFromLocation();
      setCurrentPage(route.page);
      setSelectedStockSymbol(route.symbol);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Central navigation handler
  const handleNavigate = useCallback((page: PageView, symbol?: string) => {
    setCurrentPage(page);
    setSelectedStockSymbol(symbol);
    syncRouteUrl(page, symbol);
    if (!symbol) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  return (
    <div className="min-h-screen bg-canvas text-ink-body flex flex-col font-sans selection:bg-info-600/30 selection:text-ink-heading antialiased">
      {/* Top Header Navigation */}
      <Header
        currentPage={currentPage}
        onNavigate={(page) => handleNavigate(page)}
      />

      {/* Google sign-in */}
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
            <MarketTickerTape />
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
                {/* Centered Page Title & Gradient Accent */}
                <div className="w-full text-center max-w-3xl mx-auto space-y-3 pb-2 flex flex-col items-center">
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-ink-heading tracking-tight leading-tight">
                    The SDET's Market Tracker
                  </h1>

                  {/* Subtle gradient accent underline linking Market (Blue) & SDET (Emerald) palette */}
                  <div className="h-[2px] w-32 sm:w-48 bg-gradient-to-r from-transparent via-info-500/70 via-positive-400/70 to-transparent rounded-full my-1.5" />

                  <p className="mt-1 text-sm sm:text-base text-ink-muted max-w-2xl mx-auto leading-relaxed">
                    A dual-purpose financial platform providing real-time market surveillance of select assets and a live visual showcase of automated test execution
                  </p>
                </div>

                {/* Dual Cards Grid: Market Tracking (The Board Movers) & SDET Testing */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-stretch max-w-6xl mx-auto">
                  {/* Left Card: The Board - Top 5 Risers & Fallers with Deep-Linking */}
                  <div className="w-full flex justify-center">
                    <BoardSnapshotCard
                      onExploreBoard={(symbol?: string) => {
                        handleNavigate('board', symbol);
                      }}
                    />
                  </div>

                  {/* Right Card: SDET Test Execution Telemetry */}
                  <div className="w-full flex justify-center">
                    <TestSnapshotCard
                      onExploreTests={() => {
                        handleNavigate('tests');
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : currentPage === 'board' ? (
              <TheBoard
                initialExpandedSymbol={selectedStockSymbol}
                onSelectStock={(symbol) => {
                  // Keep the active selected stock in URL parameters
                  setSelectedStockSymbol(symbol);
                  syncRouteUrl('board', symbol, true);
                }}
              />
            ) : currentPage === 'tests' ? (
              <TheTests />
            ) : currentPage === 'logic' ? (
              <TheLogic onNavigate={handleNavigate} />
            ) : currentPage === 'privacy' ? (
              <PrivacyPage />
            ) : currentPage === 'settings' ? (
              <UserSettings onNavigate={handleNavigate} />
            ) : (
              <PagePlaceholder
                page={currentPage}
                onBackToHome={() => {
                  handleNavigate('home');
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer with subtle navigation & modal triggers */}
      <Footer
        onOpenContact={() => setIsContactModalOpen(true)}
        onOpenPrivacy={() => setIsPrivacyModalOpen(true)}
      />

      {/* Contact Services Modal */}
      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
      />

      {/* Privacy Policy Modal */}
      <PrivacyModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MarketProvider>
        <AppContent />
      </MarketProvider>
    </AuthProvider>
  );
}
