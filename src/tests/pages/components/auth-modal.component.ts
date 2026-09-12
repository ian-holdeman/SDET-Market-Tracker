import type { Page } from '@playwright/test';
import { HeaderComponent } from './header.component';

export class AuthModalComponent {
  constructor(readonly page: Page) {}
  get dialog() { return this.page.getByRole('dialog', { name: 'Sign In', exact: true }); }
  get google() { return this.dialog.getByRole('button', { name: /^(Continue with Google|Connecting…)$/ }); }
  get notice() { return this.dialog.getByRole('link', { name: 'Privacy & Data Notice' }); }
  get error() { return this.dialog.getByRole('alert'); }
  async open() { await new HeaderComponent(this.page).loginButton.click(); }
  async focusGoogle() { await this.notice.focus(); await this.page.keyboard.press('Tab'); }
}
