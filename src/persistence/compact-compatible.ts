import { preV48Story } from '../content/compact-previous';
import manifest from '../../spec/content-v2.6-compact-timeline/story.json';
import chapter from '../../spec/content-v2.6-compact-timeline/chapters/01_complete.json';
import characters from '../../spec/content-v2.6-compact-timeline/characters.json';
import endings from '../../spec/content-v2.6-compact-timeline/endings.json';
import { assembleStory } from '../content/validate';
import { parseJson } from '../content/json';
import { ensure, type GameState, type Story } from '../engine/types';
import { decodeSave } from './migrate';
import { runKey, META_KEY, type StoragePort } from './save';
import { compactSlot, isCompact } from '../content/compact-contract';

export const previousCompactStory = assembleStory(manifest, [chapter], characters, endings);
export const COMPACT_V37_BACKUP_KEY = 'existence-sim:v1:backup:before-v3.7:demon-king:compact';
export function compactStoryForState<T extends Story>(story: T, version: string): T | typeof preV48Story {
  if (story.manifest.version === '2.4.0-compact' && version === '2.3.0-compact') return preV48Story;
  return story;
}
export function decodeCompatibleCompact(story: Story, text: string): GameState {
  const data = parseJson(text, '세이브') as GameState;
  const context = compactStoryForState(story, data.storyVersion);
  if (data.storyVersion === context.manifest.version) return decodeSave(context, text);
  ensure(isCompact(story.manifest) && ['2.3.0-compact', '2.4.0-compact'].includes(story.manifest.version) && data.storyVersion === '2.2.0-compact', '이관 규칙이 없는 축소판 저장 버전입니다.');
  const verified = decodeSave(previousCompactStory, text);
  const target = story.manifest.version === '2.4.0-compact' ? preV48Story : story;
  return decodeSave(target, JSON.stringify({ ...verified, storyVersion: target.manifest.version }));
}
export function backupBeforeCompactUpgrade(storage: StoragePort): void {
  const run = storage.getItem(runKey(compactSlot));
  if (!run || (parseJson(run, '세이브') as GameState).storyVersion !== '2.2.0-compact' || storage.getItem(COMPACT_V37_BACKUP_KEY) !== null) return;
  const backup = JSON.stringify({ run, meta: storage.getItem(`${META_KEY}:${compactSlot}`) });
  storage.setItem(COMPACT_V37_BACKUP_KEY, backup);
  ensure(storage.getItem(COMPACT_V37_BACKUP_KEY) === backup, '구 축소판 저장 백업 확인 실패');
}
