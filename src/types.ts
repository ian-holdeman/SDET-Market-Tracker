/**
 * Core type definitions for Ian's Market Tracker & SDET Showcase.
 * Designed with strict type-safety and self-documenting structures.
 */

export type PageView = 'home' | 'board' | 'tests' | 'logic' | 'about' | 'settings';

export type Timeframe = '1D' | '1W' | '1M' | '1Y' | 'ALL';

export type UserRole = 'admin' | 'user';

export interface UserProfile {
  username: string;
  watchlist: string[];
  role: UserRole;
}

export interface ChartDataPoint {
  timestamp: string;
  timeLabel: string;
  price: number;
  volume?: number;
}

export interface FundStatistics {
  previousClose: number;
  openPrice: number;
  daysRange: { low: number; high: number };
  fiftyTwoWeekRange: { low: number; high: number };
  peRatio: number;
  dividendYield: number;
  expenseRatio: number;
  aum: string; // e.g. "$1.6T"
  holdingsCount: number;
  topHoldings: Array<{ ticker: string; name: string; weight: number }>;
}

export interface MarketIndexData {
  symbol: string;
  name: string;
  issuer: string;
  assetClass: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  currency: string;
  asOf: string;
  stats: FundStatistics;
  timeframeData: Record<Timeframe, ChartDataPoint[]>;
}

export interface TickerSummary {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

export type AssetCategory = 
  | 'Index & Broad ETFs'
  | 'Sector ETFs'
  | 'Tech'
  | 'Consumer & Retail'
  | 'Fintech'
  | 'Healthcare & Biotech'
  | 'Industrials & Aerospace'
  | string;

export interface TradeTick {
  price: number;
  volume: number;
  timestamp: number;
  timeStr: string;
  direction?: 'up' | 'down' | 'none';
}

export interface WallStreetPriceTarget {
  targetMean: number;
  targetHigh: number;
  targetLow: number;
  consensusRating: string;
  analystCount: number;
}

export type AssetType = 'ETF' | 'Stock' | 'Crypto' | 'Index' | 'Commodity';

export interface BoardStock {
  symbol: string;
  name: string;
  assetType: AssetType;
  category: AssetCategory;
  exchange?: string;
  isFavorite?: boolean;
  price: number;
  change: number;
  changePercent: number;
  prevClose: number;
  open: number;
  dayHigh: number;
  dayLow: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  volume: number;
  peRatio?: number;
  marketCap?: string;
  dividendYield?: number;
  expenseRatio?: number;
  logoUrl?: string;
  sparkline: number[];
  lastUpdated: string;
  lastTickDirection?: 'up' | 'down' | 'none';
  tickCount: number;
  recentTrades?: TradeTick[];
  targetPrice1Y?: WallStreetPriceTarget;
}

export type BoardTimeframe = '1D' | '1W' | '1M' | 'YTD' | '1Y' | '5Y' | 'MAX';

export type BoardSortField = 
  | 'symbol' 
  | 'name' 
  | 'price' 
  | 'change' 
  | 'changePercent' 
  | 'peRatio';

export type SortDirection = 'asc' | 'desc';

export interface SdetTestQuickStatus {
  totalSuites: number;
  totalTests: number;
  passingTests: number;
  failingTests: number;
  lastRunTimestamp: string;
  pipelineHealth: 'passing' | 'degraded' | 'failing';
  coveragePercentage: number;
}
