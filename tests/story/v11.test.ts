import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { simulateAll } from '../../src/content/simulate';
import { validatePresentation } from '../../src/content/presentation';
import { simulationKey } from '../../src/content/simulation-key';
import { lifeEvents } from '../../src/ui/history';
import { createRun, choose } from '../../src/engine/transition';
import { evaluate } from '../../src/engine/conditions';
import { resolveCompatibleSave, backupBeforeImport, BACKUP_KEY } from '../../src/persistence/compatibility';
import { runKey, SaveStore } from '../../src/persistence/save';
import { fullContent, example, run, steps, MemoryStorage } from '../fixtures';

const newRun = (seed = 42) => createRun(fullContent, seed, 'v11-tests');
function progress(choices: string[]) {
  return choices.reduce((state, choice) => choose(fullContent, state, state.currentNodeId!, choice).nextState, newRun());
}
describe('콘텐츠 v1.1 및 사이드카 계약', () => {
  it('98장면·340설명·363결과·34엔딩과 29장면/116대사를 유지한다', () => {
    expect(Object.keys(fullContent.nodes)).toHaveLength(98); expect(Object.keys(fullContent.endings)).toHaveLength(34);
    const choices = Object.values(fullContent.nodes).flatMap(n => n.choices);
    expect(choices).toHaveLength(340); expect(choices.every(c => Boolean(c.description?.trim()))).toBe(true);
    expect(choices.flatMap(c => c.outcomes)).toHaveLength(363);
    const presentation = Object.values(fullContent.presentation!.nodes);
    expect(presentation).toHaveLength(98); expect(presentation.filter(s => s.dialogues)).toHaveLength(29);
    expect(presentation.flatMap(s => s.dialogues ?? [])).toHaveLength(116);
  });
  it('실행용 콘텐츠가 첨부 ZIP 원본과 바이트 단위로 일치한다', () => {
    for (const file of ['story.json', 'characters.json', 'endings.json', 'presentation.json', ...fullContent.manifest.chapters]) {
      expect(readFileSync(`public/stories/demon-king/${file}`).equals(readFileSync(`spec/content-v1.1/demon_king_content_v1_1/${file}`))).toBe(true);
    }
  });
  it('v1.1 전수 경로 검증이 상한 내 완료되고 모든 엔딩을 확인한다', () => {
    const report = simulateAll(fullContent);
    expect(report.reachableNodes).toBe(98); expect(Object.keys(report.endings)).toHaveLength(34);
    expect(report.states).toBeLessThan(100000); expect(report.terminalPaths).toBe(4935390988); expect(report.warnings).toEqual([]);
  }, 20000);
  it('표시 버전·노드 범위 오류를 거부한다', () => {
    const data = structuredClone(fullContent.presentation!); data.storyVersion = '0.0.0';
    expect(() => validatePresentation(fullContent, data)).toThrow('버전');
    data.storyVersion = '1.1.0'; delete data.nodes.dk20_exam;
    expect(() => validatePresentation(fullContent, data)).toThrow('범위');
  });
  it.each(Array.from({ length: 20 }, (_, i) => i))('v1.1 seed %i의 전체 회차가 결정적으로 종료된다', seed => {
    let a = newRun(seed); let b = newRun(seed);
    for (let turn = 0; turn < 35 && !a.ended; turn++) {
      const available = fullContent.nodes[a.currentNodeId!]!.choices.filter(c => evaluate(fullContent, a, c.enabledWhen));
      const choice = available[(seed + turn) % available.length]!;
      a = choose(fullContent, a, a.currentNodeId!, choice.id).nextState;
      b = choose(fullContent, b, b.currentNodeId!, choice.id).nextState;
      expect(a).toEqual(b);
    }
    expect(a.ended).toBe(true); expect(fullContent.endings[a.endingId!]).toBeDefined();
  });
  it('연대기는 출생 기록과 방문 장면·확정 결과만 누적하고 같은 나이의 순서를 유지한다', () => {
    const initial = lifeEvents(fullContent, newRun()); expect(initial).toHaveLength(5);
    const state = progress(['attack', 'confess']); const events = lifeEvents(fullContent, state);
    expect(events.map(e => e.nodeId).filter(Boolean)).toEqual(['dk20_exam', 'dk20_disarmed', 'dk20_after_attack_confession']);
    expect(events.find(e => e.nodeId === 'dk20_disarmed')?.summary).toBe(fullContent.presentation!.nodes.dk20_disarmed!.chronicleSummary);
    expect(events.find(e => e.nodeId === state.currentNodeId)?.result).toBeUndefined();
    expect(events.some(e => e.nodeId === 'dk20_fraud_pitch')).toBe(false);
    expect(events.filter(e => e.kind === 'origin')).toHaveLength(4); expect(new Set(events.map(e => e.id)).size).toBe(events.length);
  });
  it('숫자 비교 경계 양쪽을 합치지 않고 add가 있는 필드는 정확한 값을 유지한다', () => {
    const hash = simulationKey(fullContent); const a = newRun(); const b = newRun();
    a.currentNodeId = b.currentNodeId = 'dk71_final_review'; a.age = b.age = 71;
    a.player.gold = 3999; b.player.gold = 4000; expect(hash(a)).not.toBe(hash(b));
    a.player.gold = 7000; b.player.gold = 9000; expect(hash(a)).toBe(hash(b));
    const modified = structuredClone(example);
    modified.nodes.dk20_voluntary_detained!.choices[0]!.outcomes[0]!.effects = [{ op: 'add', path: 'player.gold', value: -3 }];
    const hashAdd = simulationKey(modified); const c = run(); const d = run(); c.player.gold = 3; d.player.gold = 4;
    expect(hashAdd(c)).not.toBe(hashAdd(d));
  });
  it('후속 조건부 현장 등장에 필요한 숫자 경계를 병합으로 숨기지 않는다', () => {
    const story = structuredClone(example);
    story.nodes.dk20_confrontation!.choices[0]!.outcomes = [0, 1].map(trust => ({
      id: `trust_${trust}`, weight: 1, result: 'neutral' as const, to: { kind: 'node' as const, id: 'dk20_voluntary_detained' },
      effects: [{ op: 'set' as const, path: 'npcs.mina.alive', value: false }, { op: 'set' as const, path: 'npcs.mina.trust', value: trust }],
    }));
    story.nodes.dk20_voluntary_detained!.choices[0]!.outcomes[0]!.to = { kind: 'node', id: 'dk20_fraud_offer' };
    story.nodes.dk20_fraud_offer!.chronicle = [{ age: 20, text: '조건부 현장 등장', when: { op: 'gt', path: 'npcs.mina.trust', value: 0 }, presence: ['mina'] }];
    expect(() => simulateAll(story)).toThrow('사망 인물');
  });
});
describe('세이브 호환성 및 실제 사건 보호', () => {
  it('이전 8장면 예제 회차를 다른 이야기로 재매핑하지 않는다', () => {
    const old = steps(['attack_mina', 'confess']); const resolved = resolveCompatibleSave(fullContent, example, JSON.stringify(old));
    expect(resolved.story.manifest.entryNodeId).toBe('dk20_confrontation'); expect(resolved.state).toEqual(old);
    expect(lifeEvents(resolved.story, resolved.state).some(e => e.nodeId === 'dk20_exam')).toBe(false);
  });
  it('전체 v1.0 회차를 원장·RNG·상태 확인 후 버전만 이관한다', () => {
    const current = progress(['attack', 'apologize', 'plead_guilty']);
    const previous = { ...current, storyVersion: '1.0.0' };
    const resolved = resolveCompatibleSave(fullContent, example, JSON.stringify(previous));
    expect(resolved.state).toEqual(current); expect(resolved.state.player.crimes).toEqual(['attempted_murder_convicted']);
    const forged = { ...previous, player: { ...previous.player, gold: 1000000 } };
    expect(() => resolveCompatibleSave(fullContent, example, JSON.stringify(forged))).toThrow();
  });
  it('이관 전 원본 저장·도감을 별도 백업하고 다시 덮어쓰지 않는다', () => {
    const storage = new MemoryStorage(); const raw = JSON.stringify(run()); storage.setItem(runKey('demon-king'), raw);
    backupBeforeImport(storage); const backup = storage.getItem(BACKUP_KEY);
    expect(JSON.parse(backup!).run).toBe(raw); storage.setItem(runKey('demon-king'), 'changed'); backupBeforeImport(storage); expect(storage.getItem(BACKUP_KEY)).toBe(backup);
  });
  it('v1.1과 예제 엔딩 도감을 함께 보존한다', () => {
    const storage = new MemoryStorage(); const oldStore = new SaveStore(example, () => storage);
    oldStore.commit(steps(['attack_mina', 'keep_attacking']));
    const store = new SaveStore(fullContent, () => storage, new Set([...Object.keys(example.endings), ...Object.keys(fullContent.endings)]));
    store.commit(newRun()); expect(store.loadMeta().discoveredEndings['demon-king']).toEqual(['end_early_death']);
  });
  it('정면 기습 실패·재판 전 무전과·사망 종료를 그대로 유지한다', () => {
    const state = progress(['attack']); expect(state.npcs.mina!.trust).toBe(-90); expect(state.player.combat).toBe(2); expect(state.player.crimes).toEqual([]);
    const ended = progress(['attack', 'second_attack']); expect(ended.endingId).toBe('end_blade'); expect(ended.player.alive).toBe(false);
  });
  it('권한 없는 판결이나 혼인 효과를 허용하지 않는다', () => {
    const story = structuredClone(fullContent); story.nodes.dk20_exam!.choices[0]!.outcomes[0]!.effects!.push({ op: 'addToSet', path: 'player.crimes', value: 'fraud_convicted' });
    expect(() => choose(story, newRun(), 'dk20_exam', 'attack')).toThrow('판결');
  });
});
