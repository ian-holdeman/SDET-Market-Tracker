import { test, expect } from '../../fixtures/showcase-test';
import { fulfillShowcaseMarket } from '../../fixtures/showcase-market';
import { TheBoardPage } from '../../pages/the-board.page';

test('holiday handoff and premarket transition keep a partial day chart; failure stops the pulse', async ({ page }, testInfo) => {
  const start = Date.parse('2026-09-08T13:29:00Z');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install({ time: start });
  await page.clock.pauseAt(start);
  let phase: 'previous' | 'premarket' | 'regular' | 'failed' = 'previous';
  let fetched = start;
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === 'supabase.example.invalid') return route.fulfill({ json: [{ symbol: 'SOFI' }] });
    if (url.origin !== 'http://127.0.0.1:3100') return route.abort();
    if (url.pathname === '/api/candles') {
      if (phase === 'failed') return route.fulfill({ status: 502, json: { error: 'Provider unavailable' } });
      const previous = phase === 'previous';
      const first = Date.parse(previous ? '2026-09-04T08:00:00Z' : '2026-09-08T08:00:00Z');
      const last = Date.parse(previous ? '2026-09-04T23:55:00Z' : phase === 'premarket' ? '2026-09-08T13:29:00Z' : '2026-09-08T13:30:00Z');
      const points = [first, last].map((timestamp, i) => ({ timestamp, price: 18 + i * .1, date: new Date(timestamp).toISOString(), label: '' }));
      return route.fulfill({ json: { symbol: 'SOFI', timeframe: '1D', points, startPrice: 18, currentPrice: 18.1, change: .1, changePercent: .1 / 18 * 100,
        high: 18.1, low: 18, asOf: points.at(-1)!.date, fetchedAt: new Date(fetched).toISOString(),
        sessionStartUnix: first, sessionEndUnix: first + 16 * 3600000, sessionSource: 'provider' } });
    }
    if (url.pathname === '/api/quotes') return route.fulfill({ json: { quotes: [{ symbol: 'SOFI', price: 18.1, prevClose: 18, change: .1, changePercent: .55, currency: 'USD', asOf: new Date(start).toISOString(), fetchedAt: new Date(fetched).toISOString(), sparkline: [18, 18.1] }] } });
    if (await fulfillShowcaseMarket(route)) return;
    if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 503, json: { error: 'Incidental service unavailable' } });
    return route.continue();
  });
  const board = new TheBoardPage(page), chart = board.chart('SOFI');
  await page.goto('/board?symbol=SOFI');
  await expect(chart.session).toContainText('Sep 4, 2026 · Previous session');
  await expect(chart.pulse).toHaveCount(0);
  await expect(chart.line).not.toHaveAttribute('d', '');
  // Clicking the selected timeframe must not erase its already loaded graph.
  const oldPath = await chart.line.getAttribute('d');
  await chart.timeframe('1D').click();
  await expect(chart.line).toHaveAttribute('d', oldPath!);

  phase = 'premarket'; fetched += 30000;
  await page.clock.runFor(31000);
  // Keep the pointer outside the chart after the card's opening layout settles.
  await page.mouse.move(0, 0);
  await expect(chart.session).toContainText('Sep 8, 2026 · Intraday samples');
  await expect(chart.pulse).toHaveCount(1);
  const preX = Number(await chart.endpoint.getAttribute('cx'));
  expect(preX).toBeGreaterThan(200); expect(preX).toBeLessThan(300);
  phase = 'regular'; fetched += 30000;
  await page.clock.runFor(31000);
  await expect.poll(async () => Number(await chart.endpoint.getAttribute('cx'))).toBeGreaterThan(preX);
  expect(Number(await chart.endpoint.getAttribute('cx'))).toBeLessThan(300);
  await expect(chart.card.getByText('Syncing...', { exact: true })).toHaveCount(0);
  await chart.card.screenshot({ path: testInfo.outputPath('active-session.png') });

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(chart.pulse).toHaveCount(0);
  await expect(chart.endpoint).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(chart.pulse).toHaveCount(1);
  const path = await chart.line.getAttribute('d');
  phase = 'failed'; fetched += 30000;
  await page.clock.runFor(31000);
  await expect(chart.card.getByRole('status')).toContainText('Showing stale historical data');
  await expect(chart.line).toHaveAttribute('d', path!);
  await expect(chart.pulse).toHaveCount(0);
  phase = 'regular'; fetched += 30000;
  await page.clock.runFor(31000);
  await expect(chart.card.getByRole('status')).toHaveCount(0);
  await expect(chart.line).toHaveAttribute('d', path!);
  await expect(chart.pulse).toHaveCount(1);
  // Resume the simulated clock so capture teardown can paint the verified final frame.
  if (process.env.SHOWCASE_CAPTURE === '1') await page.clock.resume();
});
