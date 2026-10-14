import { chromium, expect } from '@playwright/test';
import { enterGame } from '../tests/e2e/helpers';

const url = process.argv[2] ?? 'http://127.0.0.1:4175/';
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' });
try {
  for (const [name, width, height] of [['desktop', 1280, 900], ['mobile', 390, 844]] as const) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
    const page = await context.newPage(); const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const time = new Date('2026-10-14T00:00:00Z');
    await page.clock.install({ time }); await page.clock.pauseAt(time);
    await page.goto(url); await enterGame(page);
    await expect(page.locator('#current-event')).toBeAttached();
    const before = await page.evaluate(() => localStorage.getItem('existence-sim:v1:run:demon-king'));
    await expect(page.locator('#current-event .chronicle-message:visible')).toHaveCount(1);
    await expect(page.locator('.choices')).toBeHidden();
    const delay = async () => page.locator('#current-event .chronicle-message:visible').last().evaluate(el => Math.max(2500, Array.from(el.textContent ?? '').length * 170));
    await page.clock.runFor(await delay());
    await expect(page.locator('#current-event .chronicle-message:visible')).toHaveCount(2);
    await page.locator('#current-event .chronicle-message:visible').last().click();
    await expect(page.locator('#current-event .chronicle-message:visible')).toHaveCount(3);
    const nextDelay = await delay();
    await page.clock.runFor(nextDelay - 1); await expect(page.locator('#current-event .chronicle-message:visible')).toHaveCount(3);
    await page.clock.runFor(1); await expect(page.locator('#current-event .chronicle-message:visible')).toHaveCount(4);
    await expect(page.locator('.portrait figcaption')).toHaveCount(0);
    await expect(page.locator('.choices')).toBeHidden();
    await page.screenshot({ path: `docs/reading-${name}.png`, fullPage: true });
    await page.getByRole('button', { name: '스킵 · 바로 선택하기', exact: true }).click();
    await expect(page.locator('.dialogue-line:visible')).toHaveCount(4);
    await expect(page.locator('[data-choice="attack"]')).toBeEnabled();
    expect(await page.evaluate(() => localStorage.getItem('existence-sim:v1:run:demon-king'))).toBe(before);
    await page.locator('[data-choice="attack"]').click();
    await expect(page.locator('.life-panel')).toBeFocused();
    await expect(page.locator('.choices')).toBeHidden();
    await page.getByRole('button', { name: '스킵 · 바로 선택하기', exact: true }).click();
    await page.clock.runFor(400);
    await page.locator('[data-choice="second_attack"]').click();
    await page.getByRole('button', { name: '스킵 · 바로 선택하기', exact: true }).click();
    await page.clock.runFor(400);
    const ended = await page.evaluate(() => localStorage.getItem('existence-sim:v1:run:demon-king'));
    expect(JSON.parse(ended!).endingId).toBe('end_blade');
    await page.reload(); await expect(page.locator('#current-event')).toBeAttached();
    await page.getByRole('button', { name: '스킵 · 바로 선택하기', exact: true }).click();
    expect(await page.evaluate(() => localStorage.getItem('existence-sim:v1:run:demon-king'))).toBe(ended);
    await expect(page.locator('[data-choice]')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
    console.log(`${name}: 천천히 자동 한 줄·클릭당 다음 한 줄·자동 진행 재개·스킵·원장 보호·다음 장면·엔딩 복원 통과 (${url})`);
    await context.close();
  }
} finally { await browser.close(); }
