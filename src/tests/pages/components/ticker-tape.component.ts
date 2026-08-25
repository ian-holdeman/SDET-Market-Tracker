import { Page, Locator } from '@playwright/test';

export class TickerTapeComponent {
  readonly page: Page;
  readonly container: Locator;
  readonly marketFeedLabel: Locator;
  readonly tickerItems: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.locator('#ticker-tape-container, div:has-text("MARKET FEED")').first();
    this.marketFeedLabel = page.locator('span:has-text("MARKET FEED")');
    this.tickerItems = page.locator('#ticker-tape-container button, div:has-text("MARKET FEED") button');
  }
}

