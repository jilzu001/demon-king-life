import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import manifest from '../../spec/content-v3.6-story-engine-art/assets/assets.json';
import { illustrationAsset, sceneIllustrations, endingIllustrations } from '../../src/ui/illustrations';

describe('본문 일러스트의 콘텐츠 보호와 실제 에셋', () => {
  it('기존45개와 신규1개 WebP를 원본 그대로 배포하며 크기·경로가 일치한다', () => {
    expect(manifest.assets).toHaveLength(46);
    expect(new Set(manifest.assets.map(a => a.id)).size).toBe(46);
    for (const asset of manifest.assets) {
      const bytes = readFileSync(`public/${asset.path}`);
      expect(bytes).toEqual(readFileSync(`spec/content-v3.6-story-engine-art/${asset.path}`));
      if (asset.id !== 'mina_wooden_sword') expect(bytes).toEqual(readFileSync(`spec/content-v3.4-illustrated/${asset.path}`));
      expect(bytes.length).toBe(asset.bytes);
      expect(bytes.subarray(0, 4).toString()).toBe('RIFF');
      expect(bytes.subarray(8, 12).toString()).toBe('WEBP');
    }
  });
  it('나무칼 CG는 명시된12세 행동에서만 선택하고 축제/다른 나이/내용에는 억지 배치하지 않는다', () => {
    const body = '미나는 당신에게 나무칼을 쥐여 줬다.';
    expect(illustrationAsset('child', 'scene', { age: 12, body })?.id).toBe('mina_wooden_sword');
    expect(illustrationAsset('child')).toBeUndefined();
    expect(illustrationAsset('child', 'scene', { age: 20, body })).toBeUndefined();
    expect(illustrationAsset('child', 'scene', { age: 12, body: '다른 사건.' })).toBeUndefined();
    expect(illustrationAsset('mina_festival', 'scene', { age: 18, body: '미나는 나무칼을 들었다.' })?.id).toBe('mina');
    expect(illustrationAsset('mina_festival', 'scene', { age: 18, body: '인물이 없는 사건.' })).toBeUndefined();
  });
  it('기존 스토리·선택·엔딩·상태 JSON이 기존 적용 원본과 바이트 단위로 동일하다', () => {
    for (const file of ['story.json', 'characters.json', 'endings.json', 'ending_cinematics.json', 'chapters/01_complete.json']) {
      expect(readFileSync(`public/stories/demon-king-compact/${file}`)).toEqual(readFileSync(`spec/content-v2.6-compact-timeline/${file}`));
    }
  });
  it('실제 사건만 연결하고 등록되지 않은 사건·별칭·잘못된 키에는 그림을 배정하지 않는다', () => {
    const nodes = JSON.parse(readFileSync('public/stories/demon-king-compact/chapters/01_complete.json', 'utf8')).nodes;
    const endings = JSON.parse(readFileSync('public/stories/demon-king-compact/endings.json', 'utf8')).endings;
    for (const id of Object.keys(sceneIllustrations)) expect(nodes.some((n: { id: string }) => n.id === id)).toBe(true);
    for (const id of Object.keys(endingIllustrations)) expect(endings.some((e: { id: string }) => e.id === id)).toBe(true);
    for (const id of ['audit', 'settlement', 'exam_confession', 'constructor', '__proto__']) expect(illustrationAsset(id)).toBeUndefined();
    expect(illustrationAsset('exam')?.id).toBe('mina');
    expect(illustrationAsset('hearing')?.id).toBe('mina');
    expect(illustrationAsset('ending_throne', 'ending')?.id).toBe('royal_trial');
  });
});
