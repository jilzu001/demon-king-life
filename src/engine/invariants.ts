import { validateSchema } from '../content/schema';
import { isFullContent } from '../content/legal-events-v11';
import { evaluate } from './conditions';
import { describePath, validateValue } from './paths';
import { ensure, type GameState, type Scene, type Story, type WorldState } from './types';

export function assertWorld(story: Story, state: WorldState): void {
  ensure(Number.isSafeInteger(state.age) && state.age >= 0, '나이 범위 오류');
  ensure(Object.keys(state.npcs).sort().join('|') === Object.keys(story.characters).sort().join('|'), '인물 목록이 계약과 다릅니다.');
  ensure(Object.keys(state.inventory).sort().join('|') === Object.keys(story.manifest.initialState.inventory).sort().join('|'), '아이템 목록이 계약과 다릅니다.');
  for (const [field, value] of Object.entries(state.player)) {
    if (field === 'crimes') continue;
    validateValue(describePath(story, `player.${field}`), value, `player.${field}`);
  }
  for (const [id, npc] of Object.entries(state.npcs)) {
    for (const [field, value] of Object.entries(npc)) validateValue(describePath(story, `npcs.${id}.${field}`), value, `npcs.${id}.${field}`);
    ensure(npc.relationship !== 'ex_spouse' || state.flags.includes(`divorce_finalized_${id}`), `${id}: 이혼 확정 근거 누락`);
    const authoredMarriage = isFullContent(story.manifest.id, story.manifest.version, story.manifest.entryNodeId)
      && id === 'erisia' && state.flags.includes('married_erisia');
    ensure(npc.relationship !== 'spouse' || state.flags.includes('marriage_registered') || authoredMarriage, `${id}: 혼인 등록 근거 누락`);
  }
  for (const [id, value] of Object.entries(state.inventory)) validateValue(describePath(story, `inventory.${id}`), value, `inventory.${id}`);
}
export function assertPresence(story: Story, state: WorldState, scene: Scene): void {
  for (const line of scene.chronicle ?? []) {
    if (!evaluate(story, state, line.when)) continue;
    for (const id of line.presence ?? []) ensure(state.npcs[id]?.alive, `사망 인물의 현장 등장: ${id}`);
  }
}
export function assertState(story: Story, state: GameState): void {
  validateSchema('save', state);
  ensure(state.storyId === story.manifest.id && state.storyVersion === story.manifest.version, '호환되지 않는 스토리/버전입니다. 자동 이관하지 않습니다.');
  assertWorld(story, state);
  ensure(state.enteredNodeIds.length === state.history.filter(h => h.toKind === 'node').length + 1, '방문 기록 개수 오류');
  ensure(state.enteredNodeIds[0] === story.manifest.entryNodeId, '최초 방문 장면 오류');
  for (const id of state.enteredNodeIds) ensure(Object.hasOwn(story.nodes, id), `알 수 없는 방문 장면: ${id}`);
  let current = story.manifest.entryNodeId;
  let previousAge = story.nodes[story.manifest.entryNodeId]!.age;
  for (let i = 0; i < state.history.length; i++) {
    const h = state.history[i]!;
    const node = story.nodes[current];
    ensure(node && h.nodeId === current && h.age === node.age && h.age >= previousAge, '선택 원장/나이 오류');
    const outcome = node.choices.find(c => c.id === h.choiceId)?.outcomes.find(o => o.id === h.outcomeId);
    ensure(outcome && outcome.to.kind === h.toKind && outcome.to.id === h.toId, '선택 결과 원장 오류');
    previousAge = h.age;
    if (h.toKind === 'node') {
      current = h.toId;
      ensure(state.enteredNodeIds[state.history.slice(0, i + 1).filter(e => e.toKind === 'node').length] === current, '방문 순서 오류');
    } else {
      ensure(i === state.history.length - 1 && state.ended && state.endingId === h.toId, '엔딩 이후 선택 기록 오류');
    }
  }
  if (state.ended) {
    ensure(state.currentNodeId === null && state.endingId && Object.hasOwn(story.endings, state.endingId), '종료 상태 오류');
    ensure(state.history.at(-1)?.toKind === 'ending' && state.age === previousAge, '엔딩 원장 오류');
  } else {
    ensure(state.player.alive, '사망 후 플레이 지속 금지');
    ensure(state.endingId === null && state.currentNodeId === current, '현재 장면 오류');
    const node = story.nodes[current];
    ensure(node && state.age === node.age && state.enteredNodeIds.includes(current), '현재 나이/방문 오류');
    assertPresence(story, state, node);
  }
}
