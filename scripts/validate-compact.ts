import { readExampleStory } from './read-story';
import { ensure } from '../src/engine/types';
import { narrativeLines } from '../src/ui/narrative';

const story = await readExampleStory('demon-king-compact');
for (const node of Object.values(story.nodes)) {
  ensure(node.chronicleSummary && !/[\r\n"“”]/.test(node.chronicleSummary), `${node.id}: 독립적인 한 줄 연대기 누락`);
  ensure(node.choices.length <= 3, `${node.id}: 선택지 3개 초과`);
  ensure(narrativeLines(node.body).length > 1, `${node.id}: 본문 문단 구분 누락`);
  for (const choice of node.choices) for (const outcome of choice.outcomes) ensure(outcome.narrative?.trim(), `${node.id}/${choice.id}: 선택 후 서술 누락`);
}
ensure(!story.warnings.length, '축소판 도달 불가능 장면');
console.log(`축소판 구조/표시 검증 통과: ${Object.keys(story.nodes).length}사건, ${Object.values(story.nodes).reduce((sum, node) => sum + node.choices.length, 0)}선택, ${Object.keys(story.endings).length}엔딩, 후속 서술/문단/독립 연대기/결말 연출`);
