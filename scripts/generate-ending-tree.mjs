#!/usr/bin/env node
/**
 * Static ending-collection route trie builder for demon-king-life.
 * Input is the repository's actually VERIFIED v4.5 ending-route samples.
 * This is a GUIDE for one known route per ending, NOT every possible game path.
 * No changes to running state, story, save schema, RNG, or choices.
 * Usage: node scripts/generate-ending-tree.mjs /path/to/demon-king-life [output.json]
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const repo = path.resolve(process.argv[2] ?? '.');
const output = path.resolve(process.argv[3] ?? path.join(repo, 'src/content/generated/ending-tree.json'));
const read = async p => JSON.parse(await readFile(p, 'utf8'));
const storyFile = path.join(repo, 'public/stories/demon-king-compact/story.json');
const story = await read(storyFile);
const storyDir = path.dirname(storyFile);
const paths = await read(path.join(repo, 'docs/v4.5/actual-ending-paths.json'));
const endingsRaw = await read(path.join(storyDir, story.endingsFile));
const endingList = Array.isArray(endingsRaw.endings) ? endingsRaw.endings : Array.isArray(endingsRaw) ? endingsRaw : Object.values(endingsRaw.endings ?? {});
const endingIds = new Set(endingList.map(e => e.id));
const scenes = new Map();
for (const chapter of story.chapters) {
  const data = await read(path.join(storyDir, chapter));
  if (!Array.isArray(data.nodes)) throw new Error(`챕터 nodes 없음: ${chapter}`);
  for (const scene of data.nodes) {
    if (scenes.has(scene.id)) throw new Error(`중복 사건 ID: ${scene.id}`);
    scenes.set(scene.id, scene);
  }
}
if (!Array.isArray(paths) || paths.length !== 20) throw new Error(`확인된 추천 경로 20개 필요: ${paths?.length}`);
if (new Set(paths.map(r => r.endingId)).size !== paths.length) throw new Error('중복 엔딩 경로');
const uncovered = [...endingIds].filter(e => !paths.some(route => route.endingId === e));
if (uncovered.length || endingIds.size !== paths.length) throw new Error(`20개 엔딩 불일치: ${uncovered.join(',')}`);
const idFor = (value) => crypto.createHash('sha256').update(value).digest('hex').slice(0, 14);
const nodes = [{ id: 'origin', type: 'origin', label: '0세 · 출생신고', depth: 0, parentId: null, routeIds: [] }];
const byId = new Map(nodes.map(n => [n.id, n]));
const routeNodeIds = {};
for (const route of paths) {
  if (!Array.isArray(route.history) || !route.history.length) throw new Error(`${route.endingId}: 빈 실제 경로`);
  if (!endingIds.has(route.endingId)) throw new Error(`${route.endingId}: 공식 엔딩 파일에 없음`);
  if (route.history[0].nodeId !== story.entryNodeId) throw new Error(`${route.endingId}: 출발 사건 불일치`);
  let parent = 'origin', prefix = '', selected = [];
  byId.get('origin').routeIds.push(route.endingId);
  for (let i = 0; i < route.history.length; i++) {
    const step = route.history[i];
    const currentScene = scenes.get(step.nodeId);
    if (!currentScene) throw new Error(`${route.endingId}: 누락 사건 ${step.nodeId}`);
    if (step.age !== currentScene.age) throw new Error(`${route.endingId}: 나이 불일치 ${step.nodeId} ${step.age}/${currentScene.age}`);
    const choice = currentScene.choices?.find(c => c.id === step.choiceId);
    if (!choice) throw new Error(`${route.endingId}: 선택 ID 불일치 ${step.nodeId}/${step.choiceId}`);
    const outcome = choice.outcomes?.find(o => o.id === step.outcomeId);
    if (!outcome) throw new Error(`${route.endingId}: 결과 ID 불일치 ${step.nodeId}/${step.outcomeId}`);
    if (outcome.to?.kind !== step.toKind || outcome.to?.id !== step.toId) throw new Error(`${route.endingId}: 결과 목적지 불일치 ${step.nodeId}`);
    if (i < route.history.length - 1 && (step.toKind !== 'node' || step.toId !== route.history[i + 1].nodeId)) throw new Error(`${route.endingId}: 역사 기록 연속성 오류 ${step.nodeId}`);
    if (i === route.history.length - 1 && (step.toKind !== 'ending' || step.toId !== route.endingId)) throw new Error(`${route.endingId}: 결말 경로 오류`);
    prefix += `|${step.nodeId}/${step.choiceId}/${step.outcomeId}`;
    const id = `step-${idFor(prefix)}`;
    if (!byId.has(id)) {
      const node = {
        id, type: 'step', parentId: parent, depth: i + 1, nodeId: step.nodeId, age: step.age,
        sceneTitle: currentScene.title, choiceId: step.choiceId, choiceText: choice.text,
        outcomeId: step.outcomeId, toKind: step.toKind, toId: step.toId, routeIds: []
      };
      byId.set(id, node); nodes.push(node);
    } else if (byId.get(id).parentId !== parent) {
      throw new Error(`${route.endingId}: prefix-tree parent mismatch`);
    }
    byId.get(id).routeIds.push(route.endingId);
    selected.push(id); parent = id;
  }
  const eid = `ending:${route.endingId}`;
  if (byId.has(eid)) throw new Error(`엔딩 중복: ${eid}`);
  const n = { id: eid, type: 'ending', parentId: parent, depth: selected.length + 1, endingId: route.endingId, age: route.age, routeIds: [route.endingId] };
  byId.set(eid, n); nodes.push(n);
  routeNodeIds[route.endingId] = ['origin', ...selected, eid];
}
const edges = nodes.filter(n => n.parentId).map(n => ({ from: n.parentId, to: n.id }));
const out = {
  schemaVersion: 1,
  generatedFrom: ['docs/v4.5/actual-ending-paths.json', 'public/stories/demon-king-compact/story.json'],
  usage: 'verified-one-sample-per-ending; not-complete-branch-graph',
  storyVersion: story.version,
  endingCount: paths.length,
  nodes, edges, routes: routeNodeIds,
};
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log(`OK: ${paths.length} actual ending routes, ${nodes.length} trie nodes, ${edges.length} edges -> ${output}`);
