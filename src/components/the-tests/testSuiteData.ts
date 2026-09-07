export interface TestStep {
  name: string;
  action: string;
  durationMs: number;
  assertion: string;
}

export interface FeaturedTestSuite {
  id: string;
  title: string;
  specFile: string;
  pageObjectFile: string;
  tags: string[];
  durationMs: number;
  testCount: number;
  assertionCount: number;
  description: string;
  codeSnippet: string;
  steps: TestStep[];
}

export const FEATURED_TEST_SUITES: FeaturedTestSuite[] = [
  {
    id: 'the-board',
    title: 'The Board — Watchlist Table & Data Filtering',
    specFile: 'tests/specs/board/the-board.spec.ts',
    pageObjectFile: 'tests/pages/the-board.page.ts',
    tags: ['@board', '@filtering', 'POM'],
    durationMs: 512,
    testCount: 5,
    assertionCount: 14,
    description:
      'Validates watchlist table rendering, type filtering (All / ETFs / Stocks), live search debounce, and row expansion.',
    steps: [
      {
        name: 'Open The Board view',
        action: "await boardPage.open();",
        durationMs: 120,
        assertion: "expect(boardPage.pageHeading).toBeVisible()",
      },
      {
        name: 'Filter by ETFs',
        action: "await boardPage.filterByEtfs();",
        durationMs: 85,
        assertion: "expect(rows).toContain('SPY')",
      },
      {
        name: 'Filter by Stocks',
        action: "await boardPage.filterByStocks();",
        durationMs: 80,
        assertion: "expect(rows).toContain('GOOGL')",
      },
      {
        name: 'Real-time query search',
        action: "await boardPage.search('GOOGL');",
        durationMs: 95,
        assertion: "expect(rows).toEqual(['GOOGL'])",
      },
      {
        name: 'Expand SPY row quote link',
        action: "await boardPage.expandRow('SPY');",
        durationMs: 132,
        assertion: "expect(googleFinanceLink).toHaveAttribute('href', /google.com/)",
      },
    ],
    codeSnippet: `import { test, expect } from '@playwright/test';
import { TheBoardPage } from '../../pages/the-board.page';

test.describe('The Board - Watchlist & Filtering', () => {
  test('should filter assets by type', async ({ page }) => {
    const boardPage = new TheBoardPage(page);
    await boardPage.open();

    await boardPage.filterByEtfs();
    let rows = await boardPage.getVisibleRowSymbols();
    expect(rows).toContain('SPY');
    expect(rows).not.toContain('GOOGL');

    await boardPage.filterByStocks();
    rows = await boardPage.getVisibleRowSymbols();
    expect(rows).toContain('GOOGL');
    expect(rows).not.toContain('SPY');
  });

  test('should search in real-time', async ({ page }) => {
    const boardPage = new TheBoardPage(page);
    await boardPage.open();

    await boardPage.search('GOOGL');
    let rows = await boardPage.getVisibleRowSymbols();
    expect(rows).toEqual(['GOOGL']);
  });
});`,
  },
  {
    id: 'home',
    title: 'Home Page — Dual Telemetry & Navigation',
    specFile: 'tests/specs/home/home.spec.ts',
    pageObjectFile: 'tests/pages/home.page.ts',
    tags: ['@home', '@smoke', 'POM'],
    durationMs: 380,
    testCount: 3,
    assertionCount: 9,
    description:
      'Guarantees layout integrity of the index surveillance hero, telemetry snapshot card, and primary exploration CTAs.',
    steps: [
      {
        name: 'Load home view',
        action: "await homePage.open();",
        durationMs: 110,
        assertion: "expect(homePage.heroHeading).toBeVisible()",
      },
      {
        name: 'Verify telemetry snapshot card',
        action: "await expect(homePage.vtiCard).toBeVisible();",
        durationMs: 70,
        assertion: "expect(homePage.testSnapshotCard).toBeVisible()",
      },
      {
        name: 'Click Explore The Board CTA',
        action: "await homePage.clickExploreTheBoard();",
        durationMs: 100,
        assertion: "expect(boardPage.pageHeading).toBeVisible()",
      },
      {
        name: 'Click Explore The Tests CTA',
        action: "await homePage.clickExploreTheTests();",
        durationMs: 100,
        assertion: "expect(testsPage.pageHeading).toBeVisible()",
      },
    ],
    codeSnippet: `import { test, expect } from '@playwright/test';
import { HomePage } from '../../pages/home.page';
import { TheBoardPage } from '../../pages/the-board.page';

test.describe('Home Page - Dual Telemetry', () => {
  test('should display primary title and telemetry cards', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.open();

    await expect(homePage.heroHeading).toBeVisible();
    await expect(homePage.vtiCard).toBeVisible();
    await expect(homePage.testSnapshotCard).toBeVisible();
  });

  test('should navigate to The Board via CTA', async ({ page }) => {
    const homePage = new HomePage(page);
    const boardPage = new TheBoardPage(page);

    await homePage.open();
    await homePage.clickExploreTheBoard();
    await expect(boardPage.pageHeading).toBeVisible();
  });
});`,
  },
  {
    id: 'navigation',
    title: 'Header & Navigation — Client-Side Routing',
    specFile: 'tests/specs/navigation/navigation.spec.ts',
    pageObjectFile: 'tests/pages/components/header.component.ts',
    tags: ['@navigation', '@routing', 'POM'],
    durationMs: 440,
    testCount: 2,
    assertionCount: 8,
    description:
      'Tests client-side routing across all views, active tab state synchronization, brand logo reset, and footer metadata.',
    steps: [
      {
        name: 'Navigate to The Board from Header',
        action: "await homePage.header.navigateToBoard();",
        durationMs: 90,
        assertion: "expect(boardPage.pageHeading).toBeVisible()",
      },
      {
        name: 'Navigate to The Tests from Header',
        action: "await boardPage.header.navigateToTests();",
        durationMs: 85,
        assertion: "expect(testsPage.pageHeading).toBeVisible()",
      },
      {
        name: 'Navigate to Logic from Header',
        action: "await testsPage.header.navigateToLogic();",
        durationMs: 85,
        assertion: "expect(logicPage.pageHeading).toBeVisible()",
      },
      {
        name: 'Reset to Home via Brand Logo',
        action: "await logicPage.header.clickBrandLogo();",
        durationMs: 90,
        assertion: "expect(homePage.heroHeading).toBeVisible()",
      },
    ],
    codeSnippet: `import { test, expect } from '@playwright/test';
import { HomePage } from '../../pages/home.page';
import { TheBoardPage } from '../../pages/the-board.page';
import { TheTestsPage } from '../../pages/the-tests.page';

test.describe('Navigation Suite', () => {
  test('should navigate across core sections via header links', async ({ page }) => {
    const homePage = new HomePage(page);
    const boardPage = new TheBoardPage(page);
    const testsPage = new TheTestsPage(page);

    await homePage.open();
    await homePage.header.navigateToBoard();
    await expect(boardPage.pageHeading).toBeVisible();

    await boardPage.header.navigateToTests();
    await expect(testsPage.pageHeading).toBeVisible();
  });
});`,
  },
  {
    id: 'the-tests',
    title: 'The Tests — Suite Telemetry & Quality Gates',
    specFile: 'tests/specs/the-tests/the-tests.spec.ts',
    pageObjectFile: 'tests/pages/the-tests.page.ts',
    tags: ['@the-tests', '@regression', 'POM'],
    durationMs: 320,
    testCount: 2,
    assertionCount: 6,
    description:
      'Validates telemetry rendering, timeframe switcher interaction, and parallel worker execution status.',
    steps: [
      {
        name: 'Open The Tests view',
        action: "await testsPage.open();",
        durationMs: 90,
        assertion: "expect(testsPage.pageHeading).toBeVisible()",
      },
      {
        name: 'Assert Telemetry Dashboard metrics',
        action: "await expect(testsPage.passRateBadge).toContainText('100%');",
        durationMs: 70,
        assertion: "expect(testsPage.suiteCountBadge).toBeVisible()",
      },
      {
        name: 'Trigger simulated suite run',
        action: "await testsPage.triggerSuiteExecution();",
        durationMs: 90,
        assertion: "expect(testsPage.matrixRunnerStatus).toContainText('PASS')",
      },
    ],
    codeSnippet: `import { test, expect } from '@playwright/test';
import { TheTestsPage } from '../../pages/the-tests.page';

test.describe('The Tests Suite', () => {
  test('should render test telemetry and handle suite execution', async ({ page }) => {
    const testsPage = new TheTestsPage(page);
    await testsPage.open();

    await expect(testsPage.pageHeading).toBeVisible();
    await testsPage.triggerSuiteExecution();
  });
});`,
  },
];
