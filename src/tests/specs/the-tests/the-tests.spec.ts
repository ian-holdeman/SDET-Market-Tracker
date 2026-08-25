import { test, expect } from '@playwright/test';
import { TheTestsPage } from '../../pages/the-tests.page';

test.describe('The Tests Suite', () => {
  let testsPage: TheTestsPage;

  test.beforeEach(async ({ page }) => {
    testsPage = new TheTestsPage(page);
    await testsPage.open();
  });
});

