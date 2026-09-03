import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { UserProfile, loginUser, signUpUser, saveUserWatchlist, getUserRole } from '../services/authService';

interface AuthContextType {
  user: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'signup';
  openAuthModal: (mode?: 'login' | 'signup', initialError?: string) => void;
  closeAuthModal: () => void;
  setAuthModalMode: (mode: 'login' | 'signup') => void;
  login: (username: string, passcode: string) => Promise<void>;
  signup: (username: string, passcode: string) => Promise<void>;
  logout: () => void;
  toggleWatchlistSymbol: (symbol: string) => Promise<boolean>;
  isSymbolInWatchlist: (symbol: string) => boolean;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'imt_active_user_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          role: getUserRole(parsed.username || ''),
        };
      }
      return null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');

  // Sync session changes to localStorage
  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [user]);

  const openAuthModal = useCallback((mode: 'login' | 'signup' = 'login', initialError?: string) => {
    setAuthModalMode(mode);
    setError(initialError || null);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const login = useCallback(async (username: string, passcode: string) => {
    setLoading(true);
    setError(null);
    try {
      const profile = await loginUser(username, passcode);
      setUser(profile);
      setIsAuthModalOpen(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to login.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const signup = useCallback(async (username: string, passcode: string) => {
    setLoading(true);
    setError(null);
    try {
      const profile = await signUpUser(username, passcode);
      setUser(profile);
      setIsAuthModalOpen(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to create account.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setError(null);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }, []);

  const toggleWatchlistSymbol = useCallback(async (symbol: string): Promise<boolean> => {
    if (!user) {
      openAuthModal('login');
      return false;
    }

    const currentList = user.watchlist || [];
    const exists = currentList.includes(symbol);
    const updatedList = exists
      ? currentList.filter((s) => s !== symbol)
      : [...currentList, symbol];

    const updatedProfile: UserProfile = {
      ...user,
      watchlist: updatedList,
    };

    setUser(updatedProfile);

    try {
      await saveUserWatchlist(user.username, updatedList);
    } catch (err) {
      console.error('Failed to sync watchlist to database:', err);
    }

    return !exists;
  }, [user, openAuthModal]);

  const isSymbolInWatchlist = useCallback((symbol: string): boolean => {
    if (!user || !user.watchlist) return false;
    return user.watchlist.includes(symbol);
  }, [user]);

  const isAdmin = useMemo(() => {
    if (!user) return false;
    return user.role === 'admin' || getUserRole(user.username) === 'admin';
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        loading,
        error,
        isAuthModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
        setAuthModalMode,
        login,
        signup,
        logout,
        toggleWatchlistSymbol,
        isSymbolInWatchlist,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
