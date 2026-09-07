import { Page, Locator } from '@playwright/test';

export class HeaderComponent {
  readonly page: Page;
  readonly brandLogoBtn: Locator;
  readonly navBoardBtn: Locator;
  readonly navTestsBtn: Locator;
  readonly navLogicBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.brandLogoBtn = page.getByRole('button', { name: "The SDET's Market Tracker home" });
    this.navBoardBtn = page.getByRole('button', { name: 'The Board', exact: true });
    this.navTestsBtn = page.getByRole('button', { name: 'The Tests', exact: true });
    this.navLogicBtn = page.getByRole('button', { name: 'The Logic', exact: true });
  }
}

