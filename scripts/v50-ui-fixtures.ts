import { readFileSync } from 'node:fs';
import { readExampleStory } from './read-story';
import { choose, createRun } from '../src/engine/transition';
import { endingFullText, endingRecapLines } from '../src/content/freedom-memory';
const story=await readExampleStory('demon-king-compact');
const paths=JSON.parse(readFileSync('docs/v5.0/actual-ending-paths.json','utf8')) as {endingId:string;choices:string[]}[];
const expected=Object.fromEntries(paths.map(path=>{
  const run=path.choices.reduce((state,id)=>choose(story,state,state.currentNodeId!,id).nextState,createRun(story,17,'expected'));
  return [path.endingId,{fullText:endingFullText(story,run),recaps:endingRecapLines(story,run)}];
}));
const old=await readExampleStory('demon-king-v48-archive');
console.log(JSON.stringify({story,expected,legacy:JSON.stringify(createRun(old,17,'protected-old'))}));
