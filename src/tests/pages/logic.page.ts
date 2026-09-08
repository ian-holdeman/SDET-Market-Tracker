import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class LogicPage extends BasePage {
  readonly pageHeading: Locator;
  readonly content: Locator;
  readonly evidenceToggle: Locator;
  readonly evidence: Locator;
  readonly boardButton: Locator;
  readonly testsButton: Locator;

  constructor(page: Page) {
    super(page);
    this.pageHeading = page.getByRole('heading', { name: 'The Logic', exact: true });
    this.content = page.getByRole('article', { name: 'The Logic' });
    this.evidenceToggle = this.content.getByText('Evidence and coverage boundaries', { exact: true });
    this.evidence = this.content.getByTestId('logic-evidence');
    this.boardButton = this.content.getByRole('button', { name: 'The Board', exact: true });
    this.testsButton = this.content.getByRole('button', { name: 'The Tests', exact: true });
  }

  async open(): Promise<void> {
    await this.navigateTo();
    await this.header.navLogicBtn.click();
    await this.pageHeading.waitFor({ state: 'visible' });
  }
}
