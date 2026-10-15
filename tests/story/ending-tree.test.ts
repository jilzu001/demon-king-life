import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { readExampleStory } from '../../scripts/read-story';
import { choose, createRun } from '../../src/engine/transition';
import { TreeCamera, minimapTransform } from '../../src/ui/tree-camera';
import { tree, layoutTree, byTreeId, visitStatus, lastVisitedFork } from '../../src/ui/ending-tree-layout';

const story = await readExampleStory('demon-king-compact');
it('제공 카메라 역변환/팬/포인터 줌/미니맵 수학과 모바일 전체 맞춤을 유지한다', () => {
  const camera = new TreeCamera(); camera.panBy(20, -30);
  expect(camera.worldFromScreen(140, 50)).toEqual({ x: 120, y: 80 });
  const anchor = camera.worldFromScreen(150, 100); camera.zoomAt(150, 100, 1.8);
  expect(camera.worldFromScreen(150, 100)).toEqual(anchor);
  const { bounds } = layoutTree(); camera.fit(bounds, 304, 300);
  const top = camera.screenFromWorld(bounds.x, bounds.y), bottom = camera.screenFromWorld(bounds.x + bounds.width, bounds.y + bounds.height);
  expect(top.x).toBeGreaterThanOrEqual(19.9); expect(top.y).toBeGreaterThanOrEqual(19.9);
  expect(bottom.x).toBeLessThanOrEqual(284.1); expect(bottom.y).toBeLessThanOrEqual(280.1);
  camera.fit(bounds, 304, 100); const small = camera.screenFromWorld(bounds.x + bounds.width, bounds.y + bounds.height);
  expect(small.x).toBeLessThanOrEqual(284.1); expect(small.y).toBeLessThanOrEqual(80.1);
  const mini = minimapTransform(bounds, 180, 110), projected = mini.project(250, 150);
  expect(mini.unproject(projected.x, projected.y).x).toBeCloseTo(250); expect(mini.unproject(projected.x, projected.y).y).toBeCloseTo(150);
  expect(mini.rect(camera.visibleWorldRect(304, 300)).width).toBeCloseTo(304 / camera.scale * mini.scale);
});
it('20개 검증된 경로의 현재 선택과 결과만 존재하고 카메라 조작으로 노드 위치가 바뀌지 않는다', () => {
  const paths = JSON.parse(readFileSync('docs/v4.5/actual-ending-paths.json', 'utf8')) as { endingId: string; choices: string[] }[];
  const before = JSON.stringify(tree), positions = [...layoutTree().positions];
  expect(paths).toHaveLength(20); expect(tree.nodes.filter(node => node.type === 'ending')).toHaveLength(20);
  for (const path of paths) {
    let state = createRun(story, 17, 'tree');
    for (const choice of path.choices) state = choose(story, state, state.currentNodeId!, choice).nextState;
    expect(state.endingId).toBe(path.endingId);
    for (const id of tree.routes[path.endingId]!) expect(visitStatus(byTreeId.get(id)!, state).selected).toBe(true);
  }
  const camera = new TreeCamera(); camera.panBy(200, -300); camera.zoomAt(80, 120, 2);
  expect([...layoutTree().positions]).toEqual(positions); expect(JSON.stringify(tree)).toBe(before);
  expect(tree.nodes.some(node => node.nodeId?.startsWith('annual_'))).toBe(false);
});
it('일치하는 실제 방문 분기에만 재선택을 허용하고 같은 사건의 다른 선택을 선택 완료로 꾸미지 않는다', () => {
  let state = createRun(story, 17, 'fork'); state = choose(story, state, 'birth', 'family_accept').nextState;
  state = choose(story, state, 'child', 'trust_mina').nextState;
  const snapshot = JSON.stringify(state), fork = lastVisitedFork('ending_fire', state)!;
  expect(fork.nodeId).toBe('exam'); expect(visitStatus(fork, state)).toEqual({ selected: false, resumable: true });
  const future = tree.nodes.find(node => node.nodeId === 'princess')!;
  expect(visitStatus(future, state).resumable).toBe(false);
  state = choose(story, state, 'exam', 'attack').nextState;
  expect(visitStatus(fork, state).selected).toBe(false); expect(lastVisitedFork('ending_fire', state)?.nodeId).toBe('exam');
  expect(JSON.stringify(JSON.parse(snapshot))).toBe(snapshot);
});
