import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import manifest from '../../spec/content-v3.6-story-engine-art/assets/assets.json';
import { illustrationAsset, sceneIllustrations } from '../../src/ui/illustrations';
import { endingArtworkPath } from '../../src/content/ending-gallery';

describe('본문 일러스트의 콘텐츠 보호와 실제 에셋', () => {
  it('기존45개와 신규1개 WebP를 원본 그대로 배포하며 크기·경로가 일치한다', () => {
    expect(manifest.assets).toHaveLength(46);
    expect(new Set(manifest.assets.map(a => a.id)).size).toBe(46);
    for (const asset of manifest.assets) {
      const bytes = readFileSync(`public/${asset.path}`);
      expect(bytes.equals(readFileSync(`spec/content-v3.6-story-engine-art/${asset.path}`)), asset.path).toBe(true);
      if (asset.id !== 'mina_wooden_sword') expect(bytes.equals(readFileSync(`spec/content-v3.4-illustrated/${asset.path}`)), asset.path).toBe(true);
      expect(bytes.length).toBe(asset.bytes);
      expect(bytes.subarray(0, 4).toString()).toBe('RIFF');
      expect(bytes.subarray(8, 12).toString()).toBe('WEBP');
    }
  });
  it('미검증 나무칼 CG 대신 동일한 미나 기본 초상화를 표시한다', () => {
    const body = '미나는 당신에게 나무칼을 쥐여 줬다.';
    expect(illustrationAsset('child', 'scene', { age: 12, body })?.id).toBe('mina');
    expect(illustrationAsset('child')).toBeUndefined();
    expect(illustrationAsset('child', 'scene', { age: 20, body })).toBeUndefined();
    expect(illustrationAsset('child', 'scene', { age: 12, body: '다른 사건.' })).toBeUndefined();
    expect(illustrationAsset('mina_festival', 'scene', { age: 18, body: '미나는 나무칼을 들었다.' })?.id).toBe('mina');
    expect(illustrationAsset('mina_festival', 'scene', { age: 18, body: '인물이 없는 사건.' })).toBeUndefined();
  });
  it('캐릭터/초기 상태와 기존7엔딩의 연출을 유지한다', () => {
    for (const file of ['characters.json']) {
      expect(readFileSync(`public/stories/demon-king-compact/${file}`)).toEqual(readFileSync(`spec/content-v2.6-compact-timeline/${file}`));
    }
    const read = (root: string, file: string) => JSON.parse(readFileSync(`${root}/${file}`, 'utf8'));
    const current = 'public/stories/demon-king-compact'; const old = 'spec/content-v2.6-compact-timeline';
    expect(read(current, 'story.json').initialState).toEqual(read(old, 'story.json').initialState);
    const cinemas = read(current, 'ending_cinematics.json').endings;
    for (const [id, value] of Object.entries(read(old, 'ending_cinematics.json').endings)) expect(cinemas[id]).toEqual({ ...value as object, illustration: endingArtworkPath(id) });
  });
  it('실제 사건만 연결하고 등록되지 않은 사건·별칭·잘못된 키에는 그림을 배정하지 않는다', () => {
    const nodes = JSON.parse(readFileSync('public/stories/demon-king-compact/chapters/01_complete.json', 'utf8')).nodes;
    for (const id of Object.keys(sceneIllustrations)) expect(nodes.some((n: { id: string }) => n.id === id)).toBe(true);
    for (const id of ['audit', 'settlement', 'exam_confession', 'constructor', '__proto__']) expect(illustrationAsset(id)).toBeUndefined();
    expect(illustrationAsset('exam')?.id).toBe('mina');
    expect(illustrationAsset('hearing')?.id).toBe('mina');
    expect(illustrationAsset('ending_throne', 'ending')?.path).toBe(endingArtworkPath('ending_throne'));
  });
});
