import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class TheBoardPage extends BasePage {
  get allAssets() { return this.page.getByRole('button', { name: 'All', exact: true }); }
  get watchlistCount() { return this.page.locator('#board-watchlist-count-badge'); }
  watchlistButton(symbol: string) { return this.page.locator('#watchlist-star-btn-' + symbol.toLowerCase()); }
  watchingTag(symbol: string) { return this.page.locator('#watching-tag-' + symbol.toLowerCase()); }
  readonly pageHeading: Locator;
  readonly searchInput: Locator;
  readonly refreshButton: Locator;
  readonly watchlistTab: Locator;
  readonly expandAllButton: Locator;

  constructor(page: Page) {
    super(page);
    this.pageHeading = page.getByRole('heading', { name: 'The Board', exact: true });
    this.searchInput = page.getByRole('textbox', { name: 'Search market assets' });
    this.refreshButton = page.getByRole('button', { name: 'Refresh market quotes', exact: true });
    this.watchlistTab = page.getByRole('button', { name: 'Show watchlist', exact: true });
    this.expandAllButton = page.getByRole('button', { name: /Expand all assets|Collapse all assets/ });
  }

  async open(): Promise<void> {
    await this.navigateTo();
    await this.header.navBoardBtn.click();
    await this.pageHeading.waitFor({ state: 'visible' });
  }

  async searchAsset(query: string): Promise<void> {
    if (!await this.searchInput.isVisible()) {
      await this.page.getByRole('button', { name: 'Search market assets', exact: true }).click();
    }
    await this.searchInput.fill(query);
  }

  assetRow(symbol: string): Locator {
    return this.page.locator(`#board-row-${symbol.toLowerCase()}`);
  }

  chart(symbol: string) {
    const card = this.page.locator(`#drilldown-card-${symbol.toLowerCase()}`);
    return {
      card,
      financeLink: card.getByRole('link', { name: /^Google Finance/ }),
      highLabel: card.locator('#price-badge-high-' + symbol.toLowerCase()),
      surface: card.getByTestId('market-chart'),
      line: card.getByTestId('market-chart-line'),
      endpoint: card.getByTestId('market-chart-endpoint').locator('circle').first(),
      pulse: card.getByTestId('market-chart-pulse'),
      session: card.getByTestId('market-chart-session'),
      timeframe: (name: string) => card.getByRole('button', { name, exact: true }),
    };
  }
}
