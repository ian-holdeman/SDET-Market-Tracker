import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class TheTestsPage extends BasePage {
  readonly pageHeading: Locator;

  constructor(page: Page) {
    super(page);
    this.pageHeading = page.locator('h1:has-text("The Tests"), h2:has-text("The Tests")').first();
  }

  async open(): Promise<void> {
    await this.navigateTo('/');
    await this.header.navTestsBtn.click();
    await this.pageHeading.waitFor({ state: 'visible' });
  }
}
