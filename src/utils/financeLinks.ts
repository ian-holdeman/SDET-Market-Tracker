import type { BoardStock } from '../types';

// Yahoo venue codes are not Google Finance venue codes. Do not pass unknown codes through.
const venues: Record<string, string> = {
  NMS: 'NASDAQ', NGM: 'NASDAQ', NCM: 'NASDAQ', NGS: 'NASDAQ', NASDAQ: 'NASDAQ',
  'NASDAQGS': 'NASDAQ', 'NASDAQGM': 'NASDAQ', 'NASDAQCM': 'NASDAQ',
  NYQ: 'NYSE', NYS: 'NYSE', NYSE: 'NYSE', 'NEW YORK STOCK EXCHANGE': 'NYSE',
  PCX: 'NYSEARCA', 'NYSE ARCA': 'NYSEARCA', NYSEARCA: 'NYSEARCA',
  ASE: 'NYSEAMERICAN', 'NYSE AMERICAN': 'NYSEAMERICAN', NYSEAMERICAN: 'NYSEAMERICAN',
  BATS: 'BATS', BZX: 'BATS', 'CBOE BZX': 'BATS',
  PNK: 'OTCMKTS', OQX: 'OTCMKTS', OQB: 'OTCMKTS', OTCMKTS: 'OTCMKTS',
};
const indices: Record<string, string> = {
  '^GSPC': '.INX:INDEXSP', SPX: '.INX:INDEXSP', SP500: '.INX:INDEXSP',
  '^NDX': 'NDX:INDEXNASDAQ', NDX: 'NDX:INDEXNASDAQ',
  '^IXIC': '.IXIC:INDEXNASDAQ', COMP: '.IXIC:INDEXNASDAQ',
  '^DJI': '.DJI:INDEXDJX', DJI: '.DJI:INDEXDJX', DOW: '.DJI:INDEXDJX',
  '^RUT': 'RUT:INDEXRUSSELL', RUT: 'RUT:INDEXRUSSELL',
  '^FTSE': 'UKX:INDEXFTSE', '^N225': 'NI225:INDEXNIKKEI', '^GDAXI': 'DAX:INDEXDB',
};
export function normalizeExchangeForGoogleFinance(exchange: unknown): string | null {
  return typeof exchange === 'string' ? venues[exchange.trim().toUpperCase()] ?? null : null;
}

export function getGoogleFinanceQuoteUrl(stock: Pick<BoardStock, 'symbol' | 'exchange' | 'name' | 'assetType'>): string {
  const symbol = stock.symbol.trim().toUpperCase();
  let identity: string | undefined;
  if (stock.assetType === 'Index') identity = indices[symbol];
  else if (stock.assetType === 'Crypto' && /^(BTC|ETH|SOL|DOGE|XRP|ADA|AVAX|LINK)(-USD)?$/.test(symbol)) {
    identity = symbol.endsWith('-USD') ? symbol : `${symbol}-USD`;
  } else if (stock.assetType === 'Stock' || stock.assetType === 'ETF') {
    const venue = normalizeExchangeForGoogleFinance(stock.exchange);
    // Class-share spelling differs between Yahoo and Google. Other punctuation/suffixes need a separate mapping.
    const ticker = /^BRK-[AB]$/.test(symbol) ? symbol.replace('-', '.') : symbol;
    if (venue && /^[A-Z0-9]+(?:\.[A-Z])?$/.test(ticker)) identity = `${ticker}:${venue}`;
  }
  if (identity) return `https://www.google.com/finance/quote/${identity}`;
  // An explicit search is safer than a bare ticker redirect or an invented exchange.
  const query = ['site:google.com/finance/quote', symbol, stock.name, typeof stock.exchange === 'string' ? stock.exchange : ''].filter(Boolean).join(' ');
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}
