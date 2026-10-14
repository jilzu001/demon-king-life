import manifest from '../../spec/content-v3.4-illustrated/assets/assets.json';
import policy from '../../spec/content-v3.4-illustrated/assets/main_screen_illustration_policy.json';
import { element } from './dom';

// 이미지 연결은 화면 전용이다. 스토리 ID/본문/선택/저장에는 기록하지 않는다.
export const sceneIllustrations: Record<string, { asset: string; after?: string }> = {
  birth: { asset: 'village' },
  child: { asset: 'village' },
  exam: { asset: 'mina' },
  prison: { asset: 'prison', after: '감옥에서' },
  princess: { asset: 'elysia' },
  hearing: { asset: 'mina', after: '미나가 증인석에서' },
  quiet: { asset: 'village' },
};
export const endingIllustrations: Record<string, { asset: string }> = {
  ending_peace: { asset: 'final_sunset' },
  ending_throne: { asset: 'royal_trial' },
};

export function illustrationAsset(id: string, kind: 'scene' | 'ending' = 'scene') {
  const mapping = kind === 'scene' ? sceneIllustrations : endingIllustrations;
  if (!policy.enabled || !Object.hasOwn(mapping, id)) return undefined;
  return manifest.assets.find(asset => asset.id === mapping[id]!.asset);
}

export function renderIllustration(id: string, kind: 'scene' | 'ending' = 'scene', eager = false): HTMLElement | undefined {
  const asset = illustrationAsset(id, kind);
  if (!asset || !/^assets\/illustrations\/(characters|backgrounds|events)\/[a-z_]+\.webp$/.test(asset.path)) return undefined;
  const figure = element('figure', undefined, 'story-illustration');
  figure.dataset.assetId = asset.id;
  figure.style.setProperty('--illustration-ratio', String(asset.width / asset.height));
  const image = element('img');
  image.width = asset.width; image.height = asset.height;
  image.alt = asset.label; image.loading = eager ? 'eager' : 'lazy'; image.decoding = 'async';
  // 이미지가 실패하면 프레임도 제거한다. 본문/선택/게임 원장은 그대로 남는다.
  image.addEventListener('error', () => figure.remove(), { once: true });
  image.src = `${import.meta.env.BASE_URL}${asset.path}`;
  figure.append(image);
  return figure;
}

export function illustrateNarrative(prose: HTMLElement, nodeId: string, eager = false) {
  const figure = renderIllustration(nodeId, 'scene', eager);
  if (!figure) return;
  const paragraphs = [...prose.querySelectorAll<HTMLElement>(':scope > .story-paragraph')];
  const anchor = sceneIllustrations[nodeId]?.after;
  const opening = anchor ? paragraphs.find(p => p.textContent?.includes(anchor)) : paragraphs[0];
  // 앵커가 없는 다른 버전의 문안에는 임의로 삽입하지 않는다.
  opening?.after(figure);
}

export function readingCompanions(paragraph: HTMLElement): HTMLElement[] {
  const next = paragraph.nextElementSibling;
  return next instanceof HTMLElement && next.matches('.story-illustration') ? [next] : [];
}
