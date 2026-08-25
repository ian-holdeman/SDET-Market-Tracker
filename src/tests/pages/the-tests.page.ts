import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * TheTestsPage Object
 * 
 * Encapsulates the SDET automated test runner view, execution triggers,
 * suite telemetry filters, latency bounds, and live log viewports.
 */
export class TheTestsPage extends BasePage {
  readonly rootContainer: Locator;
  readonly pageHeading: Locator;
  readonly runAllTestsBtn: Locator;
  readonly statusFilterAllBtn: Locator;
  readonly statusFilterPassingBtn: Locator;
  readonly statusFilterFailingBtn: Locator;
  readonly testSuiteCards: Locator;
  readonly executionLogConsole: Locator;

  constructor(page: Page) {
    super(page);
    this.rootContainer = page.locator('#the-tests-page, div:has-text("The Tests")').first();
    this.pageHeading = page.locator('h1:has-text("The Tests"), h2:has-text("The Tests")').first();
    this.runAllTestsBtn = page.locator('#run-all-tests-btn, button:has-text("Run All Tests"), button:has-text("Execute Suite")').first();
    this.statusFilterAllBtn = page.locator('button:has-text("All Tests")');
    this.statusFilterPassingBtn = page.locator('button:has-text("Passing")');
    this.statusFilterFailingBtn = page.locator('button:has-text("Failing")');
    this.testSuiteCards = page.locator('[data-testid="test-suite-card"], div[id*="test-card-"]');
    this.executionLogConsole = page.locator('#test-execution-logs, pre, code');
  }

  async open(): Promise<void> {
    await this.navigateTo('/');
    await this.header.navTestsBtn.click();
    await this.pageHeading.waitFor({ state: 'visible' });
  }
}

