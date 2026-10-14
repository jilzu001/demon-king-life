import { parseJson } from '../content/json';
import { validateSchema } from '../content/schema';
import { assertState } from '../engine/invariants';
import { ensure, GameError, type GameState, type Meta, type Story } from '../engine/types';
import { decodeSave } from './migrate';

export interface StoragePort { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
export const META_KEY = 'existence-sim:v1:meta';
export const runKey = (storyId: string) => `existence-sim:v1:run:${storyId}`;

export class SaveStore {
  constructor(private readonly story: Story, private readonly getStorage: () => StoragePort,
    private readonly knownEndingIds: ReadonlySet<string> = new Set(Object.keys(story.endings))) {}
  raw(): string | null { return this.getStorage().getItem(runKey(this.story.manifest.id)); }
  loadMeta(): Meta {
    const text = this.getStorage().getItem(META_KEY);
    const data = text === null ? { saveSchemaVersion: 1, discoveredEndings: {} } : parseJson(text, '엔딩 도감');
    validateSchema('meta', data);
    const meta = data as Meta;
    for (const id of meta.discoveredEndings[this.story.manifest.id] ?? []) ensure(this.knownEndingIds.has(id), '알 수 없는 엔딩 도감 ID');
    return meta;
  }
  load(): GameState | null {
    this.loadMeta(); // 손상된 도감을 묵시적으로 초기화하지 않는다.
    const text = this.raw();
    return text === null ? null : decodeSave(this.story, text);
  }
  commit(state: GameState): Meta {
    assertState(this.story, state);
    const storage = this.getStorage();
    const key = runKey(this.story.manifest.id);
    const oldRun = storage.getItem(key); const oldMeta = storage.getItem(META_KEY);
    const meta = this.loadMeta();
    if (state.endingId) meta.discoveredEndings[state.storyId] = [...new Set([...(meta.discoveredEndings[state.storyId] ?? []), state.endingId])];
    const runText = JSON.stringify(state); const metaText = JSON.stringify(meta);
    try {
      // 회차는 단일 JSON으로 기록한다. 변경 없는 도감은 다시 쓰지 않는다.
      if (oldMeta !== metaText) storage.setItem(META_KEY, metaText);
      storage.setItem(key, runText);
      ensure(storage.getItem(key) === runText, '저장소 기록 확인 실패');
      return meta;
    } catch (error) {
      let rollbackFailed = false;
      try {
        if (storage.getItem(key) !== oldRun) oldRun === null ? storage.removeItem(key) : storage.setItem(key, oldRun);
        if (storage.getItem(META_KEY) !== oldMeta) oldMeta === null ? storage.removeItem(META_KEY) : storage.setItem(META_KEY, oldMeta);
      } catch { rollbackFailed = true; }
      throw new GameError(`자동 저장 실패: ${error instanceof Error ? error.message : String(error)}. ${rollbackFailed ? '저장소 복구도 실패했습니다. JSON을 내보내고 저장소 상태를 확인하세요.' : '화면 전환을 중단했습니다. JSON 내보내기 또는 저장 재시도를 사용하세요.'}`);
    }
  }
  import(text: string): GameState {
    const state = decodeSave(this.story, text);
    this.commit(state);
    return state;
  }
}
