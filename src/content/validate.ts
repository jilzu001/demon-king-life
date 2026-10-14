import { validateSchema } from './schema';
import { validateCondition } from '../engine/conditions';
import { validateEffect } from '../engine/effects';
import { assertWorld } from '../engine/invariants';
import { ensure, type Manifest, type Scene, type Character, type Ending, type Story } from '../engine/types';

export function safeContentPath(path: string): string {
  ensure(/^[a-z0-9_./-]+\.json$/.test(path) && !path.split('/').some(p => p === '..' || p === '.' || !p), `허용되지 않은 콘텐츠 파일 경로: ${path}`);
  return path;
}
export function assembleStory(manifestData: unknown, chapters: unknown[], characterData: unknown, endingData: unknown): Story {
  validateSchema('story', manifestData); validateSchema('characters', characterData); validateSchema('endings', endingData);
  for (const chapter of chapters) validateSchema('chapter', chapter);
  const manifest = manifestData as Manifest;
  for (const file of [...manifest.chapters, manifest.charactersFile, manifest.endingsFile]) safeContentPath(file);
  ensure(chapters.length === manifest.chapters.length, '장 파일 개수가 매니페스트와 다릅니다.');
  const story: Story = { manifest, nodes: Object.create(null), characters: Object.create(null), endings: Object.create(null), warnings: [] };
  const ids = new Set<string>();
  const register = <T extends { id: string }>(target: Record<string, T>, entries: T[]) => {
    for (const entry of entries) {
      ensure(!ids.has(entry.id), `중복 공개 ID: ${entry.id}`);
      ids.add(entry.id); target[entry.id] = entry;
    }
  };
  register(story.characters, (characterData as { characters: Character[] }).characters);
  register(story.endings, (endingData as { endings: Ending[] }).endings);
  for (const chapter of chapters) register(story.nodes, (chapter as { nodes: Scene[] }).nodes);
  const entry = story.nodes[manifest.entryNodeId];
  ensure(entry && entry.age >= manifest.initialState.age, '시작 장면 누락 또는 초기 시간 역행');
  assertWorld(story, manifest.initialState);
  const unique = (list: { id: string }[], label: string) => ensure(new Set(list.map(x => x.id)).size === list.length, `${label}: 중복 ID`);
  const text = (value: string) => ensure(value.trim().length, '공백만 있는 콘텐츠 문구');
  text(manifest.title);
  for (const character of Object.values(story.characters)) { text(character.name); text(character.role); character.traits.forEach(text); }
  for (const node of Object.values(story.nodes)) {
    text(node.title); text(node.body); unique(node.choices, node.id);
    for (const effect of node.entryEffects ?? []) validateEffect(story, effect);
    for (const line of node.chronicle ?? []) {
      text(line.text); ensure(line.age <= node.age, `${node.id}: 미래 연대기 금지`);
      if (line.when) validateCondition(story, line.when);
      for (const id of [...(line.presence ?? []), ...(line.reference ?? []), ...(line.flashback ?? [])]) ensure(Object.hasOwn(story.characters, id), `미등록 등장 인물: ${id}`);
    }
    if (node.choices.length > 20) story.warnings.push(`${node.id}: 선택지 20개 초과`);
    for (const choice of node.choices) {
      text(choice.text); if (choice.description !== undefined) text(choice.description);
      unique(choice.outcomes, `${node.id}/${choice.id}`);
      if (choice.enabledWhen) validateCondition(story, choice.enabledWhen);
      ensure(Number.isSafeInteger(choice.outcomes.reduce((sum, outcome) => sum + outcome.weight, 0)), '결과 가중치 합계 범위 초과');
      for (const outcome of choice.outcomes) {
        if (outcome.when) validateCondition(story, outcome.when);
        for (const effect of outcome.effects ?? []) validateEffect(story, effect);
        if (outcome.to.kind === 'node') {
          const target = story.nodes[outcome.to.id];
          ensure(target && target.age >= node.age, `${node.id}: 대상 누락 또는 시간 역행 ${outcome.to.id}`);
        } else ensure(Object.hasOwn(story.endings, outcome.to.id), `대상 엔딩 누락: ${outcome.to.id}`);
      }
    }
  }
  for (const ending of Object.values(story.endings)) {
    text(ending.title); text(ending.body);
    for (const rule of ending.recapRules ?? []) { text(rule.text); validateCondition(story, rule.when); }
  }
  const visited = new Set<string>(); const active = new Set<string>();
  const walk = (id: string) => {
    ensure(!active.has(id), `분기 순환 금지: ${id}`);
    if (visited.has(id)) return;
    active.add(id);
    for (const choice of story.nodes[id]!.choices) for (const outcome of choice.outcomes) if (outcome.to.kind === 'node') walk(outcome.to.id);
    active.delete(id); visited.add(id);
  };
  walk(manifest.entryNodeId);
  const reachable = new Set(visited);
  for (const id of Object.keys(story.nodes)) {
    if (!reachable.has(id)) story.warnings.push(`도달 불가능 장면: ${id}`);
    walk(id); // 연결되지 않은 컴포넌트의 순환도 검사한다.
  }
  return story;
}
