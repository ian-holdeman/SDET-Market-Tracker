import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class HomePage extends BasePage {
  readonly heroHeading: Locator;
  readonly boardCard: Locator;
  readonly testsCard: Locator;
  readonly logicCard: Locator;

  constructor(page: Page) {
    super(page);
    this.heroHeading = page.getByRole('heading', { name: "The SDET's Market Tracker", exact: true });
    this.boardCard = page.getByRole('button', { name: 'Open The Board', exact: true });
    this.testsCard = page.getByRole('button', { name: 'Open The Tests', exact: true });
    this.logicCard = page.getByRole('button', { name: 'Open The Logic', exact: true });
  }

  async open(): Promise<void> {
    await this.navigateTo();
    await this.heroHeading.waitFor({ state: 'visible' });
  }
}
