import { describe, expect, it } from 'vitest';
import { decodeSave } from '../../src/persistence/migrate';
import { META_KEY, runKey, SaveStore } from '../../src/persistence/save';
import { choose } from '../../src/engine/transition';
import { example, MemoryStorage, run, steps } from '../fixtures';

describe('외부 입력 검증과 자동 저장', () => {
  it('재판 회차를 복원해도 진입 효과와 원장이 중복되지 않는다', () => {
    const state = steps(['attack_mina', 'confess', 'accept_arrest']);
    expect(decodeSave(example, JSON.stringify(state))).toEqual(state);
  });
  it('복원 뒤 가중 추첨이 새로고침 전과 동일하다', () => {
    const state = run(0); const restored = decodeSave(example, JSON.stringify(state));
    expect(choose(example, restored, restored.currentNodeId!, 'stage_fight')).toEqual(choose(example, state, state.currentNodeId!, 'stage_fight'));
  });
  it.each(['gold', 'version', 'schema', 'history', 'rng', 'dead', 'crime'])('변조된 %s 저장은 원본을 보존하며 거부한다', kind => {
    const storage = new MemoryStorage(); const store = new SaveStore(example, () => storage); store.commit(run());
    const old = store.raw(); const invalid = run() as unknown as Record<string, unknown>;
    if (kind === 'gold') (invalid.player as { gold: number }).gold = 1_000_000;
    if (kind === 'version') invalid.storyVersion = '2.0.0';
    if (kind === 'schema') invalid.saveSchemaVersion = 0;
    if (kind === 'history') invalid.history = [{ nodeId: 'fake' }];
    if (kind === 'rng') invalid.rng = { seed: 123, state: 124 };
    if (kind === 'dead') (invalid.player as { alive: boolean }).alive = false;
    if (kind === 'crime') (invalid.player as { crimes: string[] }).crimes = ['attempted_murder_convicted'];
    expect(() => store.import(JSON.stringify(invalid))).toThrow(); expect(store.raw()).toBe(old);
  });
  it('저장 실패는 이전 회차와 도감을 유지한다', () => {
    const storage = new MemoryStorage(); const store = new SaveStore(example, () => storage); store.commit(run());
    const before = new Map(storage.values); storage.fail = true;
    expect(() => store.commit(steps(['surrender']))).toThrow('자동 저장 실패'); expect(storage.values).toEqual(before);
  });
  it('도감 쓰기 후 회차 쓰기 실패 시 도감도 복구한다', () => {
    const storage = new MemoryStorage(); const store = new SaveStore(example, () => storage); store.commit(run());
    const before = new Map(storage.values); const set = storage.setItem.bind(storage);
    storage.setItem = (key, value) => { if (key === runKey('demon-king')) throw new Error('회차 실패'); set(key, value); };
    expect(() => store.commit(steps(['attack_mina', 'keep_attacking']))).toThrow(); expect(storage.values).toEqual(before);
  });
  it('새 회차는 도감을 유지하고 도감은 멱등 기록한다', () => {
    const storage = new MemoryStorage(); const store = new SaveStore(example, () => storage);
    const ended = steps(['attack_mina', 'keep_attacking']); store.commit(ended); store.commit(ended); store.commit(run(44));
    expect(store.loadMeta().discoveredEndings['demon-king']).toEqual(['end_early_death']); expect(store.load()?.history).toEqual([]);
  });
  it('손상된 현재 저장과 도감을 자동으로 덮어쓰지 않는다', () => {
    const storage = new MemoryStorage(); storage.setItem(runKey('demon-king'), '{bad');
    const store = new SaveStore(example, () => storage); expect(() => store.load()).toThrow(); expect(store.raw()).toBe('{bad');
    storage.setItem(META_KEY, '{bad'); expect(() => store.commit(run())).toThrow(); expect(storage.getItem(META_KEY)).toBe('{bad');
  });
});
