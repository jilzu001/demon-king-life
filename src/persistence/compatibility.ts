import { parseJson } from '../content/json';
import { validateSchema } from '../content/schema';
import type { PresentedStory } from '../content/presentation';
import { ensure, type GameState } from '../engine/types';
import { decodeSave } from './migrate';
import { META_KEY, runKey, type StoragePort } from './save';

export const BACKUP_KEY = 'existence-sim:v1:backup:before-content-v1.1';
export function backupBeforeImport(storage: StoragePort): void {
  const run = storage.getItem(runKey('demon-king')); const meta = storage.getItem(META_KEY);
  if ((run !== null || meta !== null) && storage.getItem(BACKUP_KEY) === null) {
    const backup = JSON.stringify({ run, meta });
    storage.setItem(BACKUP_KEY, backup);
    ensure(storage.getItem(BACKUP_KEY) === backup, '업데이트 전 저장 백업 확인 실패');
  }
}
export function resolveCompatibleSave(active: PresentedStory, legacy: PresentedStory, text: string) {
  const data = parseJson(text, '세이브'); validateSchema('save', data);
  const save = data as GameState;
  ensure(save.storyId === active.manifest.id, '다른 스토리의 세이브입니다.');
  if (save.storyVersion === active.manifest.version) return { story: active, state: decodeSave(active, text), notice: '' };
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
