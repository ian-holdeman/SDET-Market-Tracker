import { test, expect } from '@playwright/test';
import { LogicPage } from '../../pages/logic.page';

test.describe('Logic Page Suite', () => {
  let logicPage: LogicPage;

  test.beforeEach(async ({ page }) => {
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin !== 'http://127.0.0.1:3100') return route.abort();
      if (url.pathname.startsWith('/api/')) return route.fulfill({ json: { quotes: [], results: [] } });
      return route.continue();
    });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    logicPage = new LogicPage(page);
    await logicPage.open();
  });

  for (const colorScheme of ['dark', 'light'] as const) {
    test(`visitors can read the structure and expand evidence with the keyboard (${colorScheme})`, async ({ page }, testInfo) => {
      await page.emulateMedia({ colorScheme });
      await expect(page.locator('html')).toHaveAttribute('data-theme', colorScheme);
      await expect(logicPage.content.getByRole('heading', { level: 2 })).toHaveText([
        'Why I built this', 'How the app works', 'How I test it', 'AI and what comes next',
      ]);
      await expect(logicPage.evidence).not.toBeVisible();
      await logicPage.evidenceToggle.focus();
      await page.keyboard.press('Enter');
      await expect(logicPage.evidence).toBeVisible();
      await expect(logicPage.evidence.getByRole('link', { name: 'Price calculation tests' })).toBeVisible();
      await logicPage.evidence.screenshot({ path: testInfo.outputPath('logic-evidence.png') });
      await page.keyboard.press('Space');
      await expect(logicPage.evidence).not.toBeVisible();
      await expect(logicPage.evidenceToggle).toBeFocused();
      expect(await logicPage.content.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await page.screenshot({ path: testInfo.outputPath('logic-layout.png'), fullPage: true });
    });
  }

  test('page links preserve public access to Board and Tests', async ({ page }) => {
    await logicPage.boardButton.click();
    await expect(page).toHaveURL(/\/board$/);
    await logicPage.header.navLogicBtn.click();
    await logicPage.testsButton.click();
    await expect(page).toHaveURL(/\/tests$/);
  });
});
