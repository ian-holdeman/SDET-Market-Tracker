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

  const points: ChartPoint[] = rawSparkline.map((price, idx) => {
    const frac = idx / (rawSparkline.length - 1 || 1);
    let label = '';
    if (timeframe === '1D') {
      const totalMinutes = Math.round(frac * 390);
      const hours = Math.floor((9 * 60 + 30 + totalMinutes) / 60);
      const mins = (9 * 60 + 30 + totalMinutes) % 60;
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const h = hours % 12 === 0 ? 12 : hours % 12;
      const m = mins < 10 ? `0${mins}` : `${mins}`;
      label = `${h}:${m} ${ampm}`;
    } else {
      label = `Tick ${idx + 1}`;
    }

    return {
      date: label,
      label,
      price,
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
  };
};
