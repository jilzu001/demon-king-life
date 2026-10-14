import { readExampleStory } from './read-story';

const story = await readExampleStory();
console.log(`구조 검증 통과: 장면 ${Object.keys(story.nodes).length}, 선택 ${Object.values(story.nodes).reduce((n, s) => n + s.choices.length, 0)}, 엔딩 ${Object.keys(story.endings).length}`);
console.log(`표시 검증 통과: 요약 ${Object.keys(story.presentation!.nodes).length}, 대화 장면 ${Object.values(story.presentation!.nodes).filter(n => n.dialogues).length}, 대사 ${Object.values(story.presentation!.nodes).reduce((n, scene) => n + (scene.dialogues?.length ?? 0), 0)}, 설명 ${Object.values(story.nodes).flatMap(n => n.choices).filter(c => c.description?.trim()).length}`);
for (const warning of story.warnings) console.warn(`경고: ${warning}`);
