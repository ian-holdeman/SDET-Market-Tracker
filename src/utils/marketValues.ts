import { BoardStock } from '../types';
export const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
export const fixed = (v: unknown, digits = 2): string => finite(v) ? v.toFixed(digits) : '—';
export function fullPriceLabel(value: unknown, currency?: string | null, assetType?: string): string {
  if (!finite(value)) return '—';
  if (assetType === 'Bond Yield') return `${fixed(value)}%`;
  const digits = value !== 0 && Math.abs(value) < 1 ? 6 : 2;
  if (!currency) return fixed(value, digits);
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: digits }).format(value); }
  catch { return `${fixed(value, digits)} ${currency}`; }
}
export function emptyStock(symbol: string, name = symbol, assetType: BoardStock['assetType'] = 'Stock'): BoardStock {
  return { symbol, name, assetType, price: null, change: null, changePercent: null, prevClose: null, open: null, dayHigh: null, dayLow: null,
    fiftyTwoWeekHigh: null, fiftyTwoWeekLow: null, volume: null, sparkline: [], lastUpdated: '', tickCount: 0, dataStatus: 'unavailable' };
}
// Compare provider observations first; retrieval order cannot make an older trade current.
export function isOlderQuote(current: Pick<BoardStock, 'asOf' | 'fetchedAt'>, incoming: Pick<BoardStock, 'asOf' | 'fetchedAt'>): boolean {
  const previous = Date.parse(current.asOf ?? ''), next = Date.parse(incoming.asOf ?? '');
  return Number.isFinite(previous) && Number.isFinite(next) && (next < previous ||
    (next === previous && Date.parse(incoming.fetchedAt ?? '') < Date.parse(current.fetchedAt ?? '')));
}
export function applyQuote(stock: BoardStock, quote: any): BoardStock {
  if (isOlderQuote(stock, quote)) return stock;
  return { ...emptyStock(stock.symbol, stock.name, stock.assetType), ...stock, ...quote,
    name: stock.name === stock.symbol ? quote.name ?? stock.name : stock.name,
    assetType: quote.assetType ?? stock.assetType, dataStatus: 'available', lastUpdated: quote.asOf,
    exchange: typeof quote.exchangeName === 'string' && quote.exchangeName.trim() ? quote.exchangeName.trim() : undefined,
    // Optional fields must be cleared on a new observation, never inherited from old fixtures/data.
    marketCap: quote.marketCap ?? null, peRatio: quote.peRatio ?? null, dividendYield: quote.dividendYield ?? null,
    expenseRatio: quote.expenseRatio ?? null, targetPrice1Y: quote.targetPrice1Y ?? null,
    fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh ?? null, fiftyTwoWeekLow: quote.fiftyTwoWeekLow ?? null,
    sparkline: quote.sparkline ?? [],
  };
}
export function priceLabel(value: unknown, currency?: string | null, assetType?: string): string {
  if (!finite(value) || Math.abs(value) < 10000 || assetType === 'Bond Yield') return fullPriceLabel(value, currency, assetType);
  const options: Intl.NumberFormatOptions = { notation: 'compact', minimumFractionDigits: 0, maximumFractionDigits: 1 };
  if (currency) { options.style = 'currency'; options.currency = currency; }
  try { return new Intl.NumberFormat('en-US', options).format(value); }
  catch { return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value); }
}

// Range cells have two prices: retain whole dollars for four-digit values.
// Hover text uses fullPriceLabel so cents remain available without widening the grid.
export function rangePriceLabel(value: unknown, currency?: string | null, assetType?: string): string {
  if (!finite(value) || Math.abs(value) < 1000 || Math.abs(value) >= 10000 || assetType === 'Bond Yield') return priceLabel(value, currency, assetType);
  try { return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0, ...(currency ? { style: 'currency', currency } : {}) }).format(value); }
  catch { return fullPriceLabel(value, currency, assetType); }
}

// Search results are view-local observations, independent of saved account assets.
export function retainSearchQuote(previous: BoardStock[], quote: BoardStock): BoardStock[] {
  const current = previous.find(stock => stock.symbol === quote.symbol);
  const newest = current && isOlderQuote(current, quote) ? current : quote;
  return [newest, ...previous.filter(stock => stock.symbol !== quote.symbol)].slice(0, 20);
}
