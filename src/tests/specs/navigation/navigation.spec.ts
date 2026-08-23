import { test, expect } from '@playwright/test';
import { HomePage } from '../../pages/home.page';
import { TheBoardPage } from '../../pages/the-board.page';
import { TheTestsPage } from '../../pages/the-tests.page';
import { AboutPage } from '../../pages/about.page';

test.describe('Global Navigation & Ticker Tape Suite', () => {
  test('should navigate seamlessly across all core sections via Header links', async ({ page }) => {
    const homePage = new HomePage(page);
    const boardPage = new TheBoardPage(page);
    const testsPage = new TheTestsPage(page);
    const aboutPage = new AboutPage(page);

    // 1. Initial Home Navigation
    await homePage.open();
    await expect(homePage.heroHeading).toBeVisible();

    // 2. Navigate to The Board
    await homePage.header.navigateToBoard();
    await expect(boardPage.pageHeading).toBeVisible();

    // 3. Navigate to The Tests
    await boardPage.header.navigateToTests();
    await expect(testsPage.pageHeading).toBeVisible();

    // 4. Navigate to About
    await testsPage.header.navigateToAbout();
    await expect(aboutPage.pageHeading).toBeVisible();

    // 5. Return to Home via Brand Logo click
    await aboutPage.header.clickBrandLogo();
    await expect(homePage.heroHeading).toBeVisible();
  });

  test('should verify global footer copyright and telemetry assertions', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.open();

    const copyright = await homePage.footer.getCopyright();
    expect(copyright).toContain('Ian Holdeman');
    expect(copyright).toContain('2026');

    const disclaimer = await homePage.footer.getDisclaimer();
    expect(disclaimer).toContain('Public Market Data');
  });
});
