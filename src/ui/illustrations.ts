import manifest from '../../spec/content-v3.6-story-engine-art/assets/assets.json';
import policy from '../../spec/content-v3.6-story-engine-art/assets/main_screen_illustration_policy.json';
import overrides from '../../spec/content-v3.6-story-engine-art/assets/scene_illustration_overrides_v3_6.json';
import { element } from './dom';

// 이미지 연결은 화면 전용이다. 스토리 ID/본문/선택/저장에는 기록하지 않는다.
export const sceneIllustrations: Record<string, { asset: string; after?: string; age?: number }> = {
  birth: { asset: 'village' },
  child: { asset: 'mina', after: '미나는 당신에게 나무칼을 쥐여 줬다.', age: 12 },
  exam: { asset: 'mina' },
  prison: { asset: 'prison', after: '감옥에서' },
  princess: { asset: 'elysia' },
  hearing: { asset: 'mina', after: '미나가 증인석에서' },
  quiet: { asset: 'village' },
  confession: { asset: 'mina', after: '미나는 검을 내리지 않았다.' },
  confession_afterm: { asset: 'mina' },
  confession_chaos: { asset: 'mina', after: '미나가 검을 내려놓았다.' },
};
export const endingIllustrations: Record<string, { asset: string }> = {
  ending_peace: { asset: 'protagonist' },
  ending_throne: { asset: 'king' },
};

type SceneContext = { body: string; age: number };
export function illustrationAsset(id: string, kind: 'scene' | 'ending' = 'scene', context?: SceneContext) {
  const mapping = kind === 'scene' ? sceneIllustrations : endingIllustrations;
  if (!policy.enabled) return undefined;
  if (kind === 'scene') {
    const scene = Object.hasOwn(sceneIllustrations, id) ? sceneIllustrations[id]! : undefined;
    if (scene?.age !== undefined && (!context || context.age !== scene.age || !context.body.includes(scene.after!))) return undefined;
    if (!scene) {
      // 동봉 명시 규칙만 따른다. 축제의 미나를 나무칼 CG와 자동으로 연결하지 않는다.
      const override = overrides.rules.find(rule => rule.eventId === id);
      if (!override || !context) return undefined;
      return override.prefer.map(assetId => manifest.assets.find(asset => asset.id === assetId))
        .find(asset => asset?.category === 'characters' && context.body.includes(asset.label));
    }
  }
  if (!Object.hasOwn(mapping, id)) return undefined;
  return manifest.assets.find(asset => asset.id === mapping[id]!.asset);
}

export function renderIllustration(id: string, kind: 'scene' | 'ending' = 'scene', eager = false, context?: SceneContext): HTMLElement | undefined {
  const asset = illustrationAsset(id, kind, context);
  if (!asset || !/^assets\/illustrations\/(characters|backgrounds|events|event_cg)\/[a-z_]+\.webp$/.test(asset.path)) return undefined;
  const figure = element('figure', undefined, 'story-illustration');
  figure.dataset.assetId = asset.id;
  figure.style.setProperty('--illustration-ratio', String(asset.width / asset.height));
  figure.style.setProperty('--asset-natural-width', `${asset.width}px`);
  const image = element('img');
  image.width = asset.width; image.height = asset.height;
  image.alt = asset.label; image.loading = eager ? 'eager' : 'lazy'; image.decoding = 'async';
  // 이미지가 실패하면 프레임도 제거한다. 본문/선택/게임 원장은 그대로 남는다.
  image.addEventListener('error', () => figure.remove(), { once: true });
  image.src = `${import.meta.env.BASE_URL}${asset.path}`;
  figure.append(image);
  return figure;
}

export function illustrateNarrative(prose: HTMLElement, nodeId: string, eager = false, context?: SceneContext) {
  const figure = renderIllustration(nodeId, 'scene', eager, context);
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
