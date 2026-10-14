import type { ScenePresentation } from '../content/presentation';
import { element } from './dom';

export function renderNarrative(body: string, presentation?: ScenePresentation): HTMLElement {
  const narrative = element('div', undefined, 'narrative');
  // body는 그대로, 따옴표를 화자/대사로 추측 분리하지 않는다.
  narrative.append(element('p', body, 'body'));
  if (presentation?.dialogues?.length) {
    const dialogues = element('div', undefined, 'dialogues'); dialogues.setAttribute('aria-label', '현재 장면의 대화');
    for (const dialogue of presentation.dialogues) {
      const line = element('div', undefined, 'dialogue-line');
      line.append(element('p', dialogue.speaker, 'speaker'), element('p', dialogue.text, 'dialogue-text')); dialogues.append(line);
    }
    narrative.append(dialogues);
  }
  return narrative;
}
