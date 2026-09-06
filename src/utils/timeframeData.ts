import { BoardStock, BoardTimeframe } from '../types';

export interface ChartPoint {
  date: string;
  price: number;
  label: string;
  timeUnix?: number;
}

export interface TimeframeSummary {
  points: ChartPoint[];
  startPrice: number;
  currentPrice: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  sessionStartUnix?: number;
  sessionEndUnix?: number;
}

/**
 * Determines whether US stock market trading is currently actively open
 * (including pre-market from 4:00 AM ET, regular session from 9:30 AM ET, and after-hours until 8:00 PM ET, Monday-Friday).
 */
export function isMarketTradingActive(): boolean {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      weekday: 'short',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const weekday = parts.find((p) => p.type === 'weekday')?.value || '';
    if (['Sat', 'Sun', 'Saturday', 'Sunday'].includes(weekday)) {
      return false;
    }

    const hourStr = parts.find((p) => p.type === 'hour')?.value || '0';
    const minStr = parts.find((p) => p.type === 'minute')?.value || '0';
    const totalMinutes = parseInt(hourStr, 10) * 60 + parseInt(minStr, 10);

    // Active trading happens from 4:00 AM ET (240 min) to 8:00 PM ET (1200 min)
    return totalMinutes >= 240 && totalMinutes < 1200;
  } catch {
    return false;
  }
}

/**
 * Evaluates whether a specific asset is actively trading right now.
 * Validates:
 * 1. Timeframe must be intraday ('1D').
 * 2. Overall market trading window must be open (4:00 AM - 8:00 PM ET, Mon-Fri).
 * 3. Asset class check: Mutual funds / non-intraday funds (e.g. Fidelity ZERO funds, 5-letter funds ending in X, or assetType 'Mutual Fund')
 *    are settled once daily and do not trade continuously.
 * 4. Freshness check: The most recent data point / tick timestamp must match today's date in Eastern Time (America/New_York).
 */
export function isAssetActivelyTrading(
  timeframe: string,
  lastPointTimestamp?: number | string,
  assetType?: string,
  symbol?: string
): boolean {
  // Only intraday '1D' views display live trading activity beacons
  if (timeframe !== '1D') {
    return false;
  }

  // Mutual funds and once-daily priced funds do not trade intraday
  if (assetType === 'Mutual Fund' || (symbol && /^[A-Z]{4}X$/i.test(symbol))) {
    return false;
  }

  // Market must be open in extended trading window (4am - 8pm ET, Mon-Fri)
  if (!isMarketTradingActive()) {
    return false;
  }

  // If timestamp is available, verify it belongs to today's trading session
  if (lastPointTimestamp) {
    try {
      const pointDate = new Date(lastPointTimestamp).toLocaleDateString('en-US', {
        timeZone: 'America/New_York',
      });
      const nowDate = new Date().toLocaleDateString('en-US', {
        timeZone: 'America/New_York',
      });

      // If the asset's latest point is from a prior calendar date, it is not trading today
      if (pointDate !== nowDate) {
        return false;
      }
    } catch {
      // Fallback
    }
  }

  return true;
}

/**
 * Builds a minimalist confirmed price baseline using only confirmed real metrics
 * (startPrice, currentPrice, dayLow, dayHigh, and actual sparkline points)
 * without inventing theoretical synthetic sinusoidal market noise.
 */
export const buildConfirmedStockTimeframeData = (
  stock: BoardStock,
  timeframe: BoardTimeframe
): TimeframeSummary => {
  const currentPrice = stock.price;
  const startPrice = stock.prevClose && stock.prevClose > 0 ? stock.prevClose : currentPrice;
  const rawSparkline = stock.sparkline && stock.sparkline.length > 0 ? stock.sparkline : [startPrice, currentPrice];

  const now = Date.now();
  const sessionDate = new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York' });
  const sessionStartUnix = new Date(`${sessionDate} 04:00:00 GMT-0400`).getTime();
  const sessionEndUnix = new Date(`${sessionDate} 20:00:00 GMT-0400`).getTime();
  const regStartUnix = new Date(`${sessionDate} 09:30:00 GMT-0400`).getTime();
  const regEndUnix = new Date(`${sessionDate} 16:00:00 GMT-0400`).getTime();
  const activeEndUnix = Math.min(Math.max(now, regStartUnix + 60000), regEndUnix);

  const points: ChartPoint[] = rawSparkline.map((price, idx) => {
    const frac = idx / (rawSparkline.length - 1 || 1);
    let label = '';
    let timeUnix = now;

    if (timeframe === '1D') {
      const totalMinutes = Math.round(frac * 390);
      const hours = Math.floor((9 * 60 + 30 + totalMinutes) / 60);
      const mins = (9 * 60 + 30 + totalMinutes) % 60;
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const h = hours % 12 === 0 ? 12 : hours % 12;
      const m = mins < 10 ? `0${mins}` : `${mins}`;
      label = `${h}:${m} ${ampm}`;
      timeUnix = Math.round(regStartUnix + frac * (activeEndUnix - regStartUnix));
    } else {
      label = `Tick ${idx + 1}`;
      timeUnix = now - Math.round((1 - frac) * 86400000);
    }

    return {
      date: label,
      label,
      price,
      timeUnix,
    };
  });

  const prices = points.map((p) => p.price);
  const high = Math.max(...prices, stock.dayHigh || currentPrice);
  const low = Math.min(...prices, stock.dayLow || currentPrice);
  const change = Number((currentPrice - startPrice).toFixed(2));
  const changePercent = Number((((currentPrice - startPrice) / (startPrice || 1)) * 100).toFixed(2));

  return {
    points,
    startPrice,
    currentPrice,
    change,
    changePercent,
    high,
    low,
    sessionStartUnix,
    sessionEndUnix,
  };
};
