import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class AboutPage extends BasePage {
  readonly pageHeading: Locator;

  constructor(page: Page) {
    super(page);
    this.pageHeading = page.locator('h1:has-text("The Logic"), h1:has-text("About")').first();
  }

  async open(): Promise<void> {
    await this.navigateTo('/');
    await this.header.navLogicBtn.click();
    await this.pageHeading.waitFor({ state: 'visible' });
  }
}

