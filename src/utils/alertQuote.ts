import type { BoardStock } from '../types';

export function alertQuote(stock: BoardStock, now = Date.now()) {
  const unit = stock.assetType === 'Bond Yield' ? '%' : stock.currency;
  const observed = stock.asOf ? Date.parse(stock.asOf) : NaN;
  if (!['available', 'stale'].includes(stock.dataStatus ?? '') || !Number.isFinite(stock.price) || !unit ||
      !Number.isFinite(observed) || observed > now) return null;
  return { value: stock.price!, unit, observedAt: stock.asOf!, stale: stock.dataStatus === 'stale' };
}
