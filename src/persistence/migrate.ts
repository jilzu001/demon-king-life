import { canonical, parseJson } from '../content/json';
import { assertState } from '../engine/invariants';
import { choose, createRun } from '../engine/transition';
import { ensure, type GameState, type Story } from '../engine/types';

export function decodeSave(story: Story, text: string): GameState {
  const data = parseJson(text, '세이브');
  // v1에는 구 버전 이관표가 없다. 다른 스키마/스토리 버전을 임의 변환하지 않는다.
  assertState(story, data as GameState);
  const state = data as GameState;
  let replay = createRun(story, state.rng.seed, state.runId);
  for (const entry of state.history) {
    const result = choose(story, replay, entry.nodeId, entry.choiceId);
    ensure(result.transitionReceipt.outcomeId === entry.outcomeId, '저장된 판정이 seed 재현 결과와 다릅니다.');
    replay = result.nextState;
  }
  ensure(canonical(replay) === canonical(state), '세이브 상태가 기록된 실제 선택 결과와 다릅니다.');
  return state;
}
