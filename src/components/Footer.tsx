import React from 'react';

interface FooterProps {
  onOpenContact?: () => void;
  onOpenPrivacy?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenContact,
  onOpenPrivacy,
}) => {
  return (
    <footer className="mt-16 sm:mt-24 border-t border-slate-800/80 bg-[#080B10] py-8 text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 text-xs text-center sm:text-left">
          {/* Row 1 / Left: Author & Non-clickable App Title (Uniform Grey) */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-slate-500">
            <span>© {new Date().getFullYear()} Ian Holdeman</span>
            <span>•</span>
            <span className="text-slate-500 select-none">The SDET's Market Tracker</span>
          </div>

          {/* Row 2 / Center-Right: Subtle Footer Links & Telemetry Info */}
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-5 text-xs">
            <div className="flex items-center gap-5 text-slate-400">
              {onOpenContact && (
                <button
                  id="footer-contact-link"
                  onClick={onOpenContact}
                  className="hover:text-blue-300 transition-colors cursor-pointer"
                >
                  Contact
                </button>
              )}

              {onOpenPrivacy && (
                <button
                  id="footer-privacy-link"
                  onClick={event => {
                    // Safari does not focus buttons on pointer activation.
                    event.currentTarget.focus({ preventScroll: true });
                    onOpenPrivacy();
                  }}
                  className="rounded hover:text-blue-300 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-400"
                >
                  Privacy
                </button>
              )}
            </div>

            <span className="hidden sm:inline text-slate-700">•</span>

            {/* Row 3 on mobile / Right on desktop: System info */}
            <span className="font-mono text-[11px] text-slate-500 block sm:inline w-full sm:w-auto mt-1 sm:mt-0">
              Public Market Data • Read-Only
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
