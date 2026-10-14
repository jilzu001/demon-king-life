import { chromium, expect } from '@playwright/test';

const url = process.argv[2] ?? 'http://127.0.0.1:4180/';
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' });
try {
  for (const [name, width, height] of [['desktop', 1280, 900], ['mobile', 390, 844], ['small', 320, 568]] as const) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
    const page = await context.newPage(); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(url);
    await expect(page.getByRole('heading', { name: '가짜 마왕의 일생', exact: true })).toBeVisible();
    await page.screenshot({ path: `docs/chat-title-${name}.png` });
    await page.locator('[data-enter]').click();
    await expect(page.locator('#current-event')).toBeAttached();
    await expect(page.getByRole('heading', { name: '가짜 마왕의 일생', exact: true })).toHaveCount(0);
    await expect(page.locator('#npc-image')).toHaveAttribute('src', /background-v1\.webp/);
    await page.screenshot({ path: `docs/chat-reading-${name}.png` });
    await page.getByRole('button', { name: '스킵 · 바로 선택하기', exact: true }).click();
    await expect(page.locator('#choice-dialog')).toBeVisible();
    const recent = (await page.locator('.life-panel').boundingBox())!;
    const popup = (await page.locator('#choice-dialog').boundingBox())!;
    expect(popup.y).toBeGreaterThanOrEqual(recent.y + recent.height);
    await page.screenshot({ path: `docs/chat-choice-${name}.png` });
    await page.getByRole('button', { name: '잠시 내리기', exact: true }).click();
    await expect(page.locator('#choice-dialog')).toBeHidden();
    await expect(page.getByRole('button', { name: '선택지 보기', exact: true })).toBeVisible();
    await expect(page.locator('#current-event .dialogue-line')).toHaveCount(4);
    await page.getByRole('button', { name: '선택지 보기', exact: true }).click();
    await page.locator('[data-choice="attack"]').click();
    await page.getByRole('button', { name: '스킵 · 바로 선택하기', exact: true }).click();
    await expect(page.locator('[data-choice="apologize"]')).toBeEnabled();
    await page.getByRole('button', { name: '잠시 내리기', exact: true }).click();
    const before = await page.evaluate(() => localStorage.getItem('existence-sim:v1:run:demon-king'));
    await page.getByRole('button', { name: '↑ 이전 사건 불러오기', exact: true }).click();
    await expect(page.locator('.past-chat')).toHaveCount(1);
    expect(await page.evaluate(() => localStorage.getItem('existence-sim:v1:run:demon-king'))).toBe(before);
    await page.reload(); await expect(page.locator('.title-card')).toHaveCount(0);
    await expect(page.locator('#current-event')).toBeAttached();
    expect(await page.evaluate(() => localStorage.getItem('existence-sim:v1:run:demon-king'))).toBe(before);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight)).toBe(true);
    expect(errors).toEqual([]);
    console.log(`${name}: 타이틀·HUD·최근 연대기·하단 선택 팝업·내리기/복원·이전 사건·저장 보호 통과 (${url})`);
    await context.close();
  }
} finally { await browser.close(); }
