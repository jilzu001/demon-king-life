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
const steps = generated.nodes.filter(node => node.type === 'step');
let expected = 0;
for (const scene of Object.values(story.nodes)) for (const choice of scene.choices) for (const outcome of choice.outcomes) {
  expected++;
  const node = steps.find(node => node.nodeId === scene.id && node.choiceId === choice.id && node.outcomeId === outcome.id);
  ensure(node && node.toKind === outcome.to.kind && node.toId === outcome.to.id, '전체 선택/결과 누락 또는 잘못된 연결');
  const targets = outcome.to.kind === 'ending' ? [`ending:${outcome.to.id}`] : steps.filter(step => step.nodeId === outcome.to.id).map(step => step.id);
  ensure(targets.length > 0 && targets.every(to => generated.edges.some(edge => edge.from === node.id && edge.to === to)), '전체 목적지 연결 누락');
}
ensure(steps.length === expected && generated.sceneCount === Object.keys(story.nodes).length, '전체 사건/결과 수 불일치');
console.log(`전체 분기 트리20검증경로/${generated.nodes.length}노드: 실제 조건·판정·중간 저장·20엔딩 재현 통과`);
