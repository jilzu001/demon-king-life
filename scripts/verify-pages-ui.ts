import { chromium, expect, type Page } from '@playwright/test';

const url = process.argv[2] ?? 'http://127.0.0.1:4175/';
const screenshots = process.argv.includes('--screenshots');
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' });
async function visibleLetters(page: Page) {
  return page.locator('.page-window').evaluate(viewport => {
    const box = viewport.getBoundingClientRect(); const visible: string[] = []; const all: string[] = [];
    for (const [p, el] of [...viewport.querySelectorAll('.story-paragraph')].entries()) {
      const text = el.firstChild!;
      for (let i = 0; i < text.textContent!.length; i++) {
        if (/\s/.test(text.textContent![i]!)) continue;
        const id = `${p}:${i}`; all.push(id);
        const range = document.createRange(); range.setStart(text, i); range.setEnd(text, i + 1);
        const r = range.getBoundingClientRect();
        if (r.left >= box.left - 1 && r.right <= box.right + 1 && r.top >= box.top - 1 && r.bottom <= box.bottom + 1) visible.push(id);
      }
    }
    return { visible, all };
  });
}
try {
  for (const [width, height] of [[1280, 900], [320, 568], [360, 800], [390, 844], [430, 932]]) {
    const page = await browser.newPage({ viewport: { width: width!, height: height! } });
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    const time = new Date('2026-10-14T00:00:00Z'); await page.clock.install({ time }); await page.clock.pauseAt(time);
    await page.goto(url); await expect(page.locator('[data-enter]')).toBeEnabled(); await page.locator('[data-enter]').click();
    const raw = () => page.evaluate(() => localStorage.getItem('existence-sim:v1:run:demon-king:compact'));
    const before = await raw();
    await page.locator('#reading-mode').click(); await expect(page.locator('#reading-mode')).toHaveText('스크롤 방식');
    const first = await page.locator('.page-window').getAttribute('data-page-index'); await page.clock.runFor(60000);
    expect(await page.locator('.page-window').getAttribute('data-page-index')).toBe(first);
    await expect(page.locator('#current-event .story-paragraph[hidden]')).toHaveCount(0);
    await page.getByRole('button', { name: '저장 관리 · 엔딩 도감', exact: true }).click();
    const size = page.getByLabel('화면 전체 글자 크기'); await size.focus(); await size.press('End');
    await page.getByRole('button', { name: '닫기', exact: true }).click();
    const count = Number(await page.locator('.page-window').getAttribute('data-page-count'));
    if (screenshots) await page.screenshot({ path: `docs/pages-first-${width}.png`, animations: 'disabled' });
    const seen = new Set<string>(); let all: string[] = [];
    for (let index = 0; index < count; index++) {
      const letters = await visibleLetters(page); all = letters.all;
      for (const id of letters.visible) { expect(seen.has(id)).toBe(false); seen.add(id); }
      expect(await page.locator('.chat-feed').evaluate(el => el.scrollTop)).toBe(0);
      if (index + 1 < count) await page.getByRole('button', { name: '다음 페이지', exact: true }).click();
    }
    expect([...seen].sort()).toEqual(all.sort()); expect(await raw()).toBe(before);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (count > 1) { await page.getByRole('button', { name: '이전 페이지', exact: true }).click(); await page.getByRole('button', { name: '다음 페이지', exact: true }).click(); }
    await page.getByRole('button', { name: '선택지', exact: true }).click();
    await page.locator('[data-choice="family_accept"]').click(); await page.clock.runFor(400);
    await expect(page.locator('#choice-aftermath .page-window')).toBeVisible();
    if (screenshots) await page.screenshot({ path: `docs/pages-aftermath-${width}.png`, animations: 'disabled' });
    const resultState = await raw(); await page.clock.runFor(60000); await expect(page.locator('#choice-aftermath')).toBeVisible(); expect(await raw()).toBe(resultState);
    await page.locator('#reading-skip').click(); await expect(page.locator('#current-event')).toBeAttached();
    await page.locator('#reading-skip').click(); await page.locator('[data-choice="trust_mina"]').click(); await page.clock.runFor(400); await page.locator('#reading-skip').click();
    await expect(page.locator('.page-window')).toHaveAttribute('data-page-index', '0');
    await expect(page.locator('#npc-image')).toHaveCount(0); await expect(page.locator('.header-history')).toBeVisible();
    if (screenshots) await page.screenshot({ path: `docs/pages-exam-${width}.png`, animations: 'disabled' });
    const saved = await raw(); await page.reload(); await expect(page.locator('#reading-mode')).toHaveText('스크롤 방식'); expect(await raw()).toBe(saved);
    await page.locator('#reading-mode').click(); await expect(page.locator('.page-window')).toHaveCount(0); await expect(page.locator('#reading-mode')).toHaveText('페이지 방식');
    expect(await raw()).toBe(saved); expect(errors).toEqual([]);
    console.log(`${width}×${height}: 페이지 즉시 표시/자동 넘김·스크롤 없음/150% 글자 전체 노출/이전·다음/선택·후속 서술/인물/설정 복원/스크롤 전환·세이브 보호 통과 (${url})`);
    await page.close();
  }
} finally { await browser.close(); }
