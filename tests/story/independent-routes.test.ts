import { vi } from 'vitest';
vi.mock('../../src/content/generated/ending-tree.json', async () => ({ default: (await import('../../backups/before-v5.0/ending-tree-v48.json')).default }));
import { it, expect } from 'vitest';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { readExampleStory } from '../../scripts/read-story';
import { preV48Story } from '../../src/content/compact-previous';
import { choose, createRun } from '../../src/engine/transition';
import { evaluate } from '../../src/engine/conditions';
import { decodeSave } from '../../src/persistence/migrate';
import { decodeCompatibleCompact, compactStoryForState } from '../../src/persistence/compact-compatible';
import { resumeAtVisitedNode } from '../../src/persistence/reselect';
import { simulationKey } from '../../src/content/simulation-key';
import { byTreeId, historyTreeIds, routeEdges, tree, visitStatus } from '../../src/ui/ending-tree-layout';
const story = await readExampleStory('demon-king-v48-archive');
const root = 'spec/content-v48-independent/demon_king_v48/';
const read = (file: string) => JSON.parse(readFileSync(file, 'utf8'));
const source = read(`${root}04_v48_independent_life_routes.json`) as {nodes: typeof story.nodes[string][]};
const matrix = read(`${root}route_matrix.json`) as {route:string;axis:string;entry:string;middle:string;final:string;ending_options:string[]}[];
const patches = read(`${root}routing_patch.json`).replaceOutcomeDestinations as {existingChoice:string;newTo:string;legacyContinuation:string}[];

it('원고28사건76선택/결과와 기존119개 계약을 보호하고 시험의 목적지4개만 바꾼다', () => {
  expect(Object.keys(story.nodes)).toHaveLength(72);
  expect(Object.values(story.nodes).flatMap(node=>node.choices)).toHaveLength(195);
  for(const old of Object.values(preV48Story.nodes)) {
    const current=story.nodes[old.id]!;
    for(const choice of old.choices) {
      const actual=current.choices.find(c=>c.id===choice.id)!;
      const patch=old.id==='exam'?patches.find(p=>p.existingChoice===choice.id):undefined;
      const expected=structuredClone(choice); if(patch) expected.outcomes[0]!.to={kind:'node',id:patch.newTo};
      expect(actual).toEqual(expected);
    }
    expect({...current,choices:old.choices}).toEqual(old);
  }
  expect(story.endings).toEqual(preV48Story.endings);
  expect(story.manifest.initialState).toEqual(preV48Story.manifest.initialState);
  expect(source.nodes).toHaveLength(28); expect(source.nodes.flatMap(node=>node.choices)).toHaveLength(76);
  for(const raw of source.nodes) {
    const node=story.nodes[raw.id]!;
    const normalized=(text:string)=>text.replace(/\s/g,'');
    expect(normalized(node.body)).toBe(normalized(raw.body.replace(raw.id==='v48_refuse_collective_final'?'마흔일곱 살,':'<none>','예순 살,')));
    for(const choice of raw.choices) {
      const next=node.choices.find(c=>c.id===choice.id)!;
      expect(next.text).toBe(choice.text);expect(next.enabledWhen).toEqual(choice.enabledWhen);
      expect(next.outcomes.map(o=>[o.id,o.to,o.weight,o.result])).toEqual(choice.outcomes.map(o=>[o.id,o.to,o.weight,o.result]));
      expect(next.outcomes[0]!.narrative).toContain(choice.outcomes[0]!.narrative);
    }
  }
});

const evidence: {route:string;middleChoice:string;endingId:string;choices:string[]}[]=[];
for(const route of matrix) it(`${route.route}: 독립3사건·중년 조건·양쪽 결말·저장/재선택`,()=>{
  const axis=route.route.split('_')[1]!, gate=`v48_${axis}_gate`;
  const prefix=['family_accept','trust_mina',axis,`${route.route}_enter`];
  for(const entry of story.nodes[route.entry]!.choices) for(const middle of story.nodes[route.middle]!.choices) {
    let state=createRun(story,17,`v48-${route.route}`);
    const choices=[...prefix,entry.id,middle.id];
    for(const id of choices) {
      const before=state.age;state=choose(story,state,state.currentNodeId!,id).nextState;
      expect(state.age).toBeGreaterThanOrEqual(before);expect(decodeSave(story,JSON.stringify(state))).toEqual(state);
    }
    expect(state.enteredNodeIds.filter(id=>id.startsWith('v48_'))).toEqual([gate,route.entry,route.middle,route.final]);
    const finals=story.nodes[route.final]!.choices;
    const enabled=finals.filter(choice=>evaluate(story,state,choice.enabledWhen));
    const expected=middle.id.endsWith('_protect')?[route.ending_options[0]]:middle.id.endsWith('_delegate')?[route.ending_options[1]]:route.ending_options;
    expect(enabled.map(choice=>choice.outcomes[0]!.to.id)).toEqual(expected);
    for(const choice of finals.filter(choice=>!enabled.includes(choice))) expect(()=>choose(story,state,state.currentNodeId!,choice.id)).toThrow('조건');
    for(const choice of enabled) {
      const ending=choose(story,state,state.currentNodeId!,choice.id).nextState;
      expect(ending.ended).toBe(true); expect(decodeSave(story,JSON.stringify(ending))).toEqual(ending);
      const resumed=resumeAtVisitedNode(story,ending,route.final,'reselect'); expect(resumed).toEqual({...state,runId:'reselect'});
      if(ending.endingId==='ending_mina_wedding') expect(ending.flags).toEqual(expect.arrayContaining(['marriage_consent_mina','marriage_consent_player','marriage_registered','v48_mina_qualified']));
      if(ending.endingId==='ending_fire') expect(ending.flags).toContain('v48_arson_committed');
      if(ending.endingId==='ending_ledger') expect(ending.flags).toContain('v48_evidence_stolen');
      evidence.push({route:route.route,middleChoice:middle.id,endingId:ending.endingId!,choices:[...choices,choice.id]});
    }
  }
  mkdirSync('docs/v4.8',{recursive:true});writeFileSync('docs/v4.8/independent-route-paths.json',JSON.stringify(evidence,null,2)+'\n');
});

it('기존20엔딩 회차는 새 게이트 방문이나 선택을 합성하지 않고 그대로 읽고 재선택한다',()=>{
  const paths=read('backups/before-v4.8/actual-ending-paths.json') as {endingId:string;choices:string[]}[];
  for(const path of paths) {
    let state=createRun(preV48Story,17,'old');
    for(const id of path.choices) state=choose(preV48Story,state,state.currentNodeId!,id).nextState;
    const text=JSON.stringify(state); expect(decodeCompatibleCompact(story,text)).toEqual(state);
    expect(compactStoryForState(story,state.storyVersion)).toBe(preV48Story);
    const resumed=resumeAtVisitedNode(story,state,'exam','old-resume');expect(resumed.storyVersion).toBe('2.3.0-compact');
    expect(resumed.enteredNodeIds.some(id=>id.startsWith('v48_'))).toBe(false);
    expect(JSON.stringify(state)).toBe(text);
    for(const id of historyTreeIds(state)) expect(byTreeId.has(id)).toBe(true);
    for(const key of routeEdges(historyTreeIds(state))) expect(tree.edges.some(edge=>`${edge.from}→${edge.to}`===key)).toBe(true);
  }
});

it('전체195선택/결과의 실제 경로·72사건 합류와 실제 방문 색을 검증한다',()=>{
  const queue=[createRun(story,0,'coverage')], seen=new Set<string>(), hash=simulationKey(story), witnesses=new Map<string,string[]>();
  for(const state of queue) {
    const key=hash(state);if(seen.has(key))continue;seen.add(key);if(state.ended)continue;
    for(const choice of story.nodes[state.currentNodeId!]!.choices.filter(c=>evaluate(story,state,c.enabledWhen))) {
      const next=choose(story,state,state.currentNodeId!,choice.id).nextState;
      witnesses.set(`step:${state.currentNodeId}:${choice.id}:${next.history.at(-1)!.outcomeId}`,next.history.map(entry=>entry.choiceId));queue.push(next);
    }
  }
  expect(witnesses.size).toBe(195);expect(tree.nodes.filter(node=>node.type==='scene')).toHaveLength(72);
  expect(new Set(tree.nodes.filter(node=>node.type==='scene').map(node=>node.nodeId)).size).toBe(72);
  expect(tree.nodes).toHaveLength(288);expect(tree.edges).toHaveLength(395);
  for(const [id,choices] of witnesses) {
    let run=createRun(story,0,'replay');for(const choice of choices)run=choose(story,run,run.currentNodeId!,choice).nextState;
    expect(visitStatus(byTreeId.get(id)!,run).selected).toBe(true);
  }
  writeFileSync('docs/v4.8/all-choice-paths.json',JSON.stringify({seed:0,count:witnesses.size,witnesses:Object.fromEntries(witnesses)},null,2)+'\n');
});
