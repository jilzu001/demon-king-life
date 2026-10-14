import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

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

test('본문 그림은 관련 문단과 함께 나타나고 클릭당 한 문단·연대기·선택 팝업을 유지한다', async ({ page }) => {
  await start(page); const saved = await raw(page);
  await expect(page.locator('#current-event .story-illustration')).toBeVisible();
  await expect(page.locator('#current-event .story-paragraph:visible')).toHaveCount(1);
  await expect(page.locator('#current-event .story-illustration img')).toHaveAttribute('alt', '마을');
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
  await expect(page.locator('#current-event .story-illustration img')).toHaveAttribute('alt', '미나');
  const saved = await raw(page); await page.reload(); await scene(page); expect(await raw(page)).toBe(saved);
  await page.getByRole('button', { name: '잠시 내리기', exact: true }).click();
  await expect(page.locator('.choice-launch')).toBeVisible(); await page.locator('.choice-launch').click();
  await select(page, 'walk_away'); await select(page, 'end_peace');
  await expect(page.locator('[data-ending-phase="0"] .story-illustration img')).toHaveAttribute('alt', '마지막 장면');
  const ended = await raw(page); await page.reload(); expect(await raw(page)).toBe(ended);
});

test('나무칼 그림은12세의 명시 문단과 함께 나타나며 원본 크기·선택·저장을 보호한다', async ({ page }) => {
  await start(page); await select(page, 'family_accept'); const saved = await raw(page);
  const figure = page.locator('#current-event .story-illustration');
  await expect(figure).toHaveAttribute('data-asset-id', 'mina_wooden_sword'); await expect(figure).toBeHidden();
  const node = chapter.nodes.find((n: { id: string }) => n.id === 'child');
  const index = node.body.split(/\n[ \t]*\n+/).findIndex((p: string) => p.includes('미나는 당신에게 나무칼을 쥐여 줬다.'));
  for (let i = 0; i < index; i++) await page.locator('#current-event .story-paragraph:visible').last().click();
  await expect(figure).toBeVisible();
  const image = figure.locator('img');
  await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth === 770 && img.naturalHeight === 575)).toBe(true);
  expect(await image.evaluate((img: HTMLImageElement) => { const r = img.getBoundingClientRect(); return r.width <= img.naturalWidth && r.height <= img.naturalHeight; })).toBe(true);
  expect(await figure.evaluate(el => el.previousElementSibling!.textContent)).toContain('미나는 당신에게 나무칼을 쥐여 줬다.');
  await expect(page.locator('#choice-dialog')).not.toBeVisible(); expect(await raw(page)).toBe(saved);
  await select(page, 'trust_mina'); await scene(page);
  await expect(page.locator('#current-event .story-illustration')).toHaveAttribute('data-asset-id', 'mina');
  expect(JSON.parse((await raw(page))!).history).toHaveLength(2);
});

test('나무칼 CG가 없으면 빈 프레임 없이 친구 선택과 다음 사건으로 진행한다', async ({ page }) => {
  await page.route('**/assets/illustrations/event_cg/mina_wooden_sword.webp', route => route.abort());
  await start(page); await select(page, 'family_accept'); const saved = await raw(page);
  await scene(page); await expect(page.locator('#current-event .story-illustration')).toHaveCount(0);
  expect(await raw(page)).toBe(saved); await select(page, 'trust_mina');
  expect(JSON.parse((await raw(page))!).currentNodeId).toBe('exam');
});

test('그림 로딩 실패 시 빈 프레임 없이 본문과 페이지·스크롤 선택을 계속한다', async ({ page }) => {
  await page.route('**/assets/illustrations/backgrounds/village.webp', route => route.abort());
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
  expect(await page.locator('.timeline-text').allTextContents()).toEqual(chapter.nodes.slice(0, 3).map((n: { chronicleSummary: string }) => n.chronicleSummary));
  await expect(page.locator('.timeline-text').first()).toHaveCSS('white-space', 'nowrap');
  expect(await page.locator('.timeline').evaluate(el => el.clientHeight)).toBeLessThanOrEqual(130);
  await page.getByRole('button', { name: '잠시 내리기', exact: true }).click();
  await page.getByRole('button', { name: '전체 기록', exact: true }).click();
  await expect(page.locator('.history-entry')).toHaveCount(3);
  await expect(page.locator('.history-entry .body, .history-entry .dialogue-line')).toHaveCount(0);
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await page.getByRole('button', { name: '선택지 보기', exact: true }).click(); await expect(page.locator('#choice-dialog')).toBeVisible();
});

test('7개 엔딩이 후속 서술과 독립 화면을 거치고 실제 사건만 회상하며 마지막에 중복 없이 해금된다', async ({ page }) => {
  const paths: Record<string, string[]> = {
    ending_escape: ['attack', 'escape_prison'], ending_fire: ['refuse', 'burn_office'], ending_throne: ['invoice', 'threaten_king'],
    ending_ledger: ['refuse', 'keep_records', 'ally', 'steal_ledger'],
    ending_peace: ['attack', 'forgive', 'ally', 'private_deal', 'take_money', 'end_peace'],
    ending_reform: ['attack', 'forgive', 'ally', 'private_deal', 'reject_money', 'end_reform'],
    ending_office: ['attack', 'forgive', 'ally', 'private_deal', 'buy_office', 'end_office'],
  };
  for (const [endingId, choices] of Object.entries(paths)) {
    await page.goto('./?edition=compact');
    await page.evaluate(key => { localStorage.removeItem(key); sessionStorage.removeItem('demon-king:title-seen:compact'); }, key);
    await start(page);
    for (const id of ['family_accept', 'trust_mina', ...choices]) await select(page, id);
    await expect(page.locator('[data-ending-phase="0"]')).toBeVisible(); await expect(page.locator('.game-header')).toHaveCount(0);
    const state = JSON.parse((await raw(page))!); expect(state.endingId).toBe(endingId);
    const beforeMeta = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), metaKey);
    expect(beforeMeta.discoveredEndings['demon-king'] ?? []).not.toContain(endingId);
    await page.getByRole('button', { name: '이어서', exact: true }).click();
    const memories: string[] = [];
    while (await page.locator('[data-ending-phase="1"]').count()) {
      const nodeId = await page.locator('[data-memory-node]').getAttribute('data-memory-node'); memories.push(nodeId!);
      expect(state.history.map((h: { nodeId: string }) => h.nodeId)).toContain(nodeId);
      await page.getByRole('button', { name: '이어서', exact: true }).click();
    }
    expect(memories.length).toBeLessThanOrEqual(8); expect(new Set(memories).size).toBe(memories.length);
    const originalOrder = state.history.map((h: { nodeId: string }) => h.nodeId).filter((id: string) => memories.includes(id)); expect(memories).toEqual(originalOrder);
    await expect(page.locator('[data-ending-phase="2"]')).toBeVisible();
    expect(await page.locator('.cinematic-shell').innerText()).not.toMatch(/마지막 순간|주마등|독백|엔딩카드|1\/4/);
    await page.getByRole('button', { name: '이어서', exact: true }).click(); await expect(page.locator('[data-ending-phase="3"] h1')).toBeVisible();
    await page.reload(); await expect(page.locator('[data-ending-phase="3"]')).toBeVisible();
    const collection = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), metaKey);
    expect(collection.discoveredEndings['demon-king'].filter((id: string) => id === endingId)).toHaveLength(1);
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
  await expect(page.locator('#current-event .story-illustration img')).toHaveAttribute('src', /assets\/illustrations\/backgrounds\/village\.webp$/);
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
  await page.locator('.timeline-item[data-node-id="exam"]').click();
  await expect(page.locator('[data-resume-node="exam"]')).toBeFocused();
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
