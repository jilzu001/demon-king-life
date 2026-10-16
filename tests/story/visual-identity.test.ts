import { it, expect } from 'vitest';
import speakers from '../../src/ui/compact-speakers.json';
import { compactSpeaker, canonicalPortrait } from '../../src/ui/visual-identity';
import { readExampleStory } from '../../scripts/read-story';
const story = await readExampleStory('demon-king-v48-archive');
it('확정 대사만 실제 본문/등장 인물과 일치하며 내레이션/미등록 인물은 추정하지 않는다', () => {
  for (const [id, rows] of Object.entries(speakers)) for (const row of rows) {
    expect(story.nodes[id]!.body.split('\n\n')[row.index]).toBe(row.text);
    expect(story.characters[row.speaker]).toBeDefined();
    expect(compactSpeaker(id, row.text)).toBe(row.speaker);
  }
  expect(compactSpeaker('exam', story.nodes.exam!.body.split('\n\n')[0]!)).toBeUndefined();
  expect(compactSpeaker('exam', '없는 대사')).toBeUndefined();
  expect(compactSpeaker('constructor', '없는 대사')).toBeUndefined();
});
it('실제 확인한 네 인물만 기준 초상화를 사용하며 레온/감사관/공용 표정은 숨긴다', () => {
  for (const actor of ['player', 'mina', 'erisia', 'king']) expect(canonicalPortrait('/', actor)).toMatch(/^\/assets\/illustrations\/characters\//);
  for (const actor of ['roen', 'auditor', 'seria', 'angry', 'constructor', '__proto__']) expect(canonicalPortrait('/', actor)).toBeUndefined();
});
