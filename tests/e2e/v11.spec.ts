import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

const contentRoot = 'public/stories/demon-king/';
const manifest = JSON.parse(readFileSync(`${contentRoot}story.json`, 'utf8'));
const nodes = Object.fromEntries(manifest.chapters.flatMap((f: string) => JSON.parse(readFileSync(contentRoot + f, 'utf8')).nodes).map((n: { id: string }) => [n.id, n]));
const presentation = JSON.parse(readFileSync(`${contentRoot}presentation.json`, 'utf8'));
const key = 'existence-sim:v1:run:demon-king';
async function start(page: Page) { await page.goto('./'); await expect(page.getByRole('heading', { name: '가장 싼 마왕', exact: true })).toBeVisible(); }
async function select(page: Page, id: string) { const b = page.locator(`[data-choice="${id}"]`); await expect(b).toBeEnabled(); await b.click(); }
async function saved(page: Page) { return page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key); }

test('새 콘텐츠·장소·전체 대사·선택 설명과 PC 2열/모바일 1열', async ({ page }, info) => {
  await start(page);
  await expect(page.locator('.location')).toHaveText(presentation.nodes.dk20_exam.locationLabel);
  await expect(page.locator('.dialogue-line')).toHaveCount(4);
  expect(await page.locator('.dialogue-text').allTextContents()).toEqual(presentation.nodes.dk20_exam.dialogues.map((d: { text: string }) => d.text));
  expect(await page.locator('.choice-description').allTextContents()).toEqual(nodes.dk20_exam.choices.map((c: { description: string }) => c.description));
  await expect(page.locator('.timeline-item')).toHaveCount(5);
  await expect(page.locator('.timeline-item[data-node-id]')).toHaveCount(1);
  const past = (await page.locator('.life-column').boundingBox())!; const current = (await page.locator('.event-column').boundingBox())!;
  if (info.project.name === 'PC') { expect(past.x + past.width).toBeLessThan(current.x); expect(current.width / past.width).toBeGreaterThan(1.6); }
  else { expect(current.y).toBeGreaterThan(past.y + past.height - 1); expect(await page.locator('.timeline').evaluate(el => getComputedStyle(el).overflowY)).toBe('visible'); }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('v11-initial.png'), fullPage: true });
});

test('3회 연속 선택·실제 연대기·분기 비노출·저장 복원·새 결과 위치', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await start(page);
  await select(page, 'attack');
  await expect(page.locator('[data-node-id="dk20_disarmed"] .timeline-text')).toHaveText(presentation.nodes.dk20_disarmed.chronicleSummary);
  await expect(page.locator('.body')).toHaveText(nodes.dk20_disarmed.body);
  await expect(page.locator('[data-node-id="dk20_fraud_pitch"]')).toHaveCount(0);
  await expect(page.locator('#current-event')).toBeFocused();
  expect(await page.locator('#current-event').evaluate(e => e.getBoundingClientRect().top)).toBeGreaterThanOrEqual(0);
  const visibleTop = await page.locator('#current-event').evaluate(e => e.getBoundingClientRect().top);
  expect(visibleTop).toBeLessThan(await page.evaluate(() => innerHeight * .35));
  await select(page, 'apologize'); await select(page, 'plead_guilty');
  const checkpoint = await saved(page); expect(checkpoint.history).toHaveLength(3);
  expect(checkpoint.player.crimes).toEqual(['attempted_murder_convicted']);
  const timeline = await page.locator('.timeline').innerText(); await page.reload(); await expect(page.getByRole('heading', { name: nodes.dk22_prison.title })).toBeVisible();
  expect(await page.locator('.timeline').innerText()).toBe(timeline); expect(await saved(page)).toEqual(checkpoint);
  await page.getByRole('button', { name: '전체 기록', exact: true }).click();
  await expect(page.locator('.history-entry')).toHaveCount(8);
  await page.locator('.history-entry[data-event-id="scene:dk20_disarmed"] summary').click();
  await expect(page.locator('.history-entry[data-event-id="scene:dk20_disarmed"] .body')).toHaveText(nodes.dk20_disarmed.body);
  await expect(page.locator('.history-entry[data-event-id="scene:dk20_disarmed"] .dialogue-line')).toHaveCount(4);
  await page.getByRole('button', { name: '닫기' }).click();
  await page.screenshot({ path: info.outputPath('v11-progress.png'), fullPage: true });
});

test('사이드카 404·불량 JSON에서도 본편 진행과 설명은 유지된다', async ({ page }) => {
  await page.route('**/stories/demon-king/presentation.json', route => route.fulfill({ status: 404, body: 'missing' }));
  await start(page); await expect(page.locator('.dialogue-line')).toHaveCount(0); await expect(page.locator('.choice-description')).toHaveCount(6);
  await page.getByText('콘텐츠 및 저장 안내', { exact: true }).click(); await expect(page.locator('.notice')).toContainText('기존 본문과 실제 선택 기록');
  await select(page, 'attack'); await expect(page.getByRole('heading', { name: nodes.dk20_disarmed.title })).toBeVisible();
  await page.unroute('**/stories/demon-king/presentation.json');
  await page.route('**/stories/demon-king/presentation.json', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{broken' }));
  await page.reload(); await expect(page.getByRole('heading', { name: nodes.dk20_disarmed.title })).toBeVisible();
  await expect(page.locator('.dialogue-line')).toHaveCount(0); expect((await saved(page)).history).toHaveLength(1);
});

test('v1.0 전체 세이브를 백업 후 이관하고 RNG·원장은 유지한다', async ({ page }) => {
  await start(page); await select(page, 'attack'); await select(page, 'apologize');
  const original = await saved(page); const old = { ...original, storyVersion: '1.0.0' };
  await page.evaluate(({ key, old }) => localStorage.setItem(key, JSON.stringify(old)), { key, old });
  await page.reload(); await expect(page.getByRole('heading', { name: nodes.dk21_assault_trial.title })).toBeVisible();
  expect(await saved(page)).toEqual(original);
  const backup = await page.evaluate(() => JSON.parse(localStorage.getItem('existence-sim:v1:backup:before-content-v1.1')!));
  expect(JSON.parse(backup.run)).toEqual(old);
});

test('표시 데이터 응답이 멈춰도 본편은 제한 시간 뒤 시작한다', async ({ page }) => {
  await page.route('**/stories/demon-king/presentation.json', () => { /* 의도적으로 응답하지 않는다. */ });
  await start(page); await expect(page.locator('.dialogue-line')).toHaveCount(0);
  await select(page, 'attack'); await expect(page.getByRole('heading', { name: nodes.dk20_disarmed.title })).toBeVisible();
});

test('조기 사망 엔딩 및 더블클릭 방지', async ({ page }) => {
  await start(page); await page.locator('[data-choice="attack"]').dblclick();
  await expect(page.getByRole('heading', { name: nodes.dk20_disarmed.title })).toBeVisible();
  await page.waitForTimeout(500); expect((await saved(page)).history).toHaveLength(1);
  await select(page, 'second_attack'); await expect(page.locator('[data-choice]')).toHaveCount(0);
  expect((await saved(page)).endingId).toBe('end_blade'); expect((await saved(page)).player.alive).toBe(false);
});

test('긴 본문과 9개 이상 대사를 생략 없이 표시한다', async ({ page }) => {
  const chapter = JSON.parse(readFileSync(contentRoot + manifest.chapters[0], 'utf8'));
  chapter.nodes.find((n: { id: string }) => n.id === 'dk20_exam').body = nodes.dk20_exam.body.repeat(15);
  const sidecar = structuredClone(presentation); sidecar.nodes.dk20_exam.dialogues = Array.from({ length: 12 }, (_, i) => presentation.nodes.dk20_exam.dialogues[i % 4]);
  await page.route('**/stories/demon-king/chapters/01_youth.json', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(chapter) }));
  await page.route('**/stories/demon-king/presentation.json', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sidecar) }));
  await start(page); await expect(page.locator('.body')).toHaveText(nodes.dk20_exam.body.repeat(15));
  await expect(page.locator('.dialogue-line')).toHaveCount(12);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await select(page, 'attack'); await expect(page.getByRole('heading', { name: nodes.dk20_disarmed.title })).toBeVisible();
});

test('정상 엔딩까지 원클릭으로 진행하며 최근 기록은 최대 8개', async ({ page }) => {
  await start(page);
  for (let i = 0; i < 30; i++) {
    const current = await saved(page); if (current.ended) break;
    await page.locator('[data-choice]:enabled').first().click();
  }
  const end = await saved(page); expect(end.ended).toBe(true); expect(end.history.length).toBeGreaterThan(3);
  await expect(page.locator('[data-choice]')).toHaveCount(0);
  expect(await page.locator('.timeline-item').count()).toBeLessThanOrEqual(8);
});
