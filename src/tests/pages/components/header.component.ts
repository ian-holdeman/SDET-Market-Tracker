import { Page, Locator } from "@playwright/test";

export class HeaderComponent {
  readonly page: Page;
  readonly brandLogoBtn: Locator;
  readonly navBoardBtn: Locator;
  readonly navTestsBtn: Locator;
  readonly navLogicBtn: Locator;
  readonly boardActivity: Locator;
  readonly testsActivity: Locator;
  get profileButton() { return this.page.locator('#header-user-profile-btn'); }
  get logoutButton() { return this.page.locator('#header-logout-btn'); }
  get loginButton() { return this.page.getByRole('button', { name: 'Sign In', exact: true }); }
  get username() { return this.page.locator('#header-username-display'); }
  get region() { return this.page.getByRole('banner'); }
  get appearanceButton() { return this.region.getByRole('button', { name: /^Switch to (light|dark) mode$/ }); }
  appearanceAction(theme: 'light' | 'dark') { return this.region.getByRole('button', { name: `Switch to ${theme} mode`, exact: true }); }
  async switchAppearance(theme: 'light' | 'dark') { await this.appearanceAction(theme).click(); }
  async observePaletteTransitions() {
    await this.page.evaluate(() => {
      (window as any).paletteTransitions = [];
      document.addEventListener('transitionrun', event => {
        if (/color|background|border|shadow|fill|stroke|^--tw-/.test(event.propertyName)) {
          (window as any).paletteTransitions.push(event.propertyName);
        }
      });
    });
  }
  async paletteTransitionsAfterPaint() {
    return this.page.evaluate(() => new Promise<string[]>(resolve => {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        resolve((window as any).paletteTransitions.splice(0));
      }));
    }));
  }

  constructor(page: Page) {
    this.page = page;
    this.brandLogoBtn = page.getByRole("button", {
      name: "The SDET's Market Tracker home",
    });
    this.navBoardBtn = page.getByRole("button", {
      name: "The Board",
      exact: true,
    });
    this.navTestsBtn = page.getByRole("button", {
      name: "The Tests",
      exact: true,
    });
    this.navLogicBtn = page.getByRole("button", {
      name: "The Logic",
      exact: true,
    });
    this.boardActivity = this.navBoardBtn.getByTestId(
      "board-activity-indicator",
    );
    this.testsActivity = this.navTestsBtn.getByTestId(
      "tests-activity-indicator",
    );
  }
}
