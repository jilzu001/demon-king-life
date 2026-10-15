import { test, expect, type Page } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';

const paths = JSON.parse(readFileSync('docs/v4.4/routes/actual-paths.json', 'utf8')) as {
  endingId: string; title: string; choices: string[]; age: number; artwork: string; body: string;
}[];
const runKey = 'existence-sim:v1:run:demon-king:compact';
const metaKey = 'existence-sim:v1:meta:demon-king:compact';
async function select(page: Page, id: string) {
  await expect(page.locator('#current-event')).toBeAttached();
  if (await page.locator('[data-reading="true"]').count()) await page.locator('#reading-skip').click();
  await expect(page.locator('#choice-dialog')).toBeVisible(); await page.clock.runFor(400);
  const choice = page.locator(`[data-choice="${id}"]`); await expect(choice).toBeEnabled();
  await choice.click(); await expect(page.locator('#choice-aftermath')).toBeVisible();
  await page.clock.runFor(400); await page.locator('#reading-skip').click();
  await expect(page.locator('#choice-aftermath')).toHaveCount(0);
}
for (const path of paths) test(`실제20엔딩/${path.endingId}: 새 게임부터 선택·회상·획득·도감·이미지·복원`, async ({ page }) => {
  test.setTimeout(60000);
  const time = new Date('2026-10-15T00:00:00Z'); await page.clock.install({ time }); await page.clock.pauseAt(time);
  const statuses: number[] = [];
  page.on('response', response => { if (new URL(response.url()).pathname.endsWith('/' + path.artwork)) statuses.push(response.status()); });
  await page.goto('./'); await expect(page.locator('[data-enter]')).toBeEnabled(); await page.locator('[data-enter]').click();
  for (const [index, id] of path.choices.entries()) {
    await select(page, id);
    const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), runKey);
    expect(saved.history.at(-1).choiceId).toBe(id);
    expect(saved.ended).toBe(index === path.choices.length - 1);
    // 신규 경로도 실제 중간 저장으로 새로고침 후 이어간다. 완료 상태를 주입하지 않는다.
    if (id.startsWith('commit_route_')) {
      await page.reload(); await expect(page.locator('#current-event')).toBeAttached();
      expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), runKey)).toEqual(saved);
    }
  }
  await expect(page.locator('[data-ending-phase="0"]')).toBeVisible();
  const initialImage = page.locator('[data-ending-phase="0"] .ending-art img');
  await expect.poll(() => initialImage.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  const source = await initialImage.getAttribute('src'); expect(source!.endsWith('/' + path.artwork)).toBe(true);
  await expect(page.locator('[data-ending-phase="0"] svg')).toHaveCount(0);
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), runKey);
  expect(saved.endingId).toBe(path.endingId); expect(saved.age).toBe(path.age);
  const locked = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), metaKey);
  expect(locked.discoveredEndings['demon-king'] ?? []).not.toContain(path.endingId);
  await page.getByRole('button', { name: '이어서', exact: true }).click();
  const memories: string[] = [];
  while (await page.locator('[data-ending-phase="1"]').count()) {
    const id = (await page.locator('[data-memory-node]').getAttribute('data-memory-node'))!;
    expect(saved.enteredNodeIds).toContain(id); memories.push(id);
    await page.getByRole('button', { name: '이어서', exact: true }).click();
  }
  await expect(page.locator('[data-ending-phase="2"]')).toBeVisible();
  await page.getByRole('button', { name: '이어서', exact: true }).click();
  await expect(page.locator('[data-ending-phase="3"] .ending-art img')).toHaveAttribute('src', source!);
  await expect(page.locator('[data-ending-phase="3"] svg')).toHaveCount(0);
  await page.reload(); await expect(page.locator('[data-ending-phase="3"]')).toBeVisible();
  const unlocked = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), metaKey);
  expect(unlocked.discoveredEndings['demon-king']).toEqual([path.endingId]);
  await page.getByRole('button', { name: '도감 보기', exact: true }).click();
  await expect(page.locator('[data-ending-detail]')).toHaveCount(1);
  await expect(page.locator('.ending-gallery-locked')).toHaveCount(19);
  await page.locator(`[data-ending-detail="${path.endingId}"]`).click();
  await expect(page.locator('.ending-detail h3')).toHaveText(path.title);
  await expect(page.locator('.ending-detail .ending-art img')).toHaveAttribute('src', source!);
  expect(await page.locator('.ending-full-text').textContent()).toBe(path.body.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean).join(''));
  const bounds = await page.locator('.ending-detail img').evaluate((image: HTMLImageElement) => {
    const r = image.getBoundingClientRect(); return { width: r.width, height: r.height, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight };
  });
  expect(bounds.width).toBeLessThanOrEqual(bounds.naturalWidth + 1); expect(bounds.height).toBeLessThanOrEqual(Math.min(360, bounds.naturalHeight) + 1);
  expect(bounds.width / bounds.height).toBeCloseTo(bounds.naturalWidth / bounds.naturalHeight, 2);
  expect(statuses).toContain(200);
  expect(await page.locator('.menu-dialog').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  writeFileSync(`docs/v4.4/routes/browser-${path.endingId}-${test.info().project.name}.json`, JSON.stringify({ endingId: path.endingId, choices: path.choices, age: saved.age, memories, image: source, statuses, bounds, saveRestored: true, unlockAfterLastCard: true }, null, 2) + '\n');
  await page.getByRole('button', { name: '닫기', exact: true }).click(); await expect(page.locator('.ending-gallery-list li')).toHaveCount(20);
});
