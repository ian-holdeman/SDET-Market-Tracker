import { Page, Locator } from '@playwright/test';

export class FooterComponent {
  readonly page: Page;
  readonly container: Locator;
  readonly copyrightText: Locator;
  readonly marketDataDisclaimer: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.locator('footer');
    this.copyrightText = page.locator('footer p:has-text("Ian Holdeman")');
    this.marketDataDisclaimer = page.locator('footer p:has-text("Public Market Data")');
  }

  async getCopyright(): Promise<string> {
    return await this.copyrightText.innerText();
  }

  async getDisclaimer(): Promise<string> {
    return await this.marketDataDisclaimer.innerText();
  }
}
