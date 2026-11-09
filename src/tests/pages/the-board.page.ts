import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class TheBoardPage extends BasePage {
  get diagnosticsOpener() { return this.page.getByRole('button', { name: 'Market provider diagnostics', exact: true }); }
  get feedTimestamp() { return this.page.getByTestId('board-feed-timestamp'); }
  async feedGeometry() {
    const measure = (locator: Locator) => locator.evaluate(element => {
      const box = element.getBoundingClientRect();
      return { x: box.x, y: box.y + window.scrollY, width: box.width, height: box.height,
        fits: element.scrollWidth <= element.clientWidth };
    });
    return { status: await measure(this.diagnosticsOpener), refresh: await measure(this.refreshButton),
      table: await measure(this.assetRow('AAPL')) };
  }
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
    else await this.page.getByRole('columnheader', { name: field === 'price' ? 'Current price' : "Today's Change", exact: true }).click();
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

  async captureCurrentQuote(symbol: string, path: string) {
    const chart = this.chart(symbol);
    await chart.currentPrice.scrollIntoViewIfNeeded();
    const [banner, card] = await Promise.all([this.header.region.boundingBox(), chart.card.boundingBox()]);
    if (!banner || !card) throw new Error('Quote capture requires the visible header and asset card');
    await this.page.evaluate(offset => window.scrollBy({ top: offset, behavior: 'instant' }), card.y - (banner.y + banner.height + 12));
    await this.page.screenshot({ path });
  }

  chart(symbol: string) {
    const card = this.page.locator(`#drilldown-card-${symbol.toLowerCase()}`);
    return {
      card,
      currentQuote: card.getByTestId("current-quote"),
      currentPrice: card.getByTestId("current-price"),
      samplePrice: card.getByTestId("chart-sample-price"),
      sampleReturn: card.getByTestId("chart-sample-return"),
      afterHoursChange: card.getByTestId("after-hours-change"),
      periodReturn: card.getByTestId('period-return'),
      afterHours: card.getByTestId('after-hours-quote'),
      sampleTime: card.getByTestId('chart-sample-time'),
      absoluteChange: card.getByTestId('period-absolute-change'),
      financeLink: card.getByRole('link', { name: /^Google Finance/ }),
      highLabel: card.locator('#price-badge-high-' + symbol.toLowerCase()),
      surface: card.getByTestId('market-chart'),
      line: card.getByTestId('market-chart-line'),
      endpoint: card.getByTestId('market-chart-endpoint').locator('circle').first(),
      pulse: card.getByTestId('market-chart-pulse'),
      session: card.getByTestId('market-chart-session'),
      hoverSample: () => card.getByTestId('market-chart').hover({ position: { x: 24, y: 40 } }),
      hoverLastSample: async () => {
        const surface = card.getByTestId('market-chart');
        const endpoint = card.getByTestId('market-chart-endpoint').locator('circle').first();
        await endpoint.waitFor({ state: 'visible' });
        const position = await endpoint.evaluate(element => {
          const circle = element as SVGCircleElement, svg = circle.ownerSVGElement!;
          const box = svg.getBoundingClientRect(), view = svg.viewBox.baseVal;
          return { x: circle.cx.baseVal.value / view.width * box.width, y: circle.cy.baseVal.value / view.height * box.height };
        });
        await surface.hover({ position });
      },
      clearSample: () => card.getByTestId('current-price').hover(),
      timeframe: (name: string) => card.getByRole('button', { name, exact: true }),
    };
  }
}
