import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { StockDetailCardComponent } from './components/stock-detail-card.component';

/**
 * TheBoardPage Object
 * 
 * Encapsulates the multi-asset watchlist roll table, search inputs,
 * asset type filters (All, ETFs, Stocks), expand-all toggles, and detail cards.
 */
export class TheBoardPage extends BasePage {
  readonly rootContainer: Locator;
  readonly pageHeading: Locator;
  readonly desktopSearchInput: Locator;
  readonly mobileSearchInput: Locator;
  readonly mobileSearchToggleBtn: Locator;
  readonly filterAllBtn: Locator;
  readonly filterEtfsBtn: Locator;
  readonly filterStocksBtn: Locator;
  readonly expandAllBtn: Locator;
  readonly stockRows: Locator;
  readonly summaryFooter: Locator;

  constructor(page: Page) {
    super(page);
    this.rootContainer = page.locator('#the-board-page');
    this.pageHeading = page.locator('#the-board-page h1:has-text("The Board")');
    this.desktopSearchInput = page.locator('#board-search-input-desktop');
    this.mobileSearchInput = page.locator('#board-search-input');
    this.mobileSearchToggleBtn = page.locator('#board-search-toggle-btn');
    this.filterAllBtn = page.locator('#board-filter-all-btn');
    this.filterEtfsBtn = page.locator('#board-filter-etf-btn');
    this.filterStocksBtn = page.locator('#board-filter-stock-btn');
    this.expandAllBtn = page.locator('#board-expand-all-btn');
    this.stockRows = page.locator('tbody tr[id*="board-row-"]');
    this.summaryFooter = page.locator('#the-board-page div:has-text("Showing")').last();
  }

  async open(): Promise<void> {
    await this.navigateTo('/');
    await this.header.navigateToBoard();
    await this.pageHeading.waitFor({ state: 'visible' });
  }

  async search(query: string): Promise<void> {
    const isDesktop = await this.desktopSearchInput.isVisible();
    if (isDesktop) {
      await this.desktopSearchInput.fill(query);
    } else {
      const isMobileInputVisible = await this.mobileSearchInput.isVisible();
      if (!isMobileInputVisible) {
        await this.mobileSearchToggleBtn.click();
      }
      await this.mobileSearchInput.fill(query);
    }
  }

  async clearSearch(): Promise<void> {
    const isDesktop = await this.desktopSearchInput.isVisible();
    if (isDesktop) {
      await this.desktopSearchInput.fill('');
    } else if (await this.mobileSearchInput.isVisible()) {
      await this.mobileSearchInput.fill('');
    }
  }

  async filterByAll(): Promise<void> {
    await this.filterAllBtn.click();
  }

  async filterByEtfs(): Promise<void> {
    await this.filterEtfsBtn.click();
  }

  async filterByStocks(): Promise<void> {
    await this.filterStocksBtn.click();
  }

  async toggleExpandAll(): Promise<void> {
    await this.expandAllBtn.click();
  }

  async expandRow(symbol: string): Promise<void> {
    const row = this.page.locator(`#board-row-${symbol}`);
    await row.click();
  }

  getStockDetailCard(symbol: string): StockDetailCardComponent {
    return new StockDetailCardComponent(this.page, symbol);
  }

  async getVisibleRowSymbols(): Promise<string[]> {
    return await this.stockRows.evaluateAll(rows => 
      rows.map(r => r.id.replace('board-row-', ''))
    );
  }

  async getSummaryCountText(): Promise<string> {
    return await this.summaryFooter.innerText();
  }
}
