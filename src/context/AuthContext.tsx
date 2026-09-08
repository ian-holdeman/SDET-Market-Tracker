import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { type UserProfile, signInWithGoogle, completeOAuth, loadProfile, changeWatchlist, clearUserWatchlist, loadWatchlist, deleteUserAccount } from '../services/authService';
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
  clearWatchlist: () => Promise<void>;
  accountBusy: boolean;
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
  const [accountBusy, setAccountBusy] = useState(false);
  const currentUser = useRef<UserProfile | null>(null);
  const owner = useRef<string | null>(null);
  const epoch = useRef(0);
  const refreshWatchlist = useRef(false);
  const watchVersion = useRef(0);
  const publish = (profile: UserProfile | null) => { currentUser.current = profile; setUser(profile); };

  useEffect(() => {
    try { localStorage.removeItem('imt_active_user_session'); } catch { /* Public rendering works with blocked storage. */ }
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    let client: ReturnType<typeof getSupabase>;
    try { client = getSupabase(); }
    catch { setLoading(false); return; } // Public browsing remains usable without account configuration.
    const refresh = async () => {
      const current = ++generation.current;
      const version = watchVersion.current;

      try {
        const { data: session } = await client.auth.getSession();
        if (!session.session) { if (!disposed && current === generation.current) publish(null); return; }
        const { data, error: authError } = await client.auth.getUser();
        if (authError || !data.user) throw new Error('Your session could not be verified. Please sign in again.');
        const profile = await loadProfile(data.user);
        if (!disposed && current === generation.current) {
          owner.current = profile.id;
          if (!mutation.current) refreshWatchlist.current = false;
          publish((mutation.current || version !== watchVersion.current) && currentUser.current?.id === profile.id
            ? { ...profile, watchlist: currentUser.current.watchlist } : profile);
        }
      } catch (err) {
        if (!disposed && current === generation.current) { if (!currentUser.current) publish(null); setError(message(err)); setIsAuthModalOpen(true); }
      } finally {
        if (!disposed && current === generation.current) setLoading(false);
      }
    };
    // Supabase calls must run outside the auth callback's internal lock.
    const { data: subscription } = client.auth.onAuthStateChange((event, session) => {
      const nextOwner = session?.user.id ?? null;
      if (event === 'SIGNED_OUT' || owner.current !== nextOwner) {
        ++epoch.current;
        owner.current = nextOwner;
        refreshWatchlist.current = false;
        publish(null);
        setLoading(!!nextOwner);
      }
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
      ++generation.current; ++epoch.current; owner.current = null; publish(null); setError(null);
    } catch { setError('Sign-out was not confirmed. Please try again.'); setIsAuthModalOpen(true); }
  };
  // Exclude conflicting writes synchronously, including clicks before React commits.
  const beginMutation = () => {
    const profile = currentUser.current;
    if (!profile || profile.id !== owner.current) throw new Error('Sign in before changing your account.');
    if (mutation.current) throw new Error('Please wait for the previous account or watchlist change.');
    if (refreshWatchlist.current) throw new Error('The current watchlist could not be verified. Reload before retrying.');
    mutation.current = true; setAccountBusy(true); ++generation.current;
    const started = epoch.current;
    return { profile, isCurrent: () => epoch.current === started && owner.current === profile.id && currentUser.current?.id === profile.id };
  };
  const endMutation = () => { ++watchVersion.current; mutation.current = false; setAccountBusy(false); };
  const deleteAccount = async () => {
    const { profile, isCurrent } = beginMutation();
    try {
      await deleteUserAccount(profile.id, isCurrent);
      if (isCurrent()) { ++epoch.current; owner.current = null; publish(null); setError(null); }
    } finally { endMutation(); }
  };
  const mutateWatchlist = async (symbol?: string): Promise<boolean> => {
    const { profile, isCurrent } = beginMutation();
    const add = symbol !== undefined && !profile.watchlist.includes(symbol);
    try {
      if (symbol === undefined) await clearUserWatchlist(profile.id);
      else await changeWatchlist(profile.id, symbol, add);
      if (!isCurrent()) throw new Error('Your account changed while the watchlist request was in progress. Check the current account before retrying.');
      if (isCurrent()) {
        const latest = currentUser.current!;
        publish({ ...latest, watchlist: symbol === undefined ? [] : add
          ? [...new Set([...latest.watchlist, symbol])] : latest.watchlist.filter(item => item !== symbol) });
      }
      return add;
    } catch (err) {
      if (isCurrent()) {
        try {
          const watchlist = await loadWatchlist(profile.id);
          if (isCurrent()) publish({ ...currentUser.current!, watchlist });
        } catch {
          if (isCurrent()) refreshWatchlist.current = true;
          throw new Error(message(err) + ' The current watchlist could not be verified. Displayed items are retained; reload before retrying.');
        }
      }
      throw err;
    } finally { endMutation(); }
  };
  const toggleWatchlistSymbol = (symbol: string) => mutateWatchlist(symbol);
  const clearWatchlist = async () => { await mutateWatchlist(); };

  return <AuthContext.Provider value={{
    user, isAdmin: user?.role === 'admin', loading, error, isAuthModalOpen,
    openAuthModal, closeAuthModal, login, logout, deleteAccount, clearWatchlist, accountBusy, toggleWatchlistSymbol,
    isSymbolInWatchlist: (symbol) => !!user?.watchlist.includes(symbol), clearError: () => setError(null),
  }}>{children}</AuthContext.Provider>;
};
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
