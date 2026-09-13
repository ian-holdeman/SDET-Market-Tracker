import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class TheBoardPage extends BasePage {
  get diagnosticsOpener() { return this.page.locator('#board-feed-status-btn'); }
  get diagnostics() { return this.page.getByRole('dialog', { name: 'Market Provider Polling' }); }
  get ping() { return this.page.getByRole('button', { name: 'Ping Engine Diagnostics' }); }
  get rows() { return this.page.getByRole('button', { name: / details$/ }); }
  async symbols() { return this.rows.evaluateAll(rows => rows.map(row => row.id.slice('board-row-'.length).toUpperCase())); }
  async category(name: string) {
    await this.page.getByRole('button', { name: 'Change asset category' }).click();
    await this.page.locator('#board-category-dropdown-menu').getByRole('button', { name: new RegExp('^' + name + '\\b') }).click();
  }
  async sort(field: 'price' | 'change') {
    const mobile = this.page.getByRole('button', { name: field === 'price' ? 'Price' : '%', exact: true });
    if (await mobile.isVisible()) await mobile.click();
    else await this.page.getByRole('columnheader', { name: field === 'price' ? 'Last Price' : "Today's Change", exact: true }).click();
  }
  metric(symbol: string, name: string) { return this.chart(symbol).card.locator(`#card-${name}-${symbol.toLowerCase()}`); }
  async metricGeometry(symbol: string) {
    const names = ['previous-close', 'day-range', '52w-range', 'volume', '1m-change', '1y-change'];
    return Promise.all(names.map(name => this.metric(symbol, name).evaluate(element => {
      const box = element.getBoundingClientRect();
      return { left: box.left, right: box.right, top: box.top, bottom: box.bottom,
        fits: element.scrollWidth <= element.clientWidth && [...element.querySelectorAll('span')].every(child => child.getBoundingClientRect().right <= box.right + 1) };
    })));
  }
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
      absoluteChange: card.getByTestId('period-absolute-change'),
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
