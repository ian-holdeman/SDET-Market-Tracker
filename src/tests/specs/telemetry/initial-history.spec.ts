import { test, expect } from '../../fixtures/showcase-test';
import { feed, published } from '../../fixtures/testEvidence';
import { HomePage } from '../../pages/home.page';
import { TheTestsPage } from '../../pages/the-tests.page';

for (const colorScheme of ['light', 'dark'] as const) {
  test(`initial saved evidence precedes delayed verification in ${colorScheme}`, async ({ page }, testInfo) => {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    const saved = { ...feed(), fetchedAt: new Date(Date.now() - 3600_000).toISOString(), snapshot: true, refreshing: true };
    let verificationEnded = false;
    let apiStart = 0, apiEnd = 0;
    await page.route('**/api/test-history**', async route => {
      apiStart ||= performance.now();
      if (new URL(route.request().url()).searchParams.get('snapshot') === '1') {
        return route.fulfill({ json: saved });
      }
      // Deliberate upstream latency for the timing experiment, not a UI settlement sleep.
      await new Promise(resolve => setTimeout(resolve, 1200));
      await route.fulfill({ json: { ...feed(), fetchedAt: new Date().toISOString() } });
      apiEnd = performance.now();
      verificationEnded = true;
    });
    const start = performance.now();
    await page.goto('/');
    const home = new HomePage(page);
    await expect(home.results.value('pass-rate')).toHaveText('100%');
    const visible = performance.now();
    await testInfo.attach('first-evidence-timing', { body: JSON.stringify({ navigationToEvidenceMs: visible - start, apiToEvidenceMs: visible - apiStart, verificationEnded }), contentType: 'application/json' });
    expect(verificationEnded, 'Saved evidence must be visible before upstream verification completes').toBe(false);
    expect(visible - apiStart).toBeLessThan(1000);
    await expect(home.results.refreshStatus).toContainText('Checking for updates');
    await expect(home.results.refreshStatus).toContainText('1h old');
    const tile = home.results.root.getByTestId('run-metric-pass-rate');
    const before = await tile.boundingBox();
    await tile.evaluate(el => el.setAttribute('data-mounted', 'yes'));
    await page.screenshot({ path: testInfo.outputPath('saved-evidence.png'), fullPage: true });
    await expect.poll(() => verificationEnded).toBe(true);
    await expect(home.results.refreshStatus).not.toContainText('Checking for updates');
    await expect(tile).toHaveAttribute('data-mounted', 'yes');
    expect(await tile.boundingBox()).toEqual(before);
    await testInfo.attach('fresh-verification-timing', { body: JSON.stringify({ navigationToVerificationMs: apiEnd - start, apiToVerificationMs: apiEnd - apiStart }), contentType: 'application/json' });
  });
}

test('navigation shares verification and an open Home report survives a newer attempt with expired evidence', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const saved = { ...feed(), fetchedAt: new Date(Date.now() - 3600_000).toISOString(), snapshot: true, refreshing: true, nextCursor: 'older' };
  const expired = { ...published(null), attempt: 2, evidenceState: 'expired' as const, url: 'https://github.com/owner/repo/actions/runs/101/attempts/2' };
  const fresh = { ...feed([expired]), fetchedAt: new Date().toISOString(), nextCursor: 'older' };
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let calls = 0, done = false;
  await page.route('**/api/test-history**', async route => {
    const url = new URL(route.request().url());
    if (url.searchParams.has('cursor')) return route.fulfill({ json: feed([]) });
    if (url.searchParams.has('snapshot')) return route.fulfill({ json: done ? fresh : saved });
    calls++;
    await gate;
    done = true;
    return route.fulfill({ json: fresh });
  });
  try {
    await page.goto('/');
    const home = new HomePage(page);
    const dashboard = new TheTestsPage(page);
    await expect(home.results.value('pass-rate')).toHaveText('100%');
    await home.testsCard.click();
    await expect(dashboard.results.value('pass-rate')).toHaveText('100%');
    await home.header.brandLogoBtn.click();
    await expect(home.results.value('pass-rate')).toHaveText('100%');
    expect(calls).toBe(1);
    await home.reportButton.click({ trial: true });
    const before = await home.results.root.boundingBox();
    await home.results.root.screenshot({ path: testInfo.outputPath('saved-card.png') });
    await home.reportButton.click();
    const report = page.getByRole('dialog', { name: 'Run #3', exact: true });
    await expect(report).toBeVisible();
    const focused = report.getByRole('button', { name: /close/i });
    await focused.focus();
    release();
    await expect(home.results.value('pass-rate')).toHaveText('—');
    await expect(report).toBeVisible();
    await expect(report).toContainText('Attempt 1: passed');
    await expect(focused).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(home.reportButton).toBeFocused();
    await expect(home.results.root).toContainText('has no complete test results');
    // Status/notice content can change with actual evidence; the card keeps its width.
    expect((await home.results.root.boundingBox())!.width).toBe(before!.width);
    await home.reportButton.click();
    const updated = page.getByRole('dialog', { name: 'Run #3 · 2', exact: true });
    await expect(updated).toBeVisible();
    await expect(updated).toContainText('Results have expired');
  } finally { release(); }
});

test('failed verification retains dated evidence and recovers without a page reload', async ({ page }) => {
  let fail = true;
  const saved = { ...feed(), fetchedAt: new Date(Date.now() - 7200_000).toISOString(), snapshot: true, refreshing: true };
  await page.route('**/api/test-history**', route => {
    if (new URL(route.request().url()).searchParams.has('snapshot')) return route.fulfill({ json: saved });
    return fail ? route.fulfill({ status: 502, json: {} }) : route.fulfill({ json: { ...feed([]), fetchedAt: new Date().toISOString() } });
  });
  await page.goto('/');
  const home = new HomePage(page);
  await expect(home.results.root.getByRole('alert')).toContainText('Showing saved results');
  await expect(home.results.value('pass-rate')).toHaveText('100%');
  await expect(home.results.refreshStatus).toContainText('2h old');
  await expect(home.results.refreshStatus).not.toContainText('Checking');
  await home.testsCard.click();
  const dashboard = new TheTestsPage(page);
  await expect(dashboard.results.root.getByRole('alert')).toContainText('Showing saved results');
  fail = false;
  await page.getByRole('button', { name: 'Refresh test history' }).click();
  await expect(dashboard.results.root.getByRole('alert')).toHaveCount(0);
  await expect(dashboard.results.value('pass-rate')).toHaveText('—');
  await expect(dashboard.results.root).toContainText('No verified runs yet');
});
