import { readExampleStory } from './read-story';
import { ensure } from '../src/engine/types';
import { narrativeLines } from '../src/ui/narrative';
import { assertCompactChoiceMinimum, isFreedom } from '../src/content/compact-contract';
import { readFile } from 'node:fs/promises';

const story = await readExampleStory('demon-king-compact');
assertCompactChoiceMinimum(story);
// 준비본의 정적 검사는 실제 로더/회차 해금 연결 검증과 구분한다.
const prepared = JSON.parse(await readFile(new URL('../content/events_v2_9.json', import.meta.url), 'utf8')) as { events: { id: string; choices: unknown[] }[] };
for (const event of prepared.events) ensure(event.choices.length >= 2, `${event.id}: 준비본 사건도 최소 2개 선택지가 필요합니다.`);
console.log(`최소 선택지 검사 통과: 공개 일반 사건 ${Object.keys(story.nodes).length}개, 준비본 ${prepared.events.length}개(정적 검사), 엔딩 ${Object.keys(story.endings).length}개는 별도 유형`);
for (const node of Object.values(story.nodes)) {
  ensure(node.chronicleSummary && !/[\r\n"“”]/.test(node.chronicleSummary), `${node.id}: 독립적인 한 줄 연대기 누락`);
  ensure(narrativeLines(node.body).length >= (isFreedom(story.manifest) ? 1 : 2), `${node.id}: 본문 문단 구분 누락`);
  for (const choice of node.choices) for (const outcome of choice.outcomes) ensure(outcome.narrative?.trim(), `${node.id}/${choice.id}: 선택 후 서술 누락`);
}
ensure(!story.warnings.length, '축소판 도달 불가능 장면');
console.log(`축소판 구조/표시 검증 통과: ${Object.keys(story.nodes).length}사건, ${Object.values(story.nodes).reduce((sum, node) => sum + node.choices.length, 0)}선택, ${Object.keys(story.endings).length}엔딩, 후속 서술/문단/독립 연대기/결말 연출`);
