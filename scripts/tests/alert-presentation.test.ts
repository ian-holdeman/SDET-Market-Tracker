import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alertValue } from '../../src/types/alerts';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

export const alertPriceCases: [number, string, string][] = [
  [15.8, 'USD', '$15.80'], [15.9849996566772, 'USD', '$15.98'],
  [0, 'USD', '$0.00'], [-15.8, 'USD', '-$15.80'],
  [12345.995, 'USD', '$12,346.00'], [15.8, 'GBp', '15.8 GBp'],
  [-0.25, '%', '-0.25%'], [15.8, 'EUR', '15.8 EUR'],
];
test('alert values round USD presentation only and retain other quoted units', () => {
  for (const [value, unit, expected] of alertPriceCases)
    assert.equal(alertValue(value, unit), expected);
});
test('push worker uses the same price presentation cases', () => {
  const context = vm.createContext({ self: { addEventListener() {} } });
  vm.runInContext(readFileSync('pwa/sw.js', 'utf8') + '\nglobalThis.format = alertValue;', context);
  for (const [value, unit, expected] of alertPriceCases)
    assert.equal(context.format(value, unit), expected);
});
