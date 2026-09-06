/**
 * Utility functions for US equity market hours and trading status.
 * Standard US stock market regular trading hours:
 * Monday through Friday: 9:30 AM - 4:00 PM US Eastern Time (ET).
 */

export interface MarketStatusInfo {
  isOpen: boolean;
  statusLabel: string;
  easternTimeFormatted: string;
}

/**
 * Checks whether the US stock markets (NYSE / NASDAQ) are currently in regular trading hours.
 */
export function isUSMarketOpen(date: Date = new Date()): boolean {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      weekday: 'short',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    let weekday = '';
    let hour = 0;
    let minute = 0;

    for (const part of parts) {
      if (part.type === 'weekday') weekday = part.value;
      if (part.type === 'hour') hour = parseInt(part.value, 10);
      if (part.type === 'minute') minute = parseInt(part.value, 10);
    }

    // Closed on weekends
    if (weekday === 'Sat' || weekday === 'Sun') {
      return false;
    }

    // 9:30 AM (570 minutes) to 4:00 PM (960 minutes)
    const currentMinutes = hour * 60 + minute;
    const marketOpenMinutes = 9 * 60 + 30; // 9:30 AM ET
    const marketCloseMinutes = 16 * 60; // 4:00 PM ET

    return currentMinutes >= marketOpenMinutes && currentMinutes < marketCloseMinutes;
  } catch (err) {
    console.warn('Error checking market hours:', err);
    return false;
  }
}

/**
 * Returns formatted market status info
 */
export function getMarketStatusInfo(date: Date = new Date()): MarketStatusInfo {
  const isOpen = isUSMarketOpen(date);
  
  let easternTimeFormatted = '';
  try {
    easternTimeFormatted = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date) + ' ET';
  } catch {
    easternTimeFormatted = '';
  }

  return {
    isOpen,
    statusLabel: isOpen ? 'Live Trading' : 'Market Closed',
    easternTimeFormatted,
  };
}
