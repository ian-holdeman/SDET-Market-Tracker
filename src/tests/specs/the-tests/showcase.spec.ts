import { test, expect } from '@playwright/test';
import { TheTestsPage } from '../../pages/the-tests.page';
import { feed } from '../../fixtures/testEvidence';

test.beforeEach(async ({ page }) => {
  await page.route('https://supabase.example.invalid/**', route => route.fulfill({ json: [] }));
  await page.route('**/api/**', route => route.fulfill({ json: feed([]) }));
});

test('public recordings decode on demand, support slower playback, and keep tab navigation accessible', async ({ page }, testInfo) => {
  const showcase = new TheTestsPage(page).showcase;
  const mediaRequests: string[] = [];
  page.on('request', request => { if (request.url().endsWith('.mp4')) mediaRequests.push(request.url()); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/tests');
  await expect(showcase.play).toBeVisible();
  expect(mediaRequests).toEqual([]);
  expect((await showcase.mediaState()).paused).toBe(true);
  await showcase.tab('Watchlist re-login').focus();
  await page.keyboard.press('End');
  await expect(showcase.tab('Safe deletion')).toBeFocused();
  await expect(showcase.tab('Safe deletion')).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowRight');
  await expect(showcase.tab('Watchlist re-login')).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(showcase.tab('Safe deletion')).toBeFocused();
  await page.keyboard.press('Home');
  await expect(showcase.tab('Watchlist re-login')).toBeFocused();
  for (const label of ['Watchlist re-login', 'Cold-start recovery', 'History recovery', 'Safe deletion']) {
    await showcase.tab(label).click();
    await expect(showcase.video).toHaveCount(1);
    expect((await showcase.mediaState()).time).toBe(0);
    await showcase.speed.selectOption('0.5');
    await showcase.play.click();
    await expect.poll(async () => (await showcase.mediaState()).time).toBeGreaterThan(0);
    await expect.poll(async () => (await showcase.mediaState()).ready).toBeGreaterThanOrEqual(2);
    const state = await showcase.mediaState();
    expect(state.ready).toBeGreaterThanOrEqual(2);
    expect(state.speed).toBe(0.5);
    expect(state.width).toBeGreaterThan(0);
    expect(state.height).toBeGreaterThan(0);
    await expect(showcase.root.getByRole('alert')).toHaveCount(0);
    if (label === 'Watchlist re-login') await showcase.root.screenshot({ path: testInfo.outputPath('showcase.png') });
  }
  await showcase.speed.selectOption('2');
  expect((await showcase.mediaState()).speed).toBe(2);
  await showcase.speed.selectOption('1');
  expect((await showcase.mediaState()).speed).toBe(1);
  await showcase.details.click();
  await expect(showcase.root).toContainText('No real account is deleted.');
  await expect(showcase.root).toContainText('Attempt 1: passed');
  await showcase.root.screenshot({ path: testInfo.outputPath('showcase-details.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const monitor = await showcase.monitor.boundingBox();
  expect(monitor!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
});

test('switching while media loads cleans up the old player and ignores its late failure', async ({ page }) => {
  const showcase = new TheTestsPage(page).showcase;
  let release: (() => void) | undefined;
  await page.route('**/recordings/watchlist-*.mp4', async route => {
    await new Promise<void>(resolve => { release = resolve; });
    await route.fulfill({ status: 404, body: '' }).catch(() => {});
  });
  await page.goto('/tests');
  await showcase.play.click();
  await expect.poll(() => Boolean(release)).toBe(true);
  const previous = await showcase.video.elementHandle();
  await showcase.tab('Cold-start recovery').click();
  expect(await previous!.evaluate((el: HTMLVideoElement) => el.paused && !el.hasAttribute('src'))).toBe(true);
  release!();
  await showcase.play.click();
  await expect.poll(async () => (await showcase.mediaState()).time).toBeGreaterThan(0);
  await expect(showcase.root.getByRole('alert')).toHaveCount(0);
  await showcase.tab('Watchlist re-login').click();
  await expect(showcase.play).toBeVisible();
  expect((await showcase.mediaState()).time).toBe(0);
});

test('a broken recording reports failure and retries the real media successfully', async ({ page }) => {
  const showcase = new TheTestsPage(page).showcase;
  let failed = true;
  await page.route('**/recordings/*.mp4', route => failed ? route.fulfill({ status: 404, body: '' }) : route.continue());
  await page.goto('/tests');
  await showcase.play.click();
  await expect(showcase.root.getByRole('alert')).toContainText('Recording could not be played');
  failed = false;
  await showcase.retry.click();
  await expect.poll(async () => (await showcase.mediaState()).time).toBeGreaterThan(0);
  await expect(showcase.root.getByRole('alert')).toHaveCount(0);
});

test('unavailable, invalid, and empty catalogs have honest states and remain retryable', async ({ page }) => {
  const showcase = new TheTestsPage(page).showcase;
  let state = 0;
  await page.route('**/recordings/manifest.json', route => state === 0 ? route.fulfill({ status: 503, body: '' }) :
    route.fulfill({ json: state === 1 ? { version: 1, recordings: [{ id: 'watchlist', src: 'https://example.com/video' }] } : { version: 1, recordings: [] } }));
  await page.goto('/tests');
  const retry = showcase.root.getByRole('button', { name: 'Retry loading recordings' });
  await expect(retry).toBeVisible();
  await expect(showcase.root).toContainText('Recordings are unavailable');
  state = 1;
  await retry.click();
  await expect(retry).toBeVisible();
  await expect(showcase.video).toHaveCount(0);
  state = 2;
  await retry.click();
  await expect(showcase.root).toContainText('This recording is not available yet');
  await expect(retry).toHaveCount(0);
  await showcase.tab('Safe deletion').click();
  await expect(showcase.root).toContainText('Only confirmed success');
  await expect(showcase.play).toHaveCount(0);
});

test('a stalled media request reaches a deadline without disabling test selection', async ({ page }) => {
  const showcase = new TheTestsPage(page).showcase;
  await page.clock.install();
  let release: (() => void) | undefined;
  await page.route('**/recordings/watchlist-*.mp4', async route => {
    await new Promise<void>(resolve => { release = resolve; });
    await route.abort().catch(() => {});
  });
  await page.goto('/tests');
  await showcase.play.click();
  await expect.poll(() => Boolean(release)).toBe(true);
  await page.clock.fastForward(12_001);
  await expect(showcase.retry).toBeVisible();
  await showcase.tab('Safe deletion').click();
  release!();
  await expect(showcase.play).toBeVisible();
  await expect(showcase.root.getByRole('alert')).toHaveCount(0);
});
