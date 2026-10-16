import { test, expect, type Page } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
const endings = JSON.parse(readFileSync('public/stories/demon-king-compact/endings.json', 'utf8')).endings as { id: string; title: string; body: string }[];
const runKey = 'existence-sim:v1:run:demon-king:compact', metaKey = 'existence-sim:v1:meta:demon-king:compact';
async function open(page: Page, start = false) {
  const now = new Date('2026-10-15T00:00:00Z'); await page.clock.install({ time: now }); await page.clock.pauseAt(now);
  await page.goto('./'); if (start) await page.locator('[data-enter]').click();
  await page.getByRole('button', { name: '저장 관리 · 엔딩 도감', exact: true }).click();
  await page.locator('[data-ending-tree-open]').click(); await expect(page.locator('.ending-tree-dialog')).toBeVisible();
}
async function snapshot(page: Page) { return page.evaluate(([run, meta]) => [localStorage.getItem(run!), localStorage.getItem(meta!)], [runKey, metaKey]); }
const fixed = (page: Page) => page.locator('.tree-node').evaluateAll(nodes => nodes.map(node => [node.getAttribute('data-tree-node'), (node as HTMLElement).style.left, (node as HTMLElement).style.top]));
test('트리 기본 잠금/카메라 드래그·휠·미니맵/노드 고정/원장 불변/닫기 포커스', async ({ page }) => {
  await open(page, true); const state = await snapshot(page), positions = await fixed(page);
  const tree = page.locator('.ending-tree-dialog'), view = page.locator('.tree-viewport');
  await expect(tree.locator('[data-tree-type="ending"]')).toHaveCount(20); await expect(tree.locator('img')).toHaveCount(0);
  for (const ending of endings) expect(await tree.innerText()).not.toContain(ending.title);
  const box = (await view.boundingBox())!, point = { x: box.x + 30, y: box.y + 25 };
  const initial = await view.getAttribute('data-camera-x');
  await page.mouse.move(point.x, point.y); await page.mouse.down(); await page.mouse.move(point.x + 70, point.y + 40, { steps: 8 }); await page.mouse.up();
  expect(await view.getAttribute('data-camera-x')).not.toBe(initial); await page.clock.runFor(300);
  const scale = await view.getAttribute('data-camera-scale'); await page.mouse.move(point.x + 20, point.y + 20); await page.mouse.wheel(0, -200);
  await expect.poll(() => view.getAttribute('data-camera-scale')).not.toBe(scale);
  const mini = (await page.locator('.tree-minimap').boundingBox())!, beforeMap = await view.getAttribute('data-camera-scale');
  await page.mouse.move(mini.x + mini.width * .2, mini.y + mini.height * .3); await page.mouse.down(); await page.mouse.move(mini.x + mini.width * .7, mini.y + mini.height * .7, { steps: 5 }); await page.mouse.up();
  expect(await view.getAttribute('data-camera-scale')).toBe(beforeMap); expect(await fixed(page)).toEqual(positions); expect(await snapshot(page)).toEqual(state);
  await tree.getByRole('button', { name: '전체 보기', exact: true }).click();
  const rect = await page.locator('.mini-viewport').evaluate(node => Object.fromEntries(['x','y','width','height'].map(key => [key, Number(node.getAttribute(key))])));
  expect(rect.x!).toBeGreaterThanOrEqual(0); expect(rect.y!).toBeGreaterThanOrEqual(0);
  expect(rect.x! + rect.width!).toBeLessThanOrEqual(180); expect(rect.y! + rect.height!).toBeLessThanOrEqual(110);
  expect(rect.width!).toBeGreaterThan(0); expect(rect.height!).toBeGreaterThan(0);
  await tree.getByRole('button', { name: '닫기', exact: true }).click(); await expect(tree).toHaveCount(0);
  await expect(page.locator('[data-ending-tree-open]')).toBeFocused(); expect(await snapshot(page)).toEqual(state);
});
test('힌트는 명시적으로 켜야 보이며 잠긴 엔딩 그림/결말은 계속 숨기고 재열기/ESC/뒤로가기를 지원한다', async ({ page }) => {
  await open(page); const tree = page.locator('.ending-tree-dialog');
  await page.getByLabel('목표 엔딩', { exact: true }).selectOption('ending_mina_wedding');
  await tree.getByRole('button', { name: '목표 엔딩 찾기', exact: true }).click();
  await expect(tree.locator('img')).toHaveCount(0); await expect(tree.getByRole('list', { name: '검증된 수집 경로' })).toHaveCount(0);
  await expect(tree.locator('.tree-node.is-target')).toHaveCount(1);
  await page.locator('[data-tree-spoilers]').check(); await expect(tree.getByRole('list', { name: '검증된 수집 경로' })).toBeVisible();
  expect(await tree.locator('.tree-node.is-target').count()).toBeGreaterThan(1);
  await expect(tree.locator('img')).toHaveCount(0); expect(await tree.innerText()).not.toContain(endings.find(ending => ending.id === 'ending_mina_wedding')!.body);
  await page.keyboard.press('Escape'); await expect(tree).toHaveCount(0); await expect(page.locator('[data-ending-tree-open]')).toBeFocused();
  await page.locator('[data-ending-tree-open]').click(); await expect(page.locator('[data-tree-spoilers]')).not.toBeChecked();
  await page.goBack(); await expect(tree).toHaveCount(0); await expect(page.locator('[data-ending-tree-open]')).toBeFocused();
});
test('실제 방문 분기 재선택은 확인 전 저장을 바꾸지 않고 확인 후 기존 백업으로 복원된다', async ({ page }) => {
  await open(page, true); await page.keyboard.press('Escape'); await page.locator('.menu-dialog').getByRole('button', { name: '닫기', exact: true }).click();
  for (const id of ['family_accept', 'trust_mina']) {
    await page.locator('#reading-skip').click(); await page.clock.runFor(400); await page.locator(`[data-choice="${id}"]`).click();
    await page.clock.runFor(400); await page.locator('#reading-skip').click();
  }
  await page.getByRole('button', { name: '저장 관리 · 엔딩 도감', exact: true }).click(); await page.locator('[data-ending-tree-open]').click();
  const before = await snapshot(page), tree = page.locator('.ending-tree-dialog'); await page.locator('[data-tree-spoilers]').check();
  await page.getByLabel('목표 엔딩', { exact: true }).selectOption('ending_fire'); await tree.getByRole('button', { name: '목표 엔딩 찾기', exact: true }).click();
  await tree.getByRole('button', { name: '방문 분기 보기', exact: true }).click();
  await tree.getByRole('button', { name: '이 사건부터 재선택', exact: true }).click(); expect(await snapshot(page)).toEqual(before);
  await tree.getByRole('button', { name: '취소', exact: true }).click(); expect(await snapshot(page)).toEqual(before);
  await tree.getByRole('button', { name: '이 사건부터 재선택', exact: true }).click(); await tree.getByRole('button', { name: '확인 · 여기부터 재선택', exact: true }).click();
  await expect(tree).toHaveCount(0);
  const after = await snapshot(page), state = JSON.parse(after[0]!); expect(state.currentNodeId).toBe('exam'); expect(state.history).toHaveLength(2); expect(after[1]).toBe(before[1]);
  expect(await page.evaluate(() => localStorage.getItem('existence-sim:v1:backup:before-reselect:demon-king:compact'))).toBe(before[0]);
});
test('모바일 실제 두 손가락 핀치는 카메라만 확대하고 노드/게임 원장을 유지한다', async ({ page, context }) => {
  test.skip(!test.info().project.use.isMobile, '실제 터치는 모바일 프로젝트에서 검사'); await open(page, true);
  const state = await snapshot(page), positions = await fixed(page), view = page.locator('.tree-viewport'), box = (await view.boundingBox())!;
  const before = Number(await view.getAttribute('data-camera-scale')), x = box.x + box.width / 2, y = box.y + box.height / 3;
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x - 25, y, id: 1 }, { x: x + 25, y, id: 2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 65, y, id: 1 }, { x: x + 65, y, id: 2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(async () => Number(await view.getAttribute('data-camera-scale'))).toBeGreaterThan(before * 1.5);
  expect(await fixed(page)).toEqual(positions); expect(await snapshot(page)).toEqual(state); await cdp.detach();
});
test('320/360/390/430/1280px·150% 글자에서 트리 컨트롤과 미니맵·전체 보기·노드 탭을 유지한다', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('demon-king:ui:text-percent', '150')); await open(page);
  for (const width of [320, 360, 390, 430, 1280]) {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 900 });
    const tree = page.locator('.ending-tree-dialog'); await tree.getByRole('button', { name: '전체 보기', exact: true }).click();
    expect((await page.locator('.tree-viewport').boundingBox())!.height).toBeGreaterThanOrEqual(160);
    if (width === 320) {
      await tree.locator('.tree-help summary').click(); await tree.getByRole('button', { name: '전체 보기', exact: true }).click();
      expect((await page.locator('.tree-viewport').boundingBox())!.height).toBeGreaterThanOrEqual(120);
      await tree.locator('.tree-help summary').click();
    }
    for (const locator of [tree.getByRole('button', { name: '닫기', exact: true }), tree.getByRole('button', { name: '전체 보기', exact: true }), page.locator('.tree-minimap')]) {
      const b = (await locator.boundingBox())!; expect(b.x).toBeGreaterThanOrEqual(0); expect(b.x + b.width).toBeLessThanOrEqual(width + 1); expect(b.y + b.height).toBeLessThanOrEqual((await page.viewportSize())!.height + 1);
    }
    await page.getByLabel('목표 엔딩', { exact: true }).selectOption('ending_peace'); await tree.getByRole('button', { name: '목표 엔딩 찾기', exact: true }).click();
    await expect(page.locator('.tree-detail')).toBeVisible(); await tree.getByRole('button', { name: '상세 접기', exact: true }).click();
    expect(await tree.locator('.tree-node').evaluateAll(nodes => nodes.every(node => [...node.children].every(line => line.getBoundingClientRect().bottom <= node.getBoundingClientRect().bottom - 1)))).toBe(true);
    if (width === 320 || width === 1280) { mkdirSync('docs/v4.6/tree-screenshots', { recursive: true }); await page.screenshot({ path: `docs/v4.6/tree-screenshots/${test.info().project.name}-${width}.png` }); }
  }
});


test('실제 획득 엔딩은 트리에서도 동일 WebP·전체 결말을 표시하며 나머지19개는 잠근다', async ({ page }) => {
  await open(page, true); await page.keyboard.press('Escape'); await page.locator('.menu-dialog').getByRole('button', { name: '닫기', exact: true }).click();
  for (const id of ['family_accept', 'trust_mina', 'refuse', 'burn_office']) {
    await page.locator('#reading-skip').click(); await page.clock.runFor(400); await page.locator(`[data-choice="${id}"]`).click();
    await page.clock.runFor(400); await page.locator('#reading-skip').click();
  }
  const source = await page.locator('[data-ending-phase="0"] .ending-art img').getAttribute('src');
  for (let guard = 0; guard < 15 && !await page.locator('[data-ending-phase="3"]').count(); guard++) await page.getByRole('button', { name: '이어서', exact: true }).click();
  await expect(page.locator('[data-ending-phase="3"]')).toBeVisible(); await page.getByRole('button', { name: '도감 보기', exact: true }).click();
  await expect(page.locator('.ending-gallery-locked')).toHaveCount(19); const before = await snapshot(page);
  await page.locator('[data-ending-tree-open]').click(); await page.getByLabel('목표 엔딩', { exact: true }).selectOption('ending_fire');
  await page.locator('.ending-tree-dialog').getByRole('button', { name: '목표 엔딩 찾기', exact: true }).click();
  await expect(page.locator('.tree-detail .ending-art img')).toHaveAttribute('src', source!);
  const ending = endings.find(e => e.id === 'ending_fire')!; await expect(page.locator('.tree-detail .ending-detail h3')).toHaveText(ending.title);
  expect(await page.locator('.tree-detail .ending-full-text').textContent()).toBe(ending.body.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean).join(''));
  await expect(page.locator('.ending-tree-dialog img')).toHaveCount(1); expect(await snapshot(page)).toEqual(before);
});

async function focusGestureNode(page: Page) {
  const tree = page.locator('.ending-tree-dialog');
  await page.getByLabel('목표 엔딩', { exact: true }).selectOption('ending_fire');
  await tree.getByRole('button', { name: '목표 엔딩 찾기', exact: true }).click();
  await tree.getByRole('button', { name: '상세 접기', exact: true }).click();
  const view = page.locator('.tree-viewport');
  const node = page.locator('[data-tree-node="ending:ending_fire"]');
  const b = (await node.boundingBox())!;
  return { view, node, x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

test('노드 글자 위의 휠·드래그는 포커스로 카메라를 재설정하지 않고 떼기 전 상세를 열지 않는다', async ({ page }) => {
  await open(page, true); const before = await snapshot(page), positions = await fixed(page);
  const { view, node, x, y } = await focusGestureNode(page);
  await page.mouse.move(x, y); await page.mouse.wheel(0, -300);
  await expect.poll(async () => Number(await view.getAttribute('data-camera-scale'))).toBeGreaterThan(1.5);
  const scale = Number(await view.getAttribute('data-camera-scale')), startX = Number(await view.getAttribute('data-camera-x')), startY = Number(await view.getAttribute('data-camera-y'));
  await page.mouse.down();
  expect(Number(await view.getAttribute('data-camera-scale'))).toBe(scale);
  await page.mouse.move(x + 25, y + 70, { steps: 10 }); await page.mouse.up();
  expect(Number(await view.getAttribute('data-camera-scale'))).toBe(scale);
  expect(Number(await view.getAttribute('data-camera-x'))).toBeCloseTo(startX + 25, 0);
  expect(Number(await view.getAttribute('data-camera-y'))).toBeCloseTo(startY + 70, 0);
  await expect(page.locator('.tree-detail')).toBeHidden();
  const v = (await view.boundingBox())!, b = (await node.boundingBox())!;
  const tapX = Math.max(v.x + 15, Math.min(v.x + v.width - 15, b.x + b.width / 2));
  const tapY = Math.max(v.y + 15, Math.min(v.y + v.height - 15, b.y + b.height / 2));
  await page.mouse.move(tapX, tapY); await page.mouse.down(); await expect(page.locator('.tree-detail')).toBeHidden();
  await page.mouse.move(tapX + 2, tapY + 2); await page.mouse.up(); await expect(page.locator('.tree-detail')).toBeVisible();
  await page.locator('.tree-detail').getByRole('button', { name: '상세 접기', exact: true }).click();
  await node.focus(); await page.keyboard.press('Enter'); await expect(page.locator('.tree-detail')).toBeVisible();
  expect(await snapshot(page)).toEqual(before); expect(await fixed(page)).toEqual(positions);
});

test('노드에서 시작한 실제 터치 연속 드래그·핀치·한 손가락 잔류·취소 후 탭을 구분한다', async ({ page, context }) => {
  test.skip(!test.info().project.use.isMobile, '실제 터치는 모바일 프로젝트에서 검사');
  await open(page, true); const before = await snapshot(page), positions = await fixed(page);
  let target = await focusGestureNode(page); const cdp = await context.newCDPSession(page);
  const startY = Number(await target.view.getAttribute('data-camera-y'));
  const finger = (x: number, y: number, id = 1) => ({ x, y, id });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [finger(target.x, target.y)] });
  for (const dy of [12, 30, 55, 80]) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [finger(target.x, target.y + dy)] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  expect(Number(await target.view.getAttribute('data-camera-y')) - startY).toBeCloseTo(80, 0);
  await expect(page.locator('.tree-detail')).toBeHidden();
  // 250ms 기다리지 않고 바로 다음 탭을 할 수 있어야 한다.
  await page.touchscreen.tap(target.x, target.y + 80); await expect(page.locator('.tree-detail')).toBeVisible();
  await page.locator('.tree-detail').getByRole('button', { name: '상세 접기', exact: true }).click();
  target = await focusGestureNode(page);
  const scale = Number(await target.view.getAttribute('data-camera-scale'));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [finger(target.x - 20, target.y), finger(target.x + 20, target.y, 2)] });
  for (const dx of [30, 42, 55]) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [finger(target.x - dx, target.y), finger(target.x + dx, target.y, 2)] });
  await expect.poll(async () => Number(await target.view.getAttribute('data-camera-scale'))).toBeGreaterThan(scale * 1.8);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [finger(target.x - 55, target.y)] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [finger(target.x - 45, target.y + 15)] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.locator('.tree-detail')).toBeHidden();
  target = await focusGestureNode(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [finger(target.x, target.y)] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await expect(page.locator('.tree-detail')).toBeHidden();
  await page.touchscreen.tap(target.x, target.y); await expect(page.locator('.tree-detail')).toBeVisible();
  expect(await snapshot(page)).toEqual(before); expect(await fixed(page)).toEqual(positions); await cdp.detach();
});

const historyKey = 'existence-sim:v1:tree-history:demon-king:compact';
const graph = JSON.parse(readFileSync('src/content/generated/ending-tree.json', 'utf8')) as { nodes: { id: string; nodeId?: string; choiceId?: string }[]; edges: unknown[]; routes: Record<string, string[]> };
async function storageSnapshot(page: Page) { return page.evaluate(() => JSON.stringify(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)]))); }
async function chooseId(page: Page, id: string) {
  if (await page.locator('#reading-skip').isEnabled()) await page.locator('#reading-skip').click();
  await page.clock.runFor(400); await page.locator(`[data-choice="${id}"]`).click(); await page.clock.runFor(400);
  if (await page.locator('#reading-skip').isEnabled()) await page.locator('#reading-skip').click();
}
async function selectStep(page: Page, nodeId: string, choiceId: string) {
  const id = graph.nodes.find(node => node.nodeId === nodeId && node.choiceId === choiceId)!.id;
  const node = page.locator(`[data-tree-node="${id}"]`); await node.focus(); await node.click();
}
test('전체44사건119선택과 합류선344개를 표시하며 구 획득ID만으로 과거 회차를 꾸미지 않는다', async ({ page }) => {
  await page.addInitScript(([key]) => localStorage.setItem(key!, JSON.stringify({ saveSchemaVersion: 1, discoveredEndings: { 'demon-king': ['ending_fire'] } })), [metaKey]);
  await open(page, true); const before = await storageSnapshot(page), tree = page.locator('.ending-tree-dialog');
  await expect(tree.locator('.tree-node')).toHaveCount(140); await expect(tree.locator('[data-tree-type="step"]')).toHaveCount(119);
  await expect(tree.locator('.tree-lines path')).toHaveCount(344);
  await expect(tree.locator('.tree-node.is-collected')).toHaveCount(graph.routes.ending_fire!.length);
  await expect(tree.locator('.tree-node.is-visited')).toHaveCount(1);
  await expect(tree.locator('.mini-collected')).toHaveCount(graph.routes.ending_fire!.length);
  await selectStep(page, 'exam', 'refuse');
  await expect(tree.locator('.tree-detail')).toContainText('실제 회차 저장이 없어');
  await expect(tree.getByRole('button', { name: /이 사건부터 재선택/ })).toHaveCount(0);
  await page.locator('[data-tree-spoilers]').check();
  for (const node of graph.nodes.filter(node => node.choiceId)) await expect(tree.locator(`[data-tree-node="${node.id}"] small`)).not.toBeEmpty();
  await expect(tree.locator('img')).toHaveCount(0); expect(await storageSnapshot(page)).toBe(before);
});

test('실제 엔딩 획득→새 회차→과거 분기 복원→다른 선택→새로고침에서 도감·능력·원장을 보존한다', async ({ page }) => {
  await open(page, true); await page.keyboard.press('Escape'); await page.locator('.menu-dialog').getByRole('button', { name: '닫기', exact: true }).click();
  for (const id of ['family_accept', 'trust_mina', 'refuse', 'burn_office']) await chooseId(page, id);
  for (let guard = 0; guard < 15 && !await page.locator('[data-ending-phase="3"]').count(); guard++) await page.getByRole('button', { name: '이어서', exact: true }).click();
  await expect(page.locator('[data-ending-phase="3"]')).toBeVisible();
  const completed = await snapshot(page), oldRun = JSON.parse(completed[0]!);
  await page.getByRole('button', { name: '도감 보기', exact: true }).click();
  await page.locator('.menu-dialog').getByRole('button', { name: '새 회차 시작', exact: true }).click();
  const fresh = await snapshot(page); expect(JSON.parse(fresh[0]!).history).toHaveLength(0); expect(fresh[1]).toBe(completed[1]);
  const archive = JSON.parse((await page.evaluate(key => localStorage.getItem(key), historyKey))!); expect(archive.runs[0]).toEqual(oldRun);
  await page.getByRole('button', { name: '저장 관리 · 엔딩 도감', exact: true }).click(); await page.locator('[data-ending-tree-open]').click();
  const tree = page.locator('.ending-tree-dialog'), before = await storageSnapshot(page);
  await expect(tree.locator('.tree-node.is-collected')).toHaveCount(graph.routes.ending_fire!.length);
  await selectStep(page, 'exam', 'refuse');
  mkdirSync('docs/tree-collection', { recursive: true });
  await page.screenshot({ path: `docs/tree-collection/${test.info().project.name}-collected.png` });
  await tree.getByRole('button', { name: '이전 회차 · 이 사건부터 재선택', exact: true }).click(); expect(await storageSnapshot(page)).toBe(before);
  await tree.getByRole('button', { name: '취소', exact: true }).click(); expect(await storageSnapshot(page)).toBe(before);
  await tree.getByRole('button', { name: '이전 회차 · 이 사건부터 재선택', exact: true }).click();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem; let once = true;
    Storage.prototype.setItem = function(key: string, value: string) {
      if (once && key === 'existence-sim:v1:backup:before-reselect:demon-king:compact') { once = false; throw new Error('백업 검사 실패'); }
      return original.call(this, key, value);
    };
  });
  await tree.getByRole('button', { name: '확인 · 여기부터 재선택', exact: true }).click();
  await expect(page.locator('[role="alert"]')).toContainText('백업 검사 실패'); expect(await snapshot(page)).toEqual(fresh);
  await page.getByRole('button', { name: '저장 관리 · 엔딩 도감', exact: true }).click();
  await page.locator('[data-ending-tree-open]').click(); await selectStep(page, 'exam', 'refuse');
  await tree.getByRole('button', { name: '이전 회차 · 이 사건부터 재선택', exact: true }).click();
  await tree.getByRole('button', { name: '확인 · 여기부터 재선택', exact: true }).click(); await expect(tree).toHaveCount(0);
  const resumed = JSON.parse((await snapshot(page))[0]!); expect(resumed.currentNodeId).toBe('exam'); expect(resumed.history).toEqual(oldRun.history.slice(0, 2));
  expect(resumed.rng.seed).toBe(oldRun.rng.seed); expect(resumed.ended).toBe(false); expect(resumed.runId).not.toBe(oldRun.runId);
  expect(await page.evaluate(() => localStorage.getItem('existence-sim:v1:backup:before-reselect:demon-king:compact'))).toBe(fresh[0]);
  await chooseId(page, 'attack'); const chosen = await snapshot(page); expect(JSON.parse(chosen[0]!).history.at(-1).choiceId).toBe('attack'); expect(chosen[1]).toBe(completed[1]);
  await page.reload(); expect(await snapshot(page)).toEqual(chosen);
  await page.getByRole('button', { name: '저장 관리 · 엔딩 도감', exact: true }).click(); await expect(page.locator('.ending-gallery-locked')).toHaveCount(19);
  await page.locator('[data-ending-tree-open]').click();
  await expect(page.locator('.tree-node.is-collected')).toHaveCount(graph.routes.ending_fire!.length);
  await expect(page.locator('.tree-node.is-visited')).toHaveCount(4);
});
