import { test, expect } from '@playwright/test';
import { AboutPage } from '../../pages/about.page';

test.describe('About & SDET Craft Suite', () => {
  test('should render engineer background and architecture overview', async ({ page }) => {
    const aboutPage = new AboutPage(page);
    await aboutPage.open();

    await expect(aboutPage.pageHeading).toBeVisible();
  });
});
