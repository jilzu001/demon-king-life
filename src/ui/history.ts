import type { PresentedStory } from '../content/presentation';
import { evaluate } from '../engine/conditions';
import type { GameState, HistoryEntry, Outcome } from '../engine/types';
import { isCompact } from '../content/compact-contract';

export const resultLabels: Record<Outcome['result'], string> = { success: '성공', failure: '실패', mixed: '복합 결과', neutral: '중립 결과' };
export type LifeEvent = {
  id: string; age: number; title: string; summary: string;
  kind: 'origin' | 'scene' | 'ending'; nodeId?: string; choiceText?: string; result?: Outcome['result']; destination?: string;
};
export function confirmedChoice(story: PresentedStory, entry: HistoryEntry) {
  const node = story.nodes[entry.nodeId]!;
  const choice = node.choices.find(c => c.id === entry.choiceId)!;
  const outcome = choice.outcomes.find(o => o.id === entry.outcomeId)!;
  const destination = entry.toKind === 'node' ? story.nodes[entry.toId]!.title : story.endings[entry.toId]!.title;
  return { choice, outcome, destination };
}
// 표시는 저장 원장의 투영이다. 렌더링 중 엔진/효과/RNG를 실행하지 않는다.
export function lifeEvents(story: PresentedStory, state: GameState): LifeEvent[] {
  const entry = story.nodes[story.manifest.entryNodeId]!;
  const events: LifeEvent[] = (entry.chronicle ?? [])
    .filter(line => evaluate(story, story.manifest.initialState, line.when))
    .map((line, index) => ({ id: `origin:${index}`, age: line.age, title: '성장 기록', summary: line.text, kind: 'origin' }));
  for (const nodeId of state.enteredNodeIds) {
    const node = story.nodes[nodeId]!;
    const history = state.history.find(h => h.nodeId === nodeId);
    const confirmed = history ? confirmedChoice(story, history) : null;
    events.push({
      id: `scene:${nodeId}`, age: node.age, title: node.title,
      summary: node.chronicleSummary ?? story.presentation?.nodes[nodeId]?.chronicleSummary ?? node.title,
      kind: 'scene', nodeId, ...(confirmed ? { choiceText: confirmed.choice.text, result: confirmed.outcome.result, destination: confirmed.destination } : {}),
    });
  }
  if (state.endingId) {
    const ending = story.endings[state.endingId]!;
    events.push({ id: `ending:${ending.id}`, age: state.age, title: ending.title, summary: isCompact(story.manifest) ? ending.title : ending.body, kind: 'ending' });
  }
  // 안정 정렬: 같은 나이의 실제 진행 순서를 유지한다.
  return events.sort((a, b) => a.age - b.age);
}
