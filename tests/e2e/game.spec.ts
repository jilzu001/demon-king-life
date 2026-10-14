import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { enterGame, lowerChoices, showChoices, skipReading } from './helpers';
const legacy = JSON.parse(readFileSync('public/stories/demon-king-legacy-phase1/story.json', 'utf8'));
const legacyInitial = { ...legacy.initialState, saveSchemaVersion: 1, storyId: legacy.id, storyVersion: legacy.version,
  runId: 'browser-regression', currentNodeId: legacy.entryNodeId, endingId: null, ended: false,
  rng: { seed: 123, state: 123 }, history: [], enteredNodeIds: [legacy.entryNodeId] };

const key = 'existence-sim:v1:run:demon-king';
async function select(page: Page, id: string) {
  await skipReading(page);
  await showChoices(page);
  const choice = page.locator(`[data-choice="${id}"]`);
  await expect(choice).toBeEnabled(); await choice.click(); await skipReading(page);
}
async function saved(page: Page) {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);
}
test.beforeEach(async ({ page }) => {
  await page.addInitScript(({ key, save }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(save)); }, { key, save: legacyInitial });
  await page.goto('./');
  await enterGame(page);
  await skipReading(page);
  await expect(page.getByRole('heading', { name: '첫 용사 시험' })).toBeVisible();
});

test('공격·고백·재판·엔딩, 새로고침과 새 회차 도감 유지', async ({ page }) => {
  await select(page, 'attack_mina'); await expect(page.getByRole('heading', { name: '칼날 앞의 고백' })).toBeVisible();
  expect((await saved(page)).player.crimes).toEqual([]);
  await select(page, 'confess'); await select(page, 'accept_arrest');
  await expect(page.getByRole('heading', { name: '다음 해의 재판' })).toBeVisible();
  const before = await saved(page); expect(before.player.legalStatus).toBe('under_trial'); expect(before.age).toBe(21);
  await page.reload(); await skipReading(page); await expect(page.getByRole('heading', { name: '다음 해의 재판' })).toBeVisible();
  expect(await saved(page)).toEqual(before);
  await select(page, 'plead'); await expect(page.getByRole('heading', { name: '고백과 공소장' })).toBeVisible();
  expect((await saved(page)).player.crimes).toEqual(['attempted_murder_convicted']);
  await expect(page.locator('[data-choice]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '새 회차 시작', exact: true }).first()).toBeEnabled();
  await page.getByRole('button', { name: '새 회차 시작', exact: true }).first().click();
  await lowerChoices(page); await page.getByRole('button', { name: '저장 관리 · 엔딩 도감', exact: true }).click();
  await expect(page.getByText('이전 예제에서 발견 · 고백과 공소장', { exact: true })).toBeVisible();
  expect((await saved(page)).player.crimes).toEqual([]);
});

test('생포 엔딩까지 진행하고 브라우저 뒤로가기로 원장이 되돌아가지 않는다', async ({ page }) => {
  await page.evaluate(() => history.pushState({}, '', '?view=game'));
  await select(page, 'surrender'); await select(page, 'accept');
  await expect(page.getByRole('heading', { name: '살아 있는 시험 과제' })).toBeVisible();
  const before = await saved(page); await page.goBack();
  await expect(page.getByRole('heading', { name: '살아 있는 시험 과제' })).toBeVisible();
  expect(await saved(page)).toEqual(before);
});

test('도망 선택도 실패 판정을 거쳐 생포 엔딩으로 끝난다', async ({ page }) => {
  await select(page, 'run'); await expect(page.getByRole('heading', { name: '도망도 실력이다' })).toBeVisible();
  await select(page, 'stop'); await select(page, 'accept');
  await expect(page.getByRole('heading', { name: '살아 있는 시험 과제' })).toBeVisible();
  expect((await saved(page)).history.map((h: { choiceId: string }) => h.choiceId)).toEqual(['run', 'stop', 'accept']);
});

test('더블클릭은 단 한 번의 선택만 저장한다', async ({ page }) => {
  await page.locator('[data-choice="attack_mina"]').dblclick();
  await skipReading(page);
  await expect(page.getByRole('heading', { name: '칼날 앞의 고백' })).toBeVisible();
  await page.waitForTimeout(500);
  expect((await saved(page)).history).toHaveLength(1);
});

test('자동 저장 실패는 다음 장면을 표시하지 않고 재시도·JSON 내보내기를 제공한다', async ({ page }) => {
  const before = await saved(page);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    (window as Window & { restoreStorage?: () => void }).restoreStorage = () => { Storage.prototype.setItem = original; };
    Storage.prototype.setItem = () => { throw new DOMException('용량 부족', 'QuotaExceededError'); };
  });
  await select(page, 'attack_mina');
  await expect(page.getByRole('alert')).toContainText('자동 저장 실패');
  await expect(page.getByRole('heading', { name: '첫 용사 시험' })).toBeVisible();
  await expect(page.getByRole('button', { name: '저장 다시 시도' })).toBeVisible();
  const downloading = page.waitForEvent('download');
  await page.getByRole('alert').getByRole('button', { name: '회차 JSON 내보내기' }).click();
  expect((await downloading).suggestedFilename()).toBe('demon-king-save.json');
  expect(await saved(page)).toEqual(before);
  await page.evaluate(() => (window as Window & { restoreStorage?: () => void }).restoreStorage!());
  await expect(page.getByRole('button', { name: '저장 다시 시도' })).toBeEnabled();
  await page.getByRole('button', { name: '저장 다시 시도' }).click();
  await skipReading(page);
  await expect(page.getByRole('heading', { name: '칼날 앞의 고백' })).toBeVisible();
  expect((await saved(page)).history).toHaveLength(1);
  await expect(page.getByRole('status')).toContainText('지난 선택 판정: 실패');
});

test('JSON 내보내기·가져오기를 통해 실제 진행 상태를 복원한다', async ({ page }) => {
  await select(page, 'attack_mina');
  const checkpoint = await saved(page);
  await expect(page.locator('[data-choice="confess"]')).toBeEnabled();
  await lowerChoices(page); await page.getByRole('button', { name: '저장 관리 · 엔딩 도감', exact: true }).click();
  await page.getByRole('button', { name: '새 회차 시작', exact: true }).click();
  await lowerChoices(page); await page.getByRole('button', { name: '저장 관리 · 엔딩 도감', exact: true }).click();
  await page.locator('#save-file').setInputFiles({ name: 'save.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(checkpoint)) });
  await skipReading(page);
  await expect(page.getByRole('heading', { name: '칼날 앞의 고백' })).toBeVisible(); expect(await saved(page)).toEqual(checkpoint);
});

test('변조 JSON과 저장된 손상 데이터를 덮어쓰지 않는다', async ({ page }) => {
  const before = await saved(page); const invalid = structuredClone(before); invalid.player.gold = 1000000;
  await lowerChoices(page); await page.getByRole('button', { name: '저장 관리 · 엔딩 도감', exact: true }).click();
  await page.locator('#save-file').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(invalid)) });
  await expect(page.getByRole('alert')).toContainText('실제 선택 결과'); expect(await saved(page)).toEqual(before);
  await page.evaluate(key => localStorage.setItem(key, '{broken'), key); await page.reload();
  await expect(page.getByRole('alert')).toContainText('JSON 문법 오류');
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe('{broken');
});

test('320px 이상에서 가로 넘침이 없고 선택 버튼을 키보드로 실행한다', async ({ page }, testInfo) => {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('game.png'), fullPage: true });
  const choice = page.locator('[data-choice="surrender"]');
  expect((await choice.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await choice.focus(); await page.keyboard.press('Enter');
  await skipReading(page);
  await expect(page.getByRole('heading', { name: '마왕 생포' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('콘텐츠 로딩 실패는 재시도 화면을 제공하며 기존 저장을 보존한다', async ({ page }) => {
  const before = await saved(page);
  await page.route('**/stories/demon-king/chapters/*.json', route => route.fulfill({ status: 404, body: 'missing' }));
  await page.reload(); await expect(page.getByRole('alert')).toContainText('콘텐츠 요청 실패');
  await expect(page.getByRole('button', { name: '콘텐츠 다시 불러오기' })).toBeVisible();
  expect(await saved(page)).toEqual(before);
  await page.unroute('**/stories/demon-king/chapters/*.json'); await page.getByRole('button', { name: '콘텐츠 다시 불러오기' }).click();
  await enterGame(page); await skipReading(page);
  await expect(page.getByRole('heading', { name: '첫 용사 시험' })).toBeVisible();
});
