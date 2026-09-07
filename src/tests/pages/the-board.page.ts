import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class TheBoardPage extends BasePage {
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
}
