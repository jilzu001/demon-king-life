import catalog from '../../spec/content-v4.5-story-art/content/ending_gallery_v4_4.json';
import artwork from './generated/ending-art-v46.json';
import { validateSchema } from './schema';
import { ensure, type Story } from '../engine/types';

export type EndingGalleryEntry = { id: string; title: string; description: string; fullText: string; kind: 'legacy' | 'new' };

validateSchema('endingGallery', catalog); validateSchema('endingArt', artwork);
ensure(new Set(catalog.endings.map(entry => entry.id)).size === 20, '엔딩 도감 ID 중복');
ensure(Object.keys(artwork.artByEndingId).sort().join('|') === catalog.endings.map(entry => entry.id).sort().join('|'), '엔딩 도감/이미지 ID 불일치');
for (const entry of catalog.endings) {
  ensure(entry.title.trim() && entry.description.trim() && entry.fullText.trim(), `${entry.id}: 빈 도감 문구`);
  ensure(artwork.artByEndingId[entry.id as keyof typeof artwork.artByEndingId], `${entry.id}: 도감 이미지 매핑 누락`);
}

export const galleryEndingIds = catalog.endings.map(entry => entry.id);
export function endingGalleryEntries(story?: Story): EndingGalleryEntry[] {
  return catalog.endings.map(entry => ({
    id: entry.id, title: story?.endings[entry.id]?.title ?? entry.title,
    description: entry.description,
    // 누적 ZIP의 재집필본이 현재 게임의 기존 결말을 덮어쓰지 않게 한다.
    fullText: story?.endings[entry.id]?.body ?? entry.fullText,
    kind: entry.kind as EndingGalleryEntry['kind'],
  }));
}
export function endingArtworkPath(endingId: string): string | undefined {
  if (!Object.hasOwn(artwork.artByEndingId, endingId)) return undefined;
  const path = artwork.artByEndingId[endingId as keyof typeof artwork.artByEndingId];
  return /^assets\/illustrations\/[a-z0-9_/]+\.webp$/.test(path) && !path.includes('..') ? path : undefined;
}
export function endingArtworkUrl(base: string, endingId: string): string | undefined {
  const path = endingArtworkPath(endingId);
  return path ? `${base ? base.replace(/\/+$/, '') + '/' : './'}${path}` : undefined;
}
