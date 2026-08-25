import { Page } from '@playwright/test';
import { HeaderComponent } from './components/header.component';
import { FooterComponent } from './components/footer.component';
import { TickerTapeComponent } from './components/ticker-tape.component';

/**
 * BasePage
 * 
 * Abstract root page object providing shared page instance and global UI components.
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

  async navigateTo(path: string = '/'): Promise<void> {
    await this.page.goto(path);
  }
}

