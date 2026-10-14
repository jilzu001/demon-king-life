import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173/phase1-test/',
    channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'PC', testMatch: /compact\.spec\.ts/, use: { viewport: { width: 1280, height: 900 } } },
    { name: '모바일-320', testMatch: /compact\.spec\.ts/, use: { viewport: { width: 320, height: 800 }, isMobile: true, hasTouch: true } },
    { name: '보관된-원작-PC', testIgnore: /compact\.spec\.ts/, use: { baseURL: 'http://127.0.0.1:4174/phase1-test/', viewport: { width: 1280, height: 900 } } },
    { name: '보관된-원작-모바일', testIgnore: /compact\.spec\.ts/, use: { baseURL: 'http://127.0.0.1:4174/phase1-test/', viewport: { width: 320, height: 800 }, isMobile: true, hasTouch: true } },
  ],
  webServer: [{
    command: 'npm run dev -- --port 4173 --strictPort --base /phase1-test/',
    url: 'http://127.0.0.1:4173/phase1-test/',
    reuseExistingServer: false,
  }, {
    command: 'npm run dev -- --port 4174 --strictPort --base /phase1-test/ --mode archived-ui',
    url: 'http://127.0.0.1:4174/phase1-test/', reuseExistingServer: false,
  }],
});
