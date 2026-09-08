import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, Lock, EyeOff, CheckCircle2 } from 'lucide-react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="relative w-full max-w-lg bg-[#0F141E] border border-slate-800/90 rounded-2xl p-6 sm:p-7 shadow-2xl z-10 space-y-6"
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-800/50 flex items-center justify-center text-purple-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Privacy & Data Notice</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  How sign-in, watchlists, and market data are handled.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Privacy Principles */}
          <div className="space-y-3 text-xs text-slate-300">
            <div className="p-3.5 rounded-xl bg-[#121824] border border-slate-800/80 space-y-1.5">
              <div className="flex items-center gap-2 text-white font-semibold">
                <EyeOff className="w-4 h-4 text-purple-400" />
                <span>Zero Tracking or Third-Party Ads</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                This platform does not deploy third-party advertising trackers, pixel beacons, or invasive analytical surveillance scripts.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#121824] border border-slate-800/80 space-y-1.5">
              <div className="flex items-center gap-2 text-white font-semibold">
                <Lock className="w-4 h-4 text-emerald-400" />
                <span>Google Sign-in and Personal Watchlists</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Google provides identity information to Supabase Auth when you sign in. Watchlists are stored under your authentication ID; ordinary users and app admins cannot read another user’s watchlist. This browser stores your sign-in session and caches market data. Deleting an account removes its live Auth identity, watchlist, and admin assignment, but does not delete your Google account. Provider backups and logs have separate retention policies.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#121824] border border-slate-800/80 space-y-1.5">
              <div className="flex items-center gap-2 text-white font-semibold">
                <CheckCircle2 className="w-4 h-4 text-blue-400" />
                <span>Public Market Feeds</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Financial data is fetched strictly as read-only public market telemetry for informational and testing showcase purposes.
              </p>
            </div>
          </div>

          {/* Footer close button */}
          <div className="pt-2 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
