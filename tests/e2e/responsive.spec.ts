import { test, expect } from '@playwright/test';
import { enterGame, skipReading } from './helpers';

test('320·360·390·430·768·1280px에서 화면 너비에 따라 레이아웃이 바뀐다', async ({ page }) => {
  await page.goto('./');
  await enterGame(page); await skipReading(page);
  for (const width of [320, 360, 390, 430, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const life = (await page.locator('.life-column').boundingBox())!;
    const scene = (await page.locator('.event-column').boundingBox())!;
    expect(scene.y).toBeGreaterThan(life.y + life.height - 1);
    expect(scene.width).toBeLessThanOrEqual(width);
    const popup = (await page.locator('#choice-dialog').boundingBox())!;
    expect(popup.y).toBeGreaterThanOrEqual(life.y + life.height);
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
  }
});
