import { Page, Locator } from '@playwright/test';

export class HeaderComponent {
  readonly page: Page;
  readonly brandLogoBtn: Locator;
  readonly navBoardBtn: Locator;
  readonly navTestsBtn: Locator;
  readonly navLogicBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.brandLogoBtn = page.locator('#brand-logo-btn');
    this.navBoardBtn = page.locator('#nav-board-btn:visible, #mobile-nav-board-btn:visible');
    this.navTestsBtn = page.locator('#nav-tests-btn:visible, #mobile-nav-tests-btn:visible');
    this.navLogicBtn = page.locator('#nav-logic-btn:visible, #mobile-nav-logic-btn:visible');
  }
}

