import { Page } from '@playwright/test';
import { HeaderComponent } from './components/header.component';
import { FooterComponent } from './components/footer.component';
import { env } from '../config/env';

export abstract class BasePage {
  readonly page: Page;
  readonly header: HeaderComponent;
  readonly footer: FooterComponent;

  constructor(page: Page) {
    this.page = page;
    this.header = new HeaderComponent(page);
    this.footer = new FooterComponent(page);
  }

  async navigateTo(path: string = env.BASE_URL): Promise<void> {
    await this.page.goto(path);
  }
}
