import annual from '../../spec/content-v4.5-story-art/content/annual_life_records_v4_2.json';
import echoes from '../../spec/content-v4.5-story-art/content/conditional_story_echoes_v4_5.json';
import type { GameState, Story } from '../engine/types';
import { isCompact } from './compact-contract';
import { annualVariants } from './annual-variants';

// 실제 도달한 두 사건 사이만 한 해씩 채운다. 선택/효과/가짜 방문은 만들지 않는다.
// 원장의 불변 seed와 나이로 고정하므로 렌더링·새로고침·저장 복원으로 재추첨되지 않는다.
export function routeYears(story: Story, state: GameState, nodeId: string) {
  if (!isCompact(story.manifest)) return [];
  const index = state.enteredNodeIds.indexOf(nodeId);
  if (index < 1) return [];
  const from = story.nodes[state.enteredNodeIds[index - 1]!]!.age;
  const until = story.nodes[nodeId]!.age;
  const years = annual.years.filter(year => year.age > from && year.age < until);
  return annualVariants(state, years).map((selected, index) => {
    const variant = years[index]!.variants.find(variant => variant.id === selected.id)!;
    return { ...selected, text: variant.text };
  });
}
export function routeBody(story: Story, state: GameState, nodeId: string): string {
  return [...routeYears(story, state, nodeId).map(year => `${year.age}세 · ${year.text}`), story.nodes[nodeId]!.body, ...storyEcho(story, state, nodeId).map(echo => echo.text)].join('\n\n');
}

export function storyEcho(story: Story, state: GameState, nodeId: string) {
  if (!isCompact(story.manifest)) return [];
  const index = state.enteredNodeIds.indexOf(nodeId);
  if (index < 0) return [];
  const previous = new Set(state.enteredNodeIds.slice(0, index));
  // 잔여 플래그만으로 기억을 만들지 않는다. 해당 과거 선택의 실제 효과도 증명해야 한다.
  const earned = new Set(state.history.filter(entry => previous.has(entry.nodeId)).flatMap(entry =>
    story.nodes[entry.nodeId]!.choices.find(choice => choice.id === entry.choiceId)!.outcomes.find(outcome => outcome.id === entry.outcomeId)!.effects
      ?.filter(effect => effect.path === 'flags' && effect.op === 'addToSet').map(effect => effect.value) ?? []));
  return echoes.echoes.filter(echo => echo.targetNodeId === nodeId && echo.allFlags.every(flag => state.flags.includes(flag) && earned.has(flag))).slice(0, 1);
}
