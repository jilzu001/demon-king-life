import type { GameState } from '../engine/types';
import type { PresentedStory } from '../content/presentation';
import { element, button } from './dom';
import type { CompactProgress } from './compact-progress';
import { renderIllustration } from './illustrations';

const drawings: Record<string, string> = {
  silhouette: 'M95 145Q100 105 130 104Q160 105 165 145 M114 80a16 16 0 1 0 32 0a16 16 0 1 0-32 0',
  sunset: 'M30 125H230 M70 124a60 60 0 0 1 120 0 M130 28V44 M52 52L64 64 M208 52L196 64',
  scroll: 'M75 30H195Q215 30 215 48H95Q75 48 75 30V132Q75 150 55 150H170Q190 150 190 132V48 M105 76H164 M105 98H164 M105 120H146',
  office: 'M42 100L130 45L218 100 M70 96V150H190V96 M115 112H145V150 M90 106H99 M160 106H169',
  stairs: 'M35 150H70V130H100V110H130V90H160V70H190V50H220 M80 38L95 53 M92 25L110 42',
  fire: 'M130 25Q165 67 148 89Q190 66 180 115Q176 154 130 154Q83 154 81 117Q76 79 108 67Q99 108 121 111Q145 97 130 25Z',
  crown: 'M62 126L45 65L95 92L130 45L165 92L215 65L198 126Z M62 146H198',
  book: 'M130 55Q95 35 52 45V140Q97 129 130 150Q163 129 208 140V45Q165 35 130 55V150',
  bars: 'M60 38H200V150H60Z M88 38V150 M116 38V150 M144 38V150 M172 38V150',
  sword: 'M70 145L176 39L199 35L195 58L89 164 M66 112L116 162',
};
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
export function compactArt(key: string): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 260 180'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', '삶을 떠올리는 그림'); svg.classList.add('compact-art');
  const path = document.createElementNS(svg.namespaceURI, 'path');
  path.setAttribute('d', Object.hasOwn(drawings, key) ? drawings[key]! : drawings.silhouette!); path.setAttribute('fill', 'none'); path.setAttribute('stroke', 'currentColor'); path.setAttribute('stroke-width', '3'); path.setAttribute('stroke-linecap', 'round'); path.setAttribute('stroke-linejoin', 'round'); svg.append(path); return svg;
}
export function renderCompactEnding(layout: HTMLElement, story: PresentedStory, state: GameState, progress: CompactProgress, options: {
  paused: boolean; onProgress: (patch: Partial<CompactProgress>) => void; onRestart: () => void; onSettings: () => void;
}): () => void {
  const ending = story.endings[state.endingId!]!;
  const cinematic = story.cinematics!.endings[ending.id]!;
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
    const illustration = renderIllustration(ending.id, 'ending');
    if (illustration) content.append(illustration);
  }
  if (phase === 1 && memories[index]) {
    const { entry, node } = memories[index]!;
    const choice = node.choices.find(c => c.id === entry.choiceId)!;
    content.dataset.memoryNode = node.id;
    // 실제 방문한 인물의 기준 초상화만 사용한다. 미승인 회상 CG는 연결하지 않는다.
    const portrait = ['child', 'exam', 'confession', 'confession_afterm', 'confession_chaos'].includes(node.id)
      ? renderIllustration('exam', 'scene', true) : undefined;
    content.append(portrait ?? compactArt(memoryArtKey(node.id)), element('p', `${entry.age}세 · ${node.title}`, 'cinematic-memory-title'), element('p', choice.text, 'cinematic-text'));
  }
  if (phase === 2) content.append(element('p', cinematic.reflection, 'cinematic-text cinematic-reflection'));
  if (phase === 3) {
    content.append(compactArt(cinematic.illustration), element('h1', ending.title), element('p', '이 삶의 결말이 기록되었습니다.', 'cinematic-text'));
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
