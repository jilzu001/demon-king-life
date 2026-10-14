import { chromium, expect } from '@playwright/test';

const url = new URL(process.argv[2] ?? 'http://127.0.0.1:4175/'); url.searchParams.set('edition', 'compact');
const screenshots = process.argv.includes('--screenshots');
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' });
try {
  for (const [name, width, height] of [['desktop', 1280, 900], ['360', 360, 800], ['390', 390, 844], ['430', 430, 932], ['320', 320, 568]] as const) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    const time = new Date('2026-10-14T00:00:00Z'); await page.clock.install({ time }); await page.clock.pauseAt(time);
    await page.goto(url.href); await expect(page.locator('[data-enter]')).toBeEnabled(); await page.locator('[data-enter]').click();
    await expect(page.locator('#current-event')).toBeAttached();
    const saved = () => page.evaluate(() => localStorage.getItem('existence-sim:v1:run:demon-king:compact'));
    const originalSlot = () => page.evaluate(() => localStorage.getItem('existence-sim:v1:run:demon-king'));
    expect(JSON.parse((await saved())!).age).toBe(0); expect(await originalSlot()).toBeNull();
    const first = page.locator('#current-event .story-paragraph:visible');
    await expect(first).toHaveCount(1);
    const delay = await first.evaluate(el => Math.max(2500, Array.from(el.textContent ?? '').length * 170));
    await page.clock.runFor(delay - 1); await expect(first).toHaveCount(1); await page.clock.runFor(1); await expect(first).toHaveCount(2);
    await first.last().click(); await expect(first).toHaveCount(3); await page.clock.runFor(160); await expect(first).toHaveCount(3);
    const scene = async () => {
      await expect(page.locator('#current-event')).toBeAttached();
      if (await page.locator('[data-reading="true"]').count()) await page.locator('#reading-skip').click();
      await expect(page.locator('#choice-dialog')).toBeVisible(); await page.clock.runFor(400);
    };
    const select = async (id: string) => {
      await scene(); await page.locator(`[data-choice="${id}"]`).click(); await expect(page.locator('#choice-aftermath')).toBeVisible();
      await expect(page.locator('#current-event, #choice-dialog')).toHaveCount(0); await page.clock.runFor(400);
      await page.locator('#reading-skip').click(); await expect(page.locator('#choice-aftermath')).toHaveCount(0);
    };
    await select('family_accept'); await select('trust_mina'); await scene();
    const timelineTexts = await page.locator('.timeline-text').allTextContents(); expect(timelineTexts).toHaveLength(3);
    for (const text of timelineTexts) expect(text).not.toMatch(/[\n“”]/);
    expect(await page.locator('.timeline').evaluate(el => el.clientHeight)).toBeLessThanOrEqual(130);
    const recent = (await page.locator('.life-panel').boundingBox())!; const popup = (await page.locator('#choice-dialog').boundingBox())!;
    expect(popup.y).toBeGreaterThanOrEqual(recent.y + recent.height);
    if (screenshots) await page.screenshot({ path: `docs/compact-choices-${name}.png` });
    await page.getByRole('button', { name: '잠시 내리기', exact: true }).click();
    await page.locator('.chat-feed').evaluate(el => { el.scrollTop = 0; });
    await expect(page.locator('#current-event .dialogue-line')).toHaveCount(0);
    const spacing = await page.locator('#current-event .story-paragraph').first().evaluate(el => {
      const css = getComputedStyle(el); return parseFloat(css.marginBottom) / parseFloat(css.fontSize);
    }); expect(spacing).toBeCloseTo(1.15, 2);
    if (screenshots) await page.screenshot({ path: `docs/compact-prose-${name}.png` });
    await page.getByRole('button', { name: '저장 관리 · 엔딩 도감', exact: true }).click();
    const size = page.getByLabel('화면 전체 글자 크기'); await size.focus(); await size.press('End'); await expect(size).toHaveValue('150');
    await page.getByRole('button', { name: '닫기', exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.locator('.chat-feed').evaluate(el => el.clientHeight)).toBeGreaterThan(60);
    if (screenshots) await page.screenshot({ path: `docs/compact-large-text-${name}.png` });
    await page.getByRole('button', { name: '선택지 보기', exact: true }).click();
    await select('attack'); await select('escape_prison');
    await expect(page.locator('[data-ending-phase="0"]')).toBeVisible(); await expect(page.locator('.game-header')).toHaveCount(0);
    await page.getByRole('button', { name: '이어서', exact: true }).click();
    const state = JSON.parse((await saved())!);
    while (await page.locator('[data-ending-phase="1"]').count()) {
      const id = await page.locator('[data-memory-node]').getAttribute('data-memory-node');
      expect(state.history.map((h: { nodeId: string }) => h.nodeId)).toContain(id);
      await page.getByRole('button', { name: '이어서', exact: true }).click();
    }
    await expect(page.locator('[data-ending-phase="2"]')).toBeVisible(); await page.getByRole('button', { name: '이어서', exact: true }).click();
    await expect(page.locator('[data-ending-phase="3"] h1')).toHaveText('계단 열일곱 개의 마왕');
    const art = (await page.locator('.compact-art').boundingBox())!;
    expect(art.height).toBeGreaterThan(60); expect(art.height).toBeLessThanOrEqual(height * .28 + 1);
    await page.clock.runFor(180);
    if (screenshots) await page.screenshot({ path: `docs/compact-ending-${name}.png` });
    const before = await saved(); await page.reload(); await expect(page.locator('[data-ending-phase="3"]')).toBeVisible(); expect(await saved()).toBe(before);
    expect(await originalSlot()).toBeNull(); expect(errors).toEqual([]);
    console.log(`${name} ${width}×${height}: 자동/클릭·문단 간격·한 줄 연대기·후속 서술·큰 글자·실제 기록 회상·엔딩 복원·원작 슬롯 보호 통과 (${url.href})`);
    await page.close();
  }
} finally { await browser.close(); }
