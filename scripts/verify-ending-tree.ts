import { readFileSync } from 'node:fs';
import { readExampleStory } from './read-story';
import { choose, createRun } from '../src/engine/transition';
import { decodeSave } from '../src/persistence/migrate';
import { ensure, type HistoryEntry } from '../src/engine/types';
import generated from '../src/content/generated/ending-tree.json';

const story = await readExampleStory('demon-king-compact');
const paths = JSON.parse(readFileSync('docs/v4.5/actual-ending-paths.json', 'utf8')) as {
  endingId: string; choices: string[]; age: number; history: HistoryEntry[];
}[];
ensure(paths.length === 20 && Object.keys(generated.routes).length === 20, '트리의 엔딩 경로 수가 다릅니다.');
ensure(generated.storyVersion === story.manifest.version, '트리/실행 스토리 버전 불일치');
const covered = new Set<string>();
for (const path of paths) {
  let state = createRun(story, 17, `tree-check-${path.endingId}`);
  for (const id of path.choices) {
    state = choose(story, state, state.currentNodeId!, id).nextState;
    ensure(JSON.stringify(decodeSave(story, JSON.stringify(state))) === JSON.stringify(state), '트리 추천 경로의 중간 저장 재현 실패');
  }
  ensure(state.ended && state.endingId === path.endingId && state.age === path.age, `${path.endingId}: 실제 도달 불일치`);
  ensure(JSON.stringify(state.history) === JSON.stringify(path.history), `${path.endingId}: 실제 선택/판정 원장 불일치`);
  const route = generated.routes[path.endingId as keyof typeof generated.routes];
  route.forEach(id => covered.add(id));
  ensure(route?.length === state.history.length + 2, `${path.endingId}: 트리 길이 불일치`);
  for (const [index, entry] of state.history.entries()) {
    const node = generated.nodes.find(node => node.id === route[index + 1]);
    ensure(node?.nodeId === entry.nodeId && node.choiceId === entry.choiceId && node.outcomeId === entry.outcomeId
      && node.age === entry.age && node.toKind === entry.toKind && node.toId === entry.toId,
      `${path.endingId}: 현재 데이터/트리 선택 불일치`);
    const scene = story.nodes[entry.nodeId]!;
    ensure(node.sceneTitle === scene.title && node.choiceText === scene.choices.find(choice => choice.id === entry.choiceId)!.text,
      `${path.endingId}: 현재 사건·선택 문구와 트리 불일치`);
  }
}
ensure(covered.size === generated.nodes.length, '실제 검증 경로에 없는 트리 노드');
console.log(`엔딩 트리20경로/${generated.nodes.length}노드: 실제 조건·판정·중간 저장·20엔딩 재현 통과`);
