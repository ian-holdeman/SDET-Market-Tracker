/**
 * Clean, subtle time formatting utilities for market updates and test telemetry.
 */

/**
 * Formats an ISO string or timestamp into a compact absolute date/time.
 * Format: "M/D at h:mm A" (or "M/D/YYYY at h:mm A" if different year).
 * Example: "9/5 at 11:44 PM" or "9/5/2025 at 11:44 PM"
 */
export function formatAbsoluteRunTime(dateInput?: string | number | Date | null): string {
  if (!dateInput) return '';

  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const isDifferentYear = date.getFullYear() !== now.getFullYear();

    const dateStr = isDifferentYear 
      ? `${month}/${day}/${date.getFullYear()}`
      : `${month}/${day}`;

    const timeStr = date.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    return `${dateStr} at ${timeStr}`;
  } catch {
    return '';
  }
}

/**
 * Formats an ISO string or timestamp into a subtle relative or localized time.
 */
export function formatSubtleTimestamp(dateInput?: string | number | Date | null): string {
  if (!dateInput) return 'Recently';

  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return 'Recently';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);

    // Negative or future timestamp guard
    if (diffSeconds < 0) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    }

    if (diffSeconds < 45) {
      return 'just now';
    }

    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    }

    if (diffHours < 12) {
      return `${diffHours}h ago`;
    }

    const isToday = date.toDateString() === now.toDateString();
    const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

    if (isToday) {
      return `Today at ${timeStr}`;
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${timeStr}`;
    }

    const monthName = date.toLocaleDateString([], { month: 'short' });
    const day = date.getDate();
    return `${monthName} ${day} at ${timeStr}`;
  } catch {
    return 'Recently';
  }
}

/**
 * Formats a market update time string (e.g., "10:45:22 AM" or ISO).
 */
export function formatMarketUpdateTime(timeString?: string | null): string {
  if (!timeString) {
    return 'Not yet updated';
  }

  // If already formatted like "10:45:22 AM" or "10:45 AM", return directly or simplify
  if (timeString.includes(':') && (timeString.includes('AM') || timeString.includes('PM'))) {
    return timeString;
  }

  return formatSubtleTimestamp(timeString);
}
