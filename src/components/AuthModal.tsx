import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, KeyRound, User, X, ArrowRight, Lock, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    authModalMode,
    setAuthModalMode,
    closeAuthModal,
    login,
    signup,
    loading,
    error,
    clearError,
  } = useAuth();

  const [username, setUsername] = useState('');
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthModalOpen) {
      setUsername('');
      setPasscode('');
      setConfirmPasscode('');
      setLocalError(null);
    }
  }, [isAuthModalOpen, authModalMode]);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const cleanUser = username.trim();
    if (!cleanUser) {
      setLocalError('Please enter a username.');
      return;
    }
    if (cleanUser.length < 3) {
      setLocalError('Username must be at least 3 characters.');
      return;
    }
    if (!passcode || passcode.length < 4) {
      setLocalError('Passcode must be at least 4 characters.');
      return;
    }

    if (authModalMode === 'signup') {
      if (passcode !== confirmPasscode) {
        setLocalError('Passcodes do not match.');
        return;
      }
    }

    try {
      if (authModalMode === 'login') {
        await login(cleanUser, passcode);
      } else {
        await signup(cleanUser, passcode);
      }
    } catch {
      // Error handled by AuthContext
    }
  };

  const displayError = localError || error;

  return (
    <AnimatePresence>
      <div
        id="auth-modal-backdrop"
        className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20 sm:pt-28 bg-black/75 backdrop-blur-sm overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) closeAuthModal();
        }}
      >
        <motion.div
          id="auth-modal-dialog"
          layout
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          transition={{ duration: 0.18, ease: [0.25, 1, 0.5, 1] }}
          className="w-full max-w-md bg-[#0F141E] border border-slate-800 rounded-2xl p-7 shadow-2xl shadow-black/90 relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            id="auth-modal-close-btn"
            onClick={closeAuthModal}
            aria-label="Close modal"
            className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center space-x-3.5 mb-6">
            <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                {authModalMode === 'login' ? 'Sign In' : 'Create Account'}
              </h2>
              <p className="text-sm font-medium text-slate-300">
                {authModalMode === 'login' ? 'See your watchlist!' : 'Save a watchlist!'}
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs with Sliding Pill Animation */}
          <div className="flex p-1.5 bg-[#121722]/90 border border-slate-800 rounded-xl mb-6 relative">
            <button
              id="auth-tab-login"
              type="button"
              onClick={() => {
                setAuthModalMode('login');
                clearError();
                setLocalError(null);
              }}
              className={`relative flex-1 py-2 text-xs font-semibold rounded-lg transition-colors z-10 select-none ${
                authModalMode === 'login'
                  ? 'text-blue-200'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {authModalMode === 'login' && (
                <motion.div
                  layoutId="activeAuthModalTab"
                  className="absolute inset-0 bg-blue-600/25 border border-blue-500/40 rounded-lg shadow-sm"
                  transition={{
                    duration: 0.18,
                    ease: [0.25, 1, 0.5, 1],
                  }}
                />
              )}
              <span className="relative z-10">Sign In</span>
            </button>
            <button
              id="auth-tab-signup"
              type="button"
              onClick={() => {
                setAuthModalMode('signup');
                clearError();
                setLocalError(null);
              }}
              className={`relative flex-1 py-2 text-xs font-semibold rounded-lg transition-colors z-10 select-none ${
                authModalMode === 'signup'
                  ? 'text-blue-200'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {authModalMode === 'signup' && (
                <motion.div
                  layoutId="activeAuthModalTab"
                  className="absolute inset-0 bg-blue-600/25 border border-blue-500/40 rounded-lg shadow-sm"
                  transition={{
                    duration: 0.18,
                    ease: [0.25, 1, 0.5, 1],
                  }}
                />
              )}
              <span className="relative z-10">Create Account</span>
            </button>
          </div>

          {/* Error Message */}
          {displayError && (
            <div
              id="auth-error-message"
              className="mb-5 p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-start space-x-2"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
              <span>{displayError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="auth-username-input" className="block text-xs font-medium text-slate-300 mb-2">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="auth-username-input"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. trader_42"
                  autoComplete="username"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="auth-passcode-input" className="block text-xs font-medium text-slate-300 mb-2">
                {authModalMode === 'login' ? 'Passcode' : 'Create Passcode'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  id="auth-passcode-input"
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Minimum 4 characters"
                  autoComplete={authModalMode === 'login' ? 'current-password' : 'new-password'}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>
            </div>

            <AnimatePresence initial={false}>
              {authModalMode === 'signup' && (
                <motion.div
                  key="confirm-passcode-field"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15, ease: 'easeInOut' }}
                  className="overflow-hidden space-y-2"
                >
                  <label htmlFor="auth-confirm-passcode-input" className="block text-xs font-medium text-slate-300">
                    Confirm Passcode
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Check className="w-4 h-4" />
                    </div>
                    <input
                      id="auth-confirm-passcode-input"
                      type="password"
                      value={confirmPasscode}
                      onChange={(e) => setConfirmPasscode(e.target.value)}
                      placeholder="Re-enter your passcode"
                      autoComplete="new-password"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="pt-2">
              <button
                id="auth-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                {loading ? (
                  <span>Verifying...</span>
                ) : (
                  <>
                    <span>{authModalMode === 'login' ? 'Sign In' : 'Create Account'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
