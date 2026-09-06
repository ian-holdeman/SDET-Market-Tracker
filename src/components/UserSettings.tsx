import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, 
  User, 
  Trash2, 
  AlertTriangle, 
  Shield, 
  CheckCircle2, 
  Lock, 
  Star, 
  LogIn, 
  X,
  Database,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PageView } from '../types';

interface UserSettingsProps {
  onNavigate: (page: PageView) => void;
}

export const UserSettings: React.FC<UserSettingsProps> = ({ onNavigate }) => {
  const { user, isAdmin, logout, deleteAccount, openAuthModal } = useAuth();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount();
      setIsDeleteModalOpen(false);
      onNavigate('home');
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to delete account. Please try again.');
      setIsDeleting(false);
    }
  };

  // If not logged in, show clean prompt
  if (!user) {
    return (
      <div className="w-full max-w-4xl mx-auto py-12 px-4">
        <div className="bg-[#0F141E] border border-slate-800/90 rounded-2xl p-8 sm:p-12 text-center space-y-6 max-w-xl mx-auto shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-blue-950/60 border border-blue-800/50 flex items-center justify-center text-blue-400 mx-auto">
            <Settings className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">Account Settings</h1>
            <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
              Sign in to manage your account settings, data privacy, and saved watchlist preferences.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => openAuthModal('login')}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors cursor-pointer shadow-lg shadow-blue-950/50"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In to Your Account</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 sm:space-y-10 py-4">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/60">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-slate-800/80 border border-slate-700/70 flex items-center justify-center text-slate-300">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Settings
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Account preferences, privacy controls, and data management.
            </p>
          </div>
        </div>

        {/* Username badge */}
        <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-[#121824] border border-slate-800/80 self-start sm:self-auto">
          <div className="w-7 h-7 rounded-lg bg-blue-900/60 border border-blue-700/50 flex items-center justify-center text-blue-300 font-bold text-xs uppercase">
            {user.username.charAt(0)}
          </div>
          <div className="text-left">
            <p className="text-xs font-bold text-white leading-tight">
              {user.username}
            </p>
            <p className="text-[10px] text-slate-400 font-mono">
              {isAdmin ? 'Admin' : 'Standard User'} • {user.watchlist?.length || 0} Watchlist Items
            </p>
          </div>
        </div>
      </div>

      {/* 2. Settings Table / Minimalist Row List */}
      <div className="bg-[#0F141E] border border-slate-800/90 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800/80 bg-[#121824]/50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider text-slate-400 text-[11px]">
            Account & Data Compliance
          </h2>
          <span className="text-[11px] font-mono text-slate-500">
            Strict Read-Only & Privacy Controls
          </span>
        </div>

        <div className="divide-y divide-slate-800/70">
          {/* Row 1: Username & Profile Details */}
          <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/20 transition-colors">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <User className="w-4 h-4 text-blue-400" />
                <span>Account Identity</span>
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your pseudonymous username used for saving watchlists and personal preference sync.
              </p>
            </div>

            <div className="sm:text-right">
              <span className="font-mono text-xs font-semibold px-3 py-1 rounded-lg bg-slate-800 text-slate-200 border border-slate-700">
                {user.username}
              </span>
            </div>
          </div>

          {/* Row 2: Watchlist Data Stats */}
          <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/20 transition-colors">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400" />
                <span>Saved Watchlist Data</span>
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Currently tracking {user.watchlist?.length || 0} assets across index funds, ETFs, and equities.
              </p>
            </div>

            <div className="sm:text-right">
              <button
                onClick={() => onNavigate('board')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
              >
                <span>View on The Board</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Row 3: Delete Account (Data Compliance) */}
          <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-rose-950/10 transition-colors">
            <div className="space-y-1 max-w-xl">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Delete Account</span>
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Permanently delete your account, saved watchlist items, and cloud data. This action is irreversible.
              </p>
            </div>

            <div className="sm:text-right">
              <button
                id="btn-delete-account"
                onClick={() => setIsDeleteModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/70 text-rose-300 hover:text-rose-200 text-xs font-semibold transition-all cursor-pointer shadow-sm hover:shadow-rose-950/50"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Delete Account</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeleting && setIsDeleteModalOpen(false)}
              className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            />

            {/* Modal Window */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="relative w-full max-w-md bg-[#0F141E] border border-rose-900/60 rounded-2xl p-6 sm:p-7 shadow-2xl z-10 space-y-6"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-950/80 border border-rose-800/60 flex items-center justify-center text-rose-400">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Delete Account</h3>
                    <p className="text-xs text-rose-400 font-medium mt-0.5">
                      Confirm permanent data deletion
                    </p>
                  </div>
                </div>

                {!isDeleting && (
                  <button
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Warning Content */}
              <div className="space-y-3 text-xs text-slate-300">
                <p className="leading-relaxed">
                  Are you sure you want to delete your account <span className="text-white font-bold font-mono">@{user.username}</span>?
                </p>
                <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-900/50 space-y-1.5 text-rose-200">
                  <p className="font-semibold text-rose-300">
                    What will be deleted:
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-slate-300 text-[11px]">
                    <li>All saved watchlist preferences and customized tickers</li>
                    <li>Account credentials and user profile records</li>
                    <li>Local session state across your devices</li>
                  </ul>
                </div>
                <p className="text-slate-400 text-[11px] italic">
                  This action cannot be undone.
                </p>
              </div>

              {deleteError && (
                <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
                  {deleteError}
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  id="confirm-delete-account-btn"
                  disabled={isDeleting}
                  onClick={handleDeleteAccount}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer shadow-lg shadow-rose-950/50 disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Yes, Delete Account</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
