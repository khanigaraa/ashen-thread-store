import { defineConfig } from '@playwright/test';

/**
 * End-to-end tests run against the Vite dev server in the Microsoft Edge that
 * is already installed on Windows (no Playwright browser download needed).
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5174',
    channel: 'msedge',
    headless: true,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npx vite --port 5174 --strictPort',
    url: 'http://localhost:5174',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
