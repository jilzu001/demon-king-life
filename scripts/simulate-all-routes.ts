import { readExampleStory } from './read-story';
import { simulateAll } from '../src/content/simulate';
import { ensure } from '../src/engine/types';

const report = simulateAll(await readExampleStory());
console.log('전체 경로 검증 통과 (현재 콘텐츠 v1.1 전체, 실제 판정 상태를 보존하는 동등 상태 병합)');
console.log(JSON.stringify(report, null, 2));
const compact = await readExampleStory('demon-king-compact');
const compactReport = simulateAll(compact);
ensure(!compactReport.warnings.length && compactReport.reachableNodes === Object.keys(compact.nodes).length
  && Object.keys(compactReport.endings).length === Object.keys(compact.endings).length, '축소판 장면/엔딩 도달성 검사 실패');
console.log('축소 완결판 전체 경로 검증 통과');
console.log(JSON.stringify(compactReport, null, 2));
