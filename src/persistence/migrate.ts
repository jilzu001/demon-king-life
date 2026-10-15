import { canonical, parseJson } from '../content/json';
import { assertState } from '../engine/invariants';
import { choose, createRun } from '../engine/transition';
import { ensure, type GameState, type Story } from '../engine/types';
import { isCompact } from '../content/compact-contract';

// 폐기된154개 연간 선택 플래그의 이름만 인식한다. 구 선택/콜백 데이터는 로딩하지 않는다.
export function deprecatedAnnualFlag(flag: string): boolean {
  return /^annual_(0[1-9]|[1-5]\d|6[0-5])_[ab]$/.test(flag)
    || /^annual_pool_(child_(rain|shoes|treasure)|teen_(notice|umbrella|mirror)|adult_(shade|cup|letter)|late_(bell|garden|oldstory))_[ab]$/.test(flag);
}

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
  const comparable = isCompact(story.manifest) ? { ...state, flags: state.flags.filter(flag => !deprecatedAnnualFlag(flag)) } : state;
  ensure(canonical(replay) === canonical(comparable), '세이브 상태가 기록된 실제 선택 결과와 다릅니다.');
  return state;
}
