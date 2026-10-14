import { readExampleStory } from '../scripts/read-story';
import { choose, createRun } from '../src/engine/transition';
import type { GameState, Story } from '../src/engine/types';
import type { StoragePort } from '../src/persistence/save';

export const example = await readExampleStory('demon-king-legacy-phase1');
export const fullContent = await readExampleStory();
export function run(seed = 123): GameState { return createRun(example, seed, 'test-run'); }
export function steps(choices: string[], seed = 123): GameState {
  return choices.reduce((state, choice) => choose(example, state, state.currentNodeId!, choice).nextState, run(seed));
}
export function copyStory(): Story { return structuredClone(example); }
export class MemoryStorage implements StoragePort {
  values = new Map<string, string>();
  fail = false;
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { if (this.fail) throw new Error('저장 용량 부족'); this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}
