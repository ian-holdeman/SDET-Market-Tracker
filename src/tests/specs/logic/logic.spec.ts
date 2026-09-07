import { test } from '@playwright/test';
import { LogicPage } from '../../pages/logic.page';

test.describe('Logic Page Suite', () => {
  let logicPage: LogicPage;

  test.beforeEach(async ({ page }) => {
    logicPage = new LogicPage(page);
    await logicPage.open();
  });
});