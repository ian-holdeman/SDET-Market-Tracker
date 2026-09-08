import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
export function Dialog({
  title,
  close,
  children,
  compact = false,
  fallbackFocus,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
  compact?: boolean;
  fallbackFocus?: React.RefObject<HTMLElement | null>;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    heading = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current!;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected && !previous.hasAttribute('disabled')) previous.focus({ preventScroll: true });
      else fallbackFocus?.current?.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={heading}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onKeyDown={(e) => {
        if (e.key !== "Tab") return;
        const items = Array.from(
          e.currentTarget.querySelectorAll<HTMLElement>(
            'button, a[href], summary, [tabindex="0"]',
          ),
        ).filter(
          (el) =>
            el.getClientRects().length > 0 && !el.hasAttribute("disabled"),
        );
        const first = items[0],
          last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            close();
        }
      }}
      className={`m-auto w-[calc(100%-1.5rem)] ${compact ? 'max-w-md' : 'max-w-3xl'} max-h-[88dvh] p-0 rounded-2xl border border-line-strong/70 bg-panel text-ink-strong shadow-2xl backdrop:bg-black/75 backdrop:backdrop-blur-sm`}
    >
      <div className="flex max-h-[88dvh] flex-col overflow-hidden">
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
          <h2 id={heading} className="text-lg font-bold text-ink-heading">
            {title}
          </h2>
          <button
            autoFocus
            onClick={close}
            aria-label={`Close ${title}`}
            className="rounded-lg p-2 text-ink-muted hover:bg-surface-800 hover:text-ink-heading focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-5">
          {children}
        </div>
      </div>
    </dialog>
  );
}
