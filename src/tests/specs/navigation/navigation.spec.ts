import { test, expect } from '../../fixtures/showcase-test';
import { HomePage, TheBoardPage, TheTestsPage, LogicPage } from '../../pages';

test.describe('Navigation Suite', () => {
  let homePage: HomePage;
  let boardPage: TheBoardPage;
  let testsPage: TheTestsPage;
  let logicPage: LogicPage;
  let pageErrors: string[];

  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    // Shared isolation supplies populated market/catalog fixtures and blocks
    // external traffic. Aborting its catalog mock caused a WebKit access error.
    homePage = new HomePage(page);
    boardPage = new TheBoardPage(page);
    testsPage = new TheTestsPage(page);
    logicPage = new LogicPage(page);

    await homePage.open();
  });

  test("navigation button validation", { tag: '@smoke' }, async ({ page }) => {
    await homePage.header.navBoardBtn.click();
    await expect(boardPage.pageHeading).toBeVisible();
    await expect(page).toHaveURL(/\/board$/);

    await homePage.header.navTestsBtn.click();
    await expect(testsPage.pageHeading).toBeVisible();
    await expect(page).toHaveURL(/\/tests$/);

    await homePage.header.navLogicBtn.click();
    await expect(logicPage.pageHeading).toBeVisible();
    await page.reload();
    await expect(logicPage.pageHeading).toBeVisible();
    await page.goBack();
    await expect(testsPage.pageHeading).toBeVisible();
    await page.goForward();
    await expect(logicPage.pageHeading).toBeVisible();

    await homePage.header.brandLogoBtn.click();
    await expect(homePage.heroHeading).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test('the home control supports Enter and Space from another page', async ({ page }) => {
    for (const key of ['Enter', 'Space']) {
      await test.step(key, async () => {
        await homePage.header.navBoardBtn.click();
        await expect(page).toHaveURL(/\/board$/);
        await homePage.header.brandLogoBtn.focus();
        await page.keyboard.press(key);
        await expect(homePage.heroHeading).toBeVisible();
        await expect(homePage.header.brandLogoBtn).toBeFocused();
      });
    }
  });
});
