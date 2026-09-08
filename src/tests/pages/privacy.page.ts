import { Page } from '@playwright/test';
export class PrivacyPage {
  constructor(readonly page: Page) {}
  get opener() { return this.page.getByRole('button', { name: 'Privacy', exact: true }); }
  get dialog() { return this.page.getByRole('dialog', { name: 'Privacy & Data Notice', exact: true }); }
  get close() { return this.dialog.getByRole('button', { name: 'Close privacy notice' }); }
  get contact() { return this.dialog.getByRole('link', { name: 'ianrholdeman@gmail.com' }); }
  get article() { return this.page.getByRole('article', { name: 'Privacy & Data Notice' }); }
  get signIn() { return this.page.getByRole('button', { name: 'Sign In', exact: true }); }
  get signInNotice() { return this.page.getByRole('dialog', { name: 'Sign In' }).getByRole('link', { name: 'Privacy & Data Notice' }); }
}
