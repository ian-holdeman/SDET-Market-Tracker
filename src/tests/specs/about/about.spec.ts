import { test, expect } from '@playwright/test';
import { AboutPage } from '../../pages/about.page';

test.describe('About Page Suite', () => {
  let aboutPage: AboutPage;

  test.beforeEach(async ({ page }) => {
    aboutPage = new AboutPage(page);
    await aboutPage.open();
  });
});

