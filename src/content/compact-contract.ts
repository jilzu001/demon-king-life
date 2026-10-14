import { ensure, type Manifest } from '../engine/types';

export const compactSlot = 'demon-king:compact';
export function isCompact(manifest: Manifest): boolean {
  return manifest?.id === 'demon-king' && manifest.entryNodeId === 'birth' && ['2.2.0-compact', '2.3.0-compact'].includes(manifest.version);
}
// 원본 ZIP을 수정하지 않는다. 축소판의 결말 분류 별칭만 기존 계약에 맞춘다.
export function adaptCompactChapter<T>(data: T): T {
  const copy = structuredClone(data) as T & { nodes: { choices: { outcomes: { result: string; to: { kind: string; id: string } }[] }[] }[] };
  for (const node of copy.nodes) for (const choice of node.choices) for (const outcome of choice.outcomes) {
    if (outcome.result !== 'bad') continue;
    ensure(outcome.to.kind === 'ending' && ['ending_escape', 'ending_fire', 'ending_throne', 'ending_ledger'].includes(outcome.to.id), '지원하지 않는 조기 결말 분류');
    outcome.result = 'failure';
  }
  return copy;
}
export function adaptCompactEndings<T>(data: T): T {
  const copy = structuredClone(data) as T & { endings: { kind: string }[] };
  for (const ending of copy.endings) if (ending.kind === 'good') ending.kind = 'happy';
  return copy;
}
