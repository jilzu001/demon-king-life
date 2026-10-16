import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { readExampleStory } from '../../scripts/read-story';
import { choose, createRun } from '../../src/engine/transition';
import { archiveTreeRun, loadTreeRuns, loadPastTreeSources, TREE_HISTORY_KEY } from '../../src/persistence/tree-history';
import { resumeAtVisitedNode, RESELECT_BACKUP_KEY } from '../../src/persistence/reselect';
import { previousCompactStory, COMPACT_V37_BACKUP_KEY } from '../../src/persistence/compact-compatible';
import { backupKey } from '../../src/persistence/compatibility';
import { compactSlot } from '../../src/content/compact-contract';
import { collectedRouteNodes, resumeSource, tree, byTreeId } from '../../src/ui/ending-tree-layout';
import { MemoryStorage } from '../fixtures';
const story = await readExampleStory('demon-king-compact');
const paths = JSON.parse(readFileSync('docs/v4.5/actual-ending-paths.json', 'utf8')) as { endingId: string; choices: string[] }[];
function play(choices: string[], id = 'source') {
  let run = createRun(story, 17, id);
  for (const choice of choices) run = choose(story, run, run.currentNodeId!, choice).nextState;
  return run;
}

it('20개 실제 엔딩 회차와 최근 미완주만 보관하며 기존 저장·도감을 쓰지 않는다', () => {
  const storage = new MemoryStorage(); storage.setItem('main-run', 'protected'); storage.setItem('meta', 'protected');
  for (const path of paths) {
    const run = play(path.choices, path.endingId); expect(run.endingId).toBe(path.endingId);
    archiveTreeRun(storage, story, run);
  }
  archiveTreeRun(storage, story, play(['family_accept'], 'unfinished-old'));
  archiveTreeRun(storage, story, play(['family_accept', 'trust_mina'], 'unfinished-new'));
  const runs = loadTreeRuns(storage, story);
  expect(runs).toHaveLength(21); expect(runs[0]!.runId).toBe('unfinished-new');
  expect(runs.filter(run => run.ended).map(run => run.endingId).sort()).toEqual(paths.map(path => path.endingId).sort());
  archiveTreeRun(storage, story, play(paths[0]!.choices, 'replacement'));
  expect(loadTreeRuns(storage, story)).toHaveLength(21); expect(loadTreeRuns(storage, story)[0]!.runId).toBe('replacement');
  expect(new TextEncoder().encode(storage.getItem(TREE_HISTORY_KEY)!).length).toBeLessThan(1_000_000);
  expect(storage.getItem('main-run')).toBe('protected'); expect(storage.getItem('meta')).toBe('protected');
});

it('기존 재선택/가져오기/구버전 백업을 검증해 읽고 원본을 변경하지 않는다', () => {
  const storage = new MemoryStorage(), run = play(['family_accept', 'trust_mina']);
  storage.setItem(RESELECT_BACKUP_KEY, JSON.stringify(run));
  storage.setItem(backupKey(compactSlot), JSON.stringify({ run: JSON.stringify(run), meta: null }));
  const old = choose(previousCompactStory, createRun(previousCompactStory, 17, 'old'), 'birth', 'family_accept').nextState;
  storage.setItem(COMPACT_V37_BACKUP_KEY, JSON.stringify({ run: JSON.stringify(old), meta: null }));
  const keys = [RESELECT_BACKUP_KEY, backupKey(compactSlot), COMPACT_V37_BACKUP_KEY, TREE_HISTORY_KEY];
  const before = keys.map(key => storage.getItem(key));
  const result = loadPastTreeSources(storage, story);
  expect(result.notice).toBe(''); expect(result.runs).toHaveLength(2);
  expect(result.runs[1]!.storyVersion).toBe(story.manifest.version);
  expect(keys.map(key => storage.getItem(key))).toEqual(before);
  const different = play(['family_appeal', 'trust_mina']);
  storage.setItem(backupKey(compactSlot), JSON.stringify({ run: JSON.stringify(different), meta: null }));
  expect(loadPastTreeSources(storage, story).runs).toHaveLength(3);
});

it('손상·변조한 기록은 복원하지 않으며 기존 보관함을 초기화하지 않는다', () => {
  const storage = new MemoryStorage(), run = play(['family_accept']);
  storage.setItem(TREE_HISTORY_KEY, '{broken');
  expect(() => archiveTreeRun(storage, story, run)).toThrow(); expect(storage.getItem(TREE_HISTORY_KEY)).toBe('{broken');
  expect(loadPastTreeSources(storage, story)).toMatchObject({ runs: [], notice: expect.stringContaining('검증하지 못해') });
  storage.setItem(TREE_HISTORY_KEY, JSON.stringify({ version: 1, runs: [{ ...run, player: { ...run.player, gold: 999 } }] }));
  expect(loadPastTreeSources(storage, story).runs).toEqual([]);
  const before = storage.getItem(TREE_HISTORY_KEY); expect(() => archiveTreeRun(storage, story, run)).toThrow();
  expect(storage.getItem(TREE_HISTORY_KEY)).toBe(before);
});

it('보관 쓰기 실패 시 이전 보관함과 현재 회차를 보존한다', () => {
  const storage = new MemoryStorage(); const first = play(['family_accept']);
  archiveTreeRun(storage, story, first); const before = storage.getItem(TREE_HISTORY_KEY);
  storage.setItem('main-run', JSON.stringify(first)); storage.fail = true;
  expect(() => archiveTreeRun(storage, story, play(['family_accept', 'trust_mina']))).toThrow('현재 회차는 교체하지 않았습니다');
  expect(storage.getItem(TREE_HISTORY_KEY)).toBe(before); expect(storage.getItem('main-run')).toBe(JSON.stringify(first));
});

it('과거 실제 원장에서 선택 직전 상태·난수를 재현하고 현재 회차를 우선한다', () => {
  const past = play(['family_accept', 'trust_mina', 'refuse', 'burn_office']);
  const current = createRun(story, 23, 'fresh'), before = JSON.stringify([past, current]);
  const node = tree.routes.ending_fire!.map(id => byTreeId.get(id)!).find(node => node.nodeId === 'exam')!;
  expect(resumeSource(node, current, [])).toBeUndefined(); expect(resumeSource(node, current, [past])).toBe(past);
  const restored = resumeAtVisitedNode(story, past, node.nodeId!, 'restored');
  expect(restored).toEqual(play(['family_accept', 'trust_mina'], 'restored'));
  expect(resumeSource(node, restored, [past])).toBe(restored);
  expect(JSON.stringify([past, current])).toBe(before);
  const differentPrefix = play(['family_appeal']);
  expect(resumeSource(node, differentPrefix, [])).toBeUndefined();
});

it('획득 경로의 색은 기존 도감의 검증된 경로 합집합이며 실제 원장을 합성하지 않는다', () => {
  const before = JSON.stringify(tree);
  expect([...collectedRouteNodes(new Set(['ending_fire', 'unknown']))]).toEqual(tree.routes.ending_fire);
  expect(collectedRouteNodes(new Set()).size).toBe(0);
  const node = byTreeId.get(tree.routes.ending_fire![2]!)!;
  expect(resumeSource(node)).toBeUndefined(); expect(JSON.stringify(tree)).toBe(before);
});

it('보관 쓰기 뒤 읽기 검증이 실패하면 이전 값을 복구한다', () => {
  const storage = new MemoryStorage(); archiveTreeRun(storage, story, play(['family_accept']));
  const before = storage.getItem(TREE_HISTORY_KEY), original = storage.setItem.bind(storage);
  let once = true;
  storage.setItem = (key, value) => { if (key === TREE_HISTORY_KEY && once) { once = false; return; } original(key, value); };
  expect(() => archiveTreeRun(storage, story, play(['family_accept', 'trust_mina']))).toThrow('지난 분기 기록 확인 실패');
  expect(storage.getItem(TREE_HISTORY_KEY)).toBe(before);
});
