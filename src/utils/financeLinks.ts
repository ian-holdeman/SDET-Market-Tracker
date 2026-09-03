import { BoardStock } from '../types';
import type { FinnhubCompanyProfile } from '../services/finnhub';

/**
 * Standard exchange dictionary for known symbols to guarantee accurate routing.
 */
export const KNOWN_SYMBOL_EXCHANGES: Record<string, string> = {
  // Broad / Index ETFs
  VTI: 'NYSEARCA',
  VOO: 'NYSEARCA',
  QQQM: 'NASDAQ',
  SPMO: 'NYSEARCA',
  SCHD: 'NYSEARCA',
  VXUS: 'NASDAQ',
  IWM: 'NYSEARCA',
  DIA: 'NYSEARCA',
  SPCX: 'NYSEARCA',

  // Fidelity Sector ETFs (trade on NYSE Arca)
  FCOM: 'NYSEARCA',
  FDIS: 'NYSEARCA',
  FSTA: 'NYSEARCA',
  FENY: 'NYSEARCA',
  FNCL: 'NYSEARCA',
  FHLC: 'NYSEARCA',
  FIDU: 'NYSEARCA',
  FMAT: 'NYSEARCA',
  FTEC: 'NYSEARCA',
  FUTY: 'NYSEARCA',

  // NYSE Stocks
  IBM: 'NYSE',
  ORCL: 'NYSE',
  IONQ: 'NYSE',

  // NASDAQ Stocks / ETFs
  GOOGL: 'NASDAQ',
  GOOG: 'NASDAQ',
  NVDA: 'NASDAQ',
  AMD: 'NASDAQ',
  AMZN: 'NASDAQ',
  MSFT: 'NASDAQ',
  AAPL: 'NASDAQ',
  TSLA: 'NASDAQ',
  META: 'NASDAQ',
  MU: 'NASDAQ',
  MRVL: 'NASDAQ',
  SNDK: 'NASDAQ',
  WDC: 'NASDAQ',
  CRWD: 'NASDAQ',
  PANW: 'NASDAQ',
  SOFI: 'NASDAQ',
  HOOD: 'NASDAQ',
  COIN: 'NASDAQ',
  AIRJ: 'NASDAQ',
  FBIO: 'NASDAQ',
  ISRG: 'NASDAQ',
  INTC: 'NASDAQ',
  RKLB: 'NASDAQ',
  SYM: 'NASDAQ',
  IREN: 'NASDAQ',
  FLNC: 'NASDAQ',
  MRNA: 'NASDAQ',
  JMKE: 'NASDAQ',
};

/**
 * Normalizes Finnhub or raw exchange strings to Google Finance format:
 * Google Finance expects 'NYSEARCA', 'NYSE', 'NASDAQ', 'BATS', or 'OTCMKTS'.
 */
export function normalizeExchangeForGoogleFinance(exchangeStr?: string): string | null {
  if (!exchangeStr) return null;
  const upper = exchangeStr.toUpperCase();

  if (upper.includes('ARCA') || upper.includes('NYSE ARCA') || upper.includes('PACIFIC')) {
    return 'NYSEARCA';
  }
  if (upper.includes('NEW YORK') || upper.includes('NYSE') || upper === 'NYS') {
    return 'NYSE';
  }
  if (upper.includes('NASDAQ') || upper.includes('NMS') || upper.includes('NGS') || upper.includes('NCM')) {
    return 'NASDAQ';
  }
  if (upper.includes('BATS') || upper.includes('CBOE') || upper.includes('BZX')) {
    return 'BATS';
  }
  if (upper.includes('OTC') || upper.includes('PINK')) {
    return 'OTCMKTS';
  }

  return null;
}

/**
 * Generates the most accurate Google Finance URL for any given stock/ETF.
 *
 * @param stock The BoardStock item
 * @param profile Optional Finnhub company profile fetched dynamically
 * @returns Fully qualified Google Finance quote URL
 */
export function getGoogleFinanceQuoteUrl(
  stock: Pick<BoardStock, 'symbol' | 'exchange'>,
  profile?: FinnhubCompanyProfile | null
): string {
  const sym = stock.symbol.trim().toUpperCase();

  // 1. Check known dictionary mapping
  if (KNOWN_SYMBOL_EXCHANGES[sym]) {
    return `https://www.google.com/finance/quote/${sym}:${KNOWN_SYMBOL_EXCHANGES[sym]}`;
  }

  // 2. Check stock's explicit exchange property
  if (stock.exchange) {
    const norm = normalizeExchangeForGoogleFinance(stock.exchange) || stock.exchange.toUpperCase();
    return `https://www.google.com/finance/quote/${sym}:${norm}`;
  }

  // 3. Check dynamic Finnhub company profile exchange
  if (profile?.exchange) {
    const norm = normalizeExchangeForGoogleFinance(profile.exchange);
    if (norm) {
      return `https://www.google.com/finance/quote/${sym}:${norm}`;
    }
  }

  // 4. Default fallback: Clean symbol without forcing NASDAQ so Google Finance redirects accurately
  return `https://www.google.com/finance/quote/${sym}`;
}
