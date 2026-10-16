import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { readExampleStory } from '../../scripts/read-story';
import { choose, createRun } from '../../src/engine/transition';
import { decodeSave } from '../../src/persistence/migrate';
import { SaveStore, runKey, META_KEY } from '../../src/persistence/save';
import { backupBeforeImport, backupKey, FREEDOM_PREVIOUS_BACKUP_KEY, resolveCompatibleSave } from '../../src/persistence/compatibility';
import { archiveTreeRun, loadTreeRuns, treeHistoryKey, TREE_HISTORY_KEY, loadPastTreeSources } from '../../src/persistence/tree-history';
import { resumeAtVisitedNode, reselectBackupKey, backupBeforeReselect } from '../../src/persistence/reselect';
import { freedomSlot, compactSlot } from '../../src/content/compact-contract';
import { freedomChronicle, endingRecapLines, endingFullText } from '../../src/content/freedom-memory';
import { endingGalleryEntries, endingArtworkPath } from '../../src/content/ending-gallery';
import { routeBody, routeYears } from '../../src/content/route-years';
import { collectedRouteNodes, collectedRoutes, historyTreeIds, routeEdges, tree, byTreeId, resumeSource, layoutTree } from '../../src/ui/ending-tree-layout';
import { illustrationAsset, outcomeArtwork } from '../../src/ui/illustrations';
import { memoryEvents } from '../../src/ui/compact-ending';
import { MemoryStorage } from '../fixtures';

const story = await readExampleStory('demon-king-compact');
const old = await readExampleStory('demon-king-v48-archive');
const paths = JSON.parse(readFileSync('docs/v5.0/actual-ending-paths.json', 'utf8')) as {endingId:string;choices:string[];nodes:string[]}[];
const play = (choices:string[], id='v5-test') => choices.reduce((state, choice) => choose(story,state,state.currentNodeId!,choice).nextState,createRun(story,17,id));

it('새32엔딩의 모든 중간 저장·불러오기와 방문 선택 직전 재선택을 재현한다',()=>{
  for(const path of paths) {
    for(let i=0;i<=path.choices.length;i++) {
      const state=play(path.choices.slice(0,i));expect(decodeSave(story,JSON.stringify(state))).toEqual(state);
    }
    const state=play(path.choices); expect(state.endingId).toBe(path.endingId);
    for(const [i,id] of state.enteredNodeIds.entries()) expect(resumeAtVisitedNode(story,state,id,'restored')).toEqual(play(path.choices.slice(0,i),'restored'));
    expect(memoryEvents(story,state).map(item=>item.node.id)).toEqual(path.nodes);
  }
});

it('구판 회차·획득·분기 원본을 그대로 보존하며 v5 슬롯과 백업을 분리한다',()=>{
  const storage=new MemoryStorage(), oldRun=createRun(old,17,'old');
  const protectedKeys=[runKey(compactSlot),`${META_KEY}:${compactSlot}`,TREE_HISTORY_KEY];
  const originals=[JSON.stringify(oldRun),JSON.stringify({saveSchemaVersion:1,discoveredEndings:{'demon-king':['ending_peace']}}),'legacy-history'];
  protectedKeys.forEach((key,i)=>storage.setItem(key,originals[i]!)); storage.setItem(backupKey(compactSlot),'earlier-protected-backup'); backupBeforeImport(storage,compactSlot,FREEDOM_PREVIOUS_BACKUP_KEY);
  const store=new SaveStore(story,()=>storage,undefined,freedomSlot);
  const state=play(paths[0]!.choices);store.commit(state);archiveTreeRun(storage,story,state);backupBeforeReselect(storage,state);
  expect(store.load()).toEqual(state);expect(store.loadMeta().discoveredEndings['demon-king']).toEqual([state.endingId]);
  expect(protectedKeys.map(key=>storage.getItem(key))).toEqual(originals);
  expect(JSON.parse(storage.getItem(FREEDOM_PREVIOUS_BACKUP_KEY)!).run).toBe(originals[0]);
  expect(storage.getItem(backupKey(compactSlot))).toBe('earlier-protected-backup');
  expect(storage.getItem(reselectBackupKey(story))).toBe(JSON.stringify(state));
  expect(()=>resolveCompatibleSave(story,old,originals[0]!)).toThrow('이전 판');
  expect(store.load()).toEqual(state);expect(loadPastTreeSources(storage,story).runs.every(run=>run.storyVersion==='5.0.0')).toBe(true);
});

it('32개 엔딩 보관과 최근 미완주1개·새회차의 수집색·실제 지난 분기 복원을 유지한다',()=>{
  const storage=new MemoryStorage(), store=new SaveStore(story,()=>storage,undefined,freedomSlot);
  for(const path of paths) {const state=play(path.choices,path.endingId);store.commit(state);archiveTreeRun(storage,story,state);}
  archiveTreeRun(storage,story,play(paths[0]!.choices.slice(0,2),'unfinished'));
  expect(loadTreeRuns(storage,story)).toHaveLength(33);expect(storage.getItem(treeHistoryKey(story))!.length).toBeLessThan(1_000_000);
  const fresh=createRun(story,22,'fresh');store.commit(fresh);const discovered=new Set(store.loadMeta().discoveredEndings['demon-king']);
  expect(discovered.size).toBe(32);const past=loadTreeRuns(storage,story);
  expect(collectedRoutes(discovered,past)).toHaveLength(32);expect(collectedRouteNodes(discovered,past).size).toBeGreaterThan(100);
  const node=byTreeId.get('scene:exam')!;const source=resumeSource(node,fresh,past)!;expect(source.enteredNodeIds).toContain('exam');
  expect(resumeAtVisitedNode(story,source,'exam','restored').currentNodeId).toBe('exam');
});

it('47사건106선택/결과32엔딩 전체 그래프를 누락·가짜 합류 없이 유지한다',()=>{
  expect(tree.nodes).toHaveLength(186);expect(tree.edges).toHaveLength(213);expect(tree.nodes.filter(node=>node.type==='step')).toHaveLength(106);
  expect(Object.keys(tree.routes)).toHaveLength(32);
  for(const path of paths) {
    const state=play(path.choices);expect(tree.routes[path.endingId]).toEqual(historyTreeIds(state));
    for(const edge of routeEdges(historyTreeIds(state))) expect(tree.edges.some(item=>`${item.from}→${item.to}`===edge)).toBe(true);
    expect(new Set(state.enteredNodeIds.filter(id=>id.startsWith('route_')).map(id=>id.split('_')[1])).size).toBe(1);
  }
  const positions=layoutTree().positions;expect(new Set([...positions.values()].map(p=>`${p.x},${p.y}`)).size).toBe(186);
  for(const edge of tree.edges) expect(positions.get(edge.to)!.x).toBeGreaterThan(positions.get(edge.from)!.x);
});

it('조건부 연대기는 실제 과거만 반영하고 미래 플래그·미방문 사건을 기억하지 않는다',()=>{
  for(const path of paths) {
    const state=play(path.choices), before=JSON.stringify(state);
    expect(freedomChronicle(story,state,'route_missing')).toEqual([]);
    for(const [i,id] of state.enteredNodeIds.entries()) {
      const then=play(path.choices.slice(0,i));
      expect(freedomChronicle(story,state,id)).toEqual(freedomChronicle(story,then,id));
      expect(routeYears(story,state,id).map(line=>line.text)).toEqual(freedomChronicle(story,state,id).map(line=>line.text));
      expect(routeBody(story,state,id)).toContain(story.nodes[id]!.body);
    }
    expect(JSON.stringify(state)).toBe(before);
    for(const text of endingRecapLines(story,state)) expect(endingFullText(story,state)).toContain(text);
  }
});

it('새 도감은 실제32개 데이터이며 구20개 그림을 잘못 연결하지 않는다',()=>{
  const entries=endingGalleryEntries(story);expect(entries).toHaveLength(32);
  for(const entry of entries) {
    expect(entry.fullText).toBe(story.endings[entry.id]!.body);expect(entry.description.length).toBeGreaterThan(0);
    expect(endingArtworkPath(entry.id)).toBeUndefined();
  }
  expect(endingGalleryEntries(old)).toHaveLength(20);
});

it('검수6개 그림만 실제 방문에서 연결하고 미제작 사건/구판 결과 CG를 누출하지 않는다',()=>{
  const audit=JSON.parse(readFileSync('docs/v5.0/illustration-audit.json','utf8')) as {assets:{nodeId:string;selected:boolean;artPath?:string;path?:string;bytes:number}[]};
  for(const art of audit.assets.filter(item=>item.selected)) {
    const path=paths.find(path=>path.nodes.includes(art.nodeId))!;const state=play(path.choices);
    const asset=illustrationAsset(art.nodeId,'scene',{state,age:story.nodes[art.nodeId]!.age,body:story.nodes[art.nodeId]!.body});
    expect(asset?.path).toBe(art.artPath??art.path);expect(readFileSync(`public/${asset!.path}`).byteLength).toBe(art.bytes);expect(art.bytes).toBeLessThan(120000);
    expect(illustrationAsset(art.nodeId,'scene',{state:createRun(story,17,'fresh'),age:story.nodes[art.nodeId]!.age,body:''})?.path).toBe(art.nodeId==='birth'?asset?.path:undefined);
  }
  const state=play(paths[0]!.choices);
  expect(illustrationAsset('child','scene',{state,age:12,body:story.nodes.child!.body})).toBeUndefined();
  for(const entry of state.history) expect(outcomeArtwork(state,entry)).toBeUndefined();
});
