import { defineConfig, devices } from '@playwright/test';
import { env } from './src/tests/config/env';

const runDirectory = process.env.IMT_BROWSER_ARTIFACTS ??= `.telemetry/browser-runs/${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}`;

/**
 * Playwright Test Configuration
 * 
 * Optimized for local dev and CI/CD environments.
 * References: https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './src/tests/specs',
  outputDir: `${runDirectory}/artifacts`,
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Preserve a maximum of one retry locally and in CI. */
  retries: 1,
  
  /* Opt out of parallel tests on CI if needed. */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ['./scripts/evidence-reporter.ts'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['json', { outputFile: `${runDirectory}/results.json` }]
  ],

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: env.BASE_URL,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Capture screenshot on test failure */
    screenshot: 'only-on-failure',

    /* Record video on failure */
    video: 'retain-on-failure',

    /* Consistent custom test ID attribute attribute for React components */
    testIdAttribute: 'data-testid',
    serviceWorkers: 'block',
  },

  /* Configure projects for major browsers and mobile viewports */
  projects: [
    {
      name: 'chromium-desktop',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    /* Mobile Viewport Testing */
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'node scripts/showcase-server.mjs',
    url: `${env.BASE_URL}/api/health`,
    reuseExistingServer: false,
    timeout: 120 * 1000,
  },
});
