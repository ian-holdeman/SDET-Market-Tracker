import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * AboutPage Object
 * 
 * Encapsulates the SDET profile, architecture rationale, tech stack,
 * repository links, and testing philosophy.
 */
export class AboutPage extends BasePage {
  readonly rootContainer: Locator;
  readonly pageHeading: Locator;
  readonly engineerProfileCard: Locator;
  readonly techStackBadges: Locator;
  readonly architectureSection: Locator;

  constructor(page: Page) {
    super(page);
    this.rootContainer = page.locator('#about-page, div:has-text("About & SDET Craft")').first();
    this.pageHeading = page.locator('h1:has-text("About"), h2:has-text("About")').first();
    this.engineerProfileCard = page.locator('div:has-text("Ian Holdeman")').first();
    this.techStackBadges = page.locator('span:has-text("React 19"), span:has-text("TypeScript"), span:has-text("Playwright")');
    this.architectureSection = page.locator('div:has-text("System Architecture"), div:has-text("Architecture Rationale")').first();
  }

  async open(): Promise<void> {
    await this.navigateTo('/');
    await this.header.navAboutBtn.click();
    await this.pageHeading.waitFor({ state: 'visible' });
  }
}

