import { Page } from '@playwright/test';
import { HeaderComponent } from './components/header.component';
export class SettingsPage {
  constructor(readonly page: Page) {}
  get panel() { return this.page.getByRole('region', { name: 'Settings' }); }
  get name() { return this.panel.getByTestId('settings-name'); }
  get light() { return this.panel.getByRole('radio', { name: 'Light', exact: true }); }
  get dark() { return this.panel.getByRole('radio', { name: 'Dark', exact: true }); }
  get clear() { return this.panel.getByRole('button', { name: 'Clear Watchlist', exact: true }); }
  get delete() { return this.panel.getByRole('button', { name: 'Delete Account', exact: true }); }
  get privacy() { return this.panel.getByRole('link', { name: 'Privacy & Data Notice' }); }
  get dialog() { return this.page.getByRole('dialog', { name: /Clear Watchlist|Delete Account/ }); }
  get confirmClear() { return this.dialog.getByRole('button', { name: 'Yes, Clear Watchlist' }); }
  get confirmDelete() { return this.dialog.getByRole('button', { name: 'Yes, Delete Account' }); }
  get cancel() { return this.dialog.getByRole('button', { name: 'Cancel', exact: true }); }
  get closePending() { return this.dialog.getByRole('button', { name: 'Close', exact: true }); }
  async navigate() {
    await new HeaderComponent(this.page).profileButton.click();
    await this.page.getByRole('button', { name: 'Settings', exact: true }).click();
  }
}
