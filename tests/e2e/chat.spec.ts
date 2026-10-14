import { test, expect, type Page } from '@playwright/test';
import { readFileSync, statSync } from 'node:fs';
import { enterGame, lowerChoices, skipReading } from './helpers';

const key = 'existence-sim:v1:run:demon-king';
async function saved(page: Page) { return page.evaluate(key => localStorage.getItem(key), key); }
async function start(page: Page) { await page.goto('./'); await enterGame(page); await expect(page.locator('#current-event')).toBeAttached(); }
async function choose(page: Page, id: string) {
  await skipReading(page); const b = page.locator(`[data-choice="${id}"]`); await expect(b).toBeEnabled(); await b.click(); await skipReading(page);
}

test('타이틀에서 시작한 뒤 이름을 제거하고 새로고침에서도 제목을 반복하지 않는다', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: '가짜 마왕의 일생', exact: true })).toBeVisible();
  expect(await saved(page)).toBeNull();
  await page.getByRole('button', { name: '시작하기', exact: true }).click();
  await expect(page.locator('.game-shell')).toBeVisible();
  await expect(page.getByRole('heading', { name: '가짜 마왕의 일생', exact: true })).toHaveCount(0);
  const before = await saved(page); await page.reload();
  await expect(page.locator('#current-event')).toBeAttached();
  await expect(page.locator('.title-card')).toHaveCount(0); expect(await saved(page)).toBe(before);
});

test('정사각 초상화·4칸 상태·연대기 배경/NPC 전환과 작은 이미지 용량', async ({ page }) => {
  await start(page);
  await expect(page.locator('.stats > div')).toHaveCount(4);
  expect(await page.locator('.stats small').allTextContents()).toEqual(['나이', '전투력', '마력', '금화']);
  expect(await page.locator('.stats strong').allTextContents()).toEqual(['20세', '2', '0', '0']);
  await expect(page.locator('.player-portrait img')).toHaveJSProperty('naturalWidth', 128);
  await expect(page.locator('#npc-image')).toHaveAttribute('src', /background-v1\.webp/);
  for (const selector of ['.player-portrait', '.npc-portrait']) {
    const box = (await page.locator(selector).boundingBox())!; expect(Math.abs(box.width - box.height)).toBeLessThan(1);
  }
  await skipReading(page);
  await expect(page.locator('#npc-image')).toHaveAttribute('src', /mina-early-tired-v2\.webp/);
  await expect(page.locator('#npc-image')).toHaveAttribute('alt', '미나 초상화');
  await expect(page.locator('.portrait figcaption')).toHaveCount(0);
  const report = JSON.parse(readFileSync('docs/portrait-assets-v2.json', 'utf8'));
  const bytes = report.assets.reduce((sum: number, asset: { file: string }) => sum + statSync(asset.file).size, statSync('public/art/background-v1.webp').size);
  expect(bytes).toBeLessThan(400000);
});

test('선택 팝업 위에 최근 기록이 보이며 잠시 내리고 다시 열어도 원장이 바뀌지 않는다', async ({ page }) => {
  await start(page); await skipReading(page);
  const before = await saved(page);
  const recent = (await page.locator('.life-panel').boundingBox())!;
  const popup = (await page.locator('#choice-dialog').boundingBox())!;
  expect(popup.y).toBeGreaterThanOrEqual(recent.y + recent.height);
  await expect(page.locator('.timeline-item')).toHaveCount(3);
  await lowerChoices(page); await expect(page.locator('#choice-dialog')).toBeHidden();
  await expect(page.getByRole('button', { name: '선택지 보기', exact: true })).toBeVisible();
  await page.locator('.chat-feed').evaluate(el => { el.scrollTop = el.scrollHeight; });
  await expect(page.locator('#current-event .dialogue-line')).toHaveCount(4);
  await page.getByRole('button', { name: '선택지 보기', exact: true }).click();
  await expect(page.locator('#choice-dialog')).toBeVisible(); expect(await saved(page)).toBe(before);
  await page.keyboard.press('Escape'); await expect(page.locator('#choice-dialog')).toBeHidden();
  expect(await saved(page)).toBe(before);
});

test('위로 스크롤하거나 이전 사건 버튼을 누르면 실제 방문 사건만 한 개씩 불러온다', async ({ page }, info) => {
  await start(page); await choose(page, 'attack'); await choose(page, 'apologize'); await lowerChoices(page);
  const before = await saved(page);
  await expect(page.locator('.past-chat')).toHaveCount(0);
  await page.getByRole('button', { name: '↑ 이전 사건 불러오기', exact: true }).click();
  await expect(page.locator('.past-chat')).toHaveCount(1);
  await expect(page.locator('.past-chat[data-node-id="dk20_disarmed"] .dialogue-line')).toHaveCount(4);
  await page.locator('.chat-feed').evaluate(el => { el.scrollTop = 0; });
  if (info.project.name === 'PC') { await page.locator('.chat-feed').hover(); await page.mouse.wheel(0, -500); }
  else await page.locator('.chat-feed').evaluate(feed => {
    const send = (type: string, y: number) => feed.dispatchEvent(new TouchEvent(type, { bubbles: true, touches: [new Touch({ identifier: 1, target: feed, clientY: y })] }));
    send('touchstart', 100); send('touchmove', 140); send('touchmove', 170);
  });
  await expect(page.locator('.past-chat')).toHaveCount(2);
  await expect(page.locator('.past-chat[data-node-id="dk20_exam"]')).toHaveCount(1);
  await expect(page.locator('.past-chat[data-node-id="dk20_fraud_pitch"]')).toHaveCount(0);
  expect(await saved(page)).toBe(before);
});

test('하단 일시정지·재생이 읽기만 제어하며 인물/설정 메뉴에서 저장을 보호한다', async ({ page }) => {
  const time = new Date('2026-10-14T00:00:00Z'); await page.clock.install({ time }); await page.clock.pauseAt(time);
  await start(page); const before = await saved(page);
  await page.getByRole('button', { name: '일시정지', exact: true }).click();
  await page.clock.runFor(60000); await expect(page.locator('.chronicle-message:visible')).toHaveCount(1);
  await expect(page.locator('.reading-status')).toHaveText('잠시 멈췄습니다.');
  await page.getByRole('button', { name: '재생', exact: true }).click(); await page.clock.runFor(15000);
  expect(await page.locator('.chronicle-message:visible').count()).toBeGreaterThan(1);
  await page.getByRole('button', { name: '인물 관계 · 재산 · 법적 기록', exact: true }).click();
  await expect(page.locator('.people-list')).toContainText('미나');
  await expect(page.locator('.people-list')).toContainText('유죄 확정 전과: 없음');
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await page.getByRole('button', { name: '저장 관리 · 엔딩 도감', exact: true }).click();
  await expect(page.getByRole('button', { name: '회차 JSON 내보내기', exact: true })).toBeVisible();
  await expect(page.locator('.menu-dialog')).toContainText('발견한 엔딩 0 / 34');
  expect(await saved(page)).toBe(before);
});

test('짧은 모바일 화면에서도 상태판·조작부·최근 기록이 선택 팝업 밖에 남는다', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 }); await start(page); await skipReading(page);
  const hud = (await page.locator('.game-header').boundingBox())!;
  const recent = (await page.locator('.life-panel').boundingBox())!;
  const popup = (await page.locator('#choice-dialog').boundingBox())!;
  const toolbar = (await page.locator('.game-toolbar').boundingBox())!;
  expect(hud.y).toBeGreaterThanOrEqual(0); expect(popup.y).toBeGreaterThanOrEqual(recent.y + recent.height);
  expect(popup.y + popup.height).toBeLessThanOrEqual(toolbar.y);
  expect(toolbar.y + toolbar.height).toBeLessThanOrEqual(568);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight)).toBe(true);
});

test('실제 공격 실패 뒤 미나의 화남·황당 표정을 대사 순서에 맞춰 표시한다', async ({ page }) => {
  const time = new Date('2026-10-14T00:00:00Z'); await page.clock.install({ time }); await page.clock.pauseAt(time);
  await start(page); await skipReading(page); await page.locator('[data-choice="attack"]').click();
  await page.clock.runFor(400); const before = await saved(page);
  await expect(page.locator('#npc-image')).toHaveAttribute('src', /background-v1\.webp/);
  await page.getByRole('button', { name: '빠르게 표시', exact: true }).click();
  await page.clock.runFor(320);
  await expect(page.locator('#npc-image')).toHaveAttribute('src', /mina-early-angry-v2\.webp/);
  await page.clock.runFor(160);
  await expect(page.locator('#player-image')).toHaveAttribute('src', /player-early-confused-v2\.webp/);
  await page.clock.runFor(160);
  await expect(page.locator('#npc-image')).toHaveAttribute('src', /mina-early-confused-v2\.webp/);
  expect(await saved(page)).toBe(before);
  expect(JSON.parse(before!).history).toHaveLength(1);
  expect(JSON.parse(before!).player.crimes).toEqual([]);
});
