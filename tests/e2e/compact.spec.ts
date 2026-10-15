import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import type { GameState } from '../../src/engine/types';
import { narrativeLines } from '../../src/ui/narrative';
const galleryCatalog = JSON.parse(readFileSync('spec/content-v4.4-ending-gallery/content/ending_gallery_v4_4.json', 'utf8')) as {
  endings: { id: string; title: string; description: string; fullText: string; kind: string }[];
};
const galleryArt = JSON.parse(readFileSync('spec/content-v4.4-ending-gallery/assets/ending_art_manifest_v4_4.json', 'utf8')).artByEndingId as Record<string, string>;
const galleryEndingIds = galleryCatalog.endings.map(entry => entry.id);
const endingGalleryEntries = () => galleryCatalog.endings;
const endingArtworkPath = (id: string) => galleryArt[id];
const fixtures = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'scripts/v37-ui-fixtures.ts'], { encoding: 'utf8' }));
const v38 = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'scripts/v38-choice-fixtures.ts'], { encoding: 'utf8' })) as {
  id: string; state: GameState; choices: { id: string; text: string; description: string; next: GameState; narrative: string }[];
}[];
const COMPACT_V37_BACKUP_KEY = 'existence-sim:v1:backup:before-v3.7:demon-king:compact';

const key = 'existence-sim:v1:run:demon-king:compact';
const metaKey = 'existence-sim:v1:meta:demon-king:compact';
const chapter = JSON.parse(readFileSync('public/stories/demon-king-compact/chapters/01_complete.json', 'utf8'));
async function raw(page: Page) { return page.evaluate(key => localStorage.getItem(key), key); }
async function start(page: Page) {
  await page.goto('./?edition=compact');
  if (await page.evaluate(() => sessionStorage.getItem('demon-king:title-seen:compact') !== '1')) {
    await expect(page.locator('[data-enter]')).toBeEnabled(); await page.locator('[data-enter]').click();
  }
  await expect(page.locator('#current-event')).toBeAttached();
}
async function scene(page: Page) {
  await expect(page.locator('#current-event')).toBeAttached();
  if (await page.locator('[data-reading="true"]').count()) await page.locator('#reading-skip').click();
  await expect(page.locator('#choice-dialog')).toBeVisible(); await page.clock.runFor(400);
}
async function select(page: Page, id: string) {
  await scene(page); await expect(page.locator(`[data-choice="${id}"]`)).toBeEnabled(); await page.locator(`[data-choice="${id}"]`).click();
  await expect(page.locator('#choice-aftermath')).toBeVisible();
  await expect(page.locator('#current-event')).toHaveCount(0); await page.clock.runFor(400);
  await page.locator('#reading-skip').click(); await expect(page.locator('#choice-aftermath')).toHaveCount(0);
}
test.beforeEach(async ({ page }) => {
  const time = new Date('2026-10-14T00:00:00Z'); await page.clock.install({ time }); await page.clock.pauseAt(time);
});

test('v4.4 도감20개는 잠김 내용을 숨기고 획득 상세/동일 WebP/닫기/저장 기록을 보호한다', async ({ page }) => {
  test.setTimeout(90000);
  await page.addInitScript(() => localStorage.setItem('demon-king:ui:text-percent', '150'));
  await start(page); const saved = await raw(page);
  const artRequests: string[] = [];
  const paths = galleryEndingIds.map(id => endingArtworkPath(id)!);
  page.on('request', request => { if (paths.some(path => new URL(request.url()).pathname.endsWith(`/${path}`))) artRequests.push(request.url()); });
  await page.getByRole('button', { name: '저장 관리 · 엔딩 도감', exact: true }).click();
  await expect(page.locator('.ending-gallery-list li')).toHaveCount(20);
  await expect(page.locator('.ending-gallery')).toContainText('발견한 엔딩 0 / 20');
  await expect(page.locator('[data-ending-detail], .ending-detail, .menu-dialog img')).toHaveCount(0);
  expect(artRequests).toEqual([]); expect(await raw(page)).toBe(saved);
  // 상세 렌더링 전수 검수용 영구 도감 픽스처. 실제 도달/해금 테스트와 구분한다.
  const meta = JSON.stringify({ saveSchemaVersion: 1, discoveredEndings: { 'demon-king': galleryEndingIds } });
  await page.evaluate(({ metaKey, meta }) => localStorage.setItem(metaKey, meta), { metaKey, meta });
  await page.reload(); await expect(page.locator('#current-event')).toBeAttached();
  await page.getByRole('button', { name: '저장 관리 · 엔딩 도감', exact: true }).click();
  for (const entry of endingGalleryEntries()) {
    await page.locator(`[data-ending-detail="${entry.id}"]`).click();
    await expect(page.locator('.ending-detail')).toHaveAttribute('data-ending-detail-id', entry.id);
    await expect(page.locator('.ending-description')).toHaveText(entry.description);
    const currentBody = JSON.parse(readFileSync('public/stories/demon-king-compact/endings.json', 'utf8')).endings.find((e: { id: string }) => e.id === entry.id)?.body ?? entry.fullText;
    await expect(page.locator('.ending-full-text p')).toHaveText(narrativeLines(currentBody));
    const image = page.locator('.ending-detail .ending-art img');
    await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    const bounds = await image.evaluate((img: HTMLImageElement) => {
      const r = img.getBoundingClientRect(); return { width: r.width, height: r.height, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight, fit: getComputedStyle(img).objectFit, source: img.currentSrc };
    });
    expect(bounds.source.endsWith(`/${endingArtworkPath(entry.id)}`)).toBe(true);
    expect(bounds.width).toBeLessThanOrEqual(bounds.naturalWidth + 1); expect(bounds.height).toBeLessThanOrEqual(Math.min(360, bounds.naturalHeight) + 1);
    expect(bounds.width / bounds.height).toBeCloseTo(bounds.naturalWidth / bounds.naturalHeight, 2); expect(bounds.fit).toBe('contain');
    await expect(page.locator('.ending-detail svg')).toHaveCount(0);
    expect(await page.locator('.menu-dialog').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    if (['ending_peace', 'ending_love_scandal', 'ending_mina_wedding', 'ending_king', 'ending_true_demon'].includes(entry.id)) await page.screenshot({ path: `docs/v4.4/gallery-${entry.id}-${test.info().project.name}.png`, animations: 'disabled' });
    await page.getByRole('button', { name: '닫기', exact: true }).click();
    await expect(page.locator('.ending-detail')).toHaveCount(0); await expect(page.locator('.ending-gallery-list li')).toHaveCount(20);
    await expect(page.locator(`[data-ending-detail="${entry.id}"]`)).toBeFocused();
    expect(await raw(page)).toBe(saved);
    expect(await page.evaluate(key => localStorage.getItem(key), metaKey)).toBe(meta);
  }
});

test('v4.4 엔딩 그림404는 글만 표시하고 SVG로 대체하지 않으며 획득 기록을 유지한다', async ({ page }) => {
  await start(page); const saved = await raw(page);
  const meta = JSON.stringify({ saveSchemaVersion: 1, discoveredEndings: { 'demon-king': ['ending_peace'] } });
  await page.evaluate(({ key, meta }) => localStorage.setItem(key, meta), { key: metaKey, meta });
  await page.route('**/assets/illustrations/events/final_sunset.webp', route => route.fulfill({ status: 404, body: '' }));
  await page.reload(); await expect(page.locator('#current-event')).toBeAttached();
  await page.getByRole('button', { name: '저장 관리 · 엔딩 도감', exact: true }).click(); await page.locator('[data-ending-detail="ending_peace"]').click();
  await expect(page.locator('.ending-art-fallback')).toBeVisible(); await expect(page.locator('.ending-detail img, .ending-detail svg')).toHaveCount(0);
  await expect(page.locator('.ending-full-text p')).not.toHaveCount(0);
  expect(await raw(page)).toBe(saved); expect(await page.evaluate(key => localStorage.getItem(key), metaKey)).toBe(meta);
  await page.getByRole('button', { name: '닫기', exact: true }).click(); await expect(page.locator('[data-ending-detail="ending_peace"]')).toBeVisible();
});

for (const event of v38) test(`v3.8 ${event.id}: 모든 선택의 표시·결과·저장·다음 진행`, async ({ page }) => {
  test.setTimeout(60000);
  const changed = ['birth', 'child', 'quiet', 'final_trial', 'office'].includes(event.id);
  const newIds = ['family_appeal', 'family_invoice', 'mina_contract', 'mina_rival', 'peace_open', 'reform_read', 'office_close'];
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('./');
  for (const mode of changed ? ['scroll', 'page'] : ['scroll']) for (const selected of event.choices) {
    await page.evaluate(({ key, state, mode }) => {
      localStorage.setItem(key, JSON.stringify(state));
      localStorage.setItem(`demon-king:compact-view:${state.runId}`, JSON.stringify({ handledHistory: state.history.length, phase: 0, memoryIndex: 0 }));
      localStorage.setItem('demon-king:ui:text-percent', '150');
      localStorage.setItem('demon-king:ui:reading-mode', mode);
      sessionStorage.setItem('demon-king:title-seen:compact', '1');
    }, { key, state: event.state, mode });
    await page.reload(); await scene(page);
    expect(JSON.parse((await raw(page))!)).toEqual(event.state);
    await expect(page.locator('[data-choice]:not([data-choice^="explore_route_"])')).toHaveCount(event.choices.length);
    for (const c of event.choices) {
      const button = page.locator(`[data-choice="${c.id}"]`);
      await expect(button).toBeEnabled();
      await expect(button.locator('.choice-title')).toHaveText(c.text);
      await expect(button).toContainText(c.description);
    }
    const button = page.locator(`[data-choice="${selected.id}"]`);
    await button.scrollIntoViewIfNeeded(); await expect(button).toBeInViewport();
    if (changed && selected === event.choices.at(-1) && mode === 'scroll') await page.screenshot({ path: `docs/v3.8/choices-${event.id}-${test.info().project.name}.png`, animations: 'disabled' });
    await button.click(); await expect(page.locator('#choice-aftermath')).toBeVisible();
    await expect(page.locator('.aftermath-prose .story-paragraph')).toHaveText(narrativeLines(selected.narrative));
    expect(JSON.parse((await raw(page))!)).toEqual(selected.next);
    if (newIds.includes(selected.id)) {
      await page.reload(); await expect(page.locator('#choice-aftermath')).toBeVisible();
      await expect(page.locator('.aftermath-prose .story-paragraph')).toHaveText(narrativeLines(selected.narrative));
      expect(JSON.parse((await raw(page))!)).toEqual(selected.next);
      if (mode === 'scroll') await page.screenshot({ path: `docs/v3.8/result-${selected.id}-${test.info().project.name}.png`, animations: 'disabled' });
    }
    await page.clock.runFor(400); await page.locator('#reading-skip').click();
    await expect(page.locator('#choice-aftermath')).toHaveCount(0);
    if (selected.next.ended) {
      await expect(page.locator('[data-ending-phase="0"]')).toBeVisible();
      if (newIds.includes(selected.id)) {
        while (await page.locator('[data-ending-phase="3"]').count() === 0) await page.getByRole('button', { name: '이어서', exact: true }).click();
        const meta = JSON.parse((await page.evaluate(key => localStorage.getItem(key), metaKey))!);
        expect(meta.discoveredEndings['demon-king']).toContain(selected.next.endingId);
      }
    } else {
      await scene(page);
      expect(await page.locator('[data-choice]:enabled').count()).toBeGreaterThanOrEqual(2);
    }
    expect(JSON.parse((await raw(page))!)).toEqual(selected.next);
  }
  expect(errors).toEqual([]);
});

test('설정에서 타이틀로 돌아가도 회차를 유지하고 타이틀 새로하기만 새 회차를 만든다', async ({ page }) => {
  await start(page); await select(page, 'family_accept'); await select(page, 'trust_mina');
  const saved = await raw(page);
  await page.evaluate(key => localStorage.setItem(key, JSON.stringify({ saveSchemaVersion: 1, discoveredEndings: { 'demon-king': ['ending_escape'] } })), metaKey);
  await page.reload();
  const meta = await page.evaluate(key => localStorage.getItem(key), metaKey);
  await page.getByRole('button', { name: '저장 관리 · 엔딩 도감', exact: true }).click();
  await page.getByRole('button', { name: '타이틀로 가기', exact: true }).click();
  await expect(page.locator('.title-card')).toBeVisible(); await expect(page.locator('[data-enter]')).toHaveText('이어하기');
  await page.clock.runFor(60000); expect(await raw(page)).toBe(saved);
  await page.reload(); await expect(page.locator('.title-card')).toBeVisible(); expect(await raw(page)).toBe(saved);
  await page.locator('[data-enter]').click(); await expect(page.locator('#current-event')).toBeAttached(); expect(await raw(page)).toBe(saved);
  await page.getByRole('button', { name: '저장 관리 · 엔딩 도감', exact: true }).click();
  await page.getByRole('button', { name: '타이틀로 가기', exact: true }).click();
  await page.getByRole('button', { name: '새로하기', exact: true }).click();
  await expect(page.locator('#current-event')).toBeAttached();
  const next = JSON.parse((await raw(page))!); expect(next.age).toBe(0); expect(next.history).toEqual([]); expect(next.runId).not.toBe(JSON.parse(saved!).runId);
  expect(await page.evaluate(key => localStorage.getItem(key), metaKey)).toBe(meta);
});

test('글자 밝기는 모든 화면 글자에만 적용되고 회차·이미지·배경을 바꾸지 않으며 다시 불러와 유지된다', async ({ page }) => {
  await start(page); const saved = await raw(page);
  const colors = async () => {
    await expect(page.locator('#scene-title')).toBeAttached();
    return page.evaluate(() => ['body', '#scene-title', '.timeline-text', '.header-history', '.stats strong', '.game-toolbar button'].map(selector => getComputedStyle(document.querySelector(selector)!).color));
  };
  const original = await colors();
  const background = await page.locator('.game-shell').evaluate(el => getComputedStyle(el).backgroundColor);
  const picture = await page.locator('#player-image').getAttribute('src');
  await page.getByRole('button', { name: '저장 관리 · 엔딩 도감', exact: true }).click();
  const slider = page.getByLabel('화면 전체 글자 밝기'); await slider.focus(); await slider.press('Home');
  expect(new Set(await colors()).size).toBe(1); expect(await colors()).not.toEqual(original);
  await expect(slider).toHaveAttribute('aria-valuetext', '0% · 짙은 회색');
  await slider.press('End'); expect(await colors()).toEqual(original);
  await slider.press('Home'); for (let i = 0; i < 10; i++) await slider.press('ArrowRight');
  await expect(slider).toHaveAttribute('aria-valuetext', '50% · 부드러운 글자색');
  const dimmed = await colors(); expect(dimmed).not.toEqual(original);
  await page.getByRole('button', { name: '닫기', exact: true }).click(); await page.reload();
  expect(await colors()).toEqual(dimmed); expect(await raw(page)).toBe(saved);
  expect(await page.locator('#player-image').getAttribute('src')).toBe(picture);
  expect(await page.locator('#player-image').evaluate(el => getComputedStyle(el).filter)).toBe('none');
  expect(await page.locator('.game-shell').evaluate(el => getComputedStyle(el).backgroundColor)).toBe(background);
  await page.getByRole('button', { name: '저장 관리 · 엔딩 도감', exact: true }).click();
  await page.getByRole('button', { name: '타이틀로 가기', exact: true }).click();
  await page.getByRole('button', { name: '저장 관리 · 엔딩 도감', exact: true }).click();
  await expect(page.getByLabel('화면 전체 글자 밝기')).toHaveValue('50');
  await page.getByRole('button', { name: '기본 밝기', exact: true }).click();
  await page.getByRole('button', { name: '닫기', exact: true }).click(); await page.locator('[data-enter]').click();
  expect(await colors()).toEqual(original); expect(await raw(page)).toBe(saved);
  await page.evaluate(() => localStorage.setItem('demon-king:ui:text-brightness', '잘못된 값'));
  await page.reload(); expect(await colors()).toEqual(original); expect(await raw(page)).toBe(saved);
});

test('150% 글자에서 능력치 한 칸은 한 줄이고 최근 연대기는 딱 한 줄이며 전체 기록은 상단에 있다', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('demon-king:ui:text-percent', '150'));
  await page.goto('./'); await expect(page.locator('[data-enter]')).toBeEnabled();
  expect(await page.locator('.title-background').evaluate(el => {
    const r = el.getBoundingClientRect(); return getComputedStyle(el).objectFit === 'cover' && r.width === innerWidth && r.height === innerHeight;
  })).toBe(true);
  await page.screenshot({ path: `docs/compact-controls/title-${test.info().project.name}.png`, animations: 'disabled' });
  await page.locator('[data-enter]').click();
  await expect(page.locator('.life-panel h2, .life-panel button, #npc-image')).toHaveCount(0);
  await expect(page.locator('.game-header .header-history')).toHaveCount(1);
  const checkHeader = async () => {
    const boxes = await page.locator('.stats > div').evaluateAll(cells => cells.map(cell => {
      const label = cell.querySelector('small')!.getBoundingClientRect(); const value = cell.querySelector('strong')!.getBoundingClientRect();
      return { text: cell.textContent, width: cell.clientWidth, scroll: cell.scrollWidth, centerDelta: Math.abs(label.y + label.height / 2 - value.y - value.height / 2) };
    }));
    for (const box of boxes) {
      expect(box.centerDelta, JSON.stringify(box)).toBeLessThan(1);
      expect(box.scroll, JSON.stringify(box)).toBeLessThanOrEqual(box.width);
    }
    await expect(page.locator('.timeline-item')).toHaveCount(1);
    expect(await page.locator('.timeline-text').evaluate(el => el.clientHeight <= parseFloat(getComputedStyle(el).lineHeight) + 1)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight + 1)).toBe(true);
  };
  await checkHeader();
  expect(await page.locator('#player-image').evaluate(el => getComputedStyle(el).objectFit)).toBe('cover');
  await select(page, 'family_accept'); await select(page, 'trust_mina'); await checkHeader();
  const widerFont = await page.addStyleTag({ content: '.stats { font-family: Verdana, sans-serif; }' });
  await checkHeader(); await widerFont.evaluate(element => { element.parentNode?.removeChild(element); });
  await page.locator('.header-history').click(); await expect(page.locator('.history-entry:has([data-resume-node])')).toHaveCount(3);
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await page.evaluate(({ key, state }) => {
    localStorage.setItem(key, JSON.stringify(state));
    localStorage.setItem(`demon-king:compact-view:${state.runId}`, JSON.stringify({ handledHistory: state.history.length, phase: 0, memoryIndex: 0 }));
  }, { key, state: fixtures.late });
  await page.reload(); await expect(page.locator('#current-event')).toBeAttached(); expect(JSON.parse((await raw(page))!).age).toBe(65); await checkHeader();
  await page.screenshot({ path: `docs/compact-controls/header-${test.info().project.name}.png`, animations: 'disabled' });
});

test('상단 NPC 없이 고백 네 번째 선택과 본문의 미나 기본 초상화를 유지한다', async ({ page }) => {
  await start(page); for (const id of ['family_accept', 'trust_mina']) await select(page, id);
  await expect(page.locator('#npc-image')).toHaveCount(0);
  const lines = chapter.nodes.find((n: { id: string }) => n.id === 'exam').body.split('\n\n');
  for (let index = 1; index <= 9; index++) {
    await page.locator('#current-event .story-paragraph:visible').last().click();
    if (index === 8) {
      await expect(page.locator('.story-illustration')).toHaveAttribute('data-asset-id', 'mina');
      await page.screenshot({ path: `docs/compact-controls/exam-${test.info().project.name}.png`, animations: 'disabled' });
    }
    expect(lines[index]).toBeDefined();
  }
  await scene(page); await expect(page.locator('[data-choice]')).toHaveCount(4);
  await expect(page.locator('[data-choice="confess"] .choice-title')).toHaveText('미나에게 사랑한다고 고백한다.');
  await select(page, 'confess'); expect(JSON.parse((await raw(page))!).currentNodeId).toBe('confession');
  await page.locator('#current-event .story-paragraph:visible').last().click();
  await page.locator('#current-event .story-paragraph:visible').last().click();
  await expect(page.locator('#npc-image')).toHaveCount(0);
  await page.locator('#current-event .story-paragraph:visible').last().click();
  await expect(page.locator('.story-illustration')).toHaveAttribute('data-asset-id', 'mina');
  await select(page, 'confess_sincere');
  expect(JSON.parse((await raw(page))!).currentNodeId).toBe('confession_afterm');
  await select(page, 'support_mina');
  await page.reload(); expect(JSON.parse((await raw(page))!).history.map((h: { choiceId: string }) => h.choiceId)).toContain('confess');
});

test('구버전 저장은 원문 백업 후 이어지고 전체 기록과 페이지 진행을 보호한다', async ({ page }) => {
  const old = fixtures.old;
  const saved = JSON.stringify(old);
  await page.addInitScript(({ saved, key }) => {
    localStorage.setItem(key, saved); sessionStorage.setItem('demon-king:title-seen:compact', '1');
    localStorage.setItem('demon-king:compact-view:v37-old-save', JSON.stringify({ handledHistory: 5, phase: 0, memoryIndex: 0 }));
  }, { saved, key });
  await page.goto('./'); await expect(page.locator('#current-event')).toBeAttached();
  expect(JSON.parse((await raw(page))!)).toEqual({ ...old, storyVersion: '2.3.0-compact' });
  expect(JSON.parse((await page.evaluate(key => localStorage.getItem(key), COMPACT_V37_BACKUP_KEY))!).run).toBe(saved);
  for (let index = 1; index <= 18; index++) {
    await page.locator('#current-event .story-paragraph:visible').last().click();
  }
  await expect(page.locator('#npc-image')).toHaveCount(0);
  await expect(page.locator('.header-history')).toBeVisible();
  await page.locator('#reading-mode').click();
  const count = Number(await page.locator('.page-window').getAttribute('data-page-count'));
  for (let i = 0; i < count; i++) {
    await expect(page.locator('.header-history')).toBeVisible();
    if (i + 1 < count) await page.getByRole('button', { name: '다음 페이지', exact: true }).click();
  }
});

test('선택2·3·4·5개는 전부 표시되고 각 선택과 마지막 항목을 클릭할 수 있다', async ({ page }) => {
  const state = fixtures.exam;
  for (const count of [2, 3, 4, 5]) for (let selected = 0; selected < count; selected++) {
    const fixture = structuredClone(chapter);
    const exam = fixture.nodes.find((n: { id: string }) => n.id === 'exam');
    if (count === 5) exam.choices.push({ ...structuredClone(exam.choices[2]), id: 'test_fifth', text: '검수용 다섯 번째 선택', outcomes: exam.choices[2].outcomes.map((o: { id: string }) => ({ ...o, id: 'out_test_fifth' })) });
    exam.choices = exam.choices.slice(0, count);
    await page.route('**/stories/demon-king-compact/chapters/01_complete.json', route => route.fulfill({ json: fixture }));
    await page.goto('./');
    await page.evaluate(({ key, state }) => {
      localStorage.setItem(key, JSON.stringify(state)); sessionStorage.setItem('demon-king:title-seen:compact', '1');
      localStorage.setItem('demon-king:compact-view:choices-audit', JSON.stringify({ handledHistory: 2, phase: 0, memoryIndex: 0 }));
      localStorage.setItem('demon-king:ui:text-percent', '150');
    }, { key, state });
    await page.reload(); await scene(page);
    await expect(page.locator('[data-choice]')).toHaveCount(count);
    const choice = exam.choices[selected];
    await page.locator(`[data-choice="${choice.id}"]`).scrollIntoViewIfNeeded();
    await page.locator(`[data-choice="${choice.id}"]`).click();
    await expect(page.locator('#choice-aftermath')).toBeVisible();
    expect(JSON.parse((await raw(page))!).history.at(-1).choiceId).toBe(choice.id);
    await page.unroute('**/stories/demon-king-compact/chapters/01_complete.json');
  }
});

test('본문 그림은 관련 문단과 함께 나타나고 클릭당 한 문단·연대기·선택 팝업을 유지한다', async ({ page }) => {
  await start(page); const saved = await raw(page);
  await expect(page.locator('#current-event .story-illustration')).toBeVisible();
  await expect(page.locator('#current-event .story-paragraph:visible')).toHaveCount(1);
  await expect(page.locator('#current-event .story-illustration img')).toHaveAttribute('alt', '신생아가 마왕으로 등록된 출생신고소에서 부모가 항의하는 장면');
  await page.locator('.chat-feed').click();
  await expect(page.locator('#current-event .story-paragraph:visible')).toHaveCount(2);
  await page.locator('.chat-feed').click();
  await expect(page.locator('#current-event .story-paragraph:visible')).toHaveCount(3);
  await expect(page.locator('#choice-dialog')).not.toBeVisible();
  await expect(page.locator('.timeline img, .choice-card img, .dialogue-line img')).toHaveCount(0);
  await scene(page);
  await expect(page.locator('#current-event .story-illustration')).toHaveCount(1);
  expect(await raw(page)).toBe(saved);
});

test('그림 없는 사건은 텍스트로 진행하고 재판·엔딩 그림과 저장 후 복원을 보호한다', async ({ page }) => {
  await start(page);
  for (const id of ['family_accept', 'trust_mina']) await select(page, id);
  await scene(page);
  await expect(page.locator('#current-event .story-illustration img')).toHaveAttribute('alt', '미나');
  await select(page, 'attack'); await scene(page);
  await expect(page.locator('#current-event .story-illustration img')).toHaveAttribute('alt', '감옥');
  await select(page, 'forgive'); await scene(page);
  await expect(page.locator('#current-event .story-illustration img')).toHaveAttribute('alt', '에리시아');
  await select(page, 'ally'); await expect(page.locator('#current-event .story-illustration')).toHaveCount(0);
  await select(page, 'public_audit'); await scene(page);
  await expect(page.locator('#current-event .story-illustration img')).toHaveAttribute('src', /cg_public_hearing\.webp$/);
  const saved = await raw(page); await page.reload(); await scene(page); expect(await raw(page)).toBe(saved);
  await page.getByRole('button', { name: '잠시 내리기', exact: true }).click();
  await expect(page.locator('.choice-launch')).toBeVisible(); await page.locator('.choice-launch').click();
  await select(page, 'walk_away'); await select(page, 'end_peace');
  await expect(page.locator('[data-ending-phase="0"] .ending-art img')).toHaveAttribute('src', /assets\/illustrations\/events\/final_sunset\.webp$/);
  await expect(page.locator('[data-ending-phase="0"] svg')).toHaveCount(0);
  const ended = await raw(page); await page.reload(); expect(await raw(page)).toBe(ended);
});

test('나무칼 장면은 미나 기준 초상화로 대체하고 문단·원본 크기·선택·저장을 보호한다', async ({ page }) => {
  await start(page); await select(page, 'family_accept'); const saved = await raw(page);
  const figure = page.locator('#current-event .story-illustration');
  await expect(figure).toHaveAttribute('data-asset-id', 'mina'); await expect(figure).toBeHidden();
  const node = chapter.nodes.find((n: { id: string }) => n.id === 'child');
  const index = 11 + node.body.split(/\n[ \t]*\n+/).findIndex((p: string) => p.includes('나무칼'));
  for (let i = 0; i < index; i++) await page.locator('#current-event .story-paragraph:visible').last().click();
  await expect(figure).toBeVisible();
  const image = figure.locator('img');
  await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth === 320 && img.naturalHeight === 505)).toBe(true);
  expect(await image.evaluate((img: HTMLImageElement) => { const r = img.getBoundingClientRect(); return r.width <= img.naturalWidth && r.height <= img.naturalHeight; })).toBe(true);
  expect(await figure.evaluate(el => el.previousElementSibling!.textContent)).toContain('나무칼');
  await expect(page.locator('#choice-dialog')).not.toBeVisible(); expect(await raw(page)).toBe(saved);
  await select(page, 'trust_mina'); await scene(page);
  await expect(page.locator('#current-event .story-illustration')).toHaveAttribute('data-asset-id', 'mina');
  expect(JSON.parse((await raw(page))!).history).toHaveLength(2);
});

test('미나 기본 초상화가 없으면 빈 프레임 없이 친구 선택과 다음 사건으로 진행한다', async ({ page }) => {
  await page.route('**/assets/illustrations/characters/mina.webp', route => route.abort());
  await start(page); await select(page, 'family_accept'); const saved = await raw(page);
  await scene(page); await expect(page.locator('#current-event .story-illustration')).toHaveCount(0);
  expect(await raw(page)).toBe(saved); await select(page, 'trust_mina');
  expect(JSON.parse((await raw(page))!).currentNodeId).toBe('exam');
});

test('그림 로딩 실패 시 빈 프레임 없이 본문과 페이지·스크롤 선택을 계속한다', async ({ page }) => {
  await page.route('**/assets/illustrations/event_cg_v4_5/cg_birth_registry.webp', route => route.abort());
  await start(page); const saved = await raw(page);
  await scene(page); await expect(page.locator('#current-event .story-illustration')).toHaveCount(0);
  await page.getByRole('button', { name: '잠시 내리기', exact: true }).click();
  await page.locator('#reading-mode').click();
  await expect(page.locator('.page-window')).toBeVisible();
  await expect(page.locator('#current-event .story-illustration')).toHaveCount(0);
  await page.locator('#reading-skip').click(); await page.locator('.choice-launch').click(); await expect(page.locator('#choice-dialog')).toBeVisible();
  expect(await raw(page)).toBe(saved);
  await page.locator('[data-choice="family_accept"]').click(); await expect(page.locator('#choice-aftermath')).toBeVisible();
  expect(JSON.parse((await raw(page))!).history).toHaveLength(1);
});

test('빈 줄마다 문단과 간격이 있고 대사 카드 중복 없이 본문 끝에서만 선택할 수 있다', async ({ page }) => {
  await start(page);
  expect(JSON.parse((await raw(page))!).age).toBe(0);
  await expect(page.locator('#current-event .story-paragraph:visible')).toHaveCount(1);
  await expect(page.locator('.choices')).toBeHidden();
  await scene(page);
  const body = chapter.nodes.find((n: { id: string }) => n.id === 'birth').body;
  expect(await page.locator('#current-event .story-paragraph').allTextContents()).toEqual(body.split(/\n[ \t]*\n+/).map((s: string) => s.trim()));
  await expect(page.locator('#current-event .dialogue-line')).toHaveCount(0);
  const styles = await page.locator('#current-event .story-paragraph').first().evaluate(el => {
    const css = getComputedStyle(el); return { size: parseFloat(css.fontSize), margin: parseFloat(css.marginBottom), line: parseFloat(css.lineHeight) };
  });
  expect(styles.margin / styles.size).toBeCloseTo(1.15, 2); expect(styles.line / styles.size).toBeCloseTo(1.75, 2);
});

test('선택 후 서술을 먼저 한 번 표시하며 새로고침 뒤 다음 장면과 원장을 보호한다', async ({ page }) => {
  await start(page); await scene(page); await page.locator('[data-choice="family_accept"]').click();
  await expect(page.locator('#choice-aftermath')).toBeVisible();
  await expect(page.locator('#current-event, #choice-dialog, .game-header')).toHaveCount(0);
  const narrative = chapter.nodes[0].choices[0].outcomes[0].narrative;
  await expect(page.locator('.aftermath-prose')).toHaveText(narrative);
  const before = await raw(page); await page.reload();
  await expect(page.locator('#choice-aftermath')).toBeVisible(); expect(await raw(page)).toBe(before);
  await page.locator('#reading-skip').click(); await expect(page.locator('#current-event')).toBeAttached();
  expect(JSON.parse((await raw(page))!).age).toBe(12);
  await scene(page); expect(await page.locator('#current-event').innerText()).not.toContain(narrative);
  const after = await raw(page); await page.reload();
  await expect(page.locator('#choice-aftermath')).toHaveCount(0); await expect(page.locator('#current-event')).toBeAttached(); expect(await raw(page)).toBe(after);
});

test('연대기는 방문한 사건의 독립 요약만 한 줄로 표시하고 전체 기록도 전문을 중복하지 않는다', async ({ page }) => {
  await start(page); await select(page, 'family_accept'); await select(page, 'trust_mina'); await scene(page);
  expect(await page.locator('.timeline-text').allTextContents()).toEqual([chapter.nodes[2].chronicleSummary]);
  await expect(page.locator('.timeline-text').first()).toHaveCSS('white-space', 'nowrap');
  expect(await page.locator('.timeline').evaluate(el => el.clientHeight)).toBeLessThanOrEqual(130);
  await page.getByRole('button', { name: '잠시 내리기', exact: true }).click();
  await page.getByRole('button', { name: '전체 기록', exact: true }).click();
  await expect(page.locator('.history-entry:has([data-resume-node])')).toHaveCount(3);
  await expect(page.locator('.history-entry .body, .history-entry .dialogue-line')).toHaveCount(0);
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await page.getByRole('button', { name: '선택지 보기', exact: true }).click(); await expect(page.locator('#choice-dialog')).toBeVisible();
});

test('8개 엔딩이 후속 서술과 독립 화면을 거치고 실제 사건만 회상하며 마지막에 중복 없이 해금된다', async ({ page }) => {
  test.setTimeout(90000);
  const paths: Record<string, string[]> = {
    ending_escape: ['attack', 'escape_prison'], ending_fire: ['refuse', 'burn_office'], ending_throne: ['invoice', 'threaten_king'],
    ending_ledger: ['refuse', 'keep_records', 'ally', 'steal_ledger'],
    ending_peace: ['attack', 'forgive', 'ally', 'private_deal', 'take_money', 'end_peace'],
    ending_reform: ['attack', 'forgive', 'ally', 'private_deal', 'reject_money', 'end_reform'],
    ending_office: ['attack', 'forgive', 'ally', 'private_deal', 'buy_office', 'end_office'],
    ending_love_scandal: ['confess', 'confess_absurd', 'embrace_fame'],
  };
  for (const [endingId, choices] of Object.entries(paths)) {
    await page.goto('./?edition=compact');
    await page.evaluate(key => { localStorage.removeItem(key); sessionStorage.removeItem('demon-king:title-seen:compact'); }, key);
    await start(page);
    for (const id of ['family_accept', 'trust_mina', ...choices]) await select(page, id);
    await expect(page.locator('[data-ending-phase="0"]')).toBeVisible(); await expect(page.locator('.game-header')).toHaveCount(0);
    const firstArt = page.locator('[data-ending-phase="0"] .ending-art img');
    await expect.poll(() => firstArt.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    const firstArtSource = await firstArt.getAttribute('src'); expect(firstArtSource!.endsWith(`/${endingArtworkPath(endingId)}`)).toBe(true);
    await expect(page.locator('[data-ending-phase="0"] svg')).toHaveCount(0);
    if (endingId === 'ending_peace' || endingId === 'ending_throne') await page.screenshot({ path: `docs/v4.4/${endingId}-${test.info().project.name}.png`, animations: 'disabled' });
    const state = JSON.parse((await raw(page))!); expect(state.endingId).toBe(endingId);
    const beforeMeta = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), metaKey);
    expect(beforeMeta.discoveredEndings['demon-king'] ?? []).not.toContain(endingId);
    await page.getByRole('button', { name: '설정', exact: true }).click();
    await expect(page.locator(`.ending-gallery [data-ending-detail="${endingId}"]`)).toHaveCount(0);
    await page.getByRole('button', { name: '닫기', exact: true }).click();
    await page.getByRole('button', { name: '이어서', exact: true }).click();
    const memories: string[] = [];
    while (await page.locator('[data-ending-phase="1"]').count()) {
      const nodeId = await page.locator('[data-memory-node]').getAttribute('data-memory-node'); memories.push(nodeId!);
      if (endingId === 'ending_peace' && nodeId === 'child') {
        await expect(page.locator('[data-memory-node] .story-illustration')).toHaveAttribute('data-asset-id', 'mina');
        await page.screenshot({ path: `docs/v4.4/memory-mina-${test.info().project.name}.png`, animations: 'disabled' });
      }
      expect(state.history.map((h: { nodeId: string }) => h.nodeId)).toContain(nodeId);
      await page.getByRole('button', { name: '이어서', exact: true }).click();
    }
    expect(memories.length).toBeGreaterThanOrEqual(4); expect(memories.length).toBeLessThanOrEqual(8); expect(new Set(memories).size).toBe(memories.length);
    const originalOrder = state.history.map((h: { nodeId: string }) => h.nodeId).filter((id: string) => memories.includes(id)); expect(memories).toEqual(originalOrder);
    await expect(page.locator('[data-ending-phase="2"]')).toBeVisible();
    expect(await page.locator('.cinematic-shell').innerText()).not.toMatch(/마지막 순간|주마등|독백|엔딩카드|1\/4/);
    await page.getByRole('button', { name: '이어서', exact: true }).click(); await expect(page.locator('[data-ending-phase="3"] h1')).toBeVisible();
    await expect(page.locator('[data-ending-phase="3"] .ending-art img')).toHaveAttribute('src', firstArtSource!);
    await expect(page.locator('[data-ending-phase="3"] svg')).toHaveCount(0);
    await page.reload(); await expect(page.locator('[data-ending-phase="3"]')).toBeVisible();
    const collection = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), metaKey);
    expect(collection.discoveredEndings['demon-king'].filter((id: string) => id === endingId)).toHaveLength(1);
    expect(await raw(page)).toBe(JSON.stringify(state));
    await page.getByRole('button', { name: '도감 보기', exact: true }).click();
    await page.locator(`[data-ending-detail="${endingId}"]`).click();
    await expect(page.locator('.ending-detail .ending-art img')).toHaveAttribute('src', firstArtSource!);
    await page.getByRole('button', { name: '닫기', exact: true }).click();
    await expect(page.locator('.ending-gallery-list li')).toHaveCount(20);
    await page.getByRole('button', { name: '닫기', exact: true }).click();
    expect(await raw(page)).toBe(JSON.stringify(state));
  }
});

test('회상은 읽을 시간 후 한 개씩 자동 전환하고 새로고침에서 이어지며 설정 중 멈춘다', async ({ page }) => {
  await start(page); for (const id of ['family_accept', 'trust_mina', 'attack', 'escape_prison']) await select(page, id);
  await page.getByRole('button', { name: '이어서', exact: true }).click();
  const first = await page.locator('[data-memory-node]').getAttribute('data-memory-node');
  const delay = await page.locator('.cinematic-content').evaluate(el => Math.max(5000, Array.from(el.textContent ?? '').length * 170));
  await page.clock.runFor(delay - 1); expect(await page.locator('[data-memory-node]').getAttribute('data-memory-node')).toBe(first);
  await page.clock.runFor(1); const second = await page.locator('[data-memory-node]').getAttribute('data-memory-node'); expect(second).not.toBe(first);
  await page.reload(); await expect(page.locator(`[data-memory-node="${second}"]`)).toBeVisible();
  await page.getByRole('button', { name: '설정', exact: true }).click(); await page.clock.runFor(60000);
  expect(await page.locator('[data-memory-node]').getAttribute('data-memory-node')).toBe(second);
  await page.getByRole('button', { name: '닫기', exact: true }).click(); await expect(page.locator(`[data-memory-node="${second}"]`)).toBeVisible();
});

test('360~430px 화면과 최대 글자 크기에서 문단 간격·연대기 한 줄·선택 팝업 접근을 유지한다', async ({ page }) => {
  await start(page); await select(page, 'family_accept'); await select(page, 'trust_mina');
  await page.getByRole('button', { name: '저장 관리 · 엔딩 도감', exact: true }).click();
  const range = page.getByLabel('화면 전체 글자 크기'); await range.focus(); await range.press('End');
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  for (const width of [360, 390, 430]) {
    await page.setViewportSize({ width, height: 800 }); await scene(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.locator('.timeline').evaluate(el => el.clientHeight)).toBeLessThanOrEqual(130);
    await expect(page.locator('.timeline-text').first()).toHaveCSS('white-space', 'nowrap');
    const timeline = (await page.locator('.life-panel').boundingBox())!;
    const popup = (await page.locator('#choice-dialog').boundingBox())!;
    expect(popup.y).toBeGreaterThanOrEqual(timeline.y + timeline.height);
    const styles = await page.locator('#current-event .story-paragraph').first().evaluate(el => ({ size: parseFloat(getComputedStyle(el).fontSize), margin: parseFloat(getComputedStyle(el).marginBottom) }));
    expect(styles.margin / styles.size).toBeCloseTo(1.15, 2);
  }
});

test('본문 HTML은 문자로 표시하고 reduced-motion에서도 결말을 수동으로 완료할 수 있다', async ({ page }) => {
  const malicious = structuredClone(chapter); malicious.nodes[0].body = '<img src=x onerror="window.__unsafe=1">\n\n“문자 그대로.”';
  await page.route('**/stories/demon-king-compact/chapters/01_complete.json', route => route.fulfill({ json: malicious }));
  await page.emulateMedia({ reducedMotion: 'reduce' }); await start(page); await scene(page);
  await expect(page.locator('#current-event .story-paragraph img')).toHaveCount(0);
  await expect(page.locator('#current-event .story-illustration img')).toHaveAttribute('src', /assets\/illustrations\/event_cg_v4_5\/cg_birth_registry\.webp$/);
  expect(await page.evaluate(() => (window as Window & { __unsafe?: number }).__unsafe)).toBeUndefined();
  expect(await page.locator('#current-event .story-paragraph').first().textContent()).toContain('<img');
  for (const id of ['family_accept', 'trust_mina', 'attack', 'escape_prison']) await select(page, id);
  await page.getByRole('button', { name: '이어서', exact: true }).click();
  const memory = await page.locator('[data-memory-node]').getAttribute('data-memory-node');
  await page.clock.runFor(60000); expect(await page.locator('[data-memory-node]').getAttribute('data-memory-node')).toBe(memory);
  await page.locator('.cinematic-content').click(); expect(await page.locator('[data-memory-node]').getAttribute('data-memory-node')).not.toBe(memory);
});

test('원작 플레이 없이 기본 주소에서 현재 판을 실행하며 과거 저장과 도감을 보호한다', async ({ page }) => {
  const original = JSON.parse(readFileSync('public/stories/demon-king/story.json', 'utf8'));
  const state = { ...original.initialState, saveSchemaVersion: 1, storyId: original.id, storyVersion: original.version,
    runId: 'original-protected', currentNodeId: original.entryNodeId, endingId: null, ended: false,
    rng: { seed: 3, state: 3 }, history: [], enteredNodeIds: [original.entryNodeId] };
  const text = JSON.stringify(state); const originalKey = 'existence-sim:v1:run:demon-king';
  const originalMeta = JSON.stringify({ saveSchemaVersion: 1, discoveredEndings: { 'demon-king': ['end_blade'] } });
  await page.goto('./'); await page.evaluate(({ key, text, meta }) => { localStorage.setItem(key, text); localStorage.setItem('existence-sim:v1:meta', meta); }, { key: originalKey, text, meta: originalMeta });
  await start(page); await select(page, 'family_accept');
  expect(await page.evaluate(key => localStorage.getItem(key), originalKey)).toBe(text);
  expect(await page.evaluate(() => localStorage.getItem('existence-sim:v1:meta'))).toBe(originalMeta);
  const compactSave = await raw(page);
  await page.getByRole('button', { name: '저장 관리 · 엔딩 도감', exact: true }).click();
  await page.locator('#save-file').setInputFiles({ name: 'original.json', mimeType: 'application/json', buffer: Buffer.from(text) });
  await expect(page.getByRole('alert')).toContainText('현재 판과 호환되지'); expect(await raw(page)).toBe(compactSave);
  await page.goto('./?edition=original');
  await expect(page.locator('#current-event')).toBeAttached();
  expect(await page.evaluate(key => localStorage.getItem(key), originalKey)).toBe(text); expect(await raw(page)).toBe(compactSave);
  await expect(page.getByRole('button', { name: /원작 플레이|축소 완결판 플레이/ })).toHaveCount(0);
  await page.getByRole('button', { name: '저장 관리 · 엔딩 도감', exact: true }).click();
  await expect(page.getByRole('button', { name: /원작 플레이|축소 완결판 플레이/ })).toHaveCount(0);
});

test('방문한 사건의 선택 직전으로 돌아가 다른 분기를 선택하고 새로고침 및 이전 회차 복원을 지원한다', async ({ page }) => {
  await start(page); await select(page, 'family_accept'); await select(page, 'trust_mina'); await select(page, 'attack');
  await scene(page); const previous = JSON.parse((await raw(page))!);
  await page.getByRole('button', { name: '잠시 내리기', exact: true }).click();
  await page.locator('.header-history').click();
  await expect(page.locator('[data-resume-node="exam"]')).toBeVisible();
  await expect(page.locator('[data-resume-node="settlement"]')).toHaveCount(0);
  await page.locator('[data-resume-node="exam"]').click();
  await expect(page.locator('#choice-dialog')).toBeVisible();
  const resumed = JSON.parse((await raw(page))!);
  expect(resumed.currentNodeId).toBe('exam'); expect(resumed.age).toBe(20);
  expect(resumed.history).toEqual(previous.history.slice(0, 2)); expect(resumed.flags).not.toContain('attacked_mina');
  expect(resumed.runId).not.toBe(previous.runId); expect(resumed.rng.seed).toBe(previous.rng.seed);
  expect(resumed.enteredNodeIds).toEqual(['birth', 'child', 'exam']);
  await expect(page.locator('#choice-aftermath')).toHaveCount(0);
  await expect(page.locator('[data-choice="refuse"]')).toBeEnabled();
  await page.reload(); await expect(page.locator('#current-event')).toBeAttached(); expect(await raw(page)).toBe(JSON.stringify(resumed));
  await select(page, 'refuse'); expect(JSON.parse((await raw(page))!).currentNodeId).toBe('petition');
  await page.getByRole('button', { name: '저장 관리 · 엔딩 도감', exact: true }).click();
  await page.getByRole('button', { name: '지난 분기에서 이어하기', exact: true }).click();
  await page.getByRole('button', { name: '재선택 전 회차 복원', exact: true }).click();
  await expect(page.locator('#choice-dialog')).toBeVisible();
  const recovered = JSON.parse((await raw(page))!);
  expect({ ...recovered, runId: previous.runId }).toEqual(previous);
  await page.getByRole('button', { name: '잠시 내리기', exact: true }).click();
  await page.getByRole('button', { name: '전체 기록', exact: true }).click();
  await page.locator('[data-resume-node="birth"]').click();
  await expect(page.locator('#choice-dialog')).toBeVisible();
  const birth = JSON.parse((await raw(page))!); expect(birth.age).toBe(0); expect(birth.history).toEqual([]);
});

test('종료 후에도 지난 분기를 재선택하고 엔딩 도감을 유지하며 저장 실패 시 원래 회차를 지킨다', async ({ page }) => {
  await start(page); for (const id of ['family_accept', 'trust_mina', 'attack', 'escape_prison']) await select(page, id);
  while (await page.locator('[data-ending-phase="3"]').count() === 0) await page.getByRole('button', { name: '이어서', exact: true }).click();
  const ended = await raw(page);
  await page.getByRole('button', { name: '설정', exact: true }).click();
  await page.getByRole('button', { name: '지난 분기에서 이어하기', exact: true }).click();
  await page.evaluate(key => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(k: string, value: string) { if (k === key) throw new Error('재선택 저장 차단'); return original.call(this, k, value); };
    (window as Window & { __restoreStorage?: () => void }).__restoreStorage = () => { Storage.prototype.setItem = original; };
  }, key);
  await page.locator('[data-resume-node="exam"]').click();
  await expect(page.getByRole('alert')).toContainText('재선택 저장 차단'); expect(await raw(page)).toBe(ended);
  await expect(page.locator('#current-event')).toHaveCount(0);
  await page.evaluate(() => (window as Window & { __restoreStorage?: () => void }).__restoreStorage!());
  await page.getByRole('button', { name: '저장 다시 시도', exact: true }).click();
  await expect(page.locator('#choice-dialog')).toBeVisible();
  const resumed = JSON.parse((await raw(page))!); expect(resumed.ended).toBe(false); expect(resumed.currentNodeId).toBe('exam');
  const collection = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), metaKey);
  expect(collection.discoveredEndings['demon-king']).toContain('ending_escape');
  await select(page, 'invoice'); expect(JSON.parse((await raw(page))!).currentNodeId).toBe('invoice');
});

test('페이지 방식은 한 페이지를 즉시 표시하고 자동으로 넘기거나 스크롤하지 않으며 방식 설정을 유지한다', async ({ page }) => {
  await start(page); const before = await raw(page);
  await page.getByRole('button', { name: '페이지 방식', exact: true }).click();
  await expect(page.getByRole('button', { name: '스크롤 방식', exact: true })).toBeVisible();
  await expect(page.locator('#current-event .story-paragraph[hidden]')).toHaveCount(0);
  const first = await page.locator('.page-window').getAttribute('data-page-index');
  const transform = await page.locator('.page-pages').evaluate(el => getComputedStyle(el).transform);
  await page.clock.runFor(60000);
  expect(await page.locator('.page-window').getAttribute('data-page-index')).toBe(first);
  expect(await page.locator('.page-pages').evaluate(el => getComputedStyle(el).transform)).toBe(transform);
  expect(await page.locator('.chat-feed').evaluate(el => el.scrollTop)).toBe(0); expect(await raw(page)).toBe(before);
  await page.reload(); await expect(page.getByRole('button', { name: '스크롤 방식', exact: true })).toBeVisible();
  expect(await raw(page)).toBe(before);
});

test('페이지를 모두 읽은 뒤에 선택지를 열고 선택 후 서술도 페이지로 읽으며 이전 페이지를 다시 볼 수 있다', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 }); await start(page);
  await page.getByRole('button', { name: '페이지 방식', exact: true }).click();
  const count = Number(await page.locator('.page-window').getAttribute('data-page-count')); expect(count).toBeGreaterThan(1);
  await page.locator('.page-window').click(); await expect(page.locator('.page-window')).toHaveAttribute('data-page-index', '1');
  await page.getByRole('button', { name: '이전 페이지', exact: true }).click(); await expect(page.locator('.page-window')).toHaveAttribute('data-page-index', '0');
  for (let i = 1; i < count; i++) await page.getByRole('button', { name: '다음 페이지', exact: true }).click();
  await expect(page.locator('#choice-dialog')).not.toBeVisible();
  await page.getByRole('button', { name: '선택지', exact: true }).click(); await expect(page.locator('#choice-dialog')).toBeVisible();
  await page.locator('[data-choice="family_accept"]').click(); await page.clock.runFor(400);
  await expect(page.locator('#choice-aftermath .page-window')).toBeVisible();
  const saved = await raw(page);
  await page.clock.runFor(60000); await expect(page.locator('#choice-aftermath')).toBeVisible(); expect(await raw(page)).toBe(saved);
  await page.locator('#reading-skip').click(); await expect(page.locator('#current-event')).toBeAttached();
  await expect(page.locator('.page-window')).toHaveAttribute('data-page-index', '0');
  await expect(page.locator('#choice-dialog')).not.toBeVisible(); expect(JSON.parse((await raw(page))!).age).toBe(12);
});

test('긴 문단도 실제 화면과 150% 글자에 맞춰 나뉘고 모든 글자가 빠짐없이 한 페이지씩 보인다', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  const data = structuredClone(chapter);
  data.nodes[0].body = '첫머리. ' + '긴 문단은 글자와 화면 크기에 맞춰 여러 페이지로 나뉩니다. '.repeat(24) + '\n\n“끝까지 빠짐없이 읽었습니다.”';
  await page.route('**/stories/demon-king-compact/chapters/01_complete.json', route => route.fulfill({ json: data }));
  await start(page);
  await page.getByRole('button', { name: '저장 관리 · 엔딩 도감', exact: true }).click();
  const size = page.getByLabel('화면 전체 글자 크기'); await size.focus(); await size.press('End'); await page.getByRole('button', { name: '닫기', exact: true }).click();
  await page.getByRole('button', { name: '페이지 방식', exact: true }).click();
  const count = Number(await page.locator('.page-window').getAttribute('data-page-count')); expect(count).toBeGreaterThan(2);
  const seen = new Set<string>();
  let expected: string[] = [];
  for (let index = 0; index < count; index++) {
    const result = await page.locator('.page-window').evaluate(viewport => {
      const box = viewport.getBoundingClientRect(); const visible: string[] = []; const all: string[] = [];
      for (const [p, element] of [...viewport.querySelectorAll('.story-paragraph')].entries()) {
        const text = element.firstChild!;
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
    expected = result.all; expect(result.visible.length).toBeGreaterThan(0);
    for (const id of result.visible) { expect(seen.has(id)).toBe(false); seen.add(id); }
    expect(await page.locator('.chat-feed').evaluate(el => el.scrollTop)).toBe(0);
    if (index + 1 < count) await page.getByRole('button', { name: '다음 페이지', exact: true }).click();
  }
  expect([...seen].sort()).toEqual(expected.sort());
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('페이지와 스크롤을 전환하거나 화면·글자 크기를 바꿔도 회차와 기존 읽기 기능을 보존한다', async ({ page }) => {
  await start(page); const before = await raw(page);
  await page.getByRole('button', { name: '페이지 방식', exact: true }).click();
  await page.getByRole('button', { name: '저장 관리 · 엔딩 도감', exact: true }).click();
  const size = page.getByLabel('화면 전체 글자 크기'); await size.focus(); await size.press('End');
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  for (const [width, height] of [[360, 800], [430, 932], [640, 430]]) {
    await page.setViewportSize({ width: width!, height: height! });
    await expect(page.locator('.page-window')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.locator('.chat-feed').evaluate(el => el.scrollTop)).toBe(0);
  }
  await page.getByRole('button', { name: '스크롤 방식', exact: true }).click();
  await expect(page.locator('.page-window')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '빠르게 표시', exact: true })).toBeVisible();
  await page.locator('#reading-skip').click(); await expect(page.locator('#choice-dialog')).toBeVisible(); expect(await raw(page)).toBe(before);
  await page.locator('[data-choice="family_accept"]').click(); await expect(page.locator('#choice-aftermath')).toBeVisible();
  expect(JSON.parse((await raw(page))!).history).toHaveLength(1);
});
