import { describe, expect, it } from 'vitest';
import { resumeAtVisitedNode, backupBeforeReselect, loadReselectBackup, RESELECT_BACKUP_KEY } from '../../src/persistence/reselect';
import { choose, createRun } from '../../src/engine/transition';
import { decodeSave } from '../../src/persistence/migrate';
import { example, steps, MemoryStorage } from '../fixtures';

describe('방문한 사건에서 재선택', () => {
  it('다음 사건에서 선택 직전의 능력·관계·재산·범죄·원장·난수를 모두 복원한다', () => {
    const source = steps(['attack_mina', 'confess', 'accept_arrest', 'plead']);
    const snapshot = structuredClone(source);
    const restored = resumeAtVisitedNode(example, source, 'dk20_disarmed', 'fork');
    const expected = choose(example, createRun(example, source.rng.seed, 'fork'), example.manifest.entryNodeId, 'attack_mina').nextState;
    expect(restored).toEqual(expected); expect(restored.ended).toBe(false);
    expect(restored.player.crimes).toEqual([]); expect(restored.player.legalStatus).toBe(example.manifest.initialState.player.legalStatus);
    expect(decodeSave(example, JSON.stringify(restored))).toEqual(restored);
    expect(source).toEqual(snapshot);
  });
  it('가중치 판정이 있던 사건의 선택 직전 난수를 복원하고 같은 선택은 같은 결과를 재현한다', () => {
    const initial = createRun(example, 123, 'weighted');
    const result = choose(example, initial, initial.currentNodeId!, 'stage_fight');
    const restored = resumeAtVisitedNode(example, result.nextState, initial.currentNodeId!, 'weighted-fork');
    expect(restored.rng).toEqual(initial.rng);
    const replayed = choose(example, restored, restored.currentNodeId!, 'stage_fight');
    expect(replayed.transitionReceipt.outcomeId).toBe(result.transitionReceipt.outcomeId);
    expect({ ...replayed.nextState, runId: result.nextState.runId }).toEqual(result.nextState);
  });
  it('미방문 사건과 변조한 현재 상태를 거부한다', () => {
    const source = steps(['attack_mina']);
    expect(() => resumeAtVisitedNode(example, source, 'dk21_trial', 'invalid')).toThrow();
    expect(() => resumeAtVisitedNode(example, { ...source, player: { ...source.player, gold: 999 } }, source.currentNodeId!, 'invalid')).toThrow();
  });
  it('되돌리기 전 회차를 재현 가능한 백업으로 보관하고 저장 실패와 손상을 거부한다', () => {
    const source = steps(['attack_mina', 'confess']); const storage = new MemoryStorage();
    backupBeforeReselect(storage, source);
    expect(loadReselectBackup(storage, example, 'restored')).toEqual({ ...source, runId: 'restored' });
    storage.fail = true; expect(() => backupBeforeReselect(storage, steps(['stage_fight']))).toThrow();
    expect(storage.getItem(RESELECT_BACKUP_KEY)).toBe(JSON.stringify(source));
    storage.fail = false; storage.setItem(RESELECT_BACKUP_KEY, '{}');
    expect(() => loadReselectBackup(storage, example, 'broken')).toThrow();
  });
});
