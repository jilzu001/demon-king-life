import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import manifest from '../../spec/content-v3.4-illustrated/assets/assets.json';
import { illustrationAsset, sceneIllustrations, endingIllustrations } from '../../src/ui/illustrations';

describe('본문 일러스트의 콘텐츠 보호와 실제 에셋', () => {
  it('45개 WebP를 원본 그대로 배포하며 매니페스트의 크기·경로가 일치한다', () => {
    expect(manifest.assets).toHaveLength(45);
    expect(new Set(manifest.assets.map(a => a.id)).size).toBe(45);
    for (const asset of manifest.assets) {
      const bytes = readFileSync(`public/${asset.path}`);
      expect(bytes).toEqual(readFileSync(`spec/content-v3.4-illustrated/${asset.path}`));
      expect(bytes.length).toBe(asset.bytes);
      expect(bytes.subarray(0, 4).toString()).toBe('RIFF');
      expect(bytes.subarray(8, 12).toString()).toBe('WEBP');
    }
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
