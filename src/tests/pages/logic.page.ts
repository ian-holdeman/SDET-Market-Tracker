import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class LogicPage extends BasePage {
  readonly pageHeading: Locator;

  constructor(page: Page) {
    super(page);
    this.pageHeading = page.getByRole('heading', { name: 'The Logic', exact: true });
  }

  async open(): Promise<void> {
    await this.navigateTo();
    await this.header.navLogicBtn.click();
    await this.pageHeading.waitFor({ state: 'visible' });
  }
}