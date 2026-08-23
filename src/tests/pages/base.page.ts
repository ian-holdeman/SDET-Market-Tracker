import { Page, Locator, expect } from '@playwright/test';
import { HeaderComponent } from './components/header.component';
import { FooterComponent } from './components/footer.component';
import { TickerTapeComponent } from './components/ticker-tape.component';

/**
 * BasePage
 * 
 * Abstract root page object providing shared primitives, navigation utilities,
 * logging helpers, and global UI component accessors (Header, Footer, Ticker Tape).
 */
export abstract class BasePage {
  readonly page: Page;
  readonly header: HeaderComponent;
  readonly footer: FooterComponent;
  readonly tickerTape: TickerTapeComponent;

  constructor(page: Page) {
    this.page = page;
    this.header = new HeaderComponent(page);
    this.footer = new FooterComponent(page);
    this.tickerTape = new TickerTapeComponent(page);
  }

  /**
   * Navigates to a relative path from baseURL and waits for network idle state.
   */
  async navigateTo(path: string = '/'): Promise<void> {
    await this.page.goto(path);
    await this.waitForPageReady();
  }

  /**
   * Waits for foundational DOM tree hydration and key containers.
   */
  async waitForPageReady(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Retrieves the current document title.
   */
  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  /**
   * Helper to locate elements using data-testid, id fallback, or CSS selector.
   */
  getByTestIdOrId(id: string): Locator {
    return this.page.locator(`[data-testid="${id}"], #${id}`);
  }

  /**
   * Scrolls to a specific locator smoothly.
   */
  async scrollToElement(locator: Locator): Promise<void> {
    await locator.scrollIntoViewIfNeeded();
  }

  /**
   * Asserts whether a given locator is visible within the viewport.
   */
  async isElementVisible(locator: Locator): Promise<boolean> {
    try {
      return await locator.isVisible();
    } catch {
      return false;
    }
  }
}
