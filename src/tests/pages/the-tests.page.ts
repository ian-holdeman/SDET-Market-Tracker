import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class TheTestsPage extends BasePage {
  readonly pageHeading: Locator;

  constructor(page: Page) {
    super(page);
    this.pageHeading = page.getByRole('heading', { name: 'The Tests', exact: true });
  }

  async open(): Promise<void> {
    await this.navigateTo();
    await this.header.navTestsBtn.click();
    await this.pageHeading.waitFor({ state: 'visible' });
  }
}
