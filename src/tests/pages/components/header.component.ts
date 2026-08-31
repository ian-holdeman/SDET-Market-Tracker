import { Page, Locator } from '@playwright/test';

export class HeaderComponent {
  readonly page: Page;
  readonly brandLogoBtn: Locator;
  readonly brandTitle: Locator;
  readonly navHomeBtn: Locator;
  readonly navBoardBtn: Locator;
  readonly navTestsBtn: Locator;
  readonly navAboutBtn: Locator;
  readonly loginBtn: Locator;
  readonly userProfileBtn: Locator;
  readonly usernameDisplay: Locator;
  readonly logoutBtn: Locator;
  readonly authModal: Locator;
  readonly usernameInput: Locator;
  readonly passcodeInput: Locator;
  readonly confirmPasscodeInput: Locator;
  readonly authSubmitBtn: Locator;
  readonly authModalCloseBtn: Locator;
  readonly authErrorMessage: Locator;
  readonly mobileMenuToggleBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.brandLogoBtn = page.locator('#brand-logo-btn');
    this.brandTitle = page.locator('header span:has-text("Ian\'s Market Tracker")');
    this.navHomeBtn = page.locator('#nav-home-btn');
    this.navBoardBtn = page.locator('#nav-board-btn');
    this.navTestsBtn = page.locator('#nav-tests-btn');
    this.navAboutBtn = page.locator('#nav-about-btn');
    this.loginBtn = page.locator('#header-login-btn');
    this.userProfileBtn = page.locator('#header-user-profile-btn');
    this.usernameDisplay = page.locator('#header-username-display');
    this.logoutBtn = page.locator('#header-logout-btn');
    this.authModal = page.locator('#auth-modal-dialog');
    this.usernameInput = page.locator('#auth-username-input');
    this.passcodeInput = page.locator('#auth-passcode-input');
    this.confirmPasscodeInput = page.locator('#auth-confirm-passcode-input');
    this.authSubmitBtn = page.locator('#auth-submit-btn');
    this.authModalCloseBtn = page.locator('#auth-modal-close-btn');
    this.authErrorMessage = page.locator('#auth-error-message');
    this.mobileMenuToggleBtn = page.locator('#mobile-menu-toggle-btn');
  }
}


