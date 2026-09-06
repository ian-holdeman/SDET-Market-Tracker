import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class TheBoardPage extends BasePage {
  readonly pageHeading: Locator;

  constructor(page: Page) {
    super(page);
    this.pageHeading = page.locator('#the-board-page h1:has-text("The Board")');
  }

  async open(): Promise<void> {
    await this.navigateTo('/');
    await this.header.navBoardBtn.click();
    await this.pageHeading.waitFor({ state: 'visible' });
  }
}
