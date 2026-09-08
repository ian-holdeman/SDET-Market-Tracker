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
    <footer className="mt-16 sm:mt-24 border-t border-line/80 bg-recessed py-8 text-ink-muted">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 text-xs text-center sm:text-left">
          {/* Row 1 / Left: Author & Non-clickable App Title (Uniform Grey) */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-ink-subtle">
            <span>© {new Date().getFullYear()} Ian Holdeman</span>
            <span>•</span>
            <span className="text-ink-subtle select-none">The SDET's Market Tracker</span>
          </div>

          {/* Row 2 / Center-Right: Subtle Footer Links & Telemetry Info */}
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-5 text-xs">
            <div className="flex items-center gap-5 text-ink-muted">
              {onOpenContact && (
                <button
                  id="footer-contact-link"
                  onClick={onOpenContact}
                  className="hover:text-info-ink-300 transition-colors cursor-pointer"
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
                  className="rounded hover:text-info-ink-300 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-focus"
                >
                  Privacy
                </button>
              )}
            </div>

            <span className="hidden sm:inline text-ink-quiet">•</span>

            {/* Row 3 on mobile / Right on desktop: System info */}
            <span className="font-mono text-[11px] text-ink-subtle block sm:inline w-full sm:w-auto mt-1 sm:mt-0">
              Public Market Data • Read-Only
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
