import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { PrivacyNotice } from './PrivacyNotice';

interface PrivacyModalProps { isOpen: boolean; onClose: () => void; }
export const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!isOpen || !element) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [isOpen]);
  return <dialog ref={dialog} aria-labelledby="privacy-heading" onCancel={onClose}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}
    className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-slate-800 bg-[#0F141E] p-0 text-slate-100 backdrop:bg-black/75">
    <div className="p-5 sm:p-7">
      <div className="mb-5 flex items-start justify-between gap-4">
        <h2 id="privacy-heading" className="text-xl font-bold">Privacy &amp; Data Notice</h2>
        <button ref={closeButton} onClick={onClose} aria-label="Close privacy notice" className="shrink-0 rounded p-1 text-slate-400 hover:text-white focus-visible:outline-2 focus-visible:outline-blue-400"><X className="h-5 w-5" aria-hidden="true" /></button>
      </div>
      <PrivacyNotice />
      <div className="mt-6 flex items-center justify-between gap-4">
        <a href="/privacy" className="rounded text-xs text-blue-300 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-blue-400">Open full notice</a>
        <button onClick={onClose} className="rounded-lg bg-slate-800 px-4 py-2 text-sm hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-blue-400">Close</button>
      </div>
    </div>
  </dialog>;
};
