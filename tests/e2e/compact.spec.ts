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
  await expect(page.locator('#current-event .story-prose img')).toHaveCount(0);
  expect(await page.evaluate(() => (window as Window & { __unsafe?: number }).__unsafe)).toBeUndefined();
  expect(await page.locator('#current-event .story-paragraph').first().textContent()).toContain('<img');
  for (const id of ['family_accept', 'trust_mina', 'attack', 'escape_prison']) await select(page, id);
  await page.getByRole('button', { name: '이어서', exact: true }).click();
  const memory = await page.locator('[data-memory-node]').getAttribute('data-memory-node');
  await page.clock.runFor(60000); expect(await page.locator('[data-memory-node]').getAttribute('data-memory-node')).toBe(memory);
  await page.locator('.cinematic-content').click(); expect(await page.locator('[data-memory-node]').getAttribute('data-memory-node')).not.toBe(memory);
});

test('원작 저장과 도감을 유지하면서 모드를 오가고 다른 모드의 저장 가져오기를 거부한다', async ({ page }) => {
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
  await expect(page.getByRole('alert')).toContainText('원작 모드'); expect(await raw(page)).toBe(compactSave);
  await page.goto('./?edition=original');
  if (await page.evaluate(() => sessionStorage.getItem('demon-king:title-seen') !== '1')) {
    await expect(page.locator('[data-enter]')).toBeEnabled(); await page.locator('[data-enter]').click();
  }
  await expect(page.locator('#current-event')).toBeAttached();
  expect(await page.evaluate(key => localStorage.getItem(key), originalKey)).toBe(text); expect(await raw(page)).toBe(compactSave);
});
