import { test, expect } from '@playwright/test';

test('320·360·390·430·768·1280px에서 화면 너비에 따라 레이아웃이 바뀐다', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: '가장 싼 마왕', exact: true })).toBeVisible();
  for (const width of [320, 360, 390, 430, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const life = (await page.locator('.life-column').boundingBox())!;
    const scene = (await page.locator('.event-column').boundingBox())!;
    if (width <= 760) expect(scene.y).toBeGreaterThan(life.y + life.height - 1);
    else expect(scene.x).toBeGreaterThan(life.x + life.width);
    expect(scene.width).toBeLessThanOrEqual(width);
  }
});
