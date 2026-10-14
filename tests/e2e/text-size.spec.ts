import { test, expect, type Page } from '@playwright/test';
import { enterGame, lowerChoices, skipReading } from './helpers';

const runKey = 'existence-sim:v1:run:demon-king';
const sizeKey = 'demon-king:ui:text-percent';
async function saved(page: Page) { return page.evaluate(key => localStorage.getItem(key), runKey); }
test.beforeEach(async ({ page }) => {
  const time = new Date('2026-10-14T00:00:00Z');
  await page.clock.install({ time }); await page.clock.pauseAt(time);
});

test('현재 크기보다 작아지지 않으며 모든 글자를 키워도 작은 화면의 조작과 선택 팝업을 유지한다', async ({ page }, info) => {
  if (info.project.name !== 'PC') await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('./'); await enterGame(page); await skipReading(page); await lowerChoices(page);
  const before = await saved(page);
  await page.getByRole('button', { name: '저장 관리 · 엔딩 도감', exact: true }).click();
  const range = page.getByLabel('화면 전체 글자 크기');
  await expect(range).toHaveValue('100'); await expect(range).toHaveAttribute('min', '100');
  await expect(page.getByRole('button', { name: '작게', exact: true })).toBeDisabled();
  const selectors = ['.stats small', '.stats strong', '.life-panel h2', '.timeline-age', '.timeline-text', '.chronicle-message', '.chat-feed .body', '.speaker', '.dialogue-text', '.choice-title', '.choice-description', '.toolbar-buttons button', '.reading-status', '.save-indicator', '.menu-dialog h2', '.menu-dialog .subtle', '.display-settings label', '.text-size-preview', '.tools button'];
  const sizes = () => page.evaluate(selectors => selectors.map(selector => parseFloat(getComputedStyle(document.querySelector(selector)!).fontSize)), selectors);
  const baseline = await sizes();
  await range.focus(); await range.press('End'); await expect(range).toHaveValue('150');
  const enlarged = await sizes();
  for (let i = 0; i < baseline.length; i++) expect(enlarged[i]! / baseline[i]!, selectors[i]).toBeCloseTo(1.5, 2);
  await expect(page.getByRole('button', { name: '크게', exact: true })).toBeDisabled();
  expect(await page.locator('.menu-dialog').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.locator('.chat-feed').evaluate(el => el.clientHeight)).toBeGreaterThan(60);
  for (const selector of ['.player-portrait', '.npc-portrait']) {
    const box = (await page.locator(selector).boundingBox())!; expect(Math.abs(box.width - box.height)).toBeLessThan(1);
  }
  const footer = (await page.locator('.game-toolbar').boundingBox())!;
  expect(footer.y + footer.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  await page.getByRole('button', { name: '선택지 보기', exact: true }).click();
  const recent = (await page.locator('.life-panel').boundingBox())!;
  const popup = (await page.locator('#choice-dialog').boundingBox())!;
  expect(popup.y).toBeGreaterThanOrEqual(recent.y + recent.height);
  expect(await page.locator('#choice-dialog').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await expect(page.locator('[data-choice="attack"]')).toBeEnabled();
  expect(await saved(page)).toBe(before);
});

test('글자 크기는 새로고침과 타이틀에서도 유지되고 잘못된 화면 설정은 게임 저장을 바꾸지 않는다', async ({ page }) => {
  await page.goto('./'); await enterGame(page);
  const before = await saved(page);
  await page.getByRole('button', { name: '저장 관리 · 엔딩 도감', exact: true }).click();
  const range = page.getByLabel('화면 전체 글자 크기'); await range.focus(); await range.press('End');
  await page.reload(); await expect(page.locator('#current-event')).toBeAttached();
  await expect(page.locator('.chronicle-message').first()).toHaveCSS('font-size', '21px');
  expect(await saved(page)).toBe(before);
  await page.evaluate(() => sessionStorage.removeItem('demon-king:title-seen')); await page.reload();
  await expect(page.locator('.title-card h1')).toBeVisible();
  expect(await page.locator('.title-card h1').evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(45);
  await enterGame(page); expect(await saved(page)).toBe(before);
  await page.evaluate(key => localStorage.setItem(key, '60'), sizeKey); await page.reload();
  await expect(page.locator('#current-event')).toBeAttached();
  await expect(page.locator('.chronicle-message').first()).toHaveCSS('font-size', '14px');
  expect(await saved(page)).toBe(before);
});
