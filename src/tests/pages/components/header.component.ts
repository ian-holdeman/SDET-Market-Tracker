import { Page, Locator } from '@playwright/test';

export class HeaderComponent {
  readonly page: Page;
  readonly brandLogoBtn: Locator;
  readonly brandTitle: Locator;
  readonly navHomeBtn: Locator;
  readonly navBoardBtn: Locator;
  readonly navTestsBtn: Locator;
  readonly navAboutBtn: Locator;
  readonly ciCdStatusBadge: Locator;
  readonly mobileMenuToggleBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.brandLogoBtn = page.locator('#brand-logo-btn');
    this.brandTitle = page.locator('header span:has-text("Ian\'s Market Tracker")');
    this.navHomeBtn = page.locator('#nav-home-btn');
    this.navBoardBtn = page.locator('#nav-board-btn');
    this.navTestsBtn = page.locator('#nav-tests-btn');
    this.navAboutBtn = page.locator('#nav-about-btn');
    this.ciCdStatusBadge = page.locator('#header-cicd-badge, header [class*="bg-emerald"]');
    this.mobileMenuToggleBtn = page.locator('#mobile-menu-toggle-btn');
  }
}

