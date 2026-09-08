import React from 'react';

/** A bold speed-and-lightning mark; decorative, never an execution indicator. */
export function AutomationMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" className="h-5 w-5 shrink-0 text-emerald-400">
      <path d="M16 2 8 13h6l-2 9 10-13h-7l1-7Z" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
      <path d="M2 7h5M2 17h6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
