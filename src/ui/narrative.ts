import type { ScenePresentation } from '../content/presentation';
import { element } from './dom';

export function narrativeLines(body: string): string[] {
  return body.replace(/\r\n?/g, '\n').trim().split(/\n[ \t]*\n+/).map(paragraph => paragraph.trim()).filter(Boolean);
}
export function renderNarrative(body: string, presentation?: ScenePresentation, linewise = false): HTMLElement {
  const narrative = element('div', undefined, 'narrative');
  if (linewise) narrative.classList.add('story-prose');
  // body는 그대로, 따옴표를 화자/대사로 추측 분리하지 않는다.
  for (const line of linewise ? narrativeLines(body) : [body]) narrative.append(element('p', line, linewise ? 'body story-paragraph' : 'body'));
  if (!linewise && presentation?.dialogues?.length) {
    const dialogues = element('div', undefined, 'dialogues'); dialogues.setAttribute('aria-label', '현재 장면의 대화');
    for (const [index, dialogue] of presentation.dialogues.entries()) {
      const line = element('div', undefined, 'dialogue-line');
      line.dataset.speaker = dialogue.speaker;
      line.dataset.dialogueIndex = String(index);
      line.append(element('p', dialogue.speaker, 'speaker'), element('p', dialogue.text, 'dialogue-text')); dialogues.append(line);
    }
    narrative.append(dialogues);
  }
  return narrative;
}
