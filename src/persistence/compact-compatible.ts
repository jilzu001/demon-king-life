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
export function decodeCompatibleCompact(story: Story, text: string): GameState {
  const data = parseJson(text, '세이브') as GameState;
  if (data.storyVersion === story.manifest.version) return decodeSave(story, text);
  ensure(isCompact(story.manifest) && story.manifest.version === '2.3.0-compact' && data.storyVersion === '2.2.0-compact', '이관 규칙이 없는 축소판 저장 버전입니다.');
  // 구 계약으로 원장/상태/난수를 먼저 검증한다. 신 선택을 구 버전 기록으로 위장할 수 없다.
  const verified = decodeSave(previousCompactStory, text);
  return decodeSave(story, JSON.stringify({ ...verified, storyVersion: story.manifest.version }));
}
export function backupBeforeCompactUpgrade(storage: StoragePort): void {
  const run = storage.getItem(runKey(compactSlot));
  if (!run || (parseJson(run, '세이브') as GameState).storyVersion !== '2.2.0-compact' || storage.getItem(COMPACT_V37_BACKUP_KEY) !== null) return;
  const backup = JSON.stringify({ run, meta: storage.getItem(`${META_KEY}:${compactSlot}`) });
  storage.setItem(COMPACT_V37_BACKUP_KEY, backup);
  ensure(storage.getItem(COMPACT_V37_BACKUP_KEY) === backup, '구 축소판 저장 백업 확인 실패');
}
