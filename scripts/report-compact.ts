import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { readExampleStory } from './read-story';
import { createRun, choose } from '../src/engine/transition';
import { evaluate } from '../src/engine/conditions';
import { simulateAll } from '../src/content/simulate';
import { decodeSave } from '../src/persistence/migrate';
import { memoryEvents } from '../src/ui/compact-ending';
import { ensure, type GameState } from '../src/engine/types';

const story = await readExampleStory('demon-king-compact');
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
async function compareFiles(source: string, runtime: string, files: string[]) {
  return Promise.all(files.map(async file => {
    const [left, right] = await Promise.all([readFile(`${source}/${file}`), readFile(`${runtime}/${file}`)]);
    ensure(left.equals(right), `원본 바이트 불일치: ${runtime}/${file}`);
    return { file, bytes: right.length, sha256: hash(right), identical: true };
  }));
}
const compactFiles = await compareFiles('spec/content-v2.6-compact-timeline', 'public/stories/demon-king-compact', [
  'story.json', 'characters.json', 'endings.json', 'ending_cinematics.json', 'chapters/01_complete.json',
]);
const original = await readExampleStory();
const originalFiles = await compareFiles('backups/before-content-v2', 'public/stories/demon-king', [
  'story.json', 'characters.json', 'endings.json', 'presentation.json', ...original.manifest.chapters,
]);
const paths: GameState[] = [];
function walk(state: GameState) {
  if (state.ended) { paths.push(state); return; }
  const node = story.nodes[state.currentNodeId!]!;
  for (const choice of node.choices.filter(c => evaluate(story, state, c.enabledWhen))) {
    ensure(choice.outcomes.filter(o => evaluate(story, state, o.when)).length === 1, '미리보기는 축소판의 결정적 결과만 지원합니다.');
    walk(choose(story, state, node.id, choice.id).nextState);
  }
}
walk(createRun(story, 17, 'compact-preview'));
ensure(paths.length === 147, '축소판 종단 경로 수 변경');
const selected = new Map<string, GameState>();
const select = (state: GameState) => { selected.set(state.history.map(h => `${h.nodeId}/${h.choiceId}`).join('|'), state); };
for (const id of Object.keys(story.endings)) select(paths.find(state => state.endingId === id)!);
for (let index = 0; selected.size < 20 && index < paths.length; index++) select(paths[(index * 37) % paths.length]!);
ensure(selected.size === 20, '20개 서로 다른 실제 경로 확보 실패');
const previews: string[] = [];
for (const state of selected.values()) {
  const restored = decodeSave(story, JSON.stringify(state));
  ensure(JSON.stringify(restored) === JSON.stringify(state), '미리보기 저장 재현 실패');
  const pieces: string[] = [];
  for (const entry of state.history) {
    const node = story.nodes[entry.nodeId]!;
    const choice = node.choices.find(c => c.id === entry.choiceId)!;
    const outcome = choice.outcomes.find(o => o.id === entry.outcomeId)!;
    pieces.push(`### ${entry.age}세 · ${node.title}\n\n연대기: ${node.chronicleSummary}\n\n${node.body}\n\n선택: ${choice.text}\n\n${outcome.narrative}`);
  }
  const cinematic = story.cinematics!.endings[state.endingId!]!;
  pieces.push(`### 결말 · ${story.endings[state.endingId!]!.title}\n\n${cinematic.finalScene}\n\n실제 회상: ${memoryEvents(story, state).map(m => m.node.title).join(' → ')}\n\n${cinematic.reflection}`);
  previews.push(`## 경로 ${previews.length + 1}\n\n${pieces.join('\n\n')}`);
}
await writeFile('docs/compact-playthrough-previews.md', '# 축소 완결판 실제 엔진 경로 20개\n\n실제 선택 함수와 저장 재현으로 생성했습니다. 미래 사건이나 빈 회상은 추가하지 않았습니다. 모든 문안은 제공된 v2.6 원문입니다.\n\n' + previews.join('\n\n---\n\n'));
await writeFile('docs/compact-import-report.json', JSON.stringify({
  sourcePackage: 'demon_king_v2_6_compact_timeline_codex.zip',
  manifestVersion: story.manifest.version,
  rawCompactFiles: compactFiles, protectedOriginalFiles: originalFiles,
  originalGraph: simulateAll(original), compactGraph: simulateAll(story),
  previews: { distinctPaths: selected.size, coveredEndings: [...new Set([...selected.values()].map(s => s.endingId))], saveReplay: '통과' },
  sourceLimitations: [
    '파일명은 v2.6이나 내부 매니페스트 버전은 2.2.0-compact로 유지되어 있다.',
    '합의금 서술에 대응하는 gold 효과, 유죄 서술에 대응하는 crimes/legalStatus 효과, 사망 서술에 대응하는 alive 효과가 원본에 없다. 서술에서 효과를 추측하지 않았다.',
    '13개 사건 사이 연령 간격과 분기 합류 후 일부 과거 플래그 미반영은 제공된 원문 그대로이다.',
  ],
}, null, 2) + '\n');
console.log('v2.6 원본 5개/원작 8개 바이트 보존, 147개 실제 종단 경로, 서로 다른 20개 경로/7개 엔딩 및 저장 재현 보고서 생성 완료');
