import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import manifest from '../../public/assets/ending_art_manifest_v4_4.json';
import compiled from '../../src/content/generated/ending-art-v46.json';
import { createHash } from 'node:crypto';
import catalog from '../../spec/content-v4.4-ending-gallery/content/ending_gallery_v4_4.json';
import { endingGalleryEntries, endingArtworkPath, endingArtworkUrl, galleryEndingIds } from '../../src/content/ending-gallery';
import { validateSchema } from '../../src/content/schema';
import { readExampleStory } from '../../scripts/read-story';
import { SaveStore, META_KEY } from '../../src/persistence/save';
import { compactSlot } from '../../src/content/compact-contract';
import { createRun } from '../../src/engine/transition';

const story = await readExampleStory('demon-king-v48-archive');
it('20개 도감/엔딩이 검수된 전용 WebP20개와 동일 공개 매핑을 사용한다', () => {
  const entries = endingGalleryEntries(story);
  expect(entries).toHaveLength(20); expect(new Set(entries.map(e => e.id)).size).toBe(20);
  expect(entries.map(e => e.id)).toEqual(catalog.endings.map(e => e.id));
  expect(entries.filter(e => e.kind === 'legacy')).toHaveLength(8); expect(entries.filter(e => e.kind === 'new')).toHaveLength(12);
  expect(new Set(Object.values(manifest.artByEndingId)).size).toBe(20);
  expect(manifest).toEqual(compiled);
  const installed = JSON.parse(readFileSync('docs/v4.6/art-installed.json', 'utf8')) as {id:string;path:string;sha256:string;bytes:number}[];
  for (const entry of entries) {
    const path = endingArtworkPath(entry.id)!;
    expect(path).toBe(`assets/illustrations/ending_v4_6/${entry.id}.webp`);
    const bytes = readFileSync(`public/${path}`);
    const reviewed = installed.find(row => row.id === entry.id)!; expect(reviewed.path).toBe(path);
    expect(bytes.length).toBe(reviewed.bytes); expect(createHash('sha256').update(bytes).digest('hex')).toBe(reviewed.sha256);
    expect(bytes.subarray(0, 4).toString()).toBe('RIFF'); expect(bytes.subarray(8, 12).toString()).toBe('WEBP');
  }
});
it('현재 게임의 제목/전체 결말이 누적 ZIP의 재집필본으로 바뀌지 않는다', () => {
  const backup = JSON.parse(readFileSync('backups/before-v4.4/endings.json', 'utf8')).endings;
  for (const old of backup) {
    const entry = endingGalleryEntries(story).find(e => e.id === old.id)!;
    expect(entry.title).toBe(old.title); expect(entry.fullText).toBe(old.body);
    expect(story.endings[old.id]!.body).toBe(old.body);
  }
});
it('배포 하위 경로/상대 경로를 유지하고 잘못된 ID나 SVG/외부 경로는 사용하지 않는다', () => {
  expect(endingArtworkUrl('/demon-king-life/', 'ending_peace')).toBe('/demon-king-life/assets/illustrations/ending_v4_6/ending_peace.webp');
  expect(endingArtworkUrl('./', 'ending_peace')).toBe('./assets/illustrations/ending_v4_6/ending_peace.webp');
  expect(endingArtworkUrl('https://example.test/game/', 'ending_peace')).toBe('https://example.test/game/assets/illustrations/ending_v4_6/ending_peace.webp');
  for (const id of ['sunset', 'constructor', '__proto__', 'unknown']) expect(endingArtworkPath(id)).toBeUndefined();
  for (const path of ['https://other.test/a.webp', '/assets/a.webp', 'assets/illustrations/../a.webp', 'assets/illustrations/a.svg']) {
    const invalid = structuredClone(manifest); invalid.artByEndingId.ending_peace = path;
    expect(() => validateSchema('endingArt', invalid)).toThrow();
  }
});
it('기존 영구 도감 기록을 그대로 읽고 새 회차/도감 열람을 위한 읽기로 획득을 추가하지 않는다', () => {
  const key = `${META_KEY}:${compactSlot}`;
  const raw = JSON.stringify({ saveSchemaVersion: 1, discoveredEndings: { 'demon-king': ['ending_escape', 'ending_peace'] } });
  const values = new Map([[key, raw]]);
  const storage = { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); }, removeItem: (k: string) => { values.delete(k); } };
  const store = new SaveStore(story, () => storage, new Set(galleryEndingIds), compactSlot);
  expect(store.loadMeta().discoveredEndings['demon-king']).toEqual(['ending_escape', 'ending_peace']);
  endingGalleryEntries(story); store.commit(createRun(story, 17, 'new-gallery-run'), false);
  expect(values.get(key)).toBe(raw);
});
