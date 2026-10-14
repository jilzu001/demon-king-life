import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import Ajv2020 from 'ajv/dist/2020';
import { assembleStory } from '../src/content/validate';
import { validateSchema } from '../src/content/schema';
import { simulateAll } from '../src/content/simulate';
import { evaluate } from '../src/engine/conditions';
import { createRun, choose } from '../src/engine/transition';
import { random } from '../src/engine/random';
import { decodeSave } from '../src/persistence/migrate';
import type { Manifest, Scene } from '../src/engine/types';

const baselinePath = 'backups/before-content-v2';
const draftPath = 'spec/content-v2-handoff';
async function json(path: string): Promise<any> { return JSON.parse(await readFile(resolve(path), 'utf8')); }
async function source(path: string) {
  const manifest = await json(`${path}/story.json`) as Manifest;
  const chapters = await Promise.all(manifest.chapters.map(file => json(`${path}/${file}`)));
  const characters = await json(`${path}/${manifest.charactersFile}`);
  const endings = await json(`${path}/${manifest.endingsFile}`);
  const story = assembleStory(manifest, chapters, characters, endings);
  return { manifest, chapters, characters, endings, story };
}
const old = await source(baselinePath);
const draft = await source(draftPath);
const presentation = await json(`${draftPath}/presentation.json`);
const status = await json(`${draftPath}/CONTENT_STATUS_V2.json`);
const removed: { nodeId: string; choiceId: string }[] = [];
const logicChanges: string[] = [];
const restoredChapters = structuredClone(draft.chapters);
for (const node of Object.values(old.story.nodes)) {
  const fresh = draft.story.nodes[node.id];
  if (!fresh) { logicChanges.push(`장면 삭제: ${node.id}`); continue; }
  if (node.age !== fresh.age || JSON.stringify(node.entryEffects) !== JSON.stringify(fresh.entryEffects)) logicChanges.push(`나이/진입 효과 변경: ${node.id}`);
  for (const choice of node.choices) {
    const next = fresh.choices.find(item => item.id === choice.id);
    if (!next) removed.push({ nodeId: node.id, choiceId: choice.id });
    else if (JSON.stringify(choice.outcomes) !== JSON.stringify(next.outcomes) || JSON.stringify(choice.enabledWhen) !== JSON.stringify(next.enabledWhen)) logicChanges.push(`조건/결과 변경: ${node.id}/${choice.id}`);
  }
  const restored = restoredChapters.flatMap(chapter => chapter.nodes as Scene[]).find((item: Scene) => item.id === node.id)!;
  restored.choices = node.choices.map(choice => structuredClone(fresh.choices.find(item => item.id === choice.id) ?? choice));
}
if (JSON.stringify(old.manifest.initialState) !== JSON.stringify(draft.manifest.initialState)) logicChanges.push('초기 상태 변경');
const protectedCandidate = assembleStory(draft.manifest, restoredChapters, draft.characters, draft.endings);
console.log('원본 v1.1과 v2 작업본, 선택 보존 후보의 전수 분기를 각각 검사합니다.');
const baselineReport = simulateAll(old.story);
const draftReport = simulateAll(draft.story);
const protectedReport = simulateAll(protectedCandidate);
const unavailableEndings = Object.keys(draft.story.endings).filter(id => !draftReport.endings[id]);
const schemaChecks: Record<string, unknown> = { mainContent: '통과' };
try { validateSchema('presentation', presentation); schemaChecks.currentPresentation = '통과'; }
catch (error) { schemaChecks.currentPresentation = String(error).slice(0, 500); }
const providedValidator = new Ajv2020({ strict: true, allErrors: true }).compile(await json(`${draftPath}/validation_schemas/presentation.schema.json`));
schemaChecks.providedPresentation = providedValidator(presentation) ? '통과' : { errorCount: providedValidator.errors?.length, examples: providedValidator.errors?.slice(0, 3) };
const cinematic = await json(`${draftPath}/ending_cinematics.json`);
const cinematicIds = cinematic.scenes.map((scene: { endingId: string }) => scene.endingId);
schemaChecks.cinematicReferences = cinematicIds.length === new Set(cinematicIds).size && cinematicIds.every((id: string) => draft.story.endings[id]) && Object.keys(draft.story.endings).every(id => cinematicIds.includes(id));
let saved = createRun(old.story, 1, 'v2-compatibility-audit');
saved = choose(old.story, saved, 'dk20_exam', 'attack').nextState;
saved = choose(old.story, saved, 'dk20_disarmed', 'second_attack').nextState;
let rawSaveCheck = '';
try { decodeSave(draft.story, JSON.stringify(saved)); rawSaveCheck = '통과'; }
catch (error) { rawSaveCheck = String(error); }
const restoredSave = decodeSave(protectedCandidate, JSON.stringify(saved));
const authoredIds = Object.entries(presentation.nodes as Record<string, { v2Authored?: boolean }>).filter(([, value]) => value.v2Authored === true).map(([id]) => id);
const duplicated = Object.values(draft.story.nodes).filter(node => {
  const lines = presentation.nodes[node.id]?.dialogues ?? [];
  return lines.length && lines.every((line: { speaker: string; text: string }) => node.body.includes(`${line.speaker}: “${line.text}”`));
}).map(node => node.id);
const paths = new Set<string>();
const previews: string[] = [];
for (let seed = 0; seed < 1000 && previews.length < 20; seed++) {
  let state = createRun(draft.story, seed, `v2-preview-${seed}`);
  let selectionSeed = seed;
  const text: string[] = [];
  while (!state.ended) {
    const node = draft.story.nodes[state.currentNodeId!]!;
    const lines = presentation.nodes[node.id]?.dialogues ?? [];
    const suffix = lines.map((line: { speaker: string; text: string }) => `${line.speaker}: “${line.text}”`).join('\n');
    const intro = suffix && node.body.endsWith(suffix) ? node.body.slice(0, -suffix.length).trimEnd() : node.body;
    text.push(`${node.age}세 · ${node.title}\n연대기: ${presentation.nodes[node.id]?.chronicleSummary ?? node.title}\n${intro}`);
    if (suffix && node.body.endsWith(suffix)) text.push(suffix);
    const choices = node.choices.filter(choice => evaluate(draft.story, state, choice.enabledWhen));
    if (!choices.length) throw new Error(`미리보기 교착: ${node.id}`);
    const roll = random(selectionSeed); selectionSeed = roll.state;
    const choice = choices[Math.floor(roll.value * choices.length)]!;
    const result = choose(draft.story, state, node.id, choice.id);
    text.push(`선택: ${choice.text}\n확정 결과: ${result.transitionReceipt.result} · ${result.transitionReceipt.outcomeId}`);
    state = result.nextState;
  }
  const signature = state.history.map(event => `${event.nodeId}/${event.choiceId}/${event.outcomeId}`).join('|');
  if (paths.has(signature)) continue;
  paths.add(signature);
  const ending = draft.story.endings[state.endingId!]!;
  text.push(`결말: ${ending.title}\n${ending.body}`);
  previews.push(`## 경로 ${previews.length + 1} · seed ${seed}\n\n${text.join('\n\n')}`);
}
if (previews.length < 20) throw new Error('20개 서로 다른 미리보기 경로를 만들지 못했습니다.');
const report = {
  baseline: { scenes: Object.keys(old.story.nodes).length, choices: Object.values(old.story.nodes).reduce((sum, node) => sum + node.choices.length, 0), ...baselineReport },
  draft: { scenes: Object.keys(draft.story.nodes).length, choices: Object.values(draft.story.nodes).reduce((sum, node) => sum + node.choices.length, 0), ...draftReport },
  removedChoices: removed, preservedChoiceLogicChanges: logicChanges, unavailableEndings,
  rawV11SaveCheck: rawSaveCheck,
  protectedCandidate: { ...protectedReport, originalMechanicsMatch: logicChanges.length === 0 && JSON.stringify(baselineReport) === JSON.stringify(protectedReport), originalSaveMatch: JSON.stringify(saved) === JSON.stringify(restoredSave) },
  schemaChecks, authoredStatus: status, v2AuthoredMarkers: authoredIds,
  dialogueDuplicatedInBodyAndSidecar: duplicated, previewPathCount: previews.length,
  note: 'v2 원본과 선택 보존 후보는 메모리에서만 검사했습니다. 공개 콘텐츠·엔진·세이브를 교체하지 않았습니다. 미리보기는 UI 통합 전 원문 읽기 순서 검사이며 집필 품질 완료 검증이 아닙니다.',
};
await mkdir(resolve('docs'), { recursive: true });
await writeFile(resolve('docs/v2-import-audit.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeFile(resolve('docs/v2-playthrough-previews.md'), `# v2 작업본 20개 경로 원문 미리보기\n\n공개 게임에 미적용 상태입니다. 엔진이 확정한 선택 순서에 따라 원문을 덤프했습니다. 본문과 사이드카의 동일 대사는 한 번만 표시했습니다. 조건 분기 전 다른 경로를 공개하지 않았으며, 집필 품질·UI 완료를 뜻하지 않습니다.\n\n${previews.join('\n\n')}\n`, 'utf8');
console.log(JSON.stringify({ scenes: report.draft.scenes, choices: report.draft.choices, reachableScenes: draftReport.reachableNodes, reachableEndings: Object.keys(draftReport.endings).length, unavailableEndings, removedChoices: removed.length, protectedCandidateMatches: report.protectedCandidate.originalMechanicsMatch, oldSaveRaw: rawSaveCheck, oldSaveProtected: report.protectedCandidate.originalSaveMatch, duplicatedScenes: duplicated.length, markedAuthoredScenes: authoredIds.length, remainingWritingAccordingToStatus: status.remainingSceneSpecificWritingNeeded, previewPaths: previews.length, schemaChecks }, null, 2));
