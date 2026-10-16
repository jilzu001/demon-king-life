import { ensure, type Manifest, type Story } from '../engine/types';

// 현재 공개 판의 배포 전 검사. 구 저장 재현용 과거 계약에는 적용하지 않는다.
export function assertCompactChoiceMinimum(story: Story): void {
  for (const node of Object.values(story.nodes)) {
    ensure(node.choices.length >= 2, `${node.id}: 일반 사건은 최소 2개 선택지가 필요합니다. (현재 ${node.choices.length}개)`);
  }
  // 엔딩은 story.endings에 따로 있으며 선택 사건으로 세지 않는다.
}

export const compactSlot = 'demon-king:compact';
export function isCompact(manifest: Manifest): boolean {
  return manifest?.id === 'demon-king' && manifest.entryNodeId === 'birth' && ['2.2.0-compact', '2.3.0-compact', '2.4.0-compact'].includes(manifest.version);
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
