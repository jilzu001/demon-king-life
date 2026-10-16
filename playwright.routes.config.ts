import { defineConfig } from '@playwright/test';

// 같은 현재 판 실제 플레이 검사를 로컬 빌드/공개 배포 URL에 실행한다.
if (!process.env.ROUTES_BASE_URL) throw new Error('ROUTES_BASE_URL에 검증할 게임 주소가 필요합니다.');
export default defineConfig({
  testDir: 'tests/e2e', testMatch: process.env.ROUTES_TREE_ONLY ? /tree-compact\.spec\.ts/ : /(?:freedom-compact|tree-compact)\.spec\.ts/,
  workers: 1, retries: 0, reporter: 'list',
  use: { baseURL: process.env.ROUTES_BASE_URL, channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', trace: 'retain-on-failure' },
  projects: [
    { name: '공개-PC', use: { viewport: { width: 1280, height: 900 } } },
    { name: '공개-모바일-320', use: { viewport: { width: 320, height: 800 }, isMobile: true, hasTouch: true } },
  ],
});
