import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { INITIAL_BOARD_STOCKS } from '../../src/data/marketData';

test('local database seed contains exactly the existing curated symbols without duplicates', async () => {
  const sql = await readFile(new URL('../../supabase/fixtures/assets.sql', import.meta.url), 'utf8');
  const symbols = [...sql.matchAll(/\('([^']+)'\)/g)].map((match) => match[1]);
  assert.equal(new Set(symbols).size, symbols.length);
  assert.deepEqual(symbols.sort(), INITIAL_BOARD_STOCKS.map((asset) => asset.symbol).sort());
});
