import { test, expect } from '../../fixtures/showcase-test';
import { pipelineBrowserEvidence } from '../../fixtures/pipeline';
import { nightlyFixture } from '../../fixtures/nightly-pipeline';
import { PipelineComponent } from '../../pages/components/pipeline.component';

for (const colorScheme of ['dark', 'light'] as const) {
  test(`nightly overview updates when idle and preserves a focused replay until load-newest in ${colorScheme}`, async ({ page }, info) => {
    const now = Date.now(); await page.clock.install({ time: now - 1000 }); await page.clock.pauseAt(now);
    await page.emulateMedia({ colorScheme });
    let number = 40, time = now;
    await page.route('**/api/test-pipeline', route => route.fulfill({ json: nightlyFixture(time, number, number === 42 ? 'failure' : 'success') }));
    const view = new PipelineComponent(page);
    await page.goto('/tests');
    await expect(view.root.getByTestId('latest-nightly')).toContainText('Latest nightly #40');
    number = 41; time += 61000; await page.clock.runFor(61000);
    await expect(view.root.getByRole('link', { name: 'View run #41 on GitHub' })).toBeVisible();
    await view.position.click({ trial: true }); await view.position.focus(); await page.keyboard.press('Home');
    const original = await view.position.elementHandle();
    number = 42; time += 61000; await page.clock.runFor(61000);
    await expect(view.root.getByTestId('latest-nightly')).toContainText('Latest nightly #42 · attempt 1 · failure');
    await expect(view.position).toBeFocused();
    await expect(view.position).toHaveValue('0');
    expect(await original!.evaluate(node => node.isConnected)).toBe(true);
    await view.root.getByRole('button', { name: 'Load newest nightly' }).click();
    await expect(view.root.getByRole('link', { name: 'View run #42 on GitHub' })).toBeVisible();
    await expect(view.job('database')).toContainText('Failed');
    await expect(view.root.getByTestId('latest-nightly')).toContainText('browser evidence: missing');
    await view.root.screenshot({ path: info.outputPath('nightly-failed.png') });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('cancellation without timing and later source removal cannot retain a successful replay', async ({ page }) => {
  const now = Date.now(); await page.clock.install({ time: now - 1000 }); await page.clock.pauseAt(now);
  let value = nightlyFixture(now, 40, 'cancelled'); value.latest!.jobs = []; value.latest!.jobsState = 'incomplete';
  await page.route('**/api/test-pipeline', route => route.fulfill({ json: value }));
  const view = new PipelineComponent(page); await page.goto('/tests');
  await expect(view.root.getByTestId('latest-nightly')).toContainText('cancelled');
  await expect(view.position).toHaveCount(0);
  value = nightlyFixture(now + 61000, 41); await page.clock.runFor(61000);
  await expect(view.replay).toBeVisible();
  value = { ...nightlyFixture(now + 122000, 41), state: 'unavailable', latest: null };
  await page.clock.runFor(61000);
  await expect(view.root.getByTestId('latest-nightly')).toContainText('Previously observed run #41');
  await expect(view.position).toHaveCount(0);
});

test('browser case outcomes remain independent when job timing is unavailable', async ({ page }) => {
  const value = nightlyFixture(Date.now(), 43, 'failure');
  const report = pipelineBrowserEvidence();
  Object.assign(report, { runId: String(value.latest!.runId), commitSha: value.latest!.commit, runnerStatus: 'incomplete', completedAt: null });
  value.latest!.createdAt = '2026-09-08T10:00:00Z';
  report.tests[0].attempts[0].status = 'failed';
  report.tests[0].attempts.push({ retry: 1, status: 'passed', durationMs: 0, startedAt: '2026-09-08T10:09:02Z' });
  report.tests[1].attempts = [];
  value.latest!.jobs = []; value.latest!.jobsState = 'incomplete';
  value.latest!.browserState = 'available'; value.latest!.browserEvidence = report;
  await page.route('**/api/test-pipeline', route => route.fulfill({ json: value }));
  const view = new PipelineComponent(page); await page.goto('/tests');
  await expect(view.root.getByTestId('latest-browser-counts')).toHaveText('Browser cases: 5 / 7 passed · 1 flaky · 0 failed · 1 incomplete · 0 skipped.');
  await expect(view.root).toContainText('timing cannot be aligned');
  await expect(view.position).toHaveCount(0);
});
