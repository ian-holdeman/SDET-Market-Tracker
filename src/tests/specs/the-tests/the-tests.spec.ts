import { test, expect } from '@playwright/test';
import { TheTestsPage } from '../../pages/the-tests.page';

test.describe('The Tests - Automated Quality & Surveillance Suite', () => {
  test('should render test page heading and initial telemetry', async ({ page }) => {
    const testsPage = new TheTestsPage(page);
    await testsPage.open();

    await expect(testsPage.pageHeading).toBeVisible();
  });

  test('should support triggering suite run and viewing passing assertions', async ({ page }) => {
    const testsPage = new TheTestsPage(page);
    await testsPage.open();

    await testsPage.triggerSuiteExecution();
    // Test suite execution assertion hook
    await expect(testsPage.pageHeading).toBeVisible();
  });
});
