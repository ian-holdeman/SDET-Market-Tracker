import { Locator } from '@playwright/test';

/** Shared report controls, including native keyboard-operable disclosures. */
export class RunReportComponent {
  constructor(readonly root: Locator) {}
  get results() { return this.root.locator('summary').filter({ hasText: /^Test results/ }); }
  get metadata() { return this.root.locator('summary').filter({ hasText: /^Run metadata$/ }); }
  get cases() { return this.root.getByRole('article'); }
  get headings() { return this.cases.getByRole('heading', { level: 3 }); }
  get commit() { return this.root.getByText('Commit', { exact: true }); }
  async expandResults() { await this.results.click(); }
}
