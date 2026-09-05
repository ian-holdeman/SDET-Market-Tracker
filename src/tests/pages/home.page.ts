import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * HomePage Object
 * 
 * Minimal baseline page object for the home landing view.
 */
export class HomePage extends BasePage {
  readonly heroHeading: Locator;

  constructor(page: Page) {
    super(page);
    this.heroHeading = page.locator('h1:has-text("Ian\'s Market Tracker")');
  }

  async open(): Promise<void> {
    await this.navigateTo('/');
    await this.heroHeading.waitFor({ state: 'visible' });
  }
}
