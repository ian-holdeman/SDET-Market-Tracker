import { Page, Locator } from '@playwright/test';

export class FooterComponent {
  readonly page: Page;
  readonly contactLink: Locator;
  readonly privacyLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.contactLink = page.getByRole('button', { name: 'Contact', exact: true });
    this.privacyLink = page.getByRole('button', { name: 'Privacy', exact: true });
  }
}