import { preV48Story } from '../../src/content/compact-previous';
import { decodeCompatibleCompact } from '../../src/persistence/compact-compatible';
import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { readExampleStory } from '../../scripts/read-story';
import { loadStory } from '../../src/content/load';
import { createRun, choose } from '../../src/engine/transition';
import { evaluate } from '../../src/engine/conditions';
import { decodeSave } from '../../src/persistence/migrate';
import { routeYears } from '../../src/content/route-years';
import { lifeEvents } from '../../src/ui/history';

const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const story = await readExampleStory('demon-king-compact');
const old = await loadStory(async path => read(`backups/before-v4.4/${path}`));
const paths = read('docs/v4.5/actual-ending-paths.json') as { endingId: string; choices: string[] }[];

it('v4.5 허용 문안 외 기존43개 선택 계약·16사건 구조·8결말·초기상태를 보존한다', () => {
  let count = 0;
  for (const node of Object.values(old.nodes)) {
    const current = preV48Story.nodes[node.id]!;
    expect({ ...current, body: node.body, chronicleSummary: node.chronicleSummary, choices: node.choices }).toEqual(node);
    expect(current.choices.slice(0, node.choices.length).map(c => ({ ...c, outcomes: c.outcomes.map(({ narrative: _text, ...o }) => o) }))).toEqual(node.choices.map(c => ({ ...c, outcomes: c.outcomes.map(({ narrative: _text, ...o }) => o) }))); count += node.choices.length;
  }
  expect(count).toBe(43);
  for (const e of Object.values(old.endings)) expect(preV48Story.endings[e.id]).toEqual(e);
  expect(preV48Story.characters).toEqual(old.characters); expect(preV48Story.manifest.initialState).toEqual(old.manifest.initialState);
  expect(preV48Story.manifest.version).toBe(old.manifest.version);
});
it('기존5328개 종단과 모든 중간 저장은 상태·원장·난수를 그대로 복원한다', () => {
  let terminals = 0;
  const visit = (state: ReturnType<typeof createRun>) => {
    expect(decodeCompatibleCompact(story, JSON.stringify(state))).toEqual(state);
    if (state.ended) { terminals++; return; }
    for (const c of old.nodes[state.currentNodeId!]!.choices) visit(choose(old, state, state.currentNodeId!, c.id).nextState);
  };
  visit(createRun(old, 17, 'all-v38-saves')); expect(terminals).toBe(5328);
}, 60000);
for (const path of paths) it(`${path.endingId}: 새 게임의 실제 선택과 중간 저장으로 도달한다`, () => {
  let state = createRun(story, 17, path.endingId);
  for (const id of path.choices) {
    expect(state.ended).toBe(false);
    state = choose(story, state, state.currentNodeId!, id).nextState;
    expect(decodeSave(story, JSON.stringify(state))).toEqual(state);
  }
  expect(state.endingId).toBe(path.endingId);
  const memories = state.enteredNodeIds; expect(new Set(memories).size).toBe(memories.length);
  const events = lifeEvents(story, state); expect(events.every(e => e.age <= state.age)).toBe(true);
  expect(lifeEvents(story, decodeSave(story, JSON.stringify(state)))).toEqual(events);
});
it('준비 사건 거절은 해금하지 않고 기존 흐름으로 복귀하며 조건 누락·관계 악화 시 우회할 수 없다', () => {
  for (const path of paths.filter(p => p.choices.some(c => c.startsWith('commit_route_')))) {
    let state = createRun(story, 17, path.endingId);
    const gateIndex = path.choices.findIndex(c => c.startsWith('explore_route_'));
    for (const id of path.choices.slice(0, gateIndex)) state = choose(story, state, state.currentNodeId!, id).nextState;
    const choice = story.nodes[state.currentNodeId!]!.choices.find(c => c.id === path.choices[gateIndex])!;
    const missing = structuredClone(state); missing.flags = [];
    expect(evaluate(story, missing, choice.enabledWhen)).toBe(false);
    expect(() => choose(story, missing, missing.currentNodeId!, choice.id)).toThrow();
    state = choose(story, state, state.currentNodeId!, choice.id).nextState;
    const setup = story.nodes[state.currentNodeId!]!;
    const years = routeYears(story, state, setup.id);
    expect(routeYears(story, decodeSave(story, JSON.stringify(state)), setup.id)).toEqual(years);
    const declined = choose(story, state, setup.id, setup.choices[1]!.id).nextState;
    expect(declined.ended).toBe(false); expect(declined.endingId).toBeNull();
    const committed = choose(story, state, setup.id, setup.choices[0]!.id).nextState;
    expect(committed.ended).toBe(false);
    const final = story.nodes[committed.currentNodeId!]!.choices[0]!;
    const unearned = structuredClone(committed); unearned.flags = state.flags;
    expect(() => choose(story, unearned, unearned.currentNodeId!, final.id)).toThrow();
    if (path.endingId === 'ending_mina_wedding') {
      expect(committed.npcs.mina!.relationship).toBe('partner');
      const low = structuredClone(committed); low.npcs.mina!.trust = 0;
      expect(() => choose(story, low, low.currentNodeId!, final.id)).toThrow();
      expect(routeYears(story, committed, committed.currentNodeId!).map(y => y.age)).toEqual(Array.from({ length: 17 }, (_, i) => i + 48));
    }
  }
});
