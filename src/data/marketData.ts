import { MarketIndexData, TickerSummary, SdetTestQuickStatus, BoardStock, AssetType, AssetCategory } from '../types';

/**
 * Generates synthetic realistic intraday and historical price sequences
 * anchored to accurate broad market levels for VTI.
 */
const generate1DPoints = (): MarketIndexData['timeframeData']['1D'] => {
  const points: MarketIndexData['timeframeData']['1D'] = [];
  const base = 378.24;
  const hours = ['09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM'];
  
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
    fiftyTwoWeekRange: { low: 310.40, high: 385.12 },
    peRatio: 26.4,
    dividendYield: 1.34,
    expenseRatio: 0.03,
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
  { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', price: 378.24, change: 1.66, changePercent: 0.44 },
  { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', price: 703.71, change: 2.30, changePercent: 0.33 },
  { symbol: 'QQQM', name: 'Invesco NASDAQ 100 ETF', price: 293.76, change: 1.15, changePercent: 0.39 },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', price: 214.72, change: 2.10, changePercent: 0.99 },
  { symbol: 'GOOGL', name: 'Alphabet Inc. Class A', price: 344.82, change: 4.15, changePercent: 1.22 },
  { symbol: 'TSLA', name: 'Tesla, Inc.', price: 362.86, change: -1.80, changePercent: -0.49 },
  { symbol: 'SCHD', name: 'Schwab U.S. Dividend Equity ETF', price: 35.11, change: 0.28, changePercent: 0.80 },
  { symbol: 'VXUS', name: 'Vanguard Total International Stock ETF', price: 87.71, change: 0.68, changePercent: 0.78 },
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

export const SERVER_FAVORITE_SYMBOLS: readonly string[] = [] as const;

/**
 * Helper to construct clean initial board stock items with realistic baselines
 * which are instantaneously populated with real-world quotes via the Yahoo proxy.
 */
function createStockItem(
  symbol: string,
  name: string,
  assetType: AssetType,
  price: number,
  change: number,
  changePercent: number,
  marketCap: string,
  peRatio?: number,
  dividendYield?: number,
  expenseRatio?: number
): BoardStock {
  const prevClose = Number((price - change).toFixed(2));
  return {
    symbol,
    name,
    assetType,
    price,
    change,
    changePercent,
    prevClose,
    open: price,
    dayHigh: Math.max(price, prevClose),
    dayLow: Math.min(price, prevClose),
    fiftyTwoWeekHigh: Number((price * 1.22).toFixed(2)),
    fiftyTwoWeekLow: Number((price * 0.78).toFixed(2)),
    volume: 5000000,
    peRatio,
    marketCap,
    dividendYield: dividendYield ?? 0,
    expenseRatio,
    sparkline: [prevClose, Number(((prevClose + price) / 2).toFixed(2)), price],
    lastUpdated: 'Live Feed Ready',
    tickCount: 0,
  };
}

export const INITIAL_BOARD_STOCKS: BoardStock[] = [
  // ==========================================
  // 1. ACTUAL INDEXES (Macro Benchmarks)
  // ==========================================
  createStockItem('^GSPC', 'S&P 500 Index', 'Index', 5850.20, 24.50, 0.42, '$48.5T', 27.2, 1.25),
  createStockItem('^IXIC', 'NASDAQ Composite', 'Index', 18450.60, 110.20, 0.60, '$28.2T', 32.4, 0.75),
  createStockItem('^DJI', 'Dow Jones Industrial Average', 'Index', 42850.10, 140.30, 0.33, '$14.1T', 22.8, 1.85),
  createStockItem('^RUT', 'Russell 2000 Index', 'Index', 2230.40, 12.10, 0.55, '$3.2T', 28.5, 1.40),
  createStockItem('^FTSE', 'FTSE 100 Index (UK)', 'Index', 8240.50, 18.20, 0.22, '$2.6T', 14.8, 3.75),
  createStockItem('^N225', 'Nikkei 225 (Japan)', 'Index', 38650.00, 210.00, 0.55, '$4.8T', 16.5, 1.90),
  createStockItem('^GDAXI', 'DAX 40 (Germany)', 'Index', 19420.30, 45.10, 0.23, '$2.1T', 13.9, 3.10),

  // ==========================================
  // 2. S&P SECTOR SPDR ETFs
  // ==========================================
  createStockItem('XLK', 'Technology Select Sector SPDR Fund', 'ETF', 232.50, 1.85, 0.80, '$72.4B', 33.1, 0.68, 0.09),
  createStockItem('XLF', 'Financial Select Sector SPDR Fund', 'ETF', 48.20, 0.35, 0.73, '$44.1B', 17.5, 1.48, 0.09),
  createStockItem('XLV', 'Health Care Select Sector SPDR Fund', 'ETF', 148.60, -0.40, -0.27, '$39.8B', 21.2, 1.55, 0.09),
  createStockItem('XLE', 'Energy Select Sector SPDR Fund', 'ETF', 89.40, 0.65, 0.73, '$36.2B', 12.8, 3.25, 0.09),
  createStockItem('XLI', 'Industrial Select Sector SPDR Fund', 'ETF', 134.10, 0.80, 0.60, '$22.5B', 24.1, 1.42, 0.09),
  createStockItem('XLY', 'Consumer Discretionary Select Sector SPDR Fund', 'ETF', 205.80, 1.20, 0.59, '$21.7B', 28.4, 0.72, 0.09),
  createStockItem('XLP', 'Consumer Staples Select Sector SPDR Fund', 'ETF', 81.50, 0.15, 0.18, '$18.4B', 22.0, 2.65, 0.09),
  createStockItem('XLU', 'Utilities Select Sector SPDR Fund', 'ETF', 79.20, -0.25, -0.31, '$17.1B', 20.4, 2.95, 0.09),
  createStockItem('XLB', 'Materials Select Sector SPDR Fund', 'ETF', 92.60, 0.40, 0.43, '$6.3B', 21.5, 1.88, 0.09),
  createStockItem('XLRE', 'Real Estate Select Sector SPDR Fund', 'ETF', 42.80, 0.10, 0.23, '$5.8B', 34.2, 3.45, 0.09),
  createStockItem('XLC', 'Communication Services Select Sector SPDR Fund', 'ETF', 92.10, 0.75, 0.82, '$19.2B', 20.6, 0.85, 0.09),

  // ==========================================
  // 3. COMMODITIES, YIELD & CRYPTO
  // ==========================================
  createStockItem('GLD', 'SPDR Gold Shares', 'Commodity', 252.80, 1.10, 0.44, '$74.5B', undefined, 0, 0.40),
  createStockItem('USO', 'United States Oil Fund', 'Commodity', 74.20, -0.30, -0.40, '$1.4B', undefined, 0, 0.60),
  createStockItem('BTC-USD', 'Bitcoin USD', 'Crypto', 80150.00, 350.00, 0.44, '$1.58T', undefined, 0),
  createStockItem('^TNX', '10-Year Treasury Yield Benchmark', 'Bond Yield', 4.45, 0.02, 0.45, '—', undefined, 4.45),
  createStockItem('AGG', 'iShares Core U.S. Aggregate Bond ETF', 'Bond Yield', 98.40, 0.15, 0.15, '$115.4B', undefined, 3.85, 0.03),

  // ==========================================
  // 4. MAG 7
  // ==========================================
  createStockItem('AAPL', 'Apple Inc.', 'Stock', 238.40, 1.80, 0.76, '$3.62T', 34.2, 0.44),
  createStockItem('MSFT', 'Microsoft Corporation', 'Stock', 432.10, 2.60, 0.61, '$3.21T', 36.1, 0.75),
  createStockItem('NVDA', 'NVIDIA Corporation', 'Stock', 142.50, 3.20, 2.30, '$3.49T', 55.4, 0.03),
  createStockItem('GOOGL', 'Alphabet Inc. (Class A)', 'Stock', 182.40, 1.90, 1.05, '$2.26T', 24.2, 0.45),
  createStockItem('AMZN', 'Amazon.com, Inc.', 'Stock', 214.80, 2.10, 0.99, '$2.25T', 44.8, 0),
  createStockItem('META', 'Meta Platforms, Inc.', 'Stock', 612.40, 5.80, 0.96, '$1.55T', 28.6, 0.33),
  createStockItem('TSLA', 'Tesla, Inc.', 'Stock', 342.10, -3.40, -0.98, '$1.09T', 92.4, 0),

  // ==========================================
  // 5. DOW 30 HOLDINGS
  // ==========================================
  createStockItem('AMGN', 'Amgen Inc.', 'Stock', 295.40, 1.20, 0.41, '$158.4B', 22.4, 3.05),
  createStockItem('AXP', 'American Express Company', 'Stock', 284.10, 2.40, 0.85, '$204.2B', 21.8, 0.98),
  createStockItem('BA', 'Boeing Company', 'Stock', 158.60, -1.20, -0.75, '$98.5B', undefined, 0),
  createStockItem('CAT', 'Caterpillar Inc.', 'Stock', 398.20, 3.10, 0.79, '$193.8B', 18.2, 1.42),
  createStockItem('CRM', 'Salesforce, Inc.', 'Stock', 332.50, 2.80, 0.85, '$321.4B', 48.2, 0.48),
  createStockItem('CSCO', 'Cisco Systems, Inc.', 'Stock', 58.40, 0.30, 0.52, '$234.1B', 22.6, 2.74),
  createStockItem('CVX', 'Chevron Corporation', 'Stock', 162.80, 1.10, 0.68, '$298.5B', 15.4, 4.02),
  createStockItem('DIS', 'The Walt Disney Company', 'Stock', 115.40, 0.90, 0.79, '$209.4B', 38.5, 0.78),
  createStockItem('GS', 'The Goldman Sachs Group, Inc.', 'Stock', 582.10, 4.50, 0.78, '$188.6B', 17.6, 2.06),
  createStockItem('HD', 'The Home Depot, Inc.', 'Stock', 412.30, 2.10, 0.51, '$409.2B', 27.5, 2.18),
  createStockItem('HON', 'Honeywell International Inc.', 'Stock', 228.40, 1.00, 0.44, '$148.9B', 24.8, 1.98),
  createStockItem('IBM', 'International Business Machines', 'Stock', 224.60, 1.40, 0.63, '$206.5B', 23.4, 2.97),
  createStockItem('INTC', 'Intel Corporation', 'Stock', 24.80, -0.30, -1.20, '$106.2B', undefined, 2.02),
  createStockItem('JNJ', 'Johnson & Johnson', 'Stock', 156.20, 0.40, 0.26, '$375.8B', 25.1, 3.18),
  createStockItem('JPM', 'JPMorgan Chase & Co.', 'Stock', 242.80, 2.20, 0.91, '$692.4B', 13.2, 1.98),
  createStockItem('KO', 'The Coca-Cola Company', 'Stock', 64.50, 0.20, 0.31, '$278.1B', 26.4, 3.01),
  createStockItem('MCD', "McDonald's Corporation", 'Stock', 298.60, 0.80, 0.27, '$214.5B', 25.8, 2.38),
  createStockItem('MMM', '3M Company', 'Stock', 132.40, 0.60, 0.46, '$73.2B', 17.8, 2.11),
  createStockItem('MRK', 'Merck & Co., Inc.', 'Stock', 102.80, 0.30, 0.29, '$260.4B', 21.2, 3.00),
  createStockItem('NKE', 'NIKE, Inc.', 'Stock', 78.40, -0.40, -0.51, '$118.2B', 26.5, 1.89),
  createStockItem('PG', 'The Procter & Gamble Company', 'Stock', 174.20, 0.50, 0.29, '$409.8B', 27.2, 2.31),
  createStockItem('SHW', 'The Sherwin-Williams Company', 'Stock', 382.40, 2.10, 0.55, '$96.4B', 34.8, 0.74),
  createStockItem('TRV', 'The Travelers Companies, Inc.', 'Stock', 262.10, 1.50, 0.58, '$59.8B', 14.5, 1.60),
  createStockItem('UNH', 'UnitedHealth Group Incorporated', 'Stock', 604.50, 3.80, 0.63, '$556.8B', 28.4, 1.39),
  createStockItem('V', 'Visa Inc.', 'Stock', 312.40, 2.00, 0.64, '$632.1B', 31.8, 0.76),
  createStockItem('VZ', 'Verizon Communications Inc.', 'Stock', 42.10, 0.15, 0.36, '$177.2B', 15.4, 6.41),
  createStockItem('WMT', 'Walmart Inc.', 'Stock', 92.40, 0.70, 0.76, '$742.6B', 35.2, 0.90),

  // ==========================================
  // 6. TOP S&P 500 / NASDAQ LEADERS & SEMIS
  // ==========================================
  createStockItem('BRK-B', 'Berkshire Hathaway Inc. (Class B)', 'Stock', 468.20, 1.90, 0.41, '$1.01T', 20.4, 0),
  createStockItem('LLY', 'Eli Lilly and Company', 'Stock', 812.40, 6.20, 0.77, '$772.5B', 62.4, 0.64),
  createStockItem('AVGO', 'Broadcom Inc.', 'Stock', 198.50, 3.40, 1.74, '$932.1B', 48.6, 1.07),
  createStockItem('COST', 'Costco Wholesale Corporation', 'Stock', 968.40, 4.20, 0.44, '$429.5B', 56.2, 0.48),
  createStockItem('NFLX', 'Netflix, Inc.', 'Stock', 884.20, 7.50, 0.86, '$378.4B', 46.2, 0),
  createStockItem('AMD', 'Advanced Micro Devices, Inc.', 'Stock', 138.40, 2.10, 1.54, '$224.6B', 44.5, 0),
  createStockItem('MU', 'Micron Technology, Inc.', 'Stock', 106.50, 2.40, 2.30, '$118.4B', 24.2, 0.43),
  createStockItem('ADBE', 'Adobe Inc.', 'Stock', 482.10, 3.20, 0.67, '$214.2B', 38.4, 0),
  createStockItem('PEP', 'PepsiCo, Inc.', 'Stock', 162.40, 0.30, 0.19, '$223.1B', 24.2, 3.32),
  createStockItem('QCOM', 'QUALCOMM Incorporated', 'Stock', 168.20, 1.80, 1.08, '$187.5B', 19.4, 2.02),
  createStockItem('ORCL', 'Oracle Corporation', 'Stock', 188.40, 2.30, 1.24, '$521.8B', 42.1, 0.85),
  createStockItem('ABBV', 'AbbVie Inc.', 'Stock', 184.20, 0.60, 0.33, '$325.4B', 48.2, 3.37),
  createStockItem('TMO', 'Thermo Fisher Scientific Inc.', 'Stock', 542.10, 2.80, 0.52, '$207.8B', 32.1, 0.26),

  // ==========================================
  // 7. CURATED EQUITIES & STORAGE
  // ==========================================
  createStockItem('SOFI', 'SoFi Technologies, Inc.', 'Stock', 14.80, 0.45, 3.14, '$15.8B', 42.5, 0),
  createStockItem('RKLB', 'Rocket Lab USA, Inc.', 'Stock', 22.40, 0.85, 3.94, '$11.2B', undefined, 0),
  createStockItem('IREN', 'Iris Energy Limited', 'Stock', 11.20, 0.40, 3.70, '$2.1B', undefined, 0),
  createStockItem('SYM', 'Symbotic Inc.', 'Stock', 38.60, 1.20, 3.21, '$22.8B', undefined, 0),
  createStockItem('IONQ', 'IonQ, Inc.', 'Stock', 28.40, 1.10, 4.03, '$6.4B', undefined, 0),
  createStockItem('HOOD', 'Robinhood Markets, Inc.', 'Stock', 35.80, 1.15, 3.32, '$31.4B', 36.8, 0),
  createStockItem('MRNA', 'Moderna, Inc.', 'Stock', 44.20, -0.60, -1.34, '$16.9B', undefined, 0),
  createStockItem('CRWD', 'CrowdStrike Holdings, Inc.', 'Stock', 348.60, 4.50, 1.31, '$85.4B', 78.4, 0),
  createStockItem('COIN', 'Coinbase Global, Inc.', 'Stock', 284.20, 6.80, 2.45, '$70.5B', 45.2, 0),
  createStockItem('PYPL', 'PayPal Holdings, Inc.', 'Stock', 84.50, 0.80, 0.96, '$87.2B', 20.4, 0),
  createStockItem('WDC', 'Western Digital Corporation', 'Stock', 68.40, 0.90, 1.33, '$23.6B', 18.2, 0),
  createStockItem('SNDK', 'SanDisk Corporation', 'Stock', 45.50, 0.65, 1.45, '$12.4B', 19.8, 0),

  // ==========================================
  // 8. CURATED CORE ETFs
  // ==========================================
  createStockItem('VOO', 'Vanguard S&P 500 ETF', 'ETF', 538.10, 2.25, 0.42, '$1.15T', 27.2, 1.32, 0.03),
  createStockItem('QQQM', 'Invesco NASDAQ 100 ETF', 'ETF', 208.50, 1.25, 0.60, '$38.5B', 32.4, 0.58, 0.15),
  createStockItem('SCHD', 'Schwab U.S. Dividend Equity ETF', 'ETF', 35.11, 0.28, 0.80, '$62.5B', 16.2, 3.42, 0.06),
  createStockItem('VXUS', 'Vanguard Total International Stock ETF', 'ETF', 87.71, 0.68, 0.78, '$78.4B', 15.4, 3.12, 0.08),
  createStockItem('SPMO', 'Invesco S&P 500 Momentum ETF', 'ETF', 104.20, 0.95, 0.92, '$18.2B', 28.5, 0.72, 0.13),
  createStockItem('VTI', 'Vanguard Total Stock Market ETF', 'ETF', 378.24, 1.66, 0.44, '$2.14T', 26.8, 1.34, 0.03),
];
