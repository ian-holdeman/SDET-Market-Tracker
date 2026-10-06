import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alertQuote } from '../../src/utils/alertQuote';
import type { BoardStock } from '../../src/types';

const now = Date.UTC(2026, 9, 6, 12);
const stock = { symbol: 'AAPL', assetType: 'Stock', price: 15.9849996566772,
  currency: 'USD', asOf: new Date(now - 86400000).toISOString(), dataStatus: 'available' } as BoardStock;
test('alert editor retains a validated closed-session Board quote, including failed refreshes', () => {
  assert.equal(alertQuote(stock, now)?.value, stock.price);
  assert.equal(alertQuote({ ...stock, dataStatus: 'stale' }, now)?.stale, true);
  assert.equal(alertQuote({ ...stock, price: 0 }, now)?.value, 0);
  assert.equal(alertQuote({ ...stock, price: -0.25, assetType: 'Bond Yield' }, now)?.unit, '%');
  assert.equal(alertQuote({ ...stock, currency: 'GBp' }, now)?.unit, 'GBp');
});
test('missing or future observations never become a creation quote', () => {
  for (const patch of [{ price: null }, { asOf: undefined }, { asOf: 'bad' },
    { asOf: new Date(now + 1).toISOString() }, { currency: null }, { dataStatus: 'unavailable' as const }])
    assert.equal(alertQuote({ ...stock, ...patch }, now), null);
});
