import { useHeaderActivity } from '../services/useHeaderActivity';
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, Layers, Terminal, Brain, LogIn, LogOut, Star, ChevronDown, Settings } from 'lucide-react';
import { PageView } from '../types';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  currentPage: PageView;
  onNavigate: (page: PageView) => void;
}

interface NavItem {
  id: PageView;
  btnId: string;
  mobileBtnId: string;
  label: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ currentPage, onNavigate }) => {
  const { session, testsActive } = useHeaderActivity();
  const activityDot = (kind: string, label: string) => <span data-testid={kind+'-activity-indicator'} role="img" aria-label={label} title={label} className="w-2 h-2 rounded-full bg-positive-400 animate-pulse motion-reduce:animate-none shrink-0" />;
  const { user, isAdmin, openAuthModal, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems: NavItem[] = [
    {
      id: 'board',
      btnId: 'nav-board-btn',
      mobileBtnId: 'mobile-nav-board-btn',
      label: 'The Board',
      icon: <Layers className="w-4 h-4" />,
      badge: session ? activityDot('board', 'U.S. equity session: '+session) : null,
    },
    {
      id: 'tests',
      btnId: 'nav-tests-btn',
      mobileBtnId: 'mobile-nav-tests-btn',
      label: 'The Tests',
      icon: <Terminal className="w-4 h-4" />,
      badge: testsActive ? activityDot('tests', 'GitHub test workflow in progress') : null,
    },
    {
      id: 'logic',
      btnId: 'nav-logic-btn',
      mobileBtnId: 'mobile-nav-logic-btn',
      label: 'The Logic',
      icon: <Brain className="w-4 h-4" />,
    },
  ];

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-canvas/85 border-b border-line/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Brand Logo & Name */}
          <motion.div
            id="brand-logo-btn"
            role="button"
            tabIndex={0}
            aria-label="The SDET's Market Tracker home"
            onClick={() => onNavigate('home')}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center space-x-3 cursor-pointer group select-none"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-info-surface-900/60 via-surface-800 to-surface-900 border border-info-500/30 flex items-center justify-center shadow-lg shadow-info-shadow-950/40 group-hover:border-info-400/60 transition-colors">
              <TrendingUp className="w-5 h-5 text-positive-ink-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold tracking-tight text-ink-heading group-hover:text-info-ink-200 transition-colors">
                  <span className="inline sm:hidden">SDET</span>
                  <span className="hidden sm:inline">The SDET's Market Tracker</span>
                </span>
              </div>
              <p className="text-xs text-ink-muted hidden sm:block">
                Market Surveillance & Test Automation Suite
              </p>
            </div>
          </motion.div>

          {/* Desktop Navigation Links with Crisp Sliding Pill */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-1.5 bg-nav-surface/90 p-1.5 rounded-xl border border-line/90 shadow-inner">
            {navItems.map((item) => {
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  id={item.btnId}
                  aria-label={item.label}
                  onClick={() => onNavigate(item.id)}
                  className={`relative px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors outline-none focus-visible:ring-1 focus-visible:ring-focus select-none ${
                    isActive
                      ? 'text-info-ink-200 font-semibold'
                      : 'text-ink-muted hover:text-ink-strong'
                  }`}
                >
                  {/* Sliding Active Background Pill */}
                  {isActive && (
                    <motion.div
                      layoutId="activeDesktopNavTab"
                      className="absolute inset-0 bg-info-600/20 border border-info-500/40 rounded-lg shadow-sm pointer-events-none"
                      transition={{
                        duration: 0.18,
                        ease: [0.25, 1, 0.5, 1],
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

          {/* User Account / Watchlist Auth Controls */}
          <div className="flex items-center space-x-3">
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  id="header-user-profile-btn"
                  onClick={() => setIsDropdownOpen((prev) => !prev)}
                  className="flex items-center space-x-2.5 px-3 py-1.5 rounded-full bg-surface-900 border border-line-strong hover:border-info-500/50 text-ink-strong text-xs transition-colors cursor-pointer"
                >
                  <div className="w-5 h-5 rounded-full bg-info-600/30 border border-info-400/40 flex items-center justify-center text-info-ink-300 font-bold text-[10px]">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <span id="header-username-display" className="font-semibold max-w-[100px] truncate">
                    {user.username}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-ink-muted transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Profile Dropdown Menu */}
                <AnimatePresence>
                  {isDropdownOpen && (
                    <motion.div
                      id="header-user-dropdown-menu"
                      initial={{ opacity: 0, y: 5, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 5, scale: 0.95 }}
                      transition={{ duration: 0.12 }}
                      className="absolute right-0 mt-2 w-48 bg-panel border border-line rounded-xl shadow-xl shadow-shade/80 py-1.5 z-50"
                    >
                      <div className="px-3 py-2 border-b border-line/80">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] text-ink-muted">Signed in as</p>
                          {isAdmin ? (
                            <span className="px-1.5 py-0.5 rounded bg-warning-500/20 text-warning-ink-300 border border-warning-500/40 text-[9px] font-mono uppercase font-bold tracking-wider">
                              Admin
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-info-500/20 text-info-ink-300 border border-info-500/40 text-[9px] font-mono uppercase font-bold tracking-wider">
                              User
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-ink-strong truncate mt-0.5">{user.username}</p>
                      </div>

                      <button
                        id="header-settings-btn"
                        onClick={() => {
                          setIsDropdownOpen(false);
                          onNavigate('settings');
                        }}
                        className="w-full px-3 py-2 text-left text-xs text-ink-secondary hover:text-ink-heading hover:bg-surface-800/60 flex items-center space-x-2 transition-colors cursor-pointer border-b border-line/60"
                      >
                        <Settings className="w-3.5 h-3.5 text-ink-muted" />
                        <span>Settings</span>
                      </button>

                      <button
                        id="header-logout-btn"
                        onClick={() => {
                          setIsDropdownOpen(false);
                          logout();
                        }}
                        className="w-full px-3 py-2 text-left text-xs text-danger-ink-300 hover:bg-danger-surface-950/30 flex items-center space-x-2 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5 text-danger-ink-400" />
                        <span>Sign Out</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button
                id="header-login-btn"
                onClick={() => openAuthModal('login')}
                className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-info-600/20 hover:bg-info-600/30 border border-info-500/40 text-info-ink-300 text-xs font-semibold transition-all hover:border-info-400 cursor-pointer shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5 text-info-ink-400" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Sub-Navigation Bar */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-line/60 text-xs font-medium relative bg-canvas/95">
          {navItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                id={item.mobileBtnId}
                aria-label={item.label}
                onClick={() => onNavigate(item.id)}
                className={`relative pl-[11px] pr-[13px] py-1.5 rounded-lg flex items-center justify-center space-x-1 outline-none select-none transition-colors text-center ${
                  isActive
                    ? 'text-info-ink-200 font-semibold'
                    : 'text-ink-muted hover:text-ink-strong'
                }`}
              >
                {/* Mobile Active Pill Indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeMobileNavTab"
                    className="absolute inset-0 bg-info-600/20 border border-info-500/40 rounded-lg shadow-sm pointer-events-none"
                    transition={{
                      duration: 0.18,
                      ease: [0.25, 1, 0.5, 1],
                    }}
                  />
                )}

                <span className="relative z-10 inline-flex items-center justify-center gap-1.5 leading-none">
                  <span>{item.label}</span>
                  {item.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};

