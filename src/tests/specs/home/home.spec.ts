import { test, expect } from '@playwright/test';
import { HomePage } from '../../pages/home.page';
import { TheBoardPage } from '../../pages/the-board.page';
import { TheTestsPage } from '../../pages/the-tests.page';

test.describe('Home Page - Dual Dashboard Showcase', () => {
  test('should display primary title, VTI market card, and SDET telemetry card', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.open();

    // Verify Main Headers
    await expect(homePage.heroHeading).toBeVisible();
    await expect(homePage.heroSubtitle).toBeVisible();

    // Verify Dual Cards presence
    await expect(homePage.vtiCard).toBeVisible();
    await expect(homePage.testSnapshotCard).toBeVisible();
  });

  test('should navigate to The Board when clicking CTA button on VTI card', async ({ page }) => {
    const homePage = new HomePage(page);
    const boardPage = new TheBoardPage(page);

    await homePage.open();
    await homePage.clickExploreTheBoard();

    await expect(boardPage.pageHeading).toBeVisible();
  });

  test('should navigate to The Tests when clicking CTA button on SDET card', async ({ page }) => {
    const homePage = new HomePage(page);
    const testsPage = new TheTestsPage(page);

    await homePage.open();
    await homePage.clickExploreTheTests();

    await expect(testsPage.pageHeading).toBeVisible();
  });
});
