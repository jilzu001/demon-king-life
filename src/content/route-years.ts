import annual from '../../spec/content-v4.4-ending-gallery/content/annual_life_records_v4_2.json';
import type { GameState, Story } from '../engine/types';
import { isCompact } from './compact-contract';

// 신규 경로에서 실제 도달한 두 사건 사이만 채운다. 선택/효과/가짜 방문은 만들지 않는다.
// 원장의 불변 seed와 나이로 고정하므로 렌더링·새로고침·저장 복원으로 재추첨되지 않는다.
export function routeYears(story: Story, state: GameState, nodeId: string) {
  if (!isCompact(story.manifest) || !/^(setup|bridge)_route_/.test(nodeId)) return [];
  const index = state.enteredNodeIds.indexOf(nodeId);
  if (index < 1) return [];
  const from = story.nodes[state.enteredNodeIds[index - 1]!]!.age;
  const until = story.nodes[nodeId]!.age;
  return annual.years.filter(year => year.age > from && year.age < until).map(year => {
    const value = (Math.imul(state.rng.seed ^ year.age, 2654435761) >>> 0) % year.variants.length;
    const variant = year.variants[value]!;
    return { id: variant.id, age: year.age, text: variant.text };
  });
}
export function routeBody(story: Story, state: GameState, nodeId: string): string {
  return [...routeYears(story, state, nodeId).map(year => `${year.age}세 · ${year.text}`), story.nodes[nodeId]!.body].join('\n\n');
}
