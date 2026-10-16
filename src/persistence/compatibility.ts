import { parseJson } from '../content/json';
import { validateSchema } from '../content/schema';
import type { PresentedStory } from '../content/presentation';
import { ensure, type GameState } from '../engine/types';
import { decodeSave } from './migrate';
import { META_KEY, runKey, type StoragePort } from './save';
import { isCompact } from '../content/compact-contract';
import { decodeCompatibleCompact, compactStoryForState } from './compact-compatible';

export const BACKUP_KEY = 'existence-sim:v1:backup:before-content-v1.1';
export const backupKey = (slotId = 'demon-king') => slotId === 'demon-king' ? BACKUP_KEY : `existence-sim:v1:backup:before-import:${slotId}`;
export function backupBeforeImport(storage: StoragePort, slotId = 'demon-king'): void {
  const key = backupKey(slotId);
  const run = storage.getItem(runKey(slotId)); const meta = storage.getItem(slotId === 'demon-king' ? META_KEY : `${META_KEY}:${slotId}`);
  if ((run !== null || meta !== null) && storage.getItem(key) === null) {
    const backup = JSON.stringify({ run, meta });
    storage.setItem(key, backup);
    ensure(storage.getItem(key) === backup, '업데이트 전 저장 백업 확인 실패');
  }
}
export function resolveCompatibleSave(active: PresentedStory, legacy: PresentedStory, text: string) {
  const data = parseJson(text, '세이브'); validateSchema('save', data);
  const save = data as GameState;
  ensure(save.storyId === active.manifest.id, '다른 스토리의 세이브입니다.');
  if (save.storyVersion === active.manifest.version) return { story: active, state: decodeSave(active, text), notice: '' };
  if (isCompact(active.manifest) && ['2.2.0-compact', '2.3.0-compact'].includes(save.storyVersion)) {
    const state = decodeCompatibleCompact(active, text);
    return { story: compactStoryForState(active, state.storyVersion), state, notice: '기존 회차는 실제 선택·상태·난수와 경로를 그대로 이어갑니다. 새 회차부터 독립 인생 경로가 적용됩니다.' };
  }
  ensure(!isCompact(active.manifest), '이전 원작의 저장은 현재 판과 호환되지 않습니다. 기존 저장 파일은 보관해 주세요.');
  ensure(save.storyVersion === '1.0.0', '명시적인 이관 규칙이 없는 저장 버전입니다.');
  if (save.enteredNodeIds[0] === legacy.manifest.entryNodeId) {
    return { story: legacy, state: decodeSave(legacy, text), notice: '이 회차는 이전 엔진 예제의 기록을 그대로 이어갑니다. 새 회차부터 콘텐츠 v1.1이 적용됩니다.' };
  }
  ensure(save.enteredNodeIds[0] === active.manifest.entryNodeId, '이관할 수 없는 이전 장면 ID입니다.');
  // ZIP이 보장한 동일 로직을 실제 세이브의 RNG·원장·전체 상태로 다시 확인한다.
  // 알 수 없는 이전 대사를 만들거나 ID를 새 경로에 맞춰 바꾸지 않는다.
  const previous: PresentedStory = { ...active, manifest: { ...active.manifest, version: '1.0.0' }, presentation: undefined };
  const verified = decodeSave(previous, text);
  const migrated = { ...verified, storyVersion: active.manifest.version };
  const next = decodeSave(active, JSON.stringify(migrated));
  return { story: active, state: next, notice: 'v1.0 선택 원장과 상태·난수를 재검증해 v1.1로 이관했습니다. 원본 저장은 별도 백업에 보관했습니다.' };
}
