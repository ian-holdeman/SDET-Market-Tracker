import { Page } from '@playwright/test';
import { FooterComponent } from './components/footer.component';

export class ContactPage {
  constructor(readonly page: Page) {}
  get opener() { return new FooterComponent(this.page).contactLink; }
  get dialog() { return this.page.getByRole('dialog', { name: 'Get in Touch' }); }
  get resume() { return this.page.getByRole('link', { name: 'View Resume (PDF)' }); }
  get close() { return this.dialog.getByRole('button', { name: 'Close Get in Touch', exact: true }); }
  get footerClose() { return this.dialog.getByRole('button', { name: 'Close', exact: true }); }
  get copy() { return this.dialog.getByRole('button', { name: 'Copy email to clipboard' }); }
  async open() { await this.opener.click(); }
}

export class ResumePage {
  constructor(readonly page: Page) {}
  get heading() { return this.page.getByRole('heading', { name: 'Ian Holdeman’s resume' }); }
  get download() { return this.page.getByRole('link', { name: 'Download PDF' }); }
  get sheets() { return this.page.getByTestId('resume-page'); }
  sheet(number: number) { return this.sheets.nth(number - 1); }
  canvas(number: number) { return this.sheet(number).getByTestId('resume-canvas'); }
  get error() { return this.page.getByRole('alert'); }
  get retry() { return this.page.getByRole('button', { name: 'Try again' }); }
}
