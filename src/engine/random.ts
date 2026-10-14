import { ensure } from './types';

// mulberry32 v1: 상태는 uint32, 가중 판정 한 번당 정확히 한 번 소비한다.
export function random(state: number): { value: number; state: number } {
  const next = (state + 0x6d2b79f5) >>> 0;
  let t = Math.imul(next ^ (next >>> 15), next | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, state: next };
}
export function weightedIndex(weights: number[], value: number): number {
  ensure(weights.length && weights.every(w => Number.isSafeInteger(w) && w > 0), '잘못된 결과 가중치');
  const sum = weights.reduce((a, b) => a + b, 0);
  ensure(Number.isSafeInteger(sum) && value >= 0 && value < 1, '난수/가중치 범위 오류');
  let cursor = value * sum;
  for (let i = 0; i < weights.length; i++) { cursor -= weights[i]!; if (cursor < 0) return i; }
  return weights.length - 1;
}
