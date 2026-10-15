import { readFileSync } from 'node:fs';
import { loadStory } from '../src/content/load';
import { readExampleStory } from './read-story';
import { choose, createRun } from '../src/engine/transition';
import type { GameState } from '../src/engine/types';

// 현재 UI에서 실제 구판 저장을 불러와 각 선택을 클릭하기 위한 검수 자료.
const previous = await loadStory(async path => JSON.parse(readFileSync(path === 'chapters/01_complete.json'
  ? 'backups/before-v3.8/01_complete.json' : `backups/before-v4.4/${path}`, 'utf8')));
const current = await readExampleStory('demon-king-compact');
const audited = await loadStory(async path => JSON.parse(readFileSync(`backups/before-v4.4/${path}`, 'utf8')));
const states: Record<string, GameState> = {};
const queue = [createRun(previous, 17, 'v38-old-save')];
while (queue.length) {
  const state = queue.shift()!;
  if (state.ended || states[state.currentNodeId!]) continue;
  states[state.currentNodeId!] = state;
  for (const choice of previous.nodes[state.currentNodeId!]!.choices) queue.push(choose(previous, state, state.currentNodeId!, choice.id).nextState);
}
// v3.8 당시43선택의 회귀 자료다. 신규 조건부 경로는 별도 실제20엔딩 검사에서 다룬다.
console.log(JSON.stringify(Object.values(audited.nodes).map(node => ({
  id: node.id, state: states[node.id], choices: node.choices.map(choice => {
    const next = choose(current, states[node.id]!, node.id, choice.id).nextState;
    const outcome = current.nodes[node.id]!.choices.find(c => c.id === choice.id)!.outcomes.find(o => o.id === next.history.at(-1)!.outcomeId)!;
    return { id: choice.id, text: choice.text, description: choice.description, next, narrative: outcome.narrative };
  }),
}))));
