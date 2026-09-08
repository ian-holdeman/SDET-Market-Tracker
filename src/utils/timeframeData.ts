import { BoardStock, BoardTimeframe } from '../types';

export interface ChartPoint {
  date: string;
  price: number;
  label: string;
  timeUnix?: number;
}

export interface TimeframeSummary {
  asOf?: string;
  fetchedAt?: string;
  stale?: boolean;
  points: ChartPoint[];
  startPrice: number | null;
  currentPrice: number | null;
  change: number | null;
  changePercent: number | null;
  high: number | null;
  low: number | null;
  sessionStartUnix?: number;
  sessionEndUnix?: number;
}


export const EMPTY_TIMEFRAME: TimeframeSummary = { points: [], startPrice: null, currentPrice: null, change: null, changePercent: null, high: null, low: null };
