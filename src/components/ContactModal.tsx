import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, FileText, HelpCircle, Check, Copy, ExternalLink, Briefcase, Sparkles } from 'lucide-react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const email = 'ianrholdeman@gmail.com';

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
          className="relative w-full max-w-lg bg-panel border border-line/90 rounded-2xl p-6 sm:p-7 shadow-2xl z-10 space-y-6"
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-info-surface-950/60 border border-info-surface-800/50 flex items-center justify-center text-info-ink-400">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-ink-heading">Get in Touch</h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  Engineering inquiries, custom development, and SDET opportunities.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-ink-muted hover:text-ink-heading hover:bg-surface-800/60 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 3 Outlined Services / Sections */}
          <div className="space-y-4">
            {/* 1. Custom App Development */}
            <div className="p-4 rounded-xl bg-raised border border-line/80 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-ink-heading flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-info-ink-400" />
                  <span>Want a custom app like this one?</span>
                </h4>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-info-surface-950 text-info-ink-400 border border-info-surface-800/50">
                  Custom Build
                </span>
              </div>
              <p className="text-xs text-ink-muted">
                Email me for rates and project availability!
              </p>
              
              <div className="pt-2 flex items-center gap-2">
                <a
                  href={`mailto:${email}?subject=Custom%20Application%20Inquiry`}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-info-600 hover:bg-info-500 text-on-action text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{email}</span>
                </a>
                <button
                  onClick={handleCopyEmail}
                  title="Copy email to clipboard"
                  className="p-2 rounded-lg bg-surface-800/80 hover:bg-surface-700 text-ink-secondary hover:text-ink-heading text-xs border border-line-strong transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4 text-positive-ink-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 2. Full-Time SDET Hiring */}
            <div className="p-4 rounded-xl bg-raised border border-line/80 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-ink-heading flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-positive-ink-400" />
                  <span>Looking for a full-time SDET?</span>
                </h4>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-positive-surface-950 text-positive-ink-400 border border-positive-surface-800/50">
                  Open to Roles
                </span>
              </div>
              <p className="text-xs text-ink-muted">
                View my experience in test automation and quality engineering.
              </p>

              <div className="pt-2">
                <a
                  href="/resume.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-positive-600/20 hover:bg-positive-600/30 text-positive-ink-300 border border-positive-500/40 text-xs font-semibold transition-colors w-full cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>View Resume (PDF)</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-70" />
                </a>
              </div>
            </div>

            {/* 3. Financial Advice Disclaimer */}
            <div className="p-4 rounded-xl bg-raised/60 border border-line/60 space-y-1.5">
              <h4 className="text-xs font-bold text-ink-secondary flex items-center gap-2">
                <HelpCircle className="w-3.5 h-3.5 text-warning-ink-400 shrink-0" />
                <span>Looking for investment advice?</span>
              </h4>
              <p className="text-xs text-ink-muted italic">
                Don't ask me! I'm just a guy who likes finance.
              </p>
            </div>
          </div>

          {/* Footer close button */}
          <div className="pt-2 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-surface-800 hover:bg-surface-700 text-ink-secondary hover:text-ink-heading text-xs font-medium transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
