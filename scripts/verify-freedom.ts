import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { readExampleStory } from './read-story';
import { choose, createRun } from '../src/engine/transition';
import { decodeSave } from '../src/persistence/migrate';
import { evaluate } from '../src/engine/conditions';
import { ensure, type GameState } from '../src/engine/types';
import { freedomChronicle, endingRecapLines } from '../src/content/freedom-memory';
import { simulateAll } from '../src/content/simulate';

const story = await readExampleStory('demon-king-compact');
ensure(story.manifest.version === '5.0.0', 'v5.0 실행 콘텐츠가 아닙니다.');
const root = 'spec/content-v50-freedom/demon_king_v50/';
const read = (file: string) => JSON.parse(readFileSync(file, 'utf8'));
// 금액 제목 오기1곳 외 원문 바이트를 보호한다. 본문/선택/효과/ID는 바꾸지 않는다.
for (const file of ['story.json', 'characters.json', 'endings.json', ...story.manifest.chapters]) {
  const source=readFileSync(`${root}content/${file}`);
  const expected=file==='endings.json' ? Buffer.from(source.toString('utf8').replace('"title": "백이십만 금화의 진실"','"title": "십이만 금화의 진실"')) : source;
  ensure(readFileSync(`public/stories/demon-king-compact/${file}`).equals(expected), `${file}: 허용하지 않은 원문 변경`);
}
const examples = read(`${root}docs/EXAMPLE_ROUTES.json`).routes as Record<string, { choices: string[]; nodes: string[] }>;
const matrix = read(`${root}docs/ROUTE_MATRIX.json`).routes as {id:string;sceneIds:string[];endingIds:string[]}[];
ensure(matrix.length === 8, '독립 루트 수 불일치');
for (const route of matrix) {
  ensure(route.sceneIds.length === 5 && route.endingIds.length === 4, `${route.id}: 청년/중년/후반 사건·결말 수`);
  for (const id of route.sceneIds) for (const choice of story.nodes[id]!.choices) for (const outcome of choice.outcomes) {
    ensure((outcome.to.kind === 'node' ? route.sceneIds : route.endingIds).includes(outcome.to.id), `${route.id}: 다른 인생 경로로 강제 합류`);
  }
}
const paths = Object.entries(examples).map(([endingId, example]) => {
  let run = createRun(story, 17, `tree-check-${endingId}`);
  for (const choice of example.choices) {
    const before = run.age;
    run = choose(story, run, run.currentNodeId!, choice).nextState;
    ensure(run.age >= before, `${endingId}: 나이 역행`);
    ensure(JSON.stringify(decodeSave(story, JSON.stringify(run))) === JSON.stringify(run), '저장 재현 실패');
  }
  ensure(run.endingId === endingId && run.ended, `${endingId}: 실제 도달 실패`);
  ensure(JSON.stringify(run.enteredNodeIds) === JSON.stringify(example.nodes), `${endingId}: 다른 루트 합류`);
  return { endingId, title: story.endings[endingId]!.title, choices: example.choices, age: run.age, history: run.history, nodes: run.enteredNodeIds };
});
ensure(paths.length === 32 && Object.keys(story.nodes).length === 47, '콘텐츠 수 불일치');
// 모든 유효 선택 조합을 실제 엔진으로 실행한다. 플래그에 따라 다른 회상도 보존한다.
const leaves: GameState[] = [], queue = [createRun(story, 0, 'full-witness')];
const covered = new Set<string>(), scenes = new Set<string>(), chronicle = new Set<string>(), recaps = new Set<string>();
for (const run of queue) {
  if (run.ended) { leaves.push(run); for (const text of endingRecapLines(story, run)) recaps.add(text); continue; }
  const scene = story.nodes[run.currentNodeId!]!; scenes.add(scene.id);
  for (const line of freedomChronicle(story, run, scene.id)) chronicle.add(line.text);
  for (const choice of scene.choices) {
    if (!evaluate(story, run, choice.enabledWhen)) { let rejected = false; try { choose(story, run, scene.id, choice.id); } catch { rejected = true; } ensure(rejected, '비활성 조건 우회'); continue; }
    const next = choose(story, run, scene.id, choice.id).nextState;
    covered.add(`${scene.id}:${choice.id}:${next.history.at(-1)!.outcomeId}`); queue.push(next);
  }
}
const choices = Object.values(story.nodes).flatMap(scene => scene.choices);
ensure(choices.length === 106 && covered.size === 106 && scenes.size === 47, '선택/결과/사건 미도달');
ensure(new Set(leaves.map(run => run.endingId)).size === 32 && leaves.length === 864, '전체 종단 경로 불일치');
const expectedChronicle = Object.values(story.nodes).flatMap(scene => scene.chronicle ?? []).map(line => line.text);
const expectedRecaps = Object.values(story.endings).flatMap(ending => ending.recapRules ?? []).map(rule => rule.text);
ensure(expectedChronicle.every(text => chronicle.has(text)), '도달하지 못한 조건부 연대기');
ensure(expectedRecaps.every(text => recaps.has(text)), '도달하지 못한 조건부 엔딩 회상');
mkdirSync('docs/v5.0', { recursive: true });
writeFileSync('docs/v5.0/actual-ending-paths.json', JSON.stringify(paths, null, 2) + '\n');
const report = { scenes: scenes.size, choices: choices.length, outcomes: covered.size, endings: 32, terminalPaths: leaves.length, conditionalChronicleLines: chronicle.size, conditionalRecapLines: recaps.size, simulation: simulateAll(story) };
writeFileSync('docs/v5.0/engine-verification.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
