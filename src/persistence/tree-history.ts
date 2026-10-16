import { MAX_JSON_BYTES, parseJson } from '../content/json';
import { ensure, GameError, type GameState, type Story } from '../engine/types';
import { decodeCompatibleCompact, COMPACT_V37_BACKUP_KEY } from './compact-compatible';
import { compactSlot } from '../content/compact-contract';
import { backupKey } from './compatibility';
import { RESELECT_BACKUP_KEY } from './reselect';
import type { StoragePort } from './save';

export const TREE_HISTORY_KEY = 'existence-sim:v1:tree-history:demon-king:compact';
const bucket = (run: GameState) => run.endingId ?? '@in-progress';

// 기존 회차/도감 스키마와 분리한다. 엔딩마다 최근 실제 회차 하나와 최근 미완주 회차 하나를 보관한다.
export function loadTreeRuns(storage: StoragePort, story: Story): GameState[] {
  const raw = storage.getItem(TREE_HISTORY_KEY);
  if (raw === null) return [];
  const data = parseJson(raw, '지난 분기 기록') as { version?: unknown; runs?: unknown } | null;
  ensure(data?.version === 1 && Array.isArray(data.runs), '지난 분기 기록의 형식이 올바르지 않습니다.');
  const values = data.runs as unknown[];
  ensure(values.length <= Object.keys(story.endings).length + 1, '지난 분기 기록 수가 올바르지 않습니다.');
  const runs = values.map(value => decodeCompatibleCompact(story, JSON.stringify(value)));
  ensure(new Set(runs.map(bucket)).size === runs.length, '지난 분기 기록이 중복되었습니다.');
  return runs;
}

export function archiveTreeRun(storage: StoragePort, story: Story, source: GameState): void {
  if (!source.history.length) return;
  const verified = decodeCompatibleCompact(story, JSON.stringify(source));
  const runs = [verified, ...loadTreeRuns(storage, story).filter(run => bucket(run) !== bucket(verified))];
  const text = JSON.stringify({ version: 1, runs });
  ensure(new TextEncoder().encode(text).length <= MAX_JSON_BYTES, '지난 분기 기록의 용량 한도를 초과했습니다. 현재 회차를 유지합니다.');
  const previous = storage.getItem(TREE_HISTORY_KEY);
  if (previous === text) return;
  try {
    storage.setItem(TREE_HISTORY_KEY, text);
    ensure(storage.getItem(TREE_HISTORY_KEY) === text, '지난 분기 기록 확인 실패');
  } catch (error) {
    let restored = true;
    try {
      if (storage.getItem(TREE_HISTORY_KEY) !== previous) previous === null ? storage.removeItem(TREE_HISTORY_KEY) : storage.setItem(TREE_HISTORY_KEY, previous);
      ensure(storage.getItem(TREE_HISTORY_KEY) === previous, '분기 보관함 복구 확인 실패');
    }
    catch { restored = false; }
    throw new GameError(`지난 분기 보관 실패: ${error instanceof Error ? error.message : String(error)}. 현재 회차는 교체하지 않았습니다.${restored ? '' : ' 분기 보관함 복구도 실패했습니다.'}`);
  }
}

// 읽기만 한다. 획득 ID만으로 seed·능력치·관계·선택 원장을 만들지 않는다.
export function loadPastTreeSources(storage: StoragePort, story: Story): { runs: GameState[]; notice: string } {
  const runs: GameState[] = [];
  let damaged = false;
  try { runs.push(...loadTreeRuns(storage, story)); } catch { damaged = true; }
  for (const [key, wrapped] of [[RESELECT_BACKUP_KEY, false], [backupKey(compactSlot), true], [COMPACT_V37_BACKUP_KEY, true]] as const) {
    try {
      const raw = storage.getItem(key); if (raw === null) continue;
      const text = wrapped ? (parseJson(raw, '이전 회차 백업') as { run?: unknown } | null)?.run : raw;
      if (text === null || text === undefined) continue;
      ensure(typeof text === 'string', '이전 회차 백업 형식 오류');
      const run = decodeCompatibleCompact(story, text);
      if (!runs.some(source => JSON.stringify(source) === JSON.stringify(run))) runs.push(run);
    } catch { damaged = true; }
  }
  return { runs, notice: damaged ? '일부 지난 분기 기록을 검증하지 못해 이어하기에서 제외했습니다. 원본 기록은 보존했습니다.' : '' };
}
