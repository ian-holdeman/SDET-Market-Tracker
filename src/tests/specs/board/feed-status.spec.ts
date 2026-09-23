import { test, expect } from '../../fixtures/showcase-test';
import { mockApp } from '../../fixtures/auth';
import { TheBoardPage } from '../../pages/the-board.page';

for (const palette of ['light', 'dark'] as const) {
  test(`provider timestamp and layout stay stable during manual and automatic refresh in ${palette}`, async ({ page, isMobile }, testInfo) => {
    await page.emulateMedia({ colorScheme: palette, reducedMotion: 'no-preference' });
    if (isMobile) await page.setViewportSize({ width: 320, height: 740 });
    const start = new Date('2026-09-23T13:00:00Z');
    await page.clock.install({ time: start });
    await mockApp(page);
    let gate: Promise<void> | null = null, release = () => {}, pending = 0, fail = false;
    let fetchedAt = '2026-09-23T12:59:00Z';
    await page.route('**/api/quotes?**', async route => {
      pending++;
      await gate;
      pending--;
      if (fail) return route.fulfill({ status: 502, json: { error: 'Unavailable' } });
      const symbols = new URL(route.request().url()).searchParams.get('symbols')!.split(',');
      await route.fulfill({ json: { quotes: symbols.map(symbol => ({ symbol, price: 101, prevClose: 100,
        change: 1, changePercent: 1, currency: 'USD', asOf: '2026-09-22T20:00:00Z', fetchedAt, sparkline: [] })) } });
    });
    const board = new TheBoardPage(page);
    await page.goto('/board');
    await expect(board.assetRow('AAPL')).toHaveAttribute('data-market-status', 'available');
    await board.refreshButton.click({ trial: true });
    await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 1000));
    const settledText = await board.diagnosticsOpener.innerText();
    const settled = await board.feedGeometry();
    try {
      for (const trigger of ['manual', 'automatic'] as const) {
        gate = new Promise<void>(resolve => { release = resolve; });
        if (trigger === 'manual') await board.refreshButton.click();
        else await page.clock.runFor(15000);
        await expect.poll(() => pending).toBe(1);
        await expect(board.diagnosticsOpener).toHaveText(settledText, { useInnerText: true });
        await expect(board.refreshButton).toHaveAttribute('aria-busy', 'true');
        expect(await board.feedGeometry()).toEqual(settled);
        await page.screenshot({ path: testInfo.outputPath(`${trigger}-refresh.png`) });
        release(); gate = null;
        await expect(board.refreshButton).toHaveAttribute('aria-busy', 'false');
        expect(await board.feedGeometry()).toEqual(settled);
      }
      // Failure retains the actual retrieval timestamp and the existing stale warning.
      fail = true;
      await board.refreshButton.click();
      await expect(board.assetRow('AAPL')).toHaveAttribute('data-market-status', 'stale');
      await expect(page.getByText('Market update failed. Previous observations are stale; assets without data remain unavailable.')).toBeVisible();
      await expect(board.diagnosticsOpener).toHaveText(settledText, { useInnerText: true });
      fail = false; fetchedAt = '2026-09-23T13:01:00Z';
      await board.refreshButton.click();
      await expect(board.assetRow('AAPL')).toHaveAttribute('data-market-status', 'available');
      await expect(board.diagnosticsOpener).not.toHaveText(settledText, { useInnerText: true });
      const recovered = await board.feedGeometry();
      expect(recovered.status.height).toBe(settled.status.height);
      expect(recovered.refresh.y + recovered.refresh.height / 2).toBe(recovered.status.y + recovered.status.height / 2);
      expect(recovered.status.x + recovered.status.width).toBeLessThanOrEqual(recovered.refresh.x);
      expect(recovered.refresh.x + recovered.refresh.width).toBeLessThanOrEqual(page.viewportSize()!.width);
      expect(recovered.status.fits).toBe(true);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.screenshot({ path: testInfo.outputPath('settled.png') });
    } finally { release(); }
  });
}
