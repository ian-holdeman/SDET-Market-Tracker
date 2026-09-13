import { test, expect } from '../../fixtures/showcase-test';
import { evidence, feed, published } from '../../fixtures/testEvidence';
import { HomePage } from '../../pages/home.page';
import { TheTestsPage } from '../../pages/the-tests.page';
import { RunReportComponent } from '../../pages/components/run-report.component';

for (const colorScheme of ['light', 'dark'] as const) {
  test(`large reports stay compact across entry points in ${colorScheme}`, async ({ page }, testInfo) => {
    await page.emulateMedia({ colorScheme });
    const e = evidence();
    e.tests = Array.from({ length: 320 }, (_, i) => ({
      ...structuredClone(e.tests[0]), id: `case-${i}`, name: `Case ${i + 1}: ${i === 319 ? 'Long case name '.repeat(24) : 'Recorded workflow'}`,
      project: i % 2 ? 'mobile-safari' : 'chromium-desktop',
    }));
    e.planned = e.tests.length;
    e.tests[0].attempts[0].status = 'failed';
    e.tests[0].attempts.push({ ...e.tests[0].attempts[0], retry: 1, status: 'passed', durationMs: 7 });
    e.tests[1].attempts[0].status = 'failed';
    e.tests[2].attempts = [];
    const missing = { ...published(null), id: '102', number: 4, url: 'https://github.com/owner/repo/actions/runs/102/attempts/1' };
    const empty = published({ ...evidence(), planned: 0, tests: [], runId: '100' });
    Object.assign(empty, { id: '100', number: 2, url: 'https://github.com/owner/repo/actions/runs/100/attempts/1' });
    let showUnavailable = false;
    await page.route('**/api/test-history**', route => route.fulfill({ json: feed(showUnavailable ? [missing, published(e), empty] : [published(e)]) }));
    await page.goto('/');
    const home = new HomePage(page);
    const dashboard = new TheTestsPage(page);
    const report = new RunReportComponent(page.getByRole('dialog', { name: 'Run #3', exact: true }));
    await home.reportButton.click();
    await expect(report.root).toBeVisible();
    // This fails against the original eager list: hundreds of case rows are visible.
    await expect(report.cases).toHaveCount(0);
    await expect(report.results).toHaveText('Test results (320 recorded cases)');
    await expect(report.metadata).toBeInViewport();
    await expect(report.root.getByRole('link', { name: 'View on GitHub' })).toBeVisible();
    await expect(report.root.getByText('1 failed · 1 unfinished', { exact: true })).toBeVisible();
    await expect(report.root.getByText('Pass rate excludes retries and includes all collected tests.')).toBeVisible();
    await report.metadata.focus();
    await page.keyboard.press('Enter');
    await expect(report.commit).toBeVisible();
    await expect(report.cases).toHaveCount(0);
    await report.results.focus();
    await page.keyboard.press('Space');
    await expect(report.headings).toHaveText(e.tests.map(t => t.name));
    await expect(report.cases.first().getByText('Attempt 1: failed · 5ms', { exact: true })).toBeVisible();
    await expect(report.cases.first().getByText('Attempt 2: passed · 7ms', { exact: true })).toBeVisible();
    await expect(report.cases.nth(2).getByText('No execution result.', { exact: true })).toBeVisible();
    await report.headings.last().scrollIntoViewIfNeeded();
    await expect(report.headings.last()).toBeInViewport();
    await expect(report.cases.last().getByText('mobile-safari', { exact: true })).toBeVisible();
    expect(await report.root.evaluate(el => [...el.querySelectorAll('*')].every(child => child.scrollWidth <= child.clientWidth + 1))).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('expanded-long-case.png') });
    await expect(report.commit).toBeVisible();
    await report.metadata.click();
    await expect(report.commit).toBeHidden();
    await expect(report.headings.last()).toBeVisible();
    await report.results.click();
    await expect(report.cases).toHaveCount(0);
    await expect(report.metadata).toBeInViewport();
    await page.screenshot({ path: testInfo.outputPath('collapsed-report.png') });
    await report.expandResults();
    await page.keyboard.press('Escape');
    await expect(home.reportButton).toBeFocused();
    await home.reportButton.click();
    await expect(report.cases).toHaveCount(0);
    await page.keyboard.press('Escape');
    showUnavailable = true;
    await home.testsCard.click();
    const view = dashboard.results.root.getByRole('button', { name: 'View Report', exact: true });
    const recent = dashboard.results.root.getByRole('button', { name: 'Details for run #3', exact: true });
    for (const opener of [view, recent]) {
      await opener.click();
      await expect(report.cases).toHaveCount(0);
      await report.expandResults();
      await expect(report.headings).toHaveText(e.tests.map(t => t.name));
      await page.keyboard.press('Escape');
      await expect(opener).toBeFocused();
    }
    const historyOpener = dashboard.results.root.getByRole('button', { name: 'Show run history' });
    await historyOpener.click();
    const history = page.getByRole('dialog', { name: 'Run history', exact: true });
    const nested = history.getByRole('button', { name: 'Details for run #3', exact: true });
    await nested.click();
    await expect(report.cases).toHaveCount(0);
    await report.expandResults();
    await expect(report.headings).toHaveText(e.tests.map(t => t.name));
    await page.keyboard.press('Escape');
    await expect(nested).toBeFocused();
    await history.getByRole('button', { name: 'Details for run #2', exact: true }).click();
    const emptyReport = new RunReportComponent(page.getByRole('dialog', { name: 'Run #2', exact: true }));
    await expect(emptyReport.root.getByText('No test results were recorded.', { exact: true })).toBeVisible();
    await expect(emptyReport.results).toHaveCount(0);
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await expect(historyOpener).toBeFocused();
    const unavailableOpener = dashboard.results.root.getByRole('button', { name: 'Details', exact: true });
    await unavailableOpener.click();
    const unavailable = new RunReportComponent(page.getByRole('dialog', { name: 'Run #4', exact: true }));
    await expect(unavailable.root.getByText('No test results were recorded.', { exact: true })).toBeVisible();
    await expect(unavailable.results).toHaveCount(0);
    await unavailable.metadata.click();
    await expect(unavailable.commit).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(unavailableOpener).toBeFocused();
  });
}
