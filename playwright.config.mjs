import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  globalSetup: './tests/setup.mjs',
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  use: {
    browserName: 'chromium',
    trace: 'retain-on-failure',
  },
});
