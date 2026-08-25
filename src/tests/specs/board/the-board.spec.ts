import { test, expect } from '@playwright/test';
import { TheBoardPage } from '../../pages/the-board.page';

test.describe('The Board Suite', () => {
  let boardPage: TheBoardPage;

  test.beforeEach(async ({ page }) => {
    boardPage = new TheBoardPage(page);
    await boardPage.open();
  });
});

