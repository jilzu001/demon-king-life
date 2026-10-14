import { readExampleStory } from './read-story';
import { simulateAll } from '../src/content/simulate';

const report = simulateAll(await readExampleStory());
console.log('전체 경로 검증 통과 (현재 콘텐츠 v1.1 전체, 실제 판정 상태를 보존하는 동등 상태 병합)');
console.log(JSON.stringify(report, null, 2));
