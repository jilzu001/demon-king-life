import { expect, type Page } from '@playwright/test';

export async function enterGame(page: Page) {
  if (await page.evaluate(() => sessionStorage.getItem('demon-king:title-seen') === '1')) return;
  const start = page.locator('[data-enter]'); await expect(start).toBeEnabled(); await start.click();
}
export async function lowerChoices(page: Page) {
  const lower = page.getByRole('button', { name: '잠시 내리기', exact: true });
  if (await lower.isVisible()) await lower.click();
}
export async function showChoices(page: Page) {
  if (!await page.locator('#choice-dialog').isVisible()) {
    const launch = page.getByRole('button', { name: '선택지 보기', exact: true }); await expect(launch).toBeEnabled(); await launch.click();
  }
}

// 기존 분기/저장 회귀 검사는 사용자가 누르는 실제 스킵 버튼으로 진행한다.
export async function skipReading(page: Page) {
  await expect(page.locator('#current-event')).toBeAttached();
  const skip = page.getByRole('button', { name: '스킵 · 바로 선택하기', exact: true });
  if (await page.locator('[data-reading="true"]').count()) await skip.click();
  await expect(page.locator('[data-reading="true"]')).toHaveCount(0);
}
