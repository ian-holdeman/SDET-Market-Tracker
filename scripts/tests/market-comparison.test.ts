import {test} from 'node:test';
import assert from 'node:assert/strict';
import {comparePair, type Pair} from '../market-comparison';
const now = Date.parse('2026-09-08T17:00:00Z');
const pair = (price=100, reference=100):Pair => ({symbol:'AAPL', yahoo:{symbol:'AAPL',price,observedAt:now,currency:'USD'},
  finnhub:{symbol:'AAPL',price:reference,observedAt:now-1000,currency:'USD'}, session:{start:now-3*3600000,end:now+3*3600000}});

test('comparison preserves zero/negative values and reports a material difference honestly', () => {
  for (const price of [0,-10,100]) assert.equal(comparePair(pair(price,price),now).status,'within-tolerance');
  assert.equal(comparePair(pair(101,100),now).status,'outside-tolerance');
  assert.equal(comparePair(pair(0.04,0),now).status,'within-tolerance');
  assert.equal(comparePair(pair(0.06,0),now).status,'outside-tolerance');
});

test('missing, malformed, stale, misaligned and out-of-session observations never pass', () => {
  const value = pair();
  assert.equal(comparePair({...value,finnhub:null},now).status,'unavailable');
  for (const change of [{observedAt:0},{price:NaN},{symbol:'MSFT'},{currency:'EUR'}])
    assert.notEqual(comparePair({...value,finnhub:{...value.finnhub!,...change}},now).status,'within-tolerance');
  for (const time of [now-61000,now-121000,now+6000])
    assert.equal(comparePair({...value,finnhub:{...value.finnhub!,observedAt:time}},now).status,'inconclusive');
  assert.equal(comparePair({...value,session:null},now).status,'inconclusive');
  assert.equal(comparePair({...value,session:{start:now+1000,end:now+3600000}},now).status,'inconclusive');
  assert.equal(comparePair({...value,session:{start:now-3600000,end:now}},now).status,'inconclusive');
});
