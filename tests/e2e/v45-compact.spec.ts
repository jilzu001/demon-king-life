import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
const key = 'existence-sim:v1:run:demon-king:compact';
const chapter = JSON.parse(readFileSync('public/stories/demon-king-compact/chapters/03_v45_expansion.json', 'utf8'));
async function start(page: Page) {
  const time = new Date('2026-10-15T00:00:00Z'); await page.clock.install({ time }); await page.clock.pauseAt(time);
  await page.goto('./'); await page.locator('[data-enter]').click(); await expect(page.locator('#current-event')).toBeAttached();
}
async function ready(page: Page) {
  if (await page.locator('[data-reading="true"]').count()) await page.locator('#reading-skip').click();
  await expect(page.locator('#choice-dialog')).toBeVisible(); await page.clock.runFor(400);
}
async function pick(page: Page, id: string, finish = true) {
  await ready(page); await page.locator(`[data-choice="${id}"]`).click();
  await expect(page.locator('#choice-aftermath')).toBeVisible();
  if (finish) { await page.clock.runFor(400); await page.locator('#reading-skip').click(); await expect(page.locator('#choice-aftermath')).toHaveCount(0); }
}
const shared = ['family_accept', 'trust_mina', 'attack', 'forgive', 'ally', 'public_audit'];
const cases = [
  { id: 'birth_tax', age: 6, prefix: [], to: 'child' },
  { id: 'mina_bridge', age: 35, prefix: shared.slice(0, 4), to: 'audit' },
  { id: 'orphan_registry', age: 50, prefix: [...shared, 'fight_case'], to: 'quiet' },
  { id: 'old_mina', age: 57, prefix: shared, to: 'final_trial' },
];
for (const item of cases) for (const selected of chapter.nodes.find((node: { id: string }) => node.id === item.id).choices) {
  test(`v4.5 실제확장/${item.id}/${selected.id}: 전용나이·결과·저장·후속사건`, async ({ page }) => {
    await start(page); for (const id of item.prefix) await pick(page, id);
    await pick(page, `explore_route_v45_${item.id}`); await ready(page);
    const state = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);
    expect(state.currentNodeId).toBe(item.id); expect(state.age).toBe(item.age);
    await expect(page.locator('#scene-title')).toHaveText(chapter.nodes.find((node: { id: string }) => node.id === item.id).title);
    await expect(page.locator('[data-choice]')).toHaveCount(3);
    await pick(page, selected.id, false);
    await expect(page.locator('.aftermath-prose .story-paragraph')).toHaveText(selected.outcomes[0].narrative.split(/\n\s*\n/));
    const next = await page.evaluate(key => localStorage.getItem(key), key);
    await page.reload(); await expect(page.locator('#choice-aftermath')).toBeVisible();
    expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(next);
    await page.clock.runFor(400); await page.locator('#reading-skip').click(); await ready(page);
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).currentNodeId, key)).toBe(item.to);
  });
}
test('v4.5 연간 기록은1~11세 한줄씩 자동/클릭 표시하고 선택/효과 없이12세 실제사건으로 이어진다', async ({ page }) => {
  await start(page); await pick(page, 'family_accept'); const saved = await page.evaluate(key => localStorage.getItem(key), key);
  const age = page.locator('.stats > div:first-child strong');
  await expect(age).toHaveText('1세');
  const first = await page.locator('#current-event .story-paragraph:visible').last().textContent();
  await page.clock.runFor(Math.max(2500, Array.from(first!).length * 170));
  await expect(age).toHaveText('2세');
  for (let year = 3; year <= 12; year++) { await page.locator('.chat-feed').click(); await expect(age).toHaveText(`${year}세`); }
  await expect(page.locator('#current-event .story-illustration img')).toHaveAttribute('src', /event_cg_v4_6\/child\.webp$/);
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(saved);
  await ready(page); await pick(page, 'trust_mina'); await ready(page);
  await expect(page.locator('[data-choice]')).toHaveCount(4); await expect(page.locator('[data-choice="confess"]')).toContainText('미나에게 사랑한다고 고백한다.');
  expect(await page.locator('#current-event .story-paragraph').allTextContents()).toContain('미나가 매년 생일에 건네던 붕대의 감촉이 떠올랐다. 신뢰가 시험 규정까지 지켜 주지는 못한다는 사실이 아팠다.');
  await page.getByRole('button', { name: '잠시 내리기', exact: true }).click(); await page.locator('.header-history').click();
  await expect(page.locator('.history-entry[data-event-id^="annual_record_"]')).toHaveCount(18);
  await expect(page.locator('.history-entry[data-event-id^="annual_record_"] button')).toHaveCount(0);
});
test('v4.5 검수CG는출생·공개재판에맞게연결되고회상문장은실제선택한하나만표시한다', async ({ page }) => {
  await start(page);
  const birth = page.locator('#current-event .story-illustration img');
  await expect(birth).toHaveAttribute('src', /event_cg_v4_5\/cg_birth_registry\.webp$/);
  for (const id of ['family_appeal', ...shared.slice(1)]) await pick(page, id);
  await ready(page);
  await expect(page.locator('#current-event .story-illustration img')).toHaveAttribute('src', /cg_public_hearing\.webp$/);
  const echo = page.locator('.story-paragraph').filter({ hasText: '재판정 문 앞에서 어머니가 첫해에 냈던 이의신청서를 펼쳤다.' }); await expect(echo).toHaveCount(1);
  await expect(page.locator('.story-paragraph').filter({ hasText: '공개 감사를 요구할 때 당신이 가장 먼저 쓴 단어는' })).toHaveCount(0);
  const image = page.locator('#current-event .story-illustration img');
  await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth === 960 && img.naturalHeight === 720)).toBe(true);
  expect(await image.evaluate((img: HTMLImageElement) => { const b = img.getBoundingClientRect(); return b.width <= img.naturalWidth && b.height <= img.naturalHeight && Math.abs(b.width / b.height - 960 / 720) < .01; })).toBe(true);
});
for (const choice of ['bring_mina', 'accept_invite']) test(`v4.5 왕궁CG/${choice}: 실제동행결과에만한번표시`, async ({ page }) => {
  await start(page); for (const id of ['family_accept', 'trust_mina', 'invoice']) await pick(page, id);
  await pick(page, choice, false); const image = page.locator('#choice-aftermath .story-illustration img');
  await expect(image).toHaveCount(choice === 'bring_mina' ? 1 : 0);
  if (choice === 'bring_mina') {
    await expect(image).toHaveAttribute('src', /cg_mina_royal_hall\.webp$/);
    await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth === 960 && img.naturalHeight === 720)).toBe(true);
    await page.reload(); await expect(page.locator('#choice-aftermath .story-illustration img')).toHaveCount(1);
  }
  await page.clock.runFor(400); await page.locator('#reading-skip').click(); await ready(page);
  await expect(page.locator('#current-event img[src*="cg_mina_royal_hall"]')).toHaveCount(0);
});
test('v4.5 주마등은실제방문·선택·고유그림만사용하고SVG는렌더링하지않는다', async ({ page }) => {
  await start(page); for (const id of [...shared, 'walk_away', 'end_peace']) await pick(page, id);
  const state = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);
  await page.getByRole('button', { name: '이어서', exact: true }).click();
  const sources: string[] = []; const visits: string[] = [];
  while (await page.locator('[data-ending-phase="1"]').count()) {
    const id = (await page.locator('[data-memory-node]').getAttribute('data-memory-node'))!; visits.push(id); expect(state.enteredNodeIds).toContain(id);
    await expect(page.locator('.cinematic-scene svg')).toHaveCount(0);
    const image = page.locator('[data-memory-node] img');
    if (await image.count()) { const path = (await image.getAttribute('src'))!; expect(sources).not.toContain(path); sources.push(path); }
    await page.getByRole('button', { name: '이어서', exact: true }).click();
  }
  expect(visits.length).toBeGreaterThanOrEqual(4); expect(visits.length).toBeLessThanOrEqual(8);
  expect(sources.some(s => s.includes('cg_birth_registry'))).toBe(true); expect(sources.some(s => s.includes('cg_public_hearing'))).toBe(true);
});
