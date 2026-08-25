import { test, expect } from '@playwright/test';
import { HomePage } from '../../pages/home.page';

test.describe('Home Page Suite', () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    await homePage.open();
  });
});

