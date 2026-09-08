import { test as base, expect } from '@playwright/test';
import { fulfillShowcaseMarket } from './showcase-market';

// Capture reuses the real scenarios. Install this fallback before their specific
// routes so no unmocked provider/account request can escape the isolated server.
export const test = base.extend<{ captureIsolation: void }>({
  captureIsolation: [async ({ context, page }, use, testInfo) => {
    if (process.env.SHOWCASE_CAPTURE === '1') {
      await context.route('**/*', async route => {
        if (await fulfillShowcaseMarket(route)) return;
        const url = new URL(route.request().url());
        if (url.origin !== 'http://127.0.0.1:3100') return route.abort();
        if (url.pathname.startsWith('/api/')) {
          if (url.pathname === '/api/test-activity') return route.fulfill({ status: 503, json: {} });
          return route.fulfill({ status: 503, json: { error: 'Unavailable in recording fixture' } });
        }
        return route.continue();
      });
      await context.route('https://supabase.example.invalid/rest/v1/curated_assets*', route =>
        route.fulfill({ json: [{ symbol: 'AAPL' }, { symbol: 'MSFT' }] }));
    }
    await use();
    if (process.env.SHOWCASE_CAPTURE === '1' && !page.isClosed()) {
      // Assertions can pass while Motion is still painting the final state.
      // Wait for finite animations and a rendered frame, never pad execution time.
      await page.evaluate(async () => {
        await Promise.all(document.getAnimations().filter(animation =>
          animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {})));
        await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      });
      await page.screenshot({ path: testInfo.outputPath('final.png') });
    }
  }, { auto: true }],
});
export { expect };
