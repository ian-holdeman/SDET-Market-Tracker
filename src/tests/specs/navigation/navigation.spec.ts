import { test, expect } from '@playwright/test';
import { HomePage, TheBoardPage, TheTestsPage, AboutPage } from '../../pages';

test.describe('Navigation Suite', () => {
  let homePage: HomePage;
  let boardPage: TheBoardPage;
  let testsPage: TheTestsPage;
  let aboutPage: AboutPage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    boardPage = new TheBoardPage(page);
    testsPage = new TheTestsPage(page);
    aboutPage = new AboutPage(page);

    await homePage.open();
  });

  test("navigation button validation", async () => {
    await homePage.header.navBoardBtn.click();
    await expect(boardPage.pageHeading).toBeVisible();

    await homePage.header.navTestsBtn.click();
    await expect(testsPage.pageHeading).toBeVisible();

    await homePage.header.navAboutBtn.click();
    await expect(aboutPage.pageHeading).toBeVisible();

    await homePage.header.navHomeBtn.click();
    await expect(homePage.heroHeading).toBeVisible();
  });
});
