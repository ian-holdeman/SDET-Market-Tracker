/**
 * Global Test Data & Constants
 * 
 * Central repository of known symbols, market benchmarks, test suite names, and viewport thresholds.
 */

export interface StockAssertionData {
  symbol: string;
  name: string;
  type: 'ETF' | 'STOCK';
}

export const KNOWN_ASSETS: StockAssertionData[] = [
  { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', type: 'ETF' },
  { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', type: 'ETF' },
  { symbol: 'QQQM', name: 'Invesco NASDAQ 100 ETF', type: 'ETF' },
  { symbol: 'GOOGL', name: 'Alphabet Inc. (Class A)', type: 'STOCK' },
  { symbol: 'VXUS', name: 'Vanguard Total International Stock ETF', type: 'ETF' },
  { symbol: 'SCHD', name: 'Schwab U.S. Dividend Equity ETF', type: 'ETF' },
];

export const APP_ROUTES = {
  HOME: '/',
  BOARD: '/#board',
  TESTS: '/#tests',
  LOGIC: '/#logic',
} as const;

export const TIMEFRAMES = ['1D', '1W', '1M', 'YTD', '1Y', '5Y', 'MAX'] as const;

export const TEST_SUITES = [
  'Finnhub WebSocket Price Stream Health',
  'Market Surveillance Alert Engine',
  'Historical Range & Volatility Bounds',
  'Deterministic State Sync & Cross-Node Replication',
  'Latency & Response SLA Validation',
  'UI Component Contract & Accessibility Audit'
] as const;
