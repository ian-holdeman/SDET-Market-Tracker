import { Page, Locator } from '@playwright/test';

export class StockDetailCardComponent {
  readonly page: Page;
  readonly symbol: string;
  readonly root: Locator;
  readonly googleFinanceLink: Locator;
  readonly timeframeButtons: Locator;
  readonly dayRangeBar: Locator;
  readonly yearRangeBar: Locator;
  readonly watchlistStarBtn: Locator;
  readonly watchingTag: Locator;

  constructor(page: Page, symbol: string) {
    this.page = page;
    this.symbol = symbol;
    this.root = page.locator(`div[id*="detail-${symbol}"], tr:has-text("${symbol}") + tr, #drilldown-card-${symbol.toLowerCase()}`);
    this.googleFinanceLink = this.root.locator('a:has-text("Google Finance")');
    this.timeframeButtons = this.root.locator('button');
    this.dayRangeBar = this.root.locator('span:has-text("Day\'s Range") + div');
    this.yearRangeBar = this.root.locator('span:has-text("52W Range") + div');
    this.watchlistStarBtn = page.locator(`#watchlist-star-btn-${symbol.toLowerCase()}`);
    this.watchingTag = page.locator(`#watching-tag-${symbol.toLowerCase()}`);
  }
}

