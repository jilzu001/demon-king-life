import { chromium, expect } from '@playwright/test';
const url = process.argv[2] ?? 'http://127.0.0.1:4175/';
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' });
try {
  for (const [name, width, height] of [['PC', 1280, 900], ['mobile', 320, 800]] as const) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => localStorage.setItem('demon-king:ui:text-percent', '150'));
    const time = new Date('2026-10-14T00:00:00Z'); await page.clock.install({ time }); await page.clock.pauseAt(time);
    const raw = () => page.evaluate(() => JSON.parse(localStorage.getItem('existence-sim:v1:run:demon-king:compact')!));
    await page.goto(url); await expect(page.locator('[data-enter]')).toBeEnabled(); await page.locator('[data-enter]').click();
    const scene = async () => {
      await expect(page.locator('#current-event')).toBeAttached(); await page.locator('#reading-skip').click();
      await expect(page.locator('#choice-dialog')).toBeVisible(); await page.clock.runFor(400);
    };
    const select = async (id: string) => {
      await scene(); await page.locator(`[data-choice="${id}"]`).click();
      await expect(page.locator('#choice-aftermath')).toBeVisible(); await page.clock.runFor(400);
      await page.locator('#reading-skip').click(); await expect(page.locator('#current-event')).toBeAttached();
    };
    await select('family_accept'); await select('trust_mina'); await scene();
    expect((await raw()).age).toBe(20);
    await expect(page.locator('[data-choice]')).toHaveCount(4);
    await expect(page.locator('[data-choice="confess"] .choice-title')).toHaveText('미나에게 사랑한다고 고백한다.');
    await page.locator('[data-choice="confess"]').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `docs/v37-review/public-confession-choice-${name}.png`, animations: 'disabled' });
    await page.locator('[data-choice="confess"]').click();
    await expect(page.locator('#choice-aftermath')).toBeVisible();
    const state = await raw(); expect(state.currentNodeId).toBe('confession'); expect(state.history.at(-1).choiceId).toBe('confess');
    await page.clock.runFor(400); await page.locator('#reading-skip').click();
    await expect(page.locator('#current-event')).toBeAttached();
    for (let i = 0; i < 3; i++) await page.locator('#current-event .story-paragraph:visible').last().click();
    await expect(page.locator('#npc-image')).toHaveAttribute('data-actor', 'mina');
    expect(await page.locator('#npc-image').getAttribute('src')).toBe(await page.locator('.story-illustration img').getAttribute('src'));
    await page.screenshot({ path: `docs/v37-review/public-confession-speaker-${name}.png`, animations: 'disabled' });
    expect(errors).toEqual([]);
    console.log(`${name} ${width}×${height}: 실제 시작→20세시험·네 선택/고백 원문·고백 클릭/원장·후속 대사/동일 미나 초상화 통과 (${url})`);
    await page.close();
  }
} finally { await browser.close(); }
