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
    // This is a routing smoke test, not a live-provider or database test.
    await page.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== 'http://127.0.0.1:3100') return route.abort();
      if (url.pathname.startsWith('/api/')) {
        return route.fulfill({ json: url.pathname === '/api/quotes' ? { quotes: [] } : { points: [], results: [] } });
      }
      return route.continue();
    });
    homePage = new HomePage(page);
    boardPage = new TheBoardPage(page);
    testsPage = new TheTestsPage(page);
    logicPage = new LogicPage(page);

    await homePage.open();
  });

  test("navigation button validation", async ({ page }) => {
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
});
