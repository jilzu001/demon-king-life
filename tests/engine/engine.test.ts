import { describe, expect, it } from 'vitest';
import { applyEffects, validateEffect } from '../../src/engine/effects';
import { evaluate, validateCondition } from '../../src/engine/conditions';
import { choose, createRun } from '../../src/engine/transition';
import { random, weightedIndex } from '../../src/engine/random';
import { assertPresence } from '../../src/engine/invariants';
import { assertLegalTransition } from '../../src/content/policies';
import { copyStory, example, run, steps } from '../fixtures';

describe('선택은 시도이며 조건으로 판정한다', () => {
  it('전투력 2의 정면 공격은 제압되며 전과는 아직 없다', () => {
    const original = run(); const snapshot = structuredClone(original);
    const { nextState, transitionReceipt } = choose(example, original, original.currentNodeId!, 'attack_mina');
    expect(transitionReceipt.result).toBe('failure'); expect(nextState.currentNodeId).toBe('dk20_disarmed');
    expect(nextState.npcs.mina!.alive).toBe(true); expect(nextState.npcs.mina!.trust).toBe(-90);
    expect(nextState.player.combat).toBe(2); expect(nextState.player.crimes).toEqual([]);
    expect(nextState.rng).toEqual(original.rng); expect(original).toEqual(snapshot);
  });
  it('공격 뒤 고백은 용서나 연애를 보장하지 않는다', () => {
    const state = steps(['attack_mina', 'confess']);
    expect(state.npcs.mina!.affection).toBe(-80); expect(state.npcs.mina!.relationship).toBe('childhood_friend');
    expect(state.player.crimes).toEqual([]);
  });
  it('재판 진입 효과는 한번 적용되고, 실제 판결에서만 전과가 생긴다', () => {
    const state = steps(['attack_mina', 'confess', 'accept_arrest']);
    expect(state.age).toBe(21); expect(state.player.legalStatus).toBe('under_trial'); expect(state.player.crimes).toEqual([]);
    const ended = choose(example, state, state.currentNodeId!, 'plead').nextState;
    expect(ended.ended).toBe(true); expect(ended.player.crimes).toEqual(['attempted_murder_convicted']);
    expect(ended.player.legalStatus).toBe('imprisoned');
  });
  it('사망 엔딩 뒤의 모든 선택은 거부한다', () => {
    const state = steps(['attack_mina', 'keep_attacking']);
    expect(state.ended).toBe(true); expect(state.player.alive).toBe(false); expect(state.age).toBe(20);
    expect(() => choose(example, state, 'dk20_disarmed', 'give_up')).toThrow('종료된');
  });
  it('이미 처리된 장면의 중복 선택을 거부한다', () => {
    const state = steps(['surrender']); const before = structuredClone(state);
    expect(() => choose(example, state, 'dk20_confrontation', 'surrender')).toThrow('현재 장면');
    expect(state).toEqual(before);
  });
  it('조건 미충족 입력과 자격 결과 0개를 실패로 차단한다', () => {
    const story = copyStory(); const state = run();
    const choice = story.nodes.dk20_confrontation!.choices[0]!;
    choice.enabledWhen = { op: 'gte', path: 'player.gold', value: 1_000_000 };
    expect(() => choose(story, state, state.currentNodeId!, choice.id)).toThrow('실행 조건');
    delete choice.enabledWhen;
    choice.outcomes[0]!.when = { op: 'gte', path: 'player.combat', value: 8402 };
    expect(() => choose(story, state, state.currentNodeId!, choice.id)).toThrow('적용 가능한 결과');
    expect(state).toEqual(run());
  });
  it('효과 중간 실패 시 원본과 RNG 모두 보존한다', () => {
    const story = copyStory(); const original = run();
    story.nodes.dk20_confrontation!.choices[0]!.outcomes[0]!.effects = [
      { op: 'add', path: 'player.gold', value: 300 }, { op: 'add', path: 'player.gold', value: -1_000_000 },
    ];
    expect(() => choose(story, original, original.currentNodeId!, 'attack_mina')).toThrow('최솟값');
    expect(original).toEqual(run());
  });
  it('진입 효과의 렌더/복원 재실행으로 보상이 중복되지 않는다', () => {
    const story = copyStory(); story.nodes.dk20_voluntary_detained!.entryEffects = [{ op: 'add', path: 'player.gold', value: 10 }];
    const first = choose(story, createRun(story, 123, 'test-run'), 'dk20_confrontation', 'surrender').nextState;
    const end = choose(story, first, 'dk20_voluntary_detained', 'accept').nextState;
    expect(first.player.gold).toBe(10); expect(end.player.gold).toBe(10);
    expect(first.enteredNodeIds.filter(id => id === 'dk20_voluntary_detained')).toHaveLength(1);
  });
});

describe('조건·효과 타입과 세계 상태 보호', () => {
  it('all/any/not과 모든 비교 연산자를 평가한다', () => {
    expect(evaluate(example, run(), { all: [{ op: 'eq', path: 'player.magic', value: 0 }, { not: { op: 'contains', path: 'flags', value: 'awakened' } }] })).toBe(true);
    expect(evaluate(example, run(), { any: [{ op: 'gte', path: 'player.gold', value: 100 }, { op: 'lte', path: 'player.combat', value: 2 }] })).toBe(true);
    expect(evaluate(example, run(), { op: 'neq', path: 'player.species', value: 'demon' })).toBe(true);
    expect(evaluate(example, run(), { op: 'gt', path: 'player.combat', value: 2 })).toBe(false);
  });
  it('금화 없는 즉시 지급, 신뢰 범위 초과, 타입 위반을 거부한다', () => {
    expect(() => applyEffects(example, run(), [{ op: 'add', path: 'player.gold', value: -1_000_000 }])).toThrow();
    expect(() => applyEffects(example, run(), [{ op: 'add', path: 'npcs.mina.trust', value: 51 }])).toThrow();
    expect(() => validateEffect(example, { op: 'set', path: 'player.combat', value: true })).toThrow();
    expect(() => validateCondition(example, { op: 'contains', path: 'player.gold', value: 'money' })).toThrow();
    expect(() => validateCondition(example, { op: 'gt', path: 'player.alive', value: true })).toThrow();
  });
  it('미등록 인물/아이템과 prototype 경로를 거부한다', () => {
    for (const path of ['npcs.unknown.trust', 'inventory.ring', 'npcs.__proto__.alive', 'age']) expect(() => validateEffect(example, { op: 'set', path, value: 1 })).toThrow();
  });
  it('등록된 물품을 음수로 만들 수 없다', () => {
    const story = copyStory(); story.manifest.initialState.inventory.ring = 1;
    const state = createRun(story, 0, 'inventory');
    applyEffects(story, state, [{ op: 'add', path: 'inventory.ring', value: -1 }]);
    expect(state.inventory.ring).toBe(0);
    expect(() => applyEffects(story, state, [{ op: 'add', path: 'inventory.ring', value: -1 }])).toThrow();
  });
  it('사망자의 부활과 실제 등장은 금지하고 회상·언급은 허용한다', () => {
    const state = run(); state.npcs.mina!.alive = false;
    expect(() => applyEffects(example, state, [{ op: 'set', path: 'npcs.mina.alive', value: true }])).toThrow('부활');
    const node = structuredClone(example.nodes.dk20_confrontation!);
    node.chronicle = [{ age: 20, text: '현장', presence: ['mina'] }];
    expect(() => assertPresence(example, state, node)).toThrow('사망 인물');
    node.chronicle = [{ age: 12, text: '회상', flashback: ['mina'], reference: ['mina'] }];
    expect(() => assertPresence(example, state, node)).not.toThrow();
  });
  it('집합 항목은 중복 없이 추가/삭제된다', () => {
    const state = run();
    applyEffects(example, state, [{ op: 'addToSet', path: 'flags', value: 'known_clue' }, { op: 'addToSet', path: 'flags', value: 'known_clue' }]);
    expect(state.flags.filter(f => f === 'known_clue')).toHaveLength(1);
    applyEffects(example, state, [{ op: 'removeFromSet', path: 'flags', value: 'known_clue' }]);
    expect(state.flags).not.toContain('known_clue');
  });
  it('혐의만으로 전과를 확정할 수 없고 이혼 신청만으로 배우자가 바뀌지 않는다', () => {
    const before = run(); const after = structuredClone(before);
    after.player.crimes.push('attempted_murder_convicted');
    const entry = { age: 20, nodeId: 'dk20_confrontation', choiceId: 'surrender', outcomeId: 'captured', toKind: 'node' as const, toId: 'dk20_voluntary_detained' };
    expect(() => assertLegalTransition(example, before, after, entry)).toThrow('판결');
    after.player.crimes = []; before.npcs.erisia!.relationship = 'spouse'; after.npcs.erisia!.relationship = 'ex_spouse';
    after.flags.push('divorce_requested_erisia');
    expect(() => assertLegalTransition(example, before, after, entry)).toThrow('이혼 신청');
    after.flags.push('divorce_finalized_erisia'); expect(() => assertLegalTransition(example, before, after, entry)).not.toThrow();
  });
  it('혼인/장부/반역 제안은 관련 없는 권리·죄를 자동 생성하지 않는다', () => {
    const state = run();
    applyEffects(example, state, [{ op: 'addToSet', path: 'flags', value: 'marriage_registered' }, { op: 'addToSet', path: 'flags', value: 'known_budget_discrepancy' }, { op: 'addToSet', path: 'flags', value: 'erisia_proposed_rebellion' }]);
    expect(state.flags).not.toContain('succession_right'); expect(state.flags).not.toContain('mina_is_conspirator');
    expect(state.player.crimes).toEqual([]); expect(state.player.gold).toBe(0);
  });
});

describe('mulberry32 v1 재현성', () => {
  it('고정 벡터와 가중치 경계를 유지한다', () => {
    expect(random(0)).toEqual({ state: 1831565813, value: 0.26642920868471265 });
    expect(weightedIndex([1, 2], 0)).toBe(0); expect(weightedIndex([1, 2], 1 / 3)).toBe(1);
    expect(() => weightedIndex([0], .5)).toThrow();
  });
  it.each(Array.from({ length: 20 }, (_, i) => i))('seed %i의 회차 및 판정이 재현된다', seed => {
    let a = run(seed); let b = run(seed);
    a = choose(example, a, a.currentNodeId!, 'stage_fight').nextState;
    b = choose(example, b, b.currentNodeId!, 'stage_fight').nextState;
    while (!a.ended) {
      const choice = example.nodes[a.currentNodeId!]!.choices.find(c => evaluate(example, a, c.enabledWhen))!;
      a = choose(example, a, a.currentNodeId!, choice.id).nextState;
      b = choose(example, b, b.currentNodeId!, choice.id).nextState;
      expect(a).toEqual(b);
    }
    expect(a.endingId).toBeTruthy();
    expect(choose(example, run(seed + 100), 'dk20_confrontation', 'stage_fight').nextState.rng.seed).toBe(seed + 100);
    expect(a.rng.seed).toBe(seed);
  });
});
