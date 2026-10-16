import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadStory } from '../../src/content/load';
import { preV48Story } from '../../src/content/compact-previous';
import { assertCompactChoiceMinimum } from '../../src/content/compact-contract';
import { choose, createRun } from '../../src/engine/transition';
import { evaluate } from '../../src/engine/conditions';
import { decodeCompatibleCompact } from '../../src/persistence/compact-compatible';
import { resumeAtVisitedNode } from '../../src/persistence/reselect';
import type { GameState } from '../../src/engine/types';

const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const current = preV48Story; // v3.8 구 회차의 무변경 계약을 검사한다.
const baseline = read('backups/before-v3.8/01_complete.json');
const previous = await loadStory(async path => path === 'story.json' ? read('backups/before-v4.4/story.json') : path === 'chapters/01_complete.json' ? baseline : read(`backups/before-v4.4/${path}`));
const v38 = await loadStory(async path => read(`backups/before-v4.4/${path}`));
const source = read('spec/content-v3.8-min-choices/chapters/01_complete.json');
const additions: Record<string, string[]> = {
  birth: ['family_appeal', 'family_invoice'], child: ['mina_contract', 'mina_rival'],
  quiet: ['peace_open'], final_trial: ['reform_read'], office: ['office_close'],
};

it('최신 16사건/36선택은 그대로 두고 지정한 5사건의 작가 선택 7개만 병합한다', () => {
  expect(Object.keys(v38.nodes)).toEqual(Object.keys(previous.nodes));
  let added = 0;
  for (const [id, old] of Object.entries(previous.nodes)) {
    const node = v38.nodes[id]!;
    expect({ ...node, choices: old.choices }).toEqual(old);
    expect(node.choices.slice(0, old.choices.length)).toEqual(old.choices);
    const extra = node.choices.slice(old.choices.length);
    expect(extra.map(c => c.id)).toEqual(additions[id] ?? []);
    for (const choice of extra) expect(choice).toEqual(source.nodes.find((n: { id: string }) => n.id === id).choices.find((c: { id: string }) => c.id === choice.id));
    added += extra.length;
  }
  expect(added).toBe(7);
  expect(v38.manifest).toEqual(previous.manifest);
  expect(v38.endings).toEqual(previous.endings);
  expect(v38.characters).toEqual(previous.characters);
  expect(v38.nodes.exam!.choices.map(c => c.id)).toEqual(['attack', 'refuse', 'invoice', 'confess']);
  expect(v38.nodes.exam!.choices[3]!.text).toBe('미나에게 사랑한다고 고백한다.');
});

it('일반 사건은 최소2개이며 0·1개 회귀를 거부하고 엔딩은 별도 유형으로 보호한다', () => {
  expect(() => assertCompactChoiceMinimum(current)).not.toThrow();
  for (const count of [0, 1]) {
    const broken = structuredClone(current); broken.nodes.birth!.choices = broken.nodes.birth!.choices.slice(0, count);
    expect(() => assertCompactChoiceMinimum(broken)).toThrow(/birth.*최소 2개/);
  }
  expect(Object.values(current.endings)).toHaveLength(20);
  const events = read('content/events_v2_9.json').events;
  expect(events).toHaveLength(65);
  for (const event of events) expect(event.choices.length).toBeGreaterThanOrEqual(2);
});

it('v3.7의319종단 경로와 모든 중간 저장은 상태·원장·난수 변경 없이 이어진다', () => {
  let terminals = 0;
  const visit = (state: GameState) => {
    expect(decodeCompatibleCompact(current, JSON.stringify(state))).toEqual(state);
    if (state.ended) { terminals++; return; }
    for (const c of previous.nodes[state.currentNodeId!]!.choices) visit(choose(previous, state, state.currentNodeId!, c.id).nextState);
  };
  visit(createRun(previous, 17, 'v37-all-saves'));
  expect(terminals).toBe(319);
});

it.each(Array.from({ length: 100 }, (_, index) => index + 1))('시드 %i: 신규 선택별 고유 서술·플래그와 진행·저장·재선택을 검증한다', seed => {
  const paths: Record<string, string[]> = {
    birth: [], child: ['family_accept'],
    quiet: ['family_accept', 'trust_mina', 'attack', 'forgive', 'ally', 'private_deal', 'take_money'],
    final_trial: ['family_accept', 'trust_mina', 'attack', 'forgive', 'ally', 'public_audit', 'fight_case', 'reject_money'],
    office: ['family_accept', 'trust_mina', 'attack', 'forgive', 'ally', 'private_deal', 'buy_office'],
  };
  for (const [nodeId, ids] of Object.entries(additions)) {
    let state = createRun(previous, seed, `new-${seed}-${nodeId}`);
    for (const id of paths[nodeId]!) state = choose(previous, state, state.currentNodeId!, id).nextState;
    expect(state.currentNodeId).toBe(nodeId);
    const narratives = new Set(current.nodes[nodeId]!.choices.flatMap(c => c.outcomes.map(o => o.narrative)));
    expect(narratives.size).toBe(current.nodes[nodeId]!.choices.length);
    for (const id of ids) {
      let next = choose(current, state, nodeId, id).nextState;
      const choice = current.nodes[nodeId]!.choices.find(c => c.id === id)!;
      const effect = choice.outcomes[0]!.effects![0]!;
      expect(effect.op).toBe('addToSet'); expect(effect.path).toBe('flags');
      expect(next.flags).toContain(effect.value);
      expect(next.player).toEqual(state.player); expect(next.npcs).toEqual(state.npcs);
      expect(decodeCompatibleCompact(current, JSON.stringify(next))).toEqual(next);
      const resumed = resumeAtVisitedNode(current, next, nodeId, `resumed-${id}`);
      expect(resumed.history).toEqual(state.history);
      expect(resumed.flags).toEqual(state.flags);
      // 이후 사건도 실제 판정으로 진행하고 결말까지 저장 복원을 확인한다.
      while (!next.ended) {
        const enabled = current.nodes[next.currentNodeId!]!.choices.filter(c => evaluate(current, next, c.enabledWhen));
        expect(enabled.length).toBeGreaterThanOrEqual(2);
        next = choose(current, next, next.currentNodeId!, enabled[0]!.id).nextState;
      }
      expect(decodeCompatibleCompact(current, JSON.stringify(next))).toEqual(next);
    }
  }
});
