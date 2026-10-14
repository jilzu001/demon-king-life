import { simulationKey } from './simulation-key';
import { evaluate } from '../engine/conditions';
import { chooseForVerification, createRun } from '../engine/transition';
import { ensure, type GameState, type Story } from '../engine/types';

export function simulateAll(story: Story, maxStates = 100_000) {
  const initial = createRun(story, 0, 'verification');
  const queue: { state: GameState; paths: number }[] = [{ state: initial, paths: 1 }];
  const ends: Record<string, number> = {};
  let states = 0; let transitions = 0; let terminalPaths = 0; let maxDepth = 0;
  const reachableNodes = new Set<string>();
  const hashState = simulationKey(story);
  // DAG 전체 경로: 같은 깊이의 동일한 세계 상태를 합치고 경로 수는 누적한다.
  while (queue.length) {
    const level = queue.splice(0);
    const next = new Map<string, { state: GameState; paths: number }>();
    for (const { state, paths } of level) {
      ensure(++states <= maxStates, `탐색 상한 ${maxStates} 초과: 검증 불완전`);
      maxDepth = Math.max(maxDepth, state.enteredNodeIds.length);
      if (state.ended) {
        ends[state.endingId!] = (ends[state.endingId!] ?? 0) + paths;
        terminalPaths += paths;
        ensure(Number.isSafeInteger(terminalPaths), '종단 경로 수 범위 초과: 검증 불완전');
        continue;
      }
      const nodeId = state.currentNodeId!; reachableNodes.add(nodeId);
      const node = story.nodes[nodeId]!;
      const choices = node.choices.filter(choice => evaluate(story, state, choice.enabledWhen));
      ensure(choices.length, `${nodeId}: 활성 선택이 없는 소프트락`);
      for (const choice of choices) {
        const outcomes = choice.outcomes.filter(outcome => evaluate(story, state, outcome.when));
        ensure(outcomes.length, `${nodeId}/${choice.id}: 적용 가능한 결과 없음`);
        for (const outcome of outcomes) {
          const { nextState } = chooseForVerification(story, state, nodeId, choice.id, outcome.id);
          ensure(++transitions <= maxStates * 20, '전이 탐색 상한 초과: 검증 불완전');
          const hash = hashState(nextState);
          const existing = next.get(hash);
          if (existing) { existing.paths += paths; ensure(Number.isSafeInteger(existing.paths), '경로 수 범위 초과'); }
          else {
            ensure(states + next.size < maxStates, `탐색 상한 ${maxStates} 초과: 검증 불완전`);
            next.set(hash, { state: nextState, paths });
          }
        }
      }
    }
    queue.push(...next.values());
  }
  ensure(terminalPaths > 0, '도달 가능한 엔딩이 없습니다.');
  return { states, transitions, terminalPaths, maxDepth, endings: ends, reachableNodes: reachableNodes.size,
    warnings: [...story.warnings, ...Object.keys(story.endings).filter(id => !ends[id]).map(id => `도달 불가능 엔딩: ${id}`)] };
}
