import manifest from '../../spec/content-v3.7-visual-audit/assets/assets.json';
import speakers from './compact-speakers.json';

// 현재 공개 판의 인물과 실제 대조한 기준 초상화만 연결한다.
const verified: Record<string, string> = { player: 'protagonist', mina: 'mina', erisia: 'elysia', king: 'king' };
export function canonicalPortrait(base: string, actor: string): string | undefined {
  const id = Object.hasOwn(verified, actor) ? verified[actor] : undefined;
  const asset = manifest.assets.find(a => a.id === id);
  return asset ? `${base}${asset.path}` : undefined;
}
export function compactSpeaker(nodeId: string, paragraph: string): string | undefined {
  if (!Object.hasOwn(speakers, nodeId)) return undefined;
  return speakers[nodeId as keyof typeof speakers].find(s => s.text === paragraph)?.speaker;
}
export function visiblePageSpeaker(viewport: HTMLElement, nodeId: string): string | undefined {
  const box = viewport.getBoundingClientRect();
  const visible = [...viewport.querySelectorAll<HTMLElement>('.story-paragraph')].filter(p =>
    [...p.getClientRects()].some(r => r.left < box.right - 1 && r.right > box.left + 1 && r.top < box.bottom && r.bottom > box.top));
  // 마지막 가시 문단이 내레이션이면 이전 페이지의 인물을 남기지 않는다.
  return compactSpeaker(nodeId, visible.at(-1)?.textContent ?? '');
}
