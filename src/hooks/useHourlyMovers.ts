import { useMemo } from 'react';
import { TickerSummary } from '../types';
import { useMarket } from '../context/MarketContext';

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

/**
 * Custom hook to calculate and update the Top 5 Gainers & Top 5 Losers
 * seamlessly synchronized with the global market data store.
 */
export function useHourlyMovers(): HourlyMoversState {
  const { stocks, lastSyncTime, isLoadingLiveMetrics } = useMarket();

  return useMemo(() => {
    const validStocks = stocks.filter(
      (s) => s.dataStatus === 'available' && Number.isFinite(s.price) && Number.isFinite(s.changePercent)
    );

    const sortedByGain = [...validStocks].sort((a, b) => b.changePercent - a.changePercent);

    const topGainers: HourlyMoversItem[] = sortedByGain.filter(s => s.changePercent > 0).slice(0, 5).map((s, idx) => ({
      currency: s.currency, assetType: s.assetType,
      symbol: s.symbol,
      name: s.name,
      price: s.price,
      change: s.change,
      changePercent: s.changePercent,
      rank: idx + 1,
      categoryType: 'gainer',
    }));

    const topLosers: HourlyMoversItem[] = sortedByGain.filter(s => s.changePercent < 0)
      .slice(-5)
      .reverse()
      .map((s, idx) => ({
        currency: s.currency, assetType: s.assetType,
        symbol: s.symbol,
        name: s.name,
        price: s.price,
        change: s.change,
        changePercent: s.changePercent,
        rank: idx + 1,
        categoryType: 'loser',
      }));

    const now = new Date();
    const lastUpdatedLabel = lastSyncTime || 'Not yet updated';

    const nextSyncDate = new Date(now);
    if (now.getMinutes() < 30) {
      nextSyncDate.setMinutes(30);
    } else {
      nextSyncDate.setHours(nextSyncDate.getHours() + 1);
      nextSyncDate.setMinutes(0);
    }
    nextSyncDate.setSeconds(0);
    const nextUpdateLabel = formatEasternHour(nextSyncDate);

    return {
      gainers: topGainers,
      losers: topLosers,
      allMovers: [...topGainers, ...topLosers],
      lastUpdatedLabel,
      nextUpdateLabel,
      isLoading: isLoadingLiveMetrics && stocks.length === 0,
    };
  }, [stocks, lastSyncTime, isLoadingLiveMetrics]);
}

