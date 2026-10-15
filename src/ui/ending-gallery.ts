import type { EndingGalleryEntry } from '../content/ending-gallery';
import { endingArtworkUrl } from '../content/ending-gallery';
import { element, button } from './dom';
import { narrativeLines } from './narrative';

export function renderEndingArtwork(entry: Pick<EndingGalleryEntry, 'id' | 'title' | 'kind'>): HTMLElement | undefined {
  const source = endingArtworkUrl(import.meta.env.BASE_URL, entry.id);
  if (!source) return undefined;
  const figure = element('figure', undefined, 'ending-art'); figure.dataset.endingArt = entry.id;
  const image = element('img'); image.alt = `${entry.title} 엔딩 일러스트`; image.loading = 'eager'; image.decoding = 'async';
  image.addEventListener('error', () => {
    figure.replaceWith(element('p', '일러스트를 불러올 수 없어 글로 표시합니다.', 'subtle ending-art-fallback'));
  }, { once: true });
  image.src = source;
  figure.append(image, element('figcaption', entry.kind === 'new' ? '기준 초상화로 구성한 회상 이미지 · 임시 아트' : '기존 장면을 재사용한 임시 일러스트', 'subtle'));
  return figure;
}

export function renderEndingGallery(entries: EndingGalleryEntry[], discovered: ReadonlySet<string>, onSelect: (id: string) => void, playableCount = entries.length): HTMLElement {
  const section = element('section', undefined, 'ending-gallery'); section.setAttribute('aria-label', '엔딩 도감');
  section.append(element('h3', '엔딩 도감'), element('p', `발견한 엔딩 ${entries.filter(e => discovered.has(e.id)).length} / ${entries.length}`));
  if (playableCount < entries.length) section.append(element('p', `현재 플레이 연결 ${playableCount}개 · 추가 ${entries.length - playableCount}개는 진입 연결 준비 중입니다.`, 'subtle'));
  const list = element('ul', undefined, 'ending-gallery-list');
  for (const [index, entry] of entries.entries()) {
    const item = element('li'); item.dataset.galleryEnding = entry.id;
    if (discovered.has(entry.id)) {
      const open = button(`${String(index + 1).padStart(2, '0')} · ${entry.title} · 자세히 보기`, () => onSelect(entry.id));
      open.dataset.endingDetail = entry.id; item.append(open);
    } else {
      // 잠김 항목은 제목/본문/이미지 URL을 DOM에 넣거나 미리 요청하지 않는다.
      item.append(element('span', `${String(index + 1).padStart(2, '0')} · 미발견 엔딩`, 'ending-gallery-locked'));
    }
    list.append(item);
  }
  section.append(list); return section;
}

export function renderEndingDetail(entry: EndingGalleryEntry): HTMLElement {
  const section = element('section', undefined, 'ending-detail'); section.dataset.endingDetailId = entry.id;
  section.append(element('h3', entry.title));
  const artwork = renderEndingArtwork(entry); if (artwork) section.append(artwork);
  section.append(element('p', entry.description, 'ending-description'), element('h4', '전체 결말'));
  const prose = element('div', undefined, 'ending-full-text');
  for (const paragraph of narrativeLines(entry.fullText)) prose.append(element('p', paragraph));
  section.append(prose); return section;
}
