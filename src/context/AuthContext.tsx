import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { type UserProfile, signInWithGoogle, completeOAuth, loadProfile, changeWatchlist, deleteUserAccount } from '../services/authService';
import { getSupabase } from '../lib/supabase';
import { clearLocalAuthState } from '../utils/authStorage';

interface AuthContextType {
  user: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
  isAuthModalOpen: boolean;
  openAuthModal: (mode?: 'login' | 'signup', initialError?: string) => void;
  closeAuthModal: () => void;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  toggleWatchlistSymbol: (symbol: string) => Promise<boolean>;
  isSymbolInWatchlist: (symbol: string) => boolean;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const message = (error: unknown) => error instanceof Error ? error.message : 'The account request failed. Please try again.';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const generation = useRef(0);
  const mutation = useRef(false);

  useEffect(() => {
    localStorage.removeItem('imt_active_user_session');
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    let client: ReturnType<typeof getSupabase>;
    try { client = getSupabase(); }
    catch { setLoading(false); return; } // Public browsing remains usable without account configuration.
    const refresh = async () => {
      const current = ++generation.current;

      try {
        const { data: session } = await client.auth.getSession();
        if (!session.session) { if (!disposed && current === generation.current) setUser(null); return; }
        const { data, error: authError } = await client.auth.getUser();
        if (authError || !data.user) throw new Error('Your session could not be verified. Please sign in again.');
        const profile = await loadProfile(data.user);
        if (!disposed && current === generation.current) setUser(profile);
      } catch (err) {
        if (!disposed && current === generation.current) { setUser(null); setError(message(err)); setIsAuthModalOpen(true); }
      } finally {
        if (!disposed && current === generation.current) setLoading(false);
      }
    };
    // Supabase calls must run outside the auth callback's internal lock.
    const { data: subscription } = client.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') setUser(null);
      ++generation.current;
      clearTimeout(timer);
      timer = setTimeout(() => { void refresh(); }, 0);
    });
    void completeOAuth().then(() => {
      if (!disposed) void refresh();
    }).catch((err) => {
      if (!disposed) { setError(message(err)); setIsAuthModalOpen(true); setLoading(false); }
    });
    const onFocus = () => { void refresh(); };
    window.addEventListener('focus', onFocus);
    return () => {
      disposed = true;
      ++generation.current;
      clearTimeout(timer);
      subscription.subscription.unsubscribe();
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const openAuthModal = useCallback((_mode: 'login' | 'signup' = 'login', initialError?: string) => {
    setError(initialError || null);
    setIsAuthModalOpen(true);
  }, []);
  const closeAuthModal = useCallback(() => { setIsAuthModalOpen(false); setError(null); }, []);
  const login = async () => {
    setLoading(true); setError(null);
    try { await signInWithGoogle(); }
    catch (err) { setError(message(err)); setLoading(false); }
  };
  const logout = async () => {
    try {
      const { error: signOutError } = await getSupabase().auth.signOut({ scope: 'local' });
      if (signOutError) throw signOutError;
      clearLocalAuthState();
      ++generation.current; setUser(null); setError(null);
    } catch { setError('Sign-out was not confirmed. Please try again.'); setIsAuthModalOpen(true); }
  };
  const deleteAccount = async () => {
    if (!user) throw new Error('Sign in again before deleting your account.');
    setLoading(true);
    try { await deleteUserAccount(); ++generation.current; setUser(null); setError(null); }
    finally { setLoading(false); }
  };
  const toggleWatchlistSymbol = async (symbol: string) => {
    if (!user) throw new Error('Sign in before changing your watchlist.');
    if (mutation.current) throw new Error('Please wait for the previous watchlist change.');
    mutation.current = true;
    const id = user.id;
    const add = !user.watchlist.includes(symbol);
    try {
      await changeWatchlist(id, symbol, add);
      setUser((current) => current?.id === id ? { ...current, watchlist: add
        ? [...new Set([...current.watchlist, symbol])] : current.watchlist.filter((item) => item !== symbol) } : current);
      return add;
    } finally { mutation.current = false; }
  };

  return <AuthContext.Provider value={{
    user, isAdmin: user?.role === 'admin', loading, error, isAuthModalOpen,
    openAuthModal, closeAuthModal, login, logout, deleteAccount, toggleWatchlistSymbol,
    isSymbolInWatchlist: (symbol) => !!user?.watchlist.includes(symbol), clearError: () => setError(null),
  }}>{children}</AuthContext.Provider>;
};
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
