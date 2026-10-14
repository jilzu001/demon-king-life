import { choose, createRun } from '../engine/transition';
import { ensure, type GameState, type Story } from '../engine/types';
import { decodeSave } from './migrate';
import type { StoragePort } from './save';

export const RESELECT_BACKUP_KEY = 'existence-sim:v1:backup:before-reselect:demon-king:compact';

// 상태를 역산하지 않고, 같은 seed로 선택 직전까지 실제 선택 원장을 재현한다.
export function resumeAtVisitedNode(story: Story, source: GameState, nodeId: string, runId: string): GameState {
  const verified = decodeSave(story, JSON.stringify(source));
  ensure(verified.enteredNodeIds.includes(nodeId), '방문하지 않은 사건에서는 이어할 수 없습니다.');
  const selected = verified.history.findIndex(entry => entry.nodeId === nodeId);
  const count = selected < 0 ? verified.history.length : selected;
  let replay = createRun(story, verified.rng.seed, runId);
  for (const entry of verified.history.slice(0, count)) {
    const result = choose(story, replay, entry.nodeId, entry.choiceId);
    ensure(result.transitionReceipt.outcomeId === entry.outcomeId, '지난 선택의 판정을 재현할 수 없습니다.');
    replay = result.nextState;
  }
  ensure(!replay.ended && replay.currentNodeId === nodeId, '선택 직전 상태를 복원할 수 없습니다.');
  return replay;
}

export function backupBeforeReselect(storage: StoragePort, state: GameState): void {
  const text = JSON.stringify(state);
  storage.setItem(RESELECT_BACKUP_KEY, text);
  ensure(storage.getItem(RESELECT_BACKUP_KEY) === text, '재선택 전 회차 백업에 실패했습니다. 현재 회차를 유지합니다.');
}

export function loadReselectBackup(storage: StoragePort, story: Story, runId: string): GameState {
  const text = storage.getItem(RESELECT_BACKUP_KEY);
  ensure(text, '복원할 재선택 전 회차가 없습니다.');
  const restored = decodeSave(story, text);
  return { ...restored, runId };
}
