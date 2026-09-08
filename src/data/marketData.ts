import { BoardStock } from '../types';
import { emptyStock } from '../utils/marketValues';
// Identity-only local curated catalog. Prices are never seeded.
const createStockItem = emptyStock;

export const INITIAL_BOARD_STOCKS: BoardStock[] = [
  // ==========================================
  // 1. ACTUAL INDEXES (Macro Benchmarks)
  // ==========================================
  createStockItem('^GSPC', 'S&P 500 Index', 'Index'),
  createStockItem('^IXIC', 'NASDAQ Composite', 'Index'),
  createStockItem('^DJI', 'Dow Jones Industrial Average', 'Index'),
  createStockItem('^RUT', 'Russell 2000 Index', 'Index'),
  createStockItem('^FTSE', 'FTSE 100 Index (UK)', 'Index'),
  createStockItem('^N225', 'Nikkei 225 (Japan)', 'Index'),
  createStockItem('^GDAXI', 'DAX 40 (Germany)', 'Index'),

  // ==========================================
  // 2. S&P SECTOR SPDR ETFs
  // ==========================================
  createStockItem('XLK', 'Technology Select Sector SPDR Fund', 'ETF'),
  createStockItem('XLF', 'Financial Select Sector SPDR Fund', 'ETF'),
  createStockItem('XLV', 'Health Care Select Sector SPDR Fund', 'ETF'),
  createStockItem('XLE', 'Energy Select Sector SPDR Fund', 'ETF'),
  createStockItem('XLI', 'Industrial Select Sector SPDR Fund', 'ETF'),
  createStockItem('XLY', 'Consumer Discretionary Select Sector SPDR Fund', 'ETF'),
  createStockItem('XLP', 'Consumer Staples Select Sector SPDR Fund', 'ETF'),
  createStockItem('XLU', 'Utilities Select Sector SPDR Fund', 'ETF'),
  createStockItem('XLB', 'Materials Select Sector SPDR Fund', 'ETF'),
  createStockItem('XLRE', 'Real Estate Select Sector SPDR Fund', 'ETF'),
  createStockItem('XLC', 'Communication Services Select Sector SPDR Fund', 'ETF'),

  // ==========================================
  // 3. COMMODITIES, YIELD & CRYPTO
  // ==========================================
  createStockItem('GLD', 'SPDR Gold Shares', 'ETF'),
  createStockItem('USO', 'United States Oil Fund', 'ETF'),
  createStockItem('BTC-USD', 'Bitcoin USD', 'Crypto'),
  createStockItem('^TNX', '10-Year Treasury Yield Benchmark', 'Bond Yield'),
  createStockItem('AGG', 'iShares Core U.S. Aggregate Bond ETF', 'ETF'),

  // ==========================================
  // 4. MAG 7
  // ==========================================
  createStockItem('AAPL', 'Apple Inc.', 'Stock'),
  createStockItem('MSFT', 'Microsoft Corporation', 'Stock'),
  createStockItem('NVDA', 'NVIDIA Corporation', 'Stock'),
  createStockItem('GOOGL', 'Alphabet Inc. (Class A)', 'Stock'),
  createStockItem('AMZN', 'Amazon.com, Inc.', 'Stock'),
  createStockItem('META', 'Meta Platforms, Inc.', 'Stock'),
  createStockItem('TSLA', 'Tesla, Inc.', 'Stock'),

  // ==========================================
  // 5. DOW 30 HOLDINGS
  // ==========================================
  createStockItem('AMGN', 'Amgen Inc.', 'Stock'),
  createStockItem('AXP', 'American Express Company', 'Stock'),
  createStockItem('BA', 'Boeing Company', 'Stock'),
  createStockItem('CAT', 'Caterpillar Inc.', 'Stock'),
  createStockItem('CRM', 'Salesforce, Inc.', 'Stock'),
  createStockItem('CSCO', 'Cisco Systems, Inc.', 'Stock'),
  createStockItem('CVX', 'Chevron Corporation', 'Stock'),
  createStockItem('DIS', 'The Walt Disney Company', 'Stock'),
  createStockItem('GS', 'The Goldman Sachs Group, Inc.', 'Stock'),
  createStockItem('HD', 'The Home Depot, Inc.', 'Stock'),
  createStockItem('HON', 'Honeywell International Inc.', 'Stock'),
  createStockItem('IBM', 'International Business Machines', 'Stock'),
  createStockItem('INTC', 'Intel Corporation', 'Stock'),
  createStockItem('JNJ', 'Johnson & Johnson', 'Stock'),
  createStockItem('JPM', 'JPMorgan Chase & Co.', 'Stock'),
  createStockItem('KO', 'The Coca-Cola Company', 'Stock'),
  createStockItem('MCD', "McDonald's Corporation", 'Stock'),
  createStockItem('MMM', '3M Company', 'Stock'),
  createStockItem('MRK', 'Merck & Co., Inc.', 'Stock'),
  createStockItem('NKE', 'NIKE, Inc.', 'Stock'),
  createStockItem('PG', 'The Procter & Gamble Company', 'Stock'),
  createStockItem('SHW', 'The Sherwin-Williams Company', 'Stock'),
  createStockItem('TRV', 'The Travelers Companies, Inc.', 'Stock'),
  createStockItem('UNH', 'UnitedHealth Group Incorporated', 'Stock'),
  createStockItem('V', 'Visa Inc.', 'Stock'),
  createStockItem('VZ', 'Verizon Communications Inc.', 'Stock'),
  createStockItem('WMT', 'Walmart Inc.', 'Stock'),

  // ==========================================
  // 6. TOP S&P 500 / NASDAQ LEADERS & SEMIS
  // ==========================================
  createStockItem('BRK-B', 'Berkshire Hathaway Inc. (Class B)', 'Stock'),
  createStockItem('LLY', 'Eli Lilly and Company', 'Stock'),
  createStockItem('AVGO', 'Broadcom Inc.', 'Stock'),
  createStockItem('COST', 'Costco Wholesale Corporation', 'Stock'),
  createStockItem('NFLX', 'Netflix, Inc.', 'Stock'),
  createStockItem('AMD', 'Advanced Micro Devices, Inc.', 'Stock'),
  createStockItem('MU', 'Micron Technology, Inc.', 'Stock'),
  createStockItem('ADBE', 'Adobe Inc.', 'Stock'),
  createStockItem('PEP', 'PepsiCo, Inc.', 'Stock'),
  createStockItem('QCOM', 'QUALCOMM Incorporated', 'Stock'),
  createStockItem('ORCL', 'Oracle Corporation', 'Stock'),
  createStockItem('ABBV', 'AbbVie Inc.', 'Stock'),
  createStockItem('TMO', 'Thermo Fisher Scientific Inc.', 'Stock'),

  // ==========================================
  // 7. CURATED EQUITIES & STORAGE
  // ==========================================
  createStockItem('SOFI', 'SoFi Technologies, Inc.', 'Stock'),
  createStockItem('RKLB', 'Rocket Lab USA, Inc.', 'Stock'),
  createStockItem('IREN', 'Iris Energy Limited', 'Stock'),
  createStockItem('SYM', 'Symbotic Inc.', 'Stock'),
  createStockItem('IONQ', 'IonQ, Inc.', 'Stock'),
  createStockItem('HOOD', 'Robinhood Markets, Inc.', 'Stock'),
  createStockItem('MRNA', 'Moderna, Inc.', 'Stock'),
  createStockItem('CRWD', 'CrowdStrike Holdings, Inc.', 'Stock'),
  createStockItem('COIN', 'Coinbase Global, Inc.', 'Stock'),
  createStockItem('PYPL', 'PayPal Holdings, Inc.', 'Stock'),
  createStockItem('WDC', 'Western Digital Corporation', 'Stock'),
  createStockItem('SNDK', 'SanDisk Corporation', 'Stock'),

  // ==========================================
  // 8. CURATED CORE ETFs
  // ==========================================
  createStockItem('VOO', 'Vanguard S&P 500 ETF', 'ETF'),
  createStockItem('QQQM', 'Invesco NASDAQ 100 ETF', 'ETF'),
  createStockItem('SCHD', 'Schwab U.S. Dividend Equity ETF', 'ETF'),
  createStockItem('VXUS', 'Vanguard Total International Stock ETF', 'ETF'),
  createStockItem('SPMO', 'Invesco S&P 500 Momentum ETF', 'ETF'),
  createStockItem('VTI', 'Vanguard Total Stock Market ETF', 'ETF'),
];
