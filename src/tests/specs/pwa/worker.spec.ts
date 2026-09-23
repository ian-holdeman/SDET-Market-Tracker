import { AuthModalComponent } from '../../pages/components/auth-modal.component';
import { HeaderComponent } from '../../pages/components/header.component';
import { test, expect } from '../../fixtures/showcase-test';
import { mockApp } from '../../fixtures/auth';
import { InstallPage } from '../../pages/install.page';
import { TheBoardPage } from '../../pages/the-board.page';
import { pwaUpdateServer } from '../../fixtures/pwa-server';


test('production artifacts have correct MIME, scope, headers and decodable icons', async ({ page, request, browser }, testInfo) => {
  await mockApp(page);
  await page.goto('/');
  await new InstallPage(page).controlled();
  testInfo.annotations.push({ type: 'browser-version', description: `${browser.browserType().name()} ${browser.version()} (emulated Android)` });
  for (const [url, type] of [['/manifest.webmanifest', 'application/manifest+json'], ['/sw.js', 'javascript'], ['/offline.html', 'text/html']]) {
    const response = await request.get(url);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain(type);
    expect(response.headers()['cache-control']).toBe('no-cache');
    expect(response.headers()['content-security-policy']).toContain("script-src 'self'");
  }
  const manifest = await (await request.get('/manifest.webmanifest')).json();
  expect(manifest).toMatchObject({ id: '/', scope: '/', start_url: '/', display: 'standalone' });
  expect(await page.evaluate(async () => (await navigator.serviceWorker.ready).scope)).toBe('http://127.0.0.1:3100/');
  for (const icon of manifest.icons) {
    const size = await page.evaluate(async src => { const image = new Image(); image.src = src; await image.decode(); return `${image.naturalWidth}x${image.naturalHeight}`; }, icon.src);
    expect(size).toBe(icon.sizes);
  }
  expect((await new InstallPage(page).cachePaths()).map(cache => cache.paths)).toEqual([['/appearance.js', '/offline.html', '/offline.js']]);
});

for (const theme of ['light', 'dark'] as const) {
  test(`offline cold navigation and explicit retry recover the deep link in ${theme}`, async ({ page, context }, testInfo) => {
    await page.emulateMedia({ colorScheme: theme });
    await mockApp(page, true);
    await page.goto('/logic');
    await new InstallPage(page).controlled();
    await page.evaluate(() => localStorage.setItem('unrelated', 'retain'));
    await context.setOffline(true);
    const response = await page.goto('/board/AAPL');
    expect(response?.status()).toBe(503);
    const install = new InstallPage(page);
    await expect(install.offlineHeading).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expect(page.getByRole('main')).toContainText('no saved account or market data');
    await page.screenshot({ path: testInfo.outputPath(`offline-${theme}.png`) });
    await context.setOffline(false);
    await install.retry.click();
    await expect(new TheBoardPage(page).pageHeading).toBeVisible();
    await expect(page).toHaveURL(/\/board\/AAPL$/);
    expect(await page.evaluate(() => localStorage.getItem('unrelated'))).toBe('retain');
    expect((await new InstallPage(page).cachePaths()).map(cache => cache.paths)).toEqual([['/appearance.js', '/offline.html', '/offline.js']]);
  });
}

test('controlled API, auth, documents and external requests bypass offline fallback; HTTP failures survive', async ({ page, context }) => {
  await mockApp(page);
  await page.goto('/logic');
  await new InstallPage(page).controlled();
  for (const url of ['/api/account', '/auth/callback?code=private', '/resume.pdf', 'https://supabase.example.invalid/rest/v1/watchlist_items']) {
    await page.route(url, route => route.abort('failed'));
    expect(await page.evaluate(async url => { try { await fetch(url); return 'resolved'; } catch { return 'failed'; } }, url)).toBe('failed');
  }
  await context.route('**/logic', route => route.fulfill({ status: 503, contentType: 'text/html', body: '<h1>Upstream unavailable</h1>' }));
  expect((await page.goto('/logic'))?.status()).toBe(503);
  await expect(page.getByRole('heading', { name: 'Upstream unavailable' })).toBeVisible();
  for (const url of ['/auth/callback?code=private', '/api/not-real', '/resume', '/unknown', '/?code=private']) {
    await page.route('http://127.0.0.1:3100' + url, route => route.abort('failed'));
    await context.route('http://127.0.0.1:3100' + url, route => route.abort('failed'));
    await expect(page.goto(url)).rejects.toThrow();
    await expect(new InstallPage(page).offlineHeading).toHaveCount(0);
  }
});

test('new worker waits without reloading an open dialog; activation only clears obsolete feature caches', async ({ page, context }) => {
  const server = await pwaUpdateServer();
  try {
    await context.route(url => url.origin === server.origin, route => route.continue());
    await page.goto(server.origin + '/logic');
    await new InstallPage(page).controlled();
    await page.evaluate(async () => {
      localStorage.setItem('imt_appearance', 'light');
      sessionStorage.setItem('imt_auth_return', '/board');
      await caches.open('unrelated-cache');
      (window as any).originalRoot = document.getElementById('root');
    });
    const install = new InstallPage(page);
    await install.open();
    server.state.version = '2222222222222222';
    await page.evaluate(async () => { await (await navigator.serviceWorker.ready).update(); });
    await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.waiting?.state)).toBe('installed');
    await expect(install.dialog).toBeVisible();
    await expect(install.close).toBeFocused();
    expect(await page.evaluate(() => (window as any).originalRoot === document.getElementById('root'))).toBe(true);
    expect(await new InstallPage(page).cachePaths()).toHaveLength(2);
    for (const version of ['4444444444444444', '5555555555555555']) {
      server.state.version = version;
      await page.evaluate(async () => { await (await navigator.serviceWorker.ready).update(); });
      await expect.poll(async () => {
        // Cache creation finishes before the worker becomes waiting.
        return (await new InstallPage(page).cachePaths()).some(cache => cache.name.endsWith(version));
      }).toBe(true);
      await expect.poll(() => install.waitingCache()).toBe('imt-pwa-offline-' + version);
      expect(await new InstallPage(page).cachePaths()).toHaveLength(3);
    }
    await expect(install.dialog).toBeVisible();
    expect(await page.evaluate(() => (window as any).originalRoot === document.getElementById('root'))).toBe(true);
    await page.goto('about:blank');
    await page.goto(server.origin + '/logic');
    await expect.poll(async () => (await new InstallPage(page).cachePaths()).map(cache => cache.name)).toEqual(['imt-pwa-offline-5555555555555555']);
    expect(await page.evaluate(() => localStorage.getItem('imt_appearance'))).toBe('light');
    expect(await page.evaluate(() => caches.has('unrelated-cache'))).toBe(true);
    expect(await page.evaluate(() => sessionStorage.getItem('imt_auth_return'))).toBe('/board');
    server.state.version = '3333333333333333';
    server.state.fail = true;
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      const settled = new Promise<void>(resolve => registration.addEventListener('updatefound', () => {
        const worker = registration.installing!;
        worker.addEventListener('statechange', () => { if (worker.state === 'redundant') resolve(); });
      }, { once: true }));
      await registration.update();
      await settled;
    });
    await install.open();
    await expect(install.dialog).toBeVisible();
    expect((await new InstallPage(page).cachePaths()).map(cache => cache.name)).toEqual(['imt-pwa-offline-5555555555555555']);
  } finally {
    await page.goto('about:blank');
    await server.close();
  }
});


test('a real controlling worker preserves mocked Google return, watchlists, Back and external link destinations', async ({ page }) => {
  const state = await mockApp(page);
  state.populated = true;
  await page.goto('/logic');
  await new InstallPage(page).controlled();
  const auth = new AuthModalComponent(page);
  await auth.open();
  await auth.google.click();
  const header = new HeaderComponent(page);
  await expect(header.username).toHaveText('Test Member');
  await expect(page).toHaveURL(/\/logic$/);
  expect(state.exchanges).toBe(1);
  await header.navBoardBtn.click();
  const board = new TheBoardPage(page);
  await board.assetRow('AAPL').click();
  await board.watchlistButton('AAPL').click();
  await expect(board.watchingTag('AAPL')).toBeVisible();
  // This fixture has no provider venue; the existing identity contract requires a labelled search.
  await expect(board.chart('AAPL').financeLink).toHaveText('Google Finance search');
  await expect(board.chart('AAPL').financeLink).toHaveAttribute('href', 'https://www.google.com/search?q=site%3Agoogle.com%2Ffinance%2Fquote%20AAPL%20Apple%20Inc.');
  await header.navLogicBtn.click();
  await page.goBack();
  await expect(board.chart('AAPL').card).toBeVisible();
  await page.reload();
  await expect(header.username).toHaveText('Test Member');
  await expect(board.watchingTag('AAPL')).toBeVisible();
  expect((await new InstallPage(page).cachePaths()).flatMap(cache => cache.paths)).toEqual(['/appearance.js', '/offline.html', '/offline.js']);
});
