import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * HomePage Object
 * 
 * Represents the main landing page with VTI market overview card,
 * SDET testing telemetry snapshot card, and quick navigation actions.
 */
export class HomePage extends BasePage {
  readonly heroHeading: Locator;
  readonly heroSubtitle: Locator;
  readonly vtiCard: Locator;
  readonly vtiExploreBoardBtn: Locator;
  readonly testSnapshotCard: Locator;
  readonly testExploreTestsBtn: Locator;
  readonly vtiTimeframeButtons: Locator;
  readonly testTimeframeButtons: Locator;

  constructor(page: Page) {
    super(page);
    this.heroHeading = page.locator('h1:has-text("Ian\'s Market Tracker")');
    this.heroSubtitle = page.locator('span:has-text("(and Test Automation Suite!)")');
    this.vtiCard = page.locator('div:has-text("Vanguard Total Stock Market")').first();
    this.vtiExploreBoardBtn = page.locator('button:has-text("Explore The Board"), button:has-text("View Detailed Board")').first();
    this.testSnapshotCard = page.locator('div:has-text("Automated Test Suite"), div:has-text("SDET")').first();
    this.testExploreTestsBtn = page.locator('button:has-text("View Test Runs"), button:has-text("Explore The Tests")').first();
    this.vtiTimeframeButtons = page.locator('div:has-text("VTI") button');
    this.testTimeframeButtons = page.locator('div:has-text("Automated Test Suite") button');
  }

  async open(): Promise<void> {
    await this.navigateTo('http://localhost:3000');
    await this.heroHeading.waitFor({ state: 'visible' });
  }
}

