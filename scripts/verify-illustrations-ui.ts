import { chromium, expect, type Page } from '@playwright/test';
import { readExampleStory } from './read-story';
import { createRun, choose } from '../src/engine/transition';
import { compactProgressKey } from '../src/ui/compact-progress';

const url = process.argv[2] ?? 'http://127.0.0.1:4175/';
const screenshots = process.argv.includes('--screenshots');
const deviceScaleFactor = process.argv.includes('--high-dpi') ? 2 : 1;
const story = await readExampleStory('demon-king-compact');
const shared = ['family_accept', 'trust_mina'];
const cases = [
  { id: 'birth', path: [], asset: 'village' },
  { id: 'child', path: ['family_accept'], asset: 'mina' },
  { id: 'exam', path: shared, asset: 'mina' },
  { id: 'prison', path: [...shared, 'attack'], asset: 'prison' },
  { id: 'hearing', path: [...shared, 'attack', 'forgive', 'ally', 'public_audit'], asset: 'mina' },
  { id: 'audit', path: [...shared, 'attack', 'forgive', 'ally'], asset: null },
  { id: 'confession', path: [...shared, 'confess'], asset: 'mina' },
  { id: 'confession_afterm', path: [...shared, 'confess', 'confess_sincere'], asset: 'mina' },
  { id: 'confession_chaos', path: [...shared, 'confess', 'confess_absurd'], asset: 'mina' },
  { id: 'ending_peace', path: [...shared, 'attack', 'forgive', 'ally', 'public_audit', 'walk_away', 'end_peace'], asset: 'protagonist' },
  { id: 'ending_throne', path: [...shared, 'invoice', 'threaten_king'], asset: 'king' },
  { id: 'ending_love_scandal', path: [...shared, 'confess', 'confess_absurd', 'embrace_fame'], asset: null },
];

async function checkPageText(page: Page, label: string, screenshotPath?: string) {
  const seen = new Set<string>(); let all: string[] = []; let sawIllustration = false;
  const count = Number(await page.locator('.page-window').getAttribute('data-page-count'));
  for (let i = 0; i < count; i++) {
    const result = await page.locator('.page-window').evaluate(viewport => {
      const box = viewport.getBoundingClientRect(); const visible: string[] = []; const all: string[] = [];
      for (const [p, el] of [...viewport.querySelectorAll('.story-paragraph')].entries()) {
        const text = el.firstChild!;
        for (let n = 0; n < text.textContent!.length; n++) {
          if (/\s/.test(text.textContent![n]!)) continue;
          const id = `${p}:${n}`; all.push(id);
          const range = document.createRange(); range.setStart(text, n); range.setEnd(text, n + 1);
          const r = range.getBoundingClientRect();
          if (r.left >= box.left - 1 && r.right <= box.right + 1 && r.top >= box.top - 1 && r.bottom <= box.bottom + 1) visible.push(id);
        }
      }
      const image = viewport.querySelector('.story-illustration img'); const r = image?.getBoundingClientRect();
      return { visible, all, imageVisible: !!r && r.left >= box.left - 1 && r.right <= box.right + 1 && r.top >= box.top - 1 && r.bottom <= box.bottom + 1 };
    });
    all = result.all;
    for (const id of result.visible) { expect(seen.has(id)).toBe(false); seen.add(id); }
    if (result.imageVisible) {
      sawIllustration = true;
      await expect.poll(() => page.locator('.story-illustration img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
      if (screenshotPath) await page.screenshot({ path: screenshotPath, animations: 'disabled' });
    }
    expect(await page.locator('.chat-feed').evaluate(el => el.scrollTop)).toBe(0);
    if (i + 1 < count) await page.getByRole('button', { name: '다음 페이지', exact: true }).click();
  }
  if (seen.size !== all.length) {
    console.log(label, await page.locator('.page-window').evaluate(el => ({ height: el.clientHeight, width: el.clientWidth, count: el.dataset.pageCount, index: el.dataset.pageIndex, text: getComputedStyle(el.querySelector('.story-paragraph')!).lineHeight, columns: el.querySelector('.page-pages')!.scrollWidth })));
    await page.screenshot({ path: 'docs/illustrated-layout-failure.png' });
  }
  expect(seen.size, label).toBe(all.length);
  if (await page.locator('.story-illustration').count()) expect(sawIllustration).toBe(true);
}

const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' });
try {
  const sizes = [[1280, 900], [320, 568], [360, 800], [390, 844], [430, 932]];
  for (const [width, height] of sizes) {
    for (const mode of ['scroll', 'page']) for (const item of cases) {
      let state = createRun(story, 17, `illustration-${item.id}`);
      for (const id of item.path) state = choose(story, state, state.currentNodeId!, id).nextState;
      const saved = JSON.stringify(state);
      const page = await browser.newPage({ viewport: { width: width!, height: height! }, deviceScaleFactor });
      const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(({ saved, progressKey, count, mode }) => {
        localStorage.setItem('existence-sim:v1:run:demon-king:compact', saved);
        localStorage.setItem(progressKey, JSON.stringify({ handledHistory: count, phase: 0, memoryIndex: 0 }));
        localStorage.setItem('demon-king:ui:text-percent', '150');
        localStorage.setItem('demon-king:ui:reading-mode', mode);
        sessionStorage.setItem('demon-king:title-seen:compact', '1');
      }, { saved, progressKey: compactProgressKey(state), count: state.history.length, mode });
      const time = new Date('2026-10-14T00:00:00Z'); await page.clock.install({ time }); await page.clock.pauseAt(time);
      await page.goto(url);
      if (!state.ended) {
        await expect(page.locator('#current-event')).toBeAttached();
        if (mode === 'page') await checkPageText(page, `${width}×${height} ${item.id}`,
          screenshots && ['child', 'exam', 'confession'].includes(item.id) && [1280, 390, 320].includes(width!) ? `docs/compact-controls/page-${item.id}-${width}-dpr${deviceScaleFactor}.png` : undefined);
        await page.locator('#reading-skip').click(); await expect(page.locator('#choice-dialog')).toBeVisible();
        await page.getByRole('button', { name: '잠시 내리기', exact: true }).click();
        await expect(page.locator('#npc-image, .life-panel h2, .life-panel button')).toHaveCount(0);
        await expect(page.locator('.header-history')).toBeVisible(); await expect(page.locator('.timeline-item')).toHaveCount(1);
        expect(await page.locator('.timeline-text').evaluate(el => el.clientHeight <= parseFloat(getComputedStyle(el).lineHeight) + 1)).toBe(true);
        expect(await page.locator('.stats > div').evaluateAll(cells => cells.every(cell => {
          const a = cell.querySelector('small')!.getBoundingClientRect(); const b = cell.querySelector('strong')!.getBoundingClientRect();
          return Math.abs(a.y + a.height / 2 - b.y - b.height / 2) < 1 && cell.scrollWidth <= cell.clientWidth;
        }))).toBe(true);
      } else await expect(page.locator('[data-ending-phase="0"]')).toBeVisible();
      const figures = page.locator('.story-illustration');
      await expect(figures).toHaveCount(item.asset ? 1 : 0);
      if (item.asset) {
        await expect(figures).toHaveAttribute('data-asset-id', item.asset);
        if (mode === 'scroll' || state.ended) await figures.scrollIntoViewIfNeeded();
        const image = figures.locator('img');
        if (mode === 'scroll' || state.ended) await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
        const bounds = await image.evaluate((img: HTMLImageElement) => {
          const r = img.getBoundingClientRect();
          return { width: r.width, height: r.height, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight, ratio: Number(img.getAttribute('width')) / Number(img.getAttribute('height')), fit: getComputedStyle(img).objectFit };
        });
        expect(bounds.width).toBeLessThanOrEqual(Math.min(width! - 20, width! <= 760 ? 480 : 680) + 1);
        expect(bounds.height).toBeLessThanOrEqual((width! <= 760 ? 240 : 360) + 1);
        expect(bounds.width).toBeLessThanOrEqual(bounds.naturalWidth + .5);
        expect(bounds.height).toBeLessThanOrEqual(bounds.naturalHeight + .5);
        expect(bounds.width / bounds.height).toBeCloseTo(bounds.ratio, 2); expect(bounds.fit).toBe('contain');
      }
      await expect(page.locator('.timeline img, .choice-card img')).toHaveCount(0);
      expect(await page.evaluate(() => visualViewport?.scale ?? 1)).toBe(1);
      expect(await page.evaluate(() => devicePixelRatio)).toBe(deviceScaleFactor);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight + 1)).toBe(true);
      expect(await page.evaluate(() => localStorage.getItem('existence-sim:v1:run:demon-king:compact'))).toBe(saved);
      if (screenshots && mode === 'scroll' && ['child', 'exam', 'confession'].includes(item.id) && [1280, 390, 320].includes(width!)) {
        await page.screenshot({ path: `docs/compact-controls/${mode}-${item.id}-${width}-dpr${deviceScaleFactor}.png`, animations: 'disabled' });
      }
      expect(errors).toEqual([]); await page.close();
    }
    console.log(`${width}×${height}/DPR${deviceScaleFactor}: 스크롤/페이지·150% 글자·상단 기록/능력치 한 줄/최근 연대기 한 줄·본문 크기 상한·글자 전체 노출·선택 팝업·저장 원장 보호 통과 (${url})`);
  }
} finally { await browser.close(); }
