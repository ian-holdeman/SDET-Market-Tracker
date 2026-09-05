/**
 * Utility to provide clean, concise shorthand names for financial assets.
 * Eliminates corporate buzzwords (Technologies, Corporation, Inc., Co., Ltd., LLC, Platforms, etc.)
 * so names fit cleanly on cards, dashboards, and tables without awkward cutoffs.
 */

const ASSET_SHORTHAND_MAP: Record<string, string> = {
  // Equities
  MU: 'Micron',
  SNDK: 'SanDisk',
  WDC: 'Western Digital',
  NVDA: 'Nvidia',
  AAPL: 'Apple',
  MSFT: 'Microsoft',
  AMZN: 'Amazon',
  GOOGL: 'Google',
  GOOG: 'Google',
  META: 'Meta',
  TSLA: 'Tesla',
  AMD: 'AMD',
  INTC: 'Intel',
  ORCL: 'Oracle',
  IBM: 'IBM',
  MRVL: 'Marvell',
  CRWD: 'CrowdStrike',
  PANW: 'Palo Alto',
  SOFI: 'SoFi',
  HOOD: 'Robinhood',
  COIN: 'Coinbase',
  AIRJ: 'Montana Aero',
  FBIO: 'Fortress Bio',
  ISRG: 'Intuitive Surg',
  SPCX: 'SpaceX',
  RKLB: 'Rocket Lab',
  IONQ: 'IonQ',
  SYM: 'Symbotic',
  IREN: 'Iris Energy',
  FLNC: 'Fluence',
  MRNA: 'Moderna',
  JMKE: "Jersey Mike's",
  AVGO: 'Broadcom',
  QCOM: 'Qualcomm',
  ARM: 'ARM Holdings',
  PLTR: 'Palantir',

  // ETFs & Index Funds
  VTI: 'Vanguard Total Mkt',
  VOO: 'Vanguard S&P 500',
  QQQM: 'Invesco NASDAQ',
  QQQ: 'Invesco QQQ',
  SPMO: 'Invesco Momentum',
  SCHD: 'Schwab Dividend',
  VXUS: 'Vanguard Intl',
  FCOM: 'Fidelity Comm',
  FDIS: 'Fidelity Discretionary',
  FSTA: 'Fidelity Staples',
  FENY: 'Fidelity Energy',
  FNCL: 'Fidelity Financials',
  FHLC: 'Fidelity Health',
  FIDU: 'Fidelity Industrials',
  FMAT: 'Fidelity Materials',
  FTEC: 'Fidelity Tech',
  FUTY: 'Fidelity Utilities',
  IWM: 'Russell 2000',
  DIA: 'Dow Jones',
  SPY: 'SPDR S&P 500',
  IVV: 'iShares Core S&P',
  BND: 'Vanguard Total Bond',
  SMH: 'VanEck Semi',
  SOXX: 'iShares Semi',
  XLK: 'Tech Select SPDR',
};

/**
 * Returns a clean, concise shorthand name for a given asset symbol or full company name.
 * 
 * @param symbol - Ticker symbol (e.g. 'MU', 'SNDK', 'NVDA')
 * @param fullName - Optional original full name (e.g. 'Micron Technology, Inc.')
 * @returns Clean shorthand name (e.g. 'Micron', 'SanDisk', 'Nvidia')
 */
export function getAssetShorthandName(symbol?: string, fullName?: string): string {
  const sym = (symbol || '').toUpperCase().trim();
  
  if (sym && ASSET_SHORTHAND_MAP[sym]) {
    return ASSET_SHORTHAND_MAP[sym];
  }

  if (!fullName) return sym;

  let cleaned = fullName;

  // 1. Remove parenthetical descriptions like "(Class A)", "(SpaceX)", "(USA)"
  cleaned = cleaned.replace(/\s*\([^)]*\)/g, '');

  // 2. Remove slash suffixes like "/ Flash Memory", "/ ADR"
  cleaned = cleaned.replace(/\s*\/.*$/, '');

  // 3. Strip corporate suffixes and buzzwords (case-insensitive word boundaries)
  cleaned = cleaned.replace(
    /\b(Technologies|Technology|Corporation|Corp\.?|Incorporated|Inc\.?|Company|Co\.?|Holdings|Holding|Limited|Ltd\.?|LLC|Platforms|Group|Systems|Enterprises|Global|International|Franchise|Ventures|Class\s+[A-Z]|N\.?V\.?|S\.?A\.?)\b/gi,
    ''
  );

  // 4. Strip verbose ETF / Fund suffixes
  cleaned = cleaned.replace(/\b(Index\s+ETF|Index\s+Fund|Equity\s+ETF|ETF|UCITS|Total\s+Stock\s+Market)\b/gi, '');

  // 5. Clean up extra punctuation, commas, hyphens, and whitespace
  cleaned = cleaned.replace(/[,.-]+$/, '').trim();
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();

  return cleaned || fullName || sym;
}
