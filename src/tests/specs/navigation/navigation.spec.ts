import { test, expect } from '@playwright/test';
import { HomePage, TheBoardPage, TheTestsPage, LogicPage } from '../../pages';

test.describe('Navigation Suite', () => {
  let homePage: HomePage;
  let boardPage: TheBoardPage;
  let testsPage: TheTestsPage;
  let logicPage: LogicPage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    boardPage = new TheBoardPage(page);
    testsPage = new TheTestsPage(page);
    logicPage = new LogicPage(page);

    await homePage.open();
  });

  test("navigation button validation", async ({ page }) => {
    await page.pause(); 
    await homePage.header.navBoardBtn.click();
    await expect(boardPage.pageHeading).toBeVisible();

    await homePage.header.navTestsBtn.click();
    await expect(testsPage.pageHeading).toBeVisible();

    await homePage.header.navLogicBtn.click();
    await expect(logicPage.pageHeading).toBeVisible();

    await homePage.header.brandLogoBtn.click();
    await expect(homePage.heroHeading).toBeVisible();
  });
});
