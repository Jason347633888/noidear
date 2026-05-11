import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E configuration for the document management system.
 *
 * Local defaults:
 *   - Backend API available through the frontend proxy or direct API helper.
 *   - Frontend dev server on http://localhost:5173.
 *
 * Docker E2E runner overrides:
 *   - PLAYWRIGHT_BASE_URL=http://client
 *   - API_BASE_URL=http://client/api/v1
 */
const configuredWorkers = process.env.PLAYWRIGHT_WORKERS
  ? Number(process.env.PLAYWRIGHT_WORKERS)
  : 1;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: process.env.PLAYWRIGHT_FULLY_PARALLEL === '1',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: Number.isFinite(configuredWorkers) && configuredWorkers > 0 ? configuredWorkers : 1,
  globalSetup: './e2e/global-setup.ts',
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-results.json' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173',
    storageState: 'e2e/.auth/admin.json',
    trace: process.env.CI ? 'retain-on-failure' : 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
  outputDir: './e2e/test-results',
});
