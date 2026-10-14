import type { GameState } from '../engine/types';

export type CompactProgress = { handledHistory: number; phase: number; memoryIndex: number };
export function compactProgressKey(state: GameState): string { return `demon-king:compact-view:${state.runId}`; }
export function loadCompactProgress(state: GameState): CompactProgress {
  const fallback = { handledHistory: 0, phase: 0, memoryIndex: 0 };
  try {
    const value = JSON.parse(localStorage.getItem(compactProgressKey(state)) ?? 'null');
    if (value && Number.isInteger(value.handledHistory) && value.handledHistory >= 0 && value.handledHistory <= state.history.length
      && Number.isInteger(value.phase) && value.phase >= 0 && value.phase <= 3
      && Number.isInteger(value.memoryIndex) && value.memoryIndex >= 0 && value.memoryIndex < 8) return value;
  } catch { /* 손상된 화면 기록으로 게임 원장을 수정하지 않는다. */ }
  return fallback;
}
