import { MarketIndexData, TickerSummary, SdetTestQuickStatus, BoardStock } from '../types';

/**
 * Generates synthetic realistic intraday and historical price sequences
 * anchored to accurate broad market levels for VTI (Vanguard Total Stock Market Index ETF).
 */
const generate1DPoints = (): MarketIndexData['timeframeData']['1D'] => {
  const points: MarketIndexData['timeframeData']['1D'] = [];
  const base = 376.58;
  const hours = ['09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM'];
  
  // Realistic intraday curve for a slight positive market day
  const offsets = [-0.10, 0.45, 0.80, 0.62, 1.15, 1.40, 1.22, 1.65, 1.90, 2.10, 2.45, 2.20, 2.65, 1.66];
  
  hours.forEach((timeLabel, index) => {
    const price = Number((base + offsets[index]).toFixed(2));
    points.push({
      timestamp: `2026-08-21T${9 + Math.floor(index / 2)}:${index % 2 === 0 ? '30' : '00'}:00Z`,
      timeLabel,
      price,
      volume: 450000 + Math.floor(Math.sin(index) * 120000),
    });
  });
  return points;
};

const generate1WPoints = (): MarketIndexData['timeframeData']['1W'] => {
  const days = ['Mon (8/17)', 'Tue (8/18)', 'Wed (8/19)', 'Thu (8/20)', 'Fri (8/21)'];
  const prices = [372.40, 373.85, 375.10, 376.58, 378.24];
  return days.map((day, i) => ({
    timestamp: `2026-08-${17 + i}`,
    timeLabel: day,
    price: prices[i],
  }));
};

const generate1MPoints = (): MarketIndexData['timeframeData']['1M'] => {
  const labels = ['Jul 20', 'Jul 27', 'Aug 03', 'Aug 10', 'Aug 17', 'Today'];
  const prices = [361.50, 364.30, 362.80, 369.10, 374.90, 378.24];
  return labels.map((label, i) => ({
    timestamp: `2026-07-${20 + i * 5}`,
    timeLabel: label,
    price: prices[i],
  }));
};

const generate1YPoints = (): MarketIndexData['timeframeData']['1Y'] => {
  const months = ['Aug 25', 'Oct 25', 'Dec 25', 'Feb 26', 'Apr 26', 'Jun 26', 'Aug 26'];
  const prices = [302.50, 315.10, 338.90, 332.30, 357.80, 369.40, 378.24];
  return months.map((m, i) => ({
    timestamp: `2025-08-${i}`,
    timeLabel: m,
    price: prices[i],
  }));
};

const generateAllPoints = (): MarketIndexData['timeframeData']['ALL'] => {
  const years = ['2020', '2021', '2022', '2023', '2024', '2025', '2026'];
  const prices = [142.10, 218.40, 192.50, 235.80, 260.40, 315.90, 378.24];
  return years.map((y, i) => ({
    timestamp: y,
    timeLabel: y,
    price: prices[i],
  }));
};

export const INITIAL_VTI_DATA: MarketIndexData = {
  symbol: 'VTI',
  name: 'Vanguard Total Stock Market Index Fund ETF',
  issuer: 'The Vanguard Group, Inc.',
  assetClass: 'Broad Market Equity (All-Cap Blend)',
  currentPrice: 378.24,
  change: 1.66,
  changePercent: 0.44,
  currency: 'USD',
  asOf: 'Market Close • Aug 21, 2026',
  stats: {
    previousClose: 376.58,
    openPrice: 377.42,
    daysRange: { low: 377.42, high: 379.23 },
    fiftyTwoWeekRange: { low: 302.50, high: 379.23 },
    peRatio: 26.4,
    dividendYield: 1.34,
    expenseRatio: 0.03, // 0.03% ultra low expense ratio
    aum: '$2.14 Trillion',
    holdingsCount: 3680,
    topHoldings: [
      { ticker: 'MSFT', name: 'Microsoft Corp.', weight: 6.72 },
      { ticker: 'AAPL', name: 'Apple Inc.', weight: 6.45 },
      { ticker: 'NVDA', name: 'NVIDIA Corp.', weight: 5.88 },
      { ticker: 'AMZN', name: 'Amazon.com Inc.', weight: 3.82 },
      { ticker: 'GOOGL', name: 'Alphabet Inc. Class A', weight: 2.24 },
      { ticker: 'META', name: 'Meta Platforms Inc.', weight: 2.15 },
    ],
  },
  timeframeData: {
    '1D': generate1DPoints(),
    '1W': generate1WPoints(),
    '1M': generate1MPoints(),
    '1Y': generate1YPoints(),
    'ALL': generateAllPoints(),
  },
};

export const POPULAR_TICKERS: TickerSummary[] = [
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF', price: 765.72, change: 3.12, changePercent: 0.41 },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', price: 714.25, change: 3.32, changePercent: 0.47 },
  { symbol: 'VTI', name: 'Vanguard Total Market', price: 378.24, change: 1.66, changePercent: 0.44 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 344.82, change: 4.15, changePercent: 1.22 },
  { symbol: 'VXUS', name: 'Vanguard Total Int.', price: 87.71, change: 0.68, changePercent: 0.78 },
  { symbol: 'SCHD', name: 'Schwab U.S. Dividend', price: 35.11, change: 0.28, changePercent: 0.80 },
];

export const INITIAL_SDET_STATUS: SdetTestQuickStatus = {
  totalSuites: 18,
  totalTests: 142,
  passingTests: 142,
  failingTests: 0,
  lastRunTimestamp: 'Just now (Automated CRON)',
  pipelineHealth: 'passing',
  coveragePercentage: 98.4,
};

export const INITIAL_BOARD_STOCKS: BoardStock[] = [
  // 5 Main Core Indexes & ETFs
  {
    symbol: 'SPY',
    name: 'SPDR S&P 500 ETF Trust',
    assetType: 'ETF',
    category: 'Broad Index',
    price: 765.72,
    change: 3.12,
    changePercent: 0.41,
    prevClose: 762.60,
    open: 764.17,
    dayHigh: 767.85,
    dayLow: 764.17,
    fiftyTwoWeekHigh: 767.85,
    fiftyTwoWeekLow: 620.40,
    volume: 48920100,
    peRatio: 28.4,
    marketCap: '$685.4B',
    dividendYield: 1.22,
    sparkline: [762.60, 763.40, 764.80, 765.10, 765.50, 765.65, 765.72],
    lastUpdated: 'Aug 21, 2026',
    tickCount: 0,
    targetPrice1Y: {
      targetMean: 820.00,
      targetHigh: 855.00,
      targetLow: 760.00,
      consensusRating: 'Moderate Buy',
      analystCount: 45,
    },
  },
  {
    symbol: 'QQQ',
    name: 'Invesco QQQ Trust (Nasdaq-100)',
    assetType: 'ETF',
    category: 'Tech & Growth',
    price: 714.25,
    change: 3.32,
    changePercent: 0.47,
    prevClose: 710.93,
    open: 711.50,
    dayHigh: 715.67,
    dayLow: 709.20,
    fiftyTwoWeekHigh: 715.67,
    fiftyTwoWeekLow: 560.10,
    volume: 34120800,
    peRatio: 33.8,
    marketCap: '$392.8B',
    dividendYield: 0.58,
    sparkline: [710.93, 712.10, 711.50, 713.80, 714.00, 714.15, 714.25],
    lastUpdated: 'Aug 21, 2026',
    tickCount: 0,
    targetPrice1Y: {
      targetMean: 775.00,
      targetHigh: 825.00,
      targetLow: 695.00,
      consensusRating: 'Moderate Buy',
      analystCount: 40,
    },
  },
  {
    symbol: 'VTI',
    name: 'Vanguard Total Stock Market ETF',
    assetType: 'ETF',
    category: 'Broad Index',
    price: 378.24,
    change: 1.66,
    changePercent: 0.44,
    prevClose: 376.58,
    open: 377.42,
    dayHigh: 379.23,
    dayLow: 377.42,
    fiftyTwoWeekHigh: 379.23,
    fiftyTwoWeekLow: 302.50,
    volume: 3824100,
    peRatio: 26.8,
    marketCap: '$2.14T',
    dividendYield: 1.34,
    sparkline: [376.58, 377.10, 377.80, 377.50, 378.00, 378.15, 378.24],
    lastUpdated: 'Aug 21, 2026',
    tickCount: 0,
    targetPrice1Y: {
      targetMean: 410.00,
      targetHigh: 435.00,
      targetLow: 370.00,
      consensusRating: 'Moderate Buy',
      analystCount: 38,
    },
  },
  {
    symbol: 'GOOGL',
    name: 'Alphabet Inc. (Class A)',
    assetType: 'Stock',
    category: 'Mega-Cap Equity',
    price: 344.82,
    change: 4.15,
    changePercent: 1.22,
    prevClose: 340.67,
    open: 341.20,
    dayHigh: 346.20,
    dayLow: 340.40,
    fiftyTwoWeekHigh: 408.61,
    fiftyTwoWeekLow: 201.30,
    volume: 18450000,
    peRatio: 17.11,
    marketCap: '$2.21T',
    dividendYield: 0.46,
    sparkline: [340.67, 341.50, 342.80, 343.40, 344.10, 344.50, 344.82],
    lastUpdated: 'Aug 21, 2026',
    tickCount: 0,
    targetPrice1Y: {
      targetMean: 392.50,
      targetHigh: 440.00,
      targetLow: 340.00,
      consensusRating: 'Strong Buy',
      analystCount: 62,
    },
  },
  {
    symbol: 'VXUS',
    name: 'Vanguard Total International Stock ETF',
    assetType: 'ETF',
    category: 'International',
    price: 87.71,
    change: 0.68,
    changePercent: 0.78,
    prevClose: 87.03,
    open: 87.58,
    dayHigh: 87.90,
    dayLow: 87.58,
    fiftyTwoWeekHigh: 87.90,
    fiftyTwoWeekLow: 71.40,
    volume: 4120600,
    peRatio: 15.4,
    marketCap: '$445.1B',
    dividendYield: 3.10,
    sparkline: [87.03, 87.20, 87.40, 87.35, 87.60, 87.68, 87.71],
    lastUpdated: 'Aug 21, 2026',
    tickCount: 0,
    targetPrice1Y: {
      targetMean: 96.00,
      targetHigh: 105.00,
      targetLow: 82.00,
      consensusRating: 'Moderate Buy',
      analystCount: 28,
    },
  },
  {
    symbol: 'SCHD',
    name: 'Schwab U.S. Dividend Equity ETF',
    assetType: 'ETF',
    category: 'Dividend',
    price: 35.11,
    change: 0.28,
    changePercent: 0.80,
    prevClose: 34.83,
    open: 34.91,
    dayHigh: 35.21,
    dayLow: 34.91,
    fiftyTwoWeekHigh: 35.31,
    fiftyTwoWeekLow: 26.32,
    volume: 2950400,
    peRatio: 16.8,
    marketCap: '$62.4B',
    dividendYield: 3.42,
    sparkline: [34.83, 34.90, 34.95, 35.02, 35.05, 35.08, 35.11],
    lastUpdated: 'Aug 21, 2026',
    tickCount: 0,
    targetPrice1Y: {
      targetMean: 38.50,
      targetHigh: 42.00,
      targetLow: 33.00,
      consensusRating: 'Moderate Buy',
      analystCount: 22,
    },
  },
];

