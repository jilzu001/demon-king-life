import { expect, type Page } from '@playwright/test';

// 기존 분기/저장 회귀 검사는 사용자가 누르는 실제 스킵 버튼으로 진행한다.
export async function skipReading(page: Page) {
  const skip = page.getByRole('button', { name: '스킵 · 바로 선택하기', exact: true });
  if (await skip.isVisible()) await skip.click();
  await expect(page.locator('[data-reading="true"]')).toHaveCount(0);
}
