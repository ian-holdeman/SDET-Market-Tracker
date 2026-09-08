import React, { useEffect, useRef } from 'react';
import { Shield, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, login, loading, error } = useAuth();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (isAuthModalOpen) dialog.current?.showModal();
    else dialog.current?.close();
  }, [isAuthModalOpen]);
  return (
    <dialog ref={dialog} id="auth-modal-dialog" aria-labelledby="auth-heading"
      onCancel={closeAuthModal} onClick={(e) => { if (e.target === e.currentTarget) closeAuthModal(); }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-line bg-panel p-0 text-ink-body backdrop:bg-black/75">
      <div className="relative p-7">
        <button onClick={closeAuthModal} aria-label="Close modal" className="absolute right-5 top-5 p-2 text-ink-muted"><X className="h-5 w-5" /></button>
        <Shield className="mb-4 h-8 w-8 text-info-ink-400" />
        <h2 id="auth-heading" className="text-xl font-bold">Sign In</h2>
        <p className="my-4 text-sm text-ink-muted">Save your personal watchlist with Google. You can browse the Board, Tests, and Logic without an account.</p>
        <p className="mb-4 text-xs"><a href="/privacy" target="_blank" rel="noreferrer" className="rounded text-info-ink-300 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-focus">Privacy &amp; Data Notice</a></p>
        {error && <p role="alert" id="auth-error-message" className="mb-4 rounded-lg border border-danger-surface-800 p-3 text-sm text-danger-ink-300">{error}</p>}
        <button id="auth-submit-btn" onClick={() => void login()} disabled={loading}
          className="w-full rounded-lg bg-info-600 px-4 py-3 text-sm font-semibold hover:bg-info-500 disabled:opacity-50">
          {loading ? 'Connecting…' : 'Continue with Google'}
        </button>
      </div>
    </dialog>
  );
};
