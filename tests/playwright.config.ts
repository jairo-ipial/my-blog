import { defineConfig } from '@playwright/test';

// Use an existing server. Tests never start, stop, or replace the user's server.
export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  outputDir: './artifacts',
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: './report', open: 'never' }]],
  use: {
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:4321',
    browserName: 'chromium',
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [320, 390].map(width => ({
    name: `mobile-${width}`,
    use: { viewport: { width, height: 844 } },
  })),
});
