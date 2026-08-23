import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, CheckCircle2, Layers, Terminal, User } from 'lucide-react';
import { PageView } from '../types';

interface HeaderProps {
  currentPage: PageView;
  onNavigate: (page: PageView) => void;
  sdetPassing: boolean;
}

interface NavItem {
  id: PageView;
  btnId: string;
  mobileBtnId: string;
  label: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ currentPage, onNavigate, sdetPassing }) => {
  const navItems: NavItem[] = [
    {
      id: 'home',
      btnId: 'nav-home-btn',
      mobileBtnId: 'mobile-nav-home-btn',
      label: 'Home',
    },
    {
      id: 'board',
      btnId: 'nav-board-btn',
      mobileBtnId: 'mobile-nav-board-btn',
      label: 'The Board',
      icon: <Layers className="w-4 h-4" />,
    },
    {
      id: 'tests',
      btnId: 'nav-tests-btn',
      mobileBtnId: 'mobile-nav-tests-btn',
      label: 'The Tests',
      icon: <Terminal className="w-4 h-4" />,
      badge: <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />,
    },
    {
      id: 'about',
      btnId: 'nav-about-btn',
      mobileBtnId: 'mobile-nav-about-btn',
      label: 'About',
      icon: <User className="w-4 h-4" />,
    },
  ];

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-[#0B0E14]/85 border-b border-slate-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Brand Logo & Name */}
          <motion.div
            id="brand-logo-btn"
            onClick={() => onNavigate('home')}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center space-x-3 cursor-pointer group select-none"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-900/60 via-slate-800 to-slate-900 border border-blue-500/30 flex items-center justify-center shadow-lg shadow-blue-950/40 group-hover:border-blue-400/60 transition-colors">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold tracking-tight text-white group-hover:text-blue-200 transition-colors">
                  <span className="inline sm:hidden">IMT</span>
                  <span className="hidden sm:inline">Ian's Market Tracker</span>
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-950/80 text-blue-400 border border-blue-800/60">
                  SDET v1.0
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Market Surveillance & Test Automation Suite
              </p>
            </div>
          </motion.div>

          {/* Desktop Navigation Links with Crisp Sliding Pill */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-1.5 bg-[#121722]/90 p-1.5 rounded-xl border border-slate-800/90 shadow-inner">
            {navItems.map((item) => {
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  id={item.btnId}
                  onClick={() => onNavigate(item.id)}
                  className={`relative px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors outline-none focus-visible:ring-1 focus-visible:ring-blue-400 select-none ${
                    isActive
                      ? 'text-blue-200 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {/* Sliding Active Background Pill (Crisp, snappy, no overshoot/bounce) */}
                  {isActive && (
                    <motion.div
                      layoutId="activeDesktopNavTab"
                      className="absolute inset-0 bg-blue-600/20 border border-blue-500/40 rounded-lg shadow-sm pointer-events-none"
                      transition={{
                        duration: 0.18,
                        ease: [0.25, 1, 0.5, 1], // Crisp cubic-bezier without bounce/overextension
                      }}
                    />
                  )}

                  <span className="relative z-10 flex items-center space-x-1.5">
                    {item.icon && <span className="opacity-80">{item.icon}</span>}
                    <span>{item.label}</span>
                    {item.badge}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Real-time Status Badges */}
          <div className="flex items-center space-x-3">
            {/* Live Pipeline Badge */}
            <div
              id="header-cicd-badge"
              className="flex items-center space-x-2 px-2.5 sm:px-3 py-1 rounded-full bg-emerald-950/50 border border-emerald-500/30 text-emerald-400 text-xs font-mono"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className="hidden sm:inline">CI/CD:</span>
              <span className="font-semibold">{sdetPassing ? '100% PASS' : 'RUNNING'}</span>
            </div>
          </div>
        </div>

        {/* Mobile Sub-Navigation Bar with Matching Clean Style & Optical Center Alignment */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-800/60 text-xs font-medium relative bg-[#0B0E14]/95">
          {navItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                id={item.mobileBtnId}
                onClick={() => onNavigate(item.id)}
                className={`relative pl-[11px] pr-[13px] py-1.5 rounded-lg flex items-center justify-center space-x-1 outline-none select-none transition-colors text-center ${
                  isActive
                    ? 'text-blue-200 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {/* Mobile Active Pill Indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeMobileNavTab"
                    className="absolute inset-0 bg-blue-600/20 border border-blue-500/40 rounded-lg shadow-sm pointer-events-none"
                    transition={{
                      duration: 0.18,
                      ease: [0.25, 1, 0.5, 1], // Crisp cubic-bezier without bounce/overextension
                    }}
                  />
                )}

                <span className="relative z-10 inline-flex items-center justify-center gap-1.5 leading-none">
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};

