import { useState, useEffect, useCallback, useRef } from 'react';
import { TickerSummary } from '../types';
import { INITIAL_BOARD_STOCKS } from '../data/marketData';
import { fetchProxyQuotes } from '../services/yahooMarket';

export interface HourlyMoversItem extends TickerSummary {
  rank: number;
  categoryType: 'gainer' | 'loser';
}

export interface HourlyMoversState {
  gainers: HourlyMoversItem[];
  losers: HourlyMoversItem[];
  allMovers: HourlyMoversItem[];
  lastUpdatedLabel: string;
  nextUpdateLabel: string;
  isLoading: boolean;
}

const ALL_SYMBOLS = INITIAL_BOARD_STOCKS.map((s) => s.symbol);
const STOCK_NAME_MAP = new Map<string, string>(
  INITIAL_BOARD_STOCKS.map((s) => [s.symbol, s.name])
);

/**
 * Returns formatted Eastern Time representation (America/New_York)
 */
function formatEasternHour(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function getEasternHourNumber(date: Date): number {
  const etStr = date.toLocaleTimeString('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    hour12: false,
  });
  return parseInt(etStr, 10);
}

/**
 * Custom hook to calculate and update the Top 5 Gainers & Top 5 Losers
 * on an hourly schedule at the top of the hour, starting at 10:00 AM EST.
 */
export function useHourlyMovers() {
  const [state, setState] = useState<HourlyMoversState>(() => {
    // Initial fallback from static data
    const sorted = [...INITIAL_BOARD_STOCKS].sort(
      (a, b) => b.changePercent - a.changePercent
    );
    const topGainers: HourlyMoversItem[] = sorted.slice(0, 5).map((s, idx) => ({
      symbol: s.symbol,
      name: s.name,
      price: s.price,
      change: s.change,
      changePercent: s.changePercent,
      rank: idx + 1,
      categoryType: 'gainer',
    }));
    const topLosers: HourlyMoversItem[] = sorted
      .slice(-5)
      .reverse()
      .map((s, idx) => ({
        symbol: s.symbol,
        name: s.name,
        price: s.price,
        change: s.change,
        changePercent: s.changePercent,
        rank: idx + 1,
        categoryType: 'loser',
      }));

    return {
      gainers: topGainers,
      losers: topLosers,
      allMovers: [...topGainers, ...topLosers],
      lastUpdatedLabel: '10:00 AM EST',
      nextUpdateLabel: '11:00 AM EST',
      isLoading: true,
    };
  });

  const lastCheckedHourRef = useRef<number>(-1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const calculateAndApplyMovers = useCallback(async () => {
    try {
      const quotes = await fetchProxyQuotes(ALL_SYMBOLS);
      if (!quotes || quotes.length === 0) return;

      const validQuotes = quotes.filter((q) => q.price > 0 && typeof q.changePercent === 'number');
      if (validQuotes.length === 0) return;

      // Sort by percentage change descending
      const sortedByGain = [...validQuotes].sort((a, b) => b.changePercent - a.changePercent);

      // Top 5 Gainers
      const gainers: HourlyMoversItem[] = sortedByGain.slice(0, 5).map((q, idx) => ({
        symbol: q.symbol,
        name: STOCK_NAME_MAP.get(q.symbol) || q.symbol,
        price: q.price,
        change: q.change,
        changePercent: q.changePercent,
        rank: idx + 1,
        categoryType: 'gainer',
      }));

      // Top 5 Losers (lowest % change, descending severity)
      const losers: HourlyMoversItem[] = sortedByGain
        .slice(-5)
        .reverse()
        .map((q, idx) => ({
          symbol: q.symbol,
          name: STOCK_NAME_MAP.get(q.symbol) || q.symbol,
          price: q.price,
          change: q.change,
          changePercent: q.changePercent,
          rank: idx + 1,
          categoryType: 'loser',
        }));

      const now = new Date();
      const currentHourET = getEasternHourNumber(now);
      lastCheckedHourRef.current = currentHourET;

      const lastUpdatedLabel = formatEasternHour(now);
      const nextSyncDate = new Date(now);
      if (now.getMinutes() < 30) {
        nextSyncDate.setMinutes(30);
      } else {
        nextSyncDate.setHours(nextSyncDate.getHours() + 1);
        nextSyncDate.setMinutes(0);
      }
      nextSyncDate.setSeconds(0);
      const nextUpdateLabel = formatEasternHour(nextSyncDate);

      setState({
        gainers,
        losers,
        allMovers: [...gainers, ...losers],
        lastUpdatedLabel,
        nextUpdateLabel,
        isLoading: false,
      });
    } catch (err) {
      console.warn('[Hourly Movers] Failed to calculate movers:', err);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    // 1. Initial snapshot fetch on mount
    calculateAndApplyMovers();

    // 2. Schedule half-hourly updates (:00 and :30)
    function scheduleNextHalfHourlySync() {
      const now = new Date();
      const nextSync = new Date(now);
      const minutes = now.getMinutes();
      if (minutes < 30) {
        nextSync.setMinutes(30);
      } else {
        nextSync.setHours(nextSync.getHours() + 1);
        nextSync.setMinutes(0);
      }
      nextSync.setSeconds(1); // 1 sec past mark
      nextSync.setMilliseconds(0);

      const msUntilNext = Math.max(2000, nextSync.getTime() - now.getTime());

      timerRef.current = setTimeout(() => {
        calculateAndApplyMovers();
        scheduleNextHalfHourlySync();
      }, msUntilNext);
    }

    scheduleNextHalfHourlySync();

    // 3. Interval check every 30s as safety guard for backgrounded tabs / waking laptop
    const guardInterval = setInterval(() => {
      const now = new Date();
      const minutes = now.getMinutes();

      // If minutes are 0-1 or 30-31
      if (minutes === 0 || minutes === 30) {
        calculateAndApplyMovers();
      }
    }, 30000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      clearInterval(guardInterval);
    };
  }, [calculateAndApplyMovers]);

  return state;
}
