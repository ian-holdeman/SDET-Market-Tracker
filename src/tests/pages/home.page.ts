import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class HomePage extends BasePage {
  readonly heroHeading: Locator;

  constructor(page: Page) {
    super(page);
    this.heroHeading = page.locator('h1:has-text("The SDET\'s Market Tracker")');
  }

  async open(): Promise<void> {
    await this.navigateTo('/');
    await this.heroHeading.waitFor({ state: 'visible' });
  }
}
