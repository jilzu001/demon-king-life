import { assertLegalTransition } from '../content/policies';
import { evaluate } from './conditions';
import { applyEffects } from './effects';
import { assertState, assertPresence } from './invariants';
import { random, weightedIndex } from './random';
import { ensure, type GameState, type Story, type TransitionReceipt } from './types';

export function createRun(story: Story, seed: number, runId: string): GameState {
  ensure(Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff, 'seed는 uint32여야 합니다.');
  const state: GameState = {
    ...structuredClone(story.manifest.initialState), saveSchemaVersion: 1,
    storyId: story.manifest.id, storyVersion: story.manifest.version, runId,
    currentNodeId: story.manifest.entryNodeId, endingId: null, ended: false,
    rng: { seed, state: seed }, history: [], enteredNodeIds: [story.manifest.entryNodeId],
  };
  const node = story.nodes[story.manifest.entryNodeId]!;
  ensure(node.age >= state.age, '초기 장면 시간 역행');
  state.age = node.age;
  applyEffects(story, state, node.entryEffects);
  ensure(state.player.crimes.join('|') === story.manifest.initialState.player.crimes.join('|'), '최초 진입만으로 전과 추가 금지');
  assertState(story, state);
  return state;
}

function transition(story: Story, state: GameState, nodeId: string, choiceId: string, verificationOutcomeId?: string) {
  assertState(story, state);
  ensure(!state.ended, '종료된 회차는 선택할 수 없습니다.');
  ensure(state.currentNodeId === nodeId, '이미 처리했거나 현재 장면과 다른 선택입니다.');
  const node = story.nodes[nodeId]!;
  const choice = node.choices.find(c => c.id === choiceId);
  ensure(choice, '존재하지 않는 선택입니다.');
  ensure(evaluate(story, state, choice.enabledWhen), '선택의 실행 조건을 만족하지 않습니다.');
  const candidates = choice.outcomes.filter(o => evaluate(story, state, o.when));
  ensure(candidates.length, `${nodeId}/${choiceId}: 적용 가능한 결과가 없습니다. 콘텐츠 오류로 선택을 중단합니다.`);
  const draft = structuredClone(state);
  let index = 0;
  if (candidates.length > 1) {
    const roll = random(draft.rng.state);
    draft.rng.state = roll.state;
    index = weightedIndex(candidates.map(o => o.weight), roll.value);
  }
  const outcome = verificationOutcomeId === undefined ? candidates[index]! : candidates.find(o => o.id === verificationOutcomeId);
  ensure(outcome, '검증 대상 결과가 현재 상태에서 성립하지 않습니다.');
  applyEffects(story, draft, outcome.effects);
  if (outcome.to.kind === 'node') {
    const target = story.nodes[outcome.to.id];
    ensure(target && target.age >= draft.age, '대상 장면 누락/시간 역행');
    ensure(!draft.enteredNodeIds.includes(target.id), 'DAG에서 재진입할 수 없습니다.');
    draft.currentNodeId = target.id;
    draft.age = target.age;
    applyEffects(story, draft, target.entryEffects);
    draft.enteredNodeIds.push(target.id);
    assertPresence(story, draft, target);
  } else {
    ensure(Object.hasOwn(story.endings, outcome.to.id), '대상 엔딩이 없습니다.');
    draft.currentNodeId = null; draft.endingId = outcome.to.id; draft.ended = true;
  }
  const entry = { age: state.age, nodeId, choiceId, outcomeId: outcome.id, toKind: outcome.to.kind, toId: outcome.to.id };
  assertLegalTransition(story, state, draft, entry);
  draft.history.push(entry);
  assertState(story, draft);
  const transitionReceipt: TransitionReceipt = { ...entry, id: `${state.runId}:${draft.history.length}`, result: outcome.result };
  return { nextState: draft, transitionReceipt };
}

export function choose(story: Story, state: GameState, nodeId: string, choiceId: string) {
  return transition(story, state, nodeId, choiceId);
}
// 검증 전용. UI와 저장 복원에서는 호출하지 않는다.
export function chooseForVerification(story: Story, state: GameState, nodeId: string, choiceId: string, outcomeId: string) {
  return transition(story, state, nodeId, choiceId, outcomeId);
}
