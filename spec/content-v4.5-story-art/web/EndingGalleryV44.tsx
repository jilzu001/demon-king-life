import React, {useEffect, useMemo, useState} from 'react';
import './ending-gallery-v4-4.css';

export type EndingGalleryEntry = {
  id: string;
  title: string;
  category: string;
  description: string;
  artPath: string;
  fullText: string;
  artStatus?: string;
};

/**
 * The host supplies ACTUALLY UNLOCKED ending IDs from its own persistent save.
 * This component deliberately does not infer unlocks from elapsed age or flags.
 */
export type EndingGalleryV44Props = {
  entries: EndingGalleryEntry[];
  unlockedEndingIds: readonly string[];
  assetBaseUrl: string; // E.g. import.meta.env.BASE_URL, or '/your-game/'
};

export function endingArtworkUrl(assetBaseUrl: string, path: string): string | null {
  const safe = /^(?:assets\/illustrations\/)[a-zA-Z0-9_\/.-]+\.webp$/;
  if (!safe.test(path) || path.includes('..')) return null;
  const root = (assetBaseUrl || './').replace(/\/+$/, '') + '/';
  return root + path;
}

/** Reuse the SAME component on the ending screen and in the gallery detail. */
export function EndingArtworkV44({artPath, assetBaseUrl, alt}: {
  artPath?: string;
  assetBaseUrl: string;
  alt: string;
}) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [artPath, assetBaseUrl]);
  const source = artPath ? endingArtworkUrl(assetBaseUrl, artPath) : null;
  if (!source || broken) {
    return <div className="eg44-no-art" role="status">일러스트를 불러오지 못했습니다.</div>;
  }
  return <img className="eg44-art" src={source} alt={alt} loading="lazy"
    onError={() => setBroken(true)} />;
}

export function EndingGalleryV44({entries, unlockedEndingIds, assetBaseUrl}: EndingGalleryV44Props) {
  const unlocked = useMemo(() => new Set(unlockedEndingIds), [unlockedEndingIds]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = entries.find(e => e.id === selectedId && unlocked.has(e.id)) || null;
  useEffect(() => { if (selectedId && !unlocked.has(selectedId)) setSelectedId(null); }, [selectedId, unlocked]);
  return <section className="eg44-root" aria-label="엔딩 도감">
    <header className="eg44-header">
      <h2>엔딩 도감</h2>
      <p>획득한 엔딩을 선택하면 일러스트와 결말을 다시 볼 수 있습니다.</p>
      <span>획득 {entries.filter(e => unlocked.has(e.id)).length} / {entries.length}</span>
    </header>
    <div className="eg44-grid">
      {entries.map((e, index) => unlocked.has(e.id) ?
        <button type="button" className="eg44-entry eg44-unlocked" key={e.id}
          onClick={() => setSelectedId(e.id)} aria-label={`${e.title} 엔딩 자세히 보기`}>
          <span className="eg44-number">{String(index + 1).padStart(2, '0')}</span>
          <span className="eg44-entry-name">{e.title}</span>
          <span className="eg44-view-label">자세히 보기 →</span>
        </button> :
        <div className="eg44-entry eg44-locked" key={e.id}
          aria-label={`미획득 엔딩 ${index + 1}`}>
          <span className="eg44-number">{String(index + 1).padStart(2, '0')}</span>
          <span className="eg44-entry-name">???</span>
          <span className="eg44-view-label">잠김</span>
        </div>
      )}
    </div>
    {selected && <section className="eg44-detail" aria-labelledby="eg44-detail-title">
      <div className="eg44-detail-title-row">
        <h3 id="eg44-detail-title">{selected.title}</h3>
        <button type="button" className="eg44-close" onClick={() => setSelectedId(null)}>닫기 ×</button>
      </div>
      <EndingArtworkV44 artPath={selected.artPath} assetBaseUrl={assetBaseUrl}
        alt={`${selected.title} 엔딩 일러스트`} />
      <p className="eg44-summary">{selected.description}</p>
      <h4>엔딩 이야기</h4>
      <div className="eg44-story">{selected.fullText.split(/\n\s*\n/).filter(Boolean).map((p,i)=><p key={i}>{p}</p>)}</div>
    </section>}
  </section>;
}
