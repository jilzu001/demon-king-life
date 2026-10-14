import { chromium, expect } from '@playwright/test';

const url = process.argv[2] ?? 'http://127.0.0.1:4175/';
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' });
try {
  for (const [name, width, height] of [['desktop', 1280, 900], ['mobile', 320, 800]] as const) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
    const page = await context.newPage(); const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url);
    await expect(page.getByRole('heading', { name: '가장 싼 마왕', exact: true })).toBeVisible();
    await page.getByRole('button', { name: '스킵 · 바로 선택하기', exact: true }).click();
    await expect(page.locator('.dialogue-line')).toHaveCount(4);
    await page.screenshot({ path: `docs/v11-initial-${name}.png`, fullPage: true });
    for (const id of ['attack', 'apologize', 'plead_guilty']) {
      const skip = page.getByRole('button', { name: '스킵 · 바로 선택하기', exact: true });
      if (await skip.isVisible()) await skip.click();
      const choice = page.locator(`[data-choice="${id}"]`); await expect(choice).toBeEnabled(); await choice.click();
    }
    const state = await page.evaluate(() => JSON.parse(localStorage.getItem('existence-sim:v1:run:demon-king')!));
    expect(state.storyVersion).toBe('1.1.0'); expect(state.history).toHaveLength(3);
    expect(state.player.crimes).toEqual(['attempted_murder_convicted']);
    await page.reload(); await expect(page.getByRole('heading', { name: '재범 방지 교육', exact: true })).toBeVisible();
    await page.getByRole('button', { name: '스킵 · 바로 선택하기', exact: true }).click();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('existence-sim:v1:run:demon-king')!))).toEqual(state);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
    await page.screenshot({ path: `docs/v11-progress-${name}.png`, fullPage: true });
    console.log(`${name}: 실제 빌드 JSON·대사·3회 진행·저장 복원·가로 넘침 확인 통과 (${url})`);
    await context.close();
  }
} finally { await browser.close(); }
