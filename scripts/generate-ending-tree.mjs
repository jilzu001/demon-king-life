#!/usr/bin/env node
// 전체 선택/판정 결과를 합류 가능한 DAG로 만든다. 20개 실제 검증 경로는 별도로 유지한다.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const repo = path.resolve(process.argv[2] ?? '.');
const output = path.resolve(process.argv[3] ?? path.join(repo, 'src/content/generated/ending-tree.json'));
const read = async file => JSON.parse(await readFile(file, 'utf8'));
const root = path.join(repo, 'public/stories/demon-king-compact');
const story = await read(path.join(root, 'story.json'));
const pathsFile = story.version === '5.0.0' ? 'docs/v5.0/actual-ending-paths.json' : 'docs/v4.5/actual-ending-paths.json';
const paths = await read(path.join(repo, pathsFile));
const endings = (await read(path.join(root, story.endingsFile))).endings;
const scenes = (await Promise.all(story.chapters.map(file => read(path.join(root, file))))).flatMap(chapter => chapter.nodes);
const stepId = (node, choice, outcome) => `step:${node}:${choice}:${outcome}`;
const nodes = [{ id: 'origin', type: 'origin', depth: 0, parentId: null, routeIds: [] }];
const choicesByScene = new Map();
for (const scene of scenes) {
  nodes.push({id: `scene:${scene.id}`, type: 'scene', nodeId: scene.id, age:scene.age, sceneTitle:scene.title, depth:0, parentId:null, routeIds:[]});
  const ids = [];
  for (const choice of scene.choices) for (const outcome of choice.outcomes) {
    const id = stepId(scene.id, choice.id, outcome.id); ids.push(id);
    nodes.push({ id, type: 'step', parentId: null, depth: 0, nodeId: scene.id, age: scene.age,
      sceneTitle: scene.title, choiceId: choice.id, choiceText: choice.text, outcomeId: outcome.id,
      toKind: outcome.to.kind, toId: outcome.to.id, routeIds: [] });
  }
  choicesByScene.set(scene.id, ids);
}
for (const ending of endings) nodes.push({ id: `ending:${ending.id}`, type: 'ending', endingId: ending.id, parentId: null, depth: 0, routeIds: [] });
const edges = [{from:'origin', to:`scene:${story.entryNodeId}`}];
for (const scene of scenes) edges.push(...choicesByScene.get(scene.id).map(to=>({from:`scene:${scene.id}`,to})));
for (const node of nodes.filter(node => node.type === 'step')) {
  const next = [node.toKind === 'ending' ? `ending:${node.toId}` : `scene:${node.toId}`];
  if (!next?.length) throw Error(`목적지 없음: ${node.id}`);
  edges.push(...next.map(to => ({ from: node.id, to })));
}
// 구 회차는 같은 시험 선택에서 게이트를 거치지 않았다. 실제 저장 경로만 버전 조건부 간선으로 보존한다.
const legacy = {attack:'prison',refuse:'petition',invoice:'invoice',confess:'confession'};
for(const node of nodes.filter(node=>story.version !== '5.0.0' && node.type==='step' && node.nodeId==='exam')) if(legacy[node.choiceId]) edges.push({from:node.id,to:`scene:${legacy[node.choiceId]}`,legacyVersion:'2.3.0-compact'});
const byId = new Map(nodes.map(node => [node.id, node]));
if (byId.size !== nodes.length) throw Error('중복 노드');
const degree = new Map(nodes.map(node => [node.id, edges.filter(edge => edge.to === node.id).length]));
const queue = nodes.filter(node => degree.get(node.id) === 0); let visited = 0;
for (const node of queue) {
  visited++;
  for (const edge of edges.filter(edge => edge.from === node.id)) {
    const target = byId.get(edge.to); if (!target) throw Error('누락 목적지');
    target.depth = Math.max(target.depth, node.depth + 1); target.parentId ??= node.id;
    degree.set(target.id, degree.get(target.id) - 1);
    if (degree.get(target.id) === 0) queue.push(target);
  }
}
if (visited !== nodes.length || queue[0]?.id !== 'origin' || nodes.some(node => node.id !== 'origin' && !node.parentId)) throw Error('순환 또는 단절된 분기');
const routes = {};
for (const path of paths) {
  const ids = ['origin', ...path.history.flatMap(entry => [`scene:${entry.nodeId}`,stepId(entry.nodeId, entry.choiceId, entry.outcomeId)]), `ending:${path.endingId}`];
  if (routes[path.endingId]) throw Error('중복 엔딩');
  for (let i = 0; i < ids.length; i++) {
    const node = byId.get(ids[i]); if (!node) throw Error('검증 경로 누락');
    if (i && !edges.some(edge => edge.from === ids[i - 1] && edge.to === ids[i])) throw Error('검증 경로 단절');
    node.routeIds.push(path.endingId);
  }
  routes[path.endingId] = ids;
}
if (Object.keys(routes).length !== endings.length) throw Error('실제 엔딩 수 불일치');
const out = { schemaVersion: 2, usage: 'complete-choice-outcome-dag; conditional-edges-require-state',
  generatedFrom: [pathsFile, 'public/stories/demon-king-compact/story.json'],
  storyVersion: story.version, endingCount: endings.length, sceneCount: scenes.length,
  choiceCount: scenes.reduce((sum, scene) => sum + scene.choices.length, 0), nodes, edges, routes };
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log(`전체 분기: ${out.sceneCount}사건/${out.choiceCount}선택/${nodes.length}노드/${edges.length}연결`);
