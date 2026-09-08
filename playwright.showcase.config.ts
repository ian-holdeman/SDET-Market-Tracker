import { defineConfig, devices } from '@playwright/test';
import { scenarios } from './scripts/showcase-scenarios.mjs';

const titles = (project: string) => new RegExp(scenarios.filter(s => s.project === project)
  .map(s => s.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$').join('|'));
if (process.env.SHOWCASE_CAPTURE !== '1' || !process.env.SHOWCASE_DIRECTORY?.startsWith('.telemetry/showcase/')) {
  throw Error('Run npm run record:showcase to capture with isolation and provenance.');
}

export default defineConfig({
  testDir: './src/tests/specs',
  testMatch: ['auth/auth.spec.ts', 'telemetry/history.spec.ts'],
  outputDir: `${process.env.SHOWCASE_DIRECTORY}/videos`,
  fullyParallel: false,
  workers: 1,
  retries: 1,
  forbidOnly: true,
  reporter: [['list'], ['./scripts/showcase-reporter.ts']],
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'off', screenshot: 'off',
    serviceWorkers: 'block',
  },
  projects: [
    { name: 'mobile-webkit', grep: titles('mobile-webkit'), use: {
      ...devices['iPhone 13'], video: { mode: 'on', size: { width: 390, height: 664 } },
    } },
    { name: 'desktop-chromium', grep: titles('desktop-chromium'), use: {
      ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 },
      video: { mode: 'on', size: { width: 1440, height: 900 } },
    } },
  ],
  webServer: {
    command: 'node scripts/showcase-server.mjs',
    url: 'http://127.0.0.1:3100/api/health', reuseExistingServer: false,
    timeout: 120_000,
  },
});
