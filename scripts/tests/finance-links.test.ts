import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getGoogleFinanceQuoteUrl } from '../../src/utils/financeLinks';
import { applyQuote, emptyStock } from '../../src/utils/marketValues';

test('quote exchange reaches the link for assets outside the old static list', () => {
  const stock = applyQuote(emptyStock('MDB'), { name: 'MongoDB', exchangeName: 'NGM' });
  assert.equal(getGoogleFinanceQuoteUrl(stock), 'https://www.google.com/finance/quote/MDB:NASDAQ');
  assert.equal(getGoogleFinanceQuoteUrl(applyQuote(emptyStock('SPY'), { exchangeName: 'PCX' })), 'https://www.google.com/finance/quote/SPY:NYSEARCA');
});
test('provider venue supersedes old mappings and missing metadata never invents a venue', () => {
  const stock = applyQuote({ ...emptyStock('ORCL'), exchange: 'NYSE' }, { exchangeName: 'NMS' });
  assert.equal(getGoogleFinanceQuoteUrl(stock), 'https://www.google.com/finance/quote/ORCL:NASDAQ');
  for (const exchangeName of [null, {}, 'NYSE UNKNOWN']) {
    const unknown = applyQuote(stock, { exchangeName });
    const url = new URL(getGoogleFinanceQuoteUrl(unknown));
    assert.equal(url.pathname, '/search');
    assert.match(url.searchParams.get('q')!, /site:google.com\/finance\/quote/);
    assert.match(url.searchParams.get('q')!, /ORCL/);
  }
});
test('indices and crypto use Google identities rather than Yahoo identifiers', () => {
  assert.equal(getGoogleFinanceQuoteUrl(emptyStock('^NDX', 'Nasdaq 100', 'Index')), 'https://www.google.com/finance/quote/NDX:INDEXNASDAQ');
  assert.equal(getGoogleFinanceQuoteUrl(emptyStock('^GSPC', 'S&P 500', 'Index')), 'https://www.google.com/finance/quote/.INX:INDEXSP');
  assert.equal(getGoogleFinanceQuoteUrl(emptyStock('BTC', 'Bitcoin', 'Crypto')), 'https://www.google.com/finance/quote/BTC-USD');
  assert.equal(new URL(getGoogleFinanceQuoteUrl({ ...emptyStock('GC=F', 'Gold futures', 'Commodity'), exchange: 'NYM' })).pathname, '/search');
});
