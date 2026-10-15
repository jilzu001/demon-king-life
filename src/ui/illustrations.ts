import manifest from '../../spec/content-v3.6-story-engine-art/assets/assets.json';
import policy from '../../spec/content-v3.6-story-engine-art/assets/main_screen_illustration_policy.json';
import overrides from '../../spec/content-v3.6-story-engine-art/assets/scene_illustration_overrides_v3_6.json';
import { element } from './dom';
import { endingArtworkPath, endingGalleryEntries } from '../content/ending-gallery';
import { renderEndingArtwork } from './ending-gallery';
import sceneArt from '../content/generated/scene-art-v45-current.json';
import { installedArtwork } from '../content/art-v46';
import eventArt from '../content/generated/event-art-v46.json';
import type { GameState, HistoryEntry } from '../engine/types';
import { validateSchema } from '../content/schema';
validateSchema('sceneArt', sceneArt);

// 이미지 연결은 화면 전용이다. 스토리 ID/본문/선택/저장에는 기록하지 않는다.
export const sceneIllustrations: Record<string, { asset: string; after?: string; age?: number }> = {
  birth: { asset: 'village' },
  child: { asset: 'mina', after: '나무칼', age: 12 },
  exam: { asset: 'mina' },
  prison: { asset: 'prison', after: '감옥에서' },
  princess: { asset: 'elysia' },
  hearing: { asset: 'mina', after: '미나가 증인석에서' },
  quiet: { asset: 'village' },
  confession: { asset: 'mina', after: '미나는 검을 내리지 않았다.' },
  confession_afterm: { asset: 'mina' },
  confession_chaos: { asset: 'mina', after: '미나가 검을 내려놓았다.' },
};
type SceneContext = { body: string; age: number; state?: GameState };
export type StoryArtwork = { id: string; path: string; width: number; height: number; label: string };
function mappedArtwork(rule: typeof sceneArt.rules[number]): StoryArtwork {
  return { id: rule.id, path: rule.artPath, width: rule.width, height: rule.height, label: rule.alt };
}
type EventArt = StoryArtwork & { nodeId: string; age: number; choiceId?: string; outcomeId?: string };
const eventRules: EventArt[] = eventArt.rules;
export function outcomeArtwork(state: GameState, entry: HistoryEntry): StoryArtwork | undefined {
  const actual = state.history.some(record => record.nodeId === entry.nodeId && record.choiceId === entry.choiceId && record.outcomeId === entry.outcomeId && record.age === entry.age);
  if (!actual) return undefined;
  const event = eventRules.find(rule => rule.nodeId === entry.nodeId && rule.age === entry.age && rule.choiceId === entry.choiceId && rule.outcomeId === entry.outcomeId);
  if (event) return event;
  const rule = sceneArt.rules.find(rule => rule.when.nodeId === entry.nodeId && rule.when.outcomeId === entry.outcomeId);
  if (!rule || !rule.when.outcomeId || entry.choiceId !== 'bring_mina' || entry.age !== 21
    || !state.history.some(record => record.nodeId === entry.nodeId && record.choiceId === entry.choiceId && record.outcomeId === entry.outcomeId)
    || !state.flags.includes(rule.when.requiredFlag!) || !state.npcs.mina?.alive || state.npcs.mina.trust < 0
    || ['estranged', 'enemy', 'ex_spouse'].includes(state.npcs.mina.relationship)) return undefined;
  return mappedArtwork(rule);
}
export function illustrationAsset(id: string, kind: 'scene' | 'ending' = 'scene', context?: SceneContext) {
  if (kind === 'ending') {
    const path = endingArtworkPath(id);
    const art = path && installedArtwork(path);
    return art ? { ...art, label: endingGalleryEntries().find(entry => entry.id === id)?.title ?? id }
      : manifest.assets.find(asset => asset.path === path);
  }
  if (context?.state?.enteredNodeIds.includes(id)) {
    const rule = sceneArt.rules.find(rule => rule.when.nodeId === id && rule.when.age === context.age && rule.usage.includes('main-scene'));
    if (rule && (id !== 'hearing' || (context.state.flags.includes('public_audit') && context.state.history.some(entry => entry.nodeId === 'audit' && entry.choiceId === 'public_audit')))) return mappedArtwork(rule);
    const event = eventRules.find(rule => rule.nodeId === id && rule.age === context.age && !rule.choiceId);
    if (event) return event;
  }
  const mapping = sceneIllustrations;
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
  if (kind === 'ending') {
    const entry = endingGalleryEntries().find(entry => entry.id === id);
    return entry ? renderEndingArtwork(entry) : undefined;
  }
  const asset = illustrationAsset(id, kind, context);
  return asset ? renderStoryArtwork(asset, eager) : undefined;
}
export function renderStoryArtwork(asset: StoryArtwork, eager = false): HTMLElement | undefined {
  if (!/^assets\/illustrations\/(characters|backgrounds|events|event_cg|event_cg_v4_5|event_cg_v4_6)\/[a-z0-9_]+\.webp$/.test(asset.path)) return undefined;
  const actual = installedArtwork(asset.path); if (actual) asset = { ...asset, width: actual.width, height: actual.height };
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
  // 연간 한 문장에 같은 단어가 있어도, 사건의 그림을 그 해 기록에 붙이지 않는다.
  const paragraphs = [...prose.querySelectorAll<HTMLElement>(':scope > .story-paragraph')].filter(paragraph => !paragraph.dataset.readAge);
  const anchor = sceneIllustrations[nodeId]?.after;
  const firstBody = context?.body.split(/\r?\n\s*\r?\n/)[0];
  const opening = figure.dataset.assetId && (sceneArt.rules.some(rule => rule.id === figure.dataset.assetId) || eventRules.some(rule => rule.id === figure.dataset.assetId))
    ? paragraphs.find(p => p.textContent === firstBody)
    : anchor ? paragraphs.find(p => p.textContent?.includes(anchor)) : paragraphs.find(p => !/^\d+세 ·/.test(p.textContent ?? ''));
  // 앵커가 없는 다른 버전의 문안에는 임의로 삽입하지 않는다.
  opening?.after(figure);
}

export function readingCompanions(paragraph: HTMLElement): HTMLElement[] {
  const next = paragraph.nextElementSibling;
  return next instanceof HTMLElement && next.matches('.story-illustration') ? [next] : [];
}
