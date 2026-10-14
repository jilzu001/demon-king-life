import { test, expect, type Page } from '@playwright/test';
import { enterGame, lowerChoices } from './helpers';

const key = 'existence-sim:v1:run:demon-king';
async function raw(page: Page) { return page.evaluate(key => localStorage.getItem(key), key); }
async function readDelay(page: Page, selector: string) {
  return page.locator(selector).last().evaluate(el => Math.max(2500, Array.from(el.textContent ?? '').length * 170));
}
test.beforeEach(async ({ page }) => {
  const time = new Date('2026-10-14T00:00:00Z');
  await page.clock.install({ time }); await page.clock.pauseAt(time);
  await page.goto('./'); await enterGame(page);
  await expect(page.locator('#current-event')).toBeAttached();
});

test('읽을 시간을 주며 연대기 → 본문 → 대사를 자동으로 한 줄씩 표시하고 마지막 대사 뒤 선택지를 공개한다', async ({ page }) => {
  const before = await raw(page);
  await expect(page.locator('#current-event .chronicle-message:visible')).toHaveCount(1);
  await expect(page.locator('.story .body')).toBeHidden();
  await expect(page.locator('.choices')).toBeHidden();
  await expect(page.locator('[data-choice="attack"]')).toBeDisabled();
  await page.locator('[data-choice="attack"]').dispatchEvent('click');
  expect(await raw(page)).toBe(before);
  const firstDelay = await readDelay(page, '#current-event .chronicle-message:visible');
  await page.clock.runFor(firstDelay - 1);
  await expect(page.locator('#current-event .chronicle-message:visible')).toHaveCount(1);
  await page.clock.runFor(1);
  await expect(page.locator('#current-event .chronicle-message:visible')).toHaveCount(2);
  const chronicleCount = await page.locator('#current-event .chronicle-message').count();
  for (let i = 3; i <= chronicleCount; i++) {
    await page.clock.runFor(await readDelay(page, '#current-event .chronicle-message:visible'));
    await expect(page.locator('#current-event .chronicle-message:visible')).toHaveCount(i);
    await expect(page.locator('.story .body')).toBeHidden();
  }
  await page.clock.runFor(await readDelay(page, '#current-event .chronicle-message:visible'));
  await expect(page.locator('.story .body')).toBeVisible();
  await expect(page.locator('.dialogue-line:visible')).toHaveCount(0);
  await expect(page.locator('.choices')).toBeHidden();
  for (let i = 1; i <= 4; i++) {
    const selector = i === 1 ? '.story .body' : '.dialogue-line:visible';
    await page.clock.runFor(await readDelay(page, selector));
    await expect(page.locator('.dialogue-line:visible')).toHaveCount(i);
    await expect(page.locator('.choices')).toBeHidden();
  }
  const finalDelay = await readDelay(page, '.dialogue-line:last-child');
  await page.clock.runFor(finalDelay - 1);
  await expect(page.locator('.choices')).toBeHidden();
  await page.clock.runFor(1);
  await expect(page.locator('[data-choice="attack"]')).toBeVisible();
  await expect(page.locator('[data-choice="attack"]')).toBeEnabled();
  expect(await raw(page)).toBe(before);
});

test('내용 클릭은 다음 한 줄만 즉시 표시하며 새 줄의 읽기 시간이 지난 뒤 자동 진행을 이어간다', async ({ page }) => {
  const before = await raw(page);
  const firstDelay = await readDelay(page, '#current-event .chronicle-message:visible');
  await page.clock.runFor(firstDelay - 1);
  await page.locator('#current-event .chronicle-message:visible').first().click();
  await expect(page.locator('#current-event .chronicle-message:visible')).toHaveCount(2);
  await page.clock.runFor(1); // 클릭 전 타이머는 취소되어 다음 줄이 겹쳐 나오지 않는다.
  await expect(page.locator('#current-event .chronicle-message:visible')).toHaveCount(2);
  const secondDelay = await readDelay(page, '#current-event .chronicle-message:visible');
  await page.clock.runFor(secondDelay - 1);
  await expect(page.locator('#current-event .chronicle-message:visible')).toHaveCount(3);
  await expect(page.locator('.choices')).toBeHidden();
  await page.getByRole('button', { name: '빠르게 표시', exact: true }).click();
  await expect(page.getByRole('button', { name: '빠르게 표시', exact: true })).toBeDisabled();
  await expect(page.locator('.choices')).toBeHidden();
  await page.locator('#current-event .chronicle-message:visible').last().click();
  await expect(page.locator('#current-event .chronicle-message:visible')).toHaveCount(4);
  await expect(page.getByRole('button', { name: '빠르게 표시', exact: true })).toBeEnabled();
  await expect(page.locator('.choices')).toBeHidden();
  await page.clock.runFor(160);
  await expect(page.locator('#current-event .chronicle-message:visible')).toHaveCount(4);
  await expect(page.locator('.choices')).toBeHidden();
  expect(await raw(page)).toBe(before);
});

test('스킵은 한 번에 표시하고 새 장면에서는 다시 읽기, 연대기를 먼저 보여준다', async ({ page }, info) => {
  const before = await raw(page);
  const skip = page.getByRole('button', { name: '스킵 · 바로 선택하기', exact: true });
  await skip.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('.dialogue-line:visible')).toHaveCount(4);
  await expect(page.locator('[data-choice="attack"]')).toBeEnabled();
  expect(await raw(page)).toBe(before);
  await page.locator('[data-choice="attack"]').click();
  await expect(page.locator('.life-panel')).toBeFocused();
  await expect(page.getByRole('button', { name: '전체 기록', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '전체 기록', exact: true }).dispatchEvent('click');
  await expect(page.locator('.menu-dialog')).toHaveCount(0);
  if (info.project.name !== 'PC') {
    const top = await page.locator('.life-panel').evaluate(el => el.getBoundingClientRect().top);
    expect(top).toBeGreaterThanOrEqual(0); expect(top).toBeLessThan(400);
  }
  await expect(page.locator('.choices')).toBeHidden();
  await expect(page.locator('#current-event .body')).toBeHidden();
  await skip.click();
  await expect(page.locator('[data-choice="apologize"]')).toBeDisabled(); // 연속 클릭 잠금은 유지한다.
  await page.clock.runFor(400);
  await expect(page.getByRole('button', { name: '전체 기록', exact: true })).toBeEnabled();
  await expect(page.locator('[data-choice="apologize"]')).toBeEnabled();
  await page.locator('[data-choice="second_attack"]').click();
  await expect(page.locator('[data-choice]')).toHaveCount(0);
  await skip.click(); await page.clock.runFor(400);
  await expect(page.getByRole('button', { name: '새 회차 시작', exact: true })).toBeEnabled();
  const ended = await raw(page);
  await page.clock.runFor(60000); expect(await raw(page)).toBe(ended);
  await page.getByRole('button', { name: '새 회차 시작', exact: true }).click();
  await expect(page.locator('#current-event .chronicle-message:visible')).toHaveCount(1);
  await expect(page.locator('.choices')).toBeHidden();
});

test('전체 기록 열람 중에는 읽기를 멈추고 닫으면 이어간다', async ({ page }) => {
  const before = await raw(page);
  await page.getByRole('button', { name: '전체 기록', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.clock.runFor(60000);
  await expect(page.locator('#current-event .chronicle-message:visible')).toHaveCount(1);
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await expect(page.locator('#current-event .chronicle-message:visible')).toHaveCount(1);
  await page.getByRole('button', { name: '빠르게 표시', exact: true }).click();
  await page.clock.runFor(5000);
  await expect(page.locator('[data-choice="attack"]')).toBeEnabled();
  await lowerChoices(page); await page.getByRole('button', { name: '전체 기록', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: '스킵 · 바로 선택하기', exact: true })).toBeDisabled();
  expect(await raw(page)).toBe(before);
});

test('새로고침·표시 중 새 회차에도 저장을 보호하고 이전 타이머를 취소한다', async ({ page }) => {
  const before = await raw(page); await page.reload();
  await expect(page.locator('#current-event .chronicle-message:visible')).toHaveCount(1);
  expect(await raw(page)).toBe(before);
  await page.getByRole('button', { name: '저장 관리 · 엔딩 도감', exact: true }).click();
  await page.getByRole('button', { name: '새 회차 시작', exact: true }).click();
  expect(await raw(page)).not.toBe(before);
  await expect(page.locator('#current-event .chronicle-message:visible')).toHaveCount(1);
  await page.clock.runFor(500);
  await expect(page.locator('.choices')).toBeHidden();
  await page.getByRole('button', { name: '스킵 · 바로 선택하기', exact: true }).click();
  await page.clock.runFor(60000);
  const state = JSON.parse((await raw(page))!); expect(state.history).toHaveLength(0);
  await expect(page.locator('.dialogue-line:visible')).toHaveCount(4);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
