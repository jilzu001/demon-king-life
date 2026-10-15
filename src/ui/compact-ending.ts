import type { GameState } from '../engine/types';
import type { PresentedStory } from '../content/presentation';
import { element, button } from './dom';
import type { CompactProgress } from './compact-progress';
import { illustrationAsset, outcomeArtwork, renderStoryArtwork } from './illustrations';
import { renderEndingArtwork } from './ending-gallery';
import { endingGalleryEntries } from '../content/ending-gallery';

export function memoryArtKey(nodeId: string): string {
  const keys: Record<string, string> = { birth: 'silhouette', child: 'sword', exam: 'sword', prison: 'bars', petition: 'scroll', invoice: 'book', princess: 'crown', audit: 'book', hearing: 'scroll', settlement: 'office', quiet: 'sunset', final_trial: 'scroll', office: 'office' };
  return Object.hasOwn(keys, nodeId) ? keys[nodeId]! : 'silhouette';
}
export function memoryEvents(story: PresentedStory, state: GameState) {
  const records = state.history.map((entry, index) => ({ entry, index, node: story.nodes[entry.nodeId]! }));
  const priority = (index: number, id: string) => index === 0 || index === records.length - 1 ? 3 : ['exam', 'audit', 'hearing', 'settlement'].includes(id) ? 2 : 1;
  return records.sort((a, b) => priority(b.index, b.node.id) - priority(a.index, a.node.id) || a.index - b.index)
    .slice(0, story.cinematics?.replayRules.maxEvents ?? 8).sort((a, b) => a.index - b.index);
}
export function renderCompactEnding(layout: HTMLElement, story: PresentedStory, state: GameState, progress: CompactProgress, options: {
  paused: boolean; onProgress: (patch: Partial<CompactProgress>) => void; onRestart: () => void; onSettings: () => void;
}): () => void {
  const ending = story.endings[state.endingId!]!;
  const cinematic = story.cinematics!.endings[ending.id]!;
  const artworkEntry = endingGalleryEntries(story).find(entry => entry.id === ending.id)
    ?? { id: ending.id, title: ending.title, kind: 'legacy' as const };
  const memories = memoryEvents(story, state);
  const index = Math.min(progress.memoryIndex, Math.max(0, memories.length - 1));
  const phase = progress.phase;
  const next = () => options.onProgress(phase === 1 && index + 1 < memories.length
    ? { memoryIndex: index + 1 }
    : { phase: phase === 0 && !memories.length ? 2 : Math.min(3, phase + 1), memoryIndex: 0 });
  const scene = element('section', undefined, 'cinematic-scene'); scene.tabIndex = -1;
  scene.dataset.endingPhase = String(phase);
  scene.setAttribute('aria-label', '삶의 결말');
  const content = element('div', undefined, 'cinematic-content');
  if (phase === 0) {
    content.append(element('p', cinematic.finalScene, 'cinematic-text'));
    const illustration = renderEndingArtwork(artworkEntry);
    if (illustration) content.append(illustration);
  }
  if (phase === 1 && memories[index]) {
    const { entry, node } = memories[index]!;
    const choice = node.choices.find(c => c.id === entry.choiceId)!;
    content.dataset.memoryNode = node.id;
    const used = new Set<string>();
    let selected: ReturnType<typeof illustrationAsset>;
    for (let i = 0; i <= index; i++) {
      const memory = memories[i]!;
      const art = outcomeArtwork(state, memory.entry) ?? illustrationAsset(memory.node.id, 'scene', { body: memory.node.body, age: memory.entry.age, state });
      selected = art && !used.has(art.path) ? art : undefined;
      if (art) used.add(art.path);
    }
    const image = selected ? renderStoryArtwork(selected, true) : undefined;
    if (image) content.append(image);
    content.append(element('p', `${entry.age}세 · ${node.title}`, 'cinematic-memory-title'), element('p', choice.text, 'cinematic-text'));
  }
  if (phase === 2) content.append(element('p', cinematic.reflection, 'cinematic-text cinematic-reflection'));
  if (phase === 3) {
    const illustration = renderEndingArtwork(artworkEntry);
    if (illustration) content.append(illustration);
    content.append(element('h1', ending.title), element('p', '이 삶의 결말이 기록되었습니다.', 'cinematic-text'));
  }
  scene.append(content); layout.append(scene);
  const controls = element('div', undefined, 'cinematic-actions');
  if (phase < 3) controls.append(button('이어서', next));
  else controls.append(button('새 회차 시작', options.onRestart), button('도감 보기', options.onSettings));
  controls.append(button('설정', options.onSettings)); layout.append(controls);
  if (phase === 1) scene.addEventListener('click', event => { if (!(event.target as Element).closest('button, a')) next(); });
  scene.focus({ preventScroll: true });
  let timer: ReturnType<typeof setTimeout> | undefined;
  if (phase === 1 && !options.paused && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    timer = setTimeout(next, Math.max(5000, Array.from(content.textContent ?? '').length * 170));
  }
  return () => clearTimeout(timer);
}
