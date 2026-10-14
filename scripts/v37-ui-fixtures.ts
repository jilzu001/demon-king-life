import { readExampleStory } from './read-story';
import { previousCompactStory } from '../src/persistence/compact-compatible';
import { choose, createRun } from '../src/engine/transition';
const story = await readExampleStory('demon-king-compact');
let old = createRun(previousCompactStory, 17, 'v37-old-save');
for (const id of ['family_accept', 'trust_mina', 'attack', 'forgive', 'ally']) old = choose(previousCompactStory, old, old.currentNodeId!, id).nextState;
let exam = createRun(story, 17, 'choices-audit');
for (const id of ['family_accept', 'trust_mina']) exam = choose(story, exam, exam.currentNodeId!, id).nextState;
console.log(JSON.stringify({ old, exam }));
