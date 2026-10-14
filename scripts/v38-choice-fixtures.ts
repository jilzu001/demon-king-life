import { readFileSync } from 'node:fs';
import { loadStory } from '../src/content/load';
import { readExampleStory } from './read-story';
import { choose, createRun } from '../src/engine/transition';
import type { GameState } from '../src/engine/types';

// 현재 UI에서 실제 구판 저장을 불러와 각 선택을 클릭하기 위한 검수 자료.
const previous = await loadStory(async path => JSON.parse(readFileSync(path === 'chapters/01_complete.json'
  ? 'backups/before-v3.8/01_complete.json' : `public/stories/demon-king-compact/${path}`, 'utf8')));
const current = await readExampleStory('demon-king-compact');
const states: Record<string, GameState> = {};
const queue = [createRun(previous, 17, 'v38-old-save')];
while (queue.length) {
  const state = queue.shift()!;
  if (state.ended || states[state.currentNodeId!]) continue;
  states[state.currentNodeId!] = state;
  for (const choice of previous.nodes[state.currentNodeId!]!.choices) queue.push(choose(previous, state, state.currentNodeId!, choice.id).nextState);
}
console.log(JSON.stringify(Object.values(current.nodes).map(node => ({
  id: node.id, state: states[node.id], choices: node.choices.map(choice => {
    const next = choose(current, states[node.id]!, node.id, choice.id).nextState;
    const outcome = choice.outcomes.find(o => o.id === next.history.at(-1)!.outcomeId)!;
    return { id: choice.id, text: choice.text, description: choice.description, next, narrative: outcome.narrative };
  }),
}))));
