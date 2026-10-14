import { chromium, expect } from '@playwright/test';

const url = new URL(process.argv[2] ?? 'http://127.0.0.1:4175/');
const snapshots = process.argv.includes('--screenshots');
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' });
try {
  for (const [width, height] of [[1280, 900], [320, 568], [360, 800], [390, 844], [430, 932]]) {
    const page = await browser.newPage({ viewport: { width: width!, height: height! } });
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    const now = new Date('2026-10-14T00:00:00Z'); await page.clock.install({ time: now }); await page.clock.pauseAt(now);
    await page.goto(url.href);
    await expect(page.locator('[data-enter]')).toBeEnabled();
    await expect(page.getByRole('button', { name: /원작 플레이|축소 완결판 플레이/ })).toHaveCount(0);
    await page.locator('[data-enter]').click(); await expect(page.locator('#current-event')).toBeAttached();
    await page.evaluate(() => { localStorage.setItem('existence-sim:v1:run:demon-king', 'archived-run'); localStorage.setItem('existence-sim:v1:meta', 'archived-meta'); });
    const raw = () => page.evaluate(() => localStorage.getItem('existence-sim:v1:run:demon-king:compact'));
    expect(JSON.parse((await raw())!).age).toBe(0);
    const scene = async () => {
      await expect(page.locator('#current-event')).toBeAttached();
      if (await page.locator('[data-reading="true"]').count()) await page.locator('#reading-skip').click();
      await expect(page.locator('#choice-dialog')).toBeVisible(); await page.clock.runFor(400);
    };
    const choose = async (id: string) => {
      await scene(); await page.locator(`[data-choice="${id}"]`).click();
      await expect(page.locator('#choice-aftermath')).toBeVisible(); await page.clock.runFor(400);
      await page.locator('#reading-skip').click(); await expect(page.locator('#choice-aftermath')).toHaveCount(0);
    };
    for (const id of ['family_accept', 'trust_mina', 'attack']) await choose(id);
    await scene(); const previous = JSON.parse((await raw())!);
    await page.getByRole('button', { name: '잠시 내리기', exact: true }).click();
    await page.getByRole('button', { name: '저장 관리 · 엔딩 도감', exact: true }).click();
    const size = page.getByLabel('화면 전체 글자 크기'); await size.focus(); await size.press('End');
    await page.getByRole('button', { name: '닫기', exact: true }).click();
    await page.locator('.timeline-item[data-node-id="exam"]').click();
    await expect(page.locator('[data-resume-node]')).toHaveCount(4);
    expect(await page.locator('.menu-dialog').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    if (snapshots) await page.screenshot({ path: `docs/reselect-history-${width}.png`, animations: 'disabled' });
    await page.locator('[data-resume-node="exam"]').click(); await expect(page.locator('#choice-dialog')).toBeVisible();
    const restored = JSON.parse((await raw())!);
    expect(restored.age).toBe(20); expect(restored.history).toEqual(previous.history.slice(0, 2)); expect(restored.flags).not.toContain('attacked_mina');
    expect(restored.runId).not.toBe(previous.runId); expect(restored.rng.seed).toBe(previous.rng.seed);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (snapshots) await page.screenshot({ path: `docs/reselect-choices-${width}.png`, animations: 'disabled' });
    await choose('refuse'); expect(JSON.parse((await raw())!).currentNodeId).toBe('petition');
    const selected = await raw(); await page.reload(); await expect(page.locator('#current-event')).toBeAttached(); expect(await raw()).toBe(selected);
    await page.getByRole('button', { name: '저장 관리 · 엔딩 도감', exact: true }).click();
    await page.getByRole('button', { name: '지난 분기에서 이어하기', exact: true }).click();
    await page.getByRole('button', { name: '재선택 전 회차 복원', exact: true }).click(); await expect(page.locator('#choice-dialog')).toBeVisible();
    expect({ ...JSON.parse((await raw())!), runId: previous.runId }).toEqual(previous);
    const recovered = await raw(); const oldUrl = new URL(url); oldUrl.searchParams.set('edition', 'original');
    await page.goto(oldUrl.href); await expect(page.locator('#current-event')).toBeAttached(); expect(await raw()).toBe(recovered);
    expect(await page.evaluate(() => localStorage.getItem('existence-sim:v1:run:demon-king'))).toBe('archived-run');
    expect(await page.evaluate(() => localStorage.getItem('existence-sim:v1:meta'))).toBe('archived-meta');
    expect(errors).toEqual([]);
    console.log(`${width}×${height}: 기본 새 판/원작 버튼 제거/150% 글자/방문 분기 재선택/다른 선택/저장 복원/이전 회차 복귀/과거 저장 보호 통과 (${url.href})`);
    await page.close();
  }
} finally { await browser.close(); }
