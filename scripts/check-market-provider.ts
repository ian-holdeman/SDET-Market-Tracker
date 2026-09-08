import assert from 'node:assert/strict';
import { validateChart, normalizeQuote, normalizeCandles } from '../server/market';
// Opt-in external check. No credentials, no database writes, no expected price constants.
for (const symbol of ['SPY', 'BTC-USD', '^NDX', 'AGG']) {
  const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=5m&includePrePost=true`, { signal: AbortSignal.timeout(12000) });
  assert.equal(response.status, 200, `${symbol}: provider HTTP ${response.status}`);
  const c = validateChart(await response.json(), symbol);
  const quote = normalizeQuote(c, symbol), candles = normalizeCandles(c, symbol, '1D');
  assert.ok(candles.points.length > 0);
  console.log(`${symbol}: chart contract accepted; ${candles.points.length} points, quote as of ${quote.asOf}, currency ${quote.currency}, type ${quote.assetType}`);
}
const rich = await fetch('https://query1.finance.yahoo.com/v7/finance/quote?symbols=SPY', { signal: AbortSignal.timeout(12000) });
console.log(`Optional fundamentals endpoint HTTP ${rich.status}; unavailable fundamentals remain null.`);
