import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

type Event = { id: string; body: string; bodyParagraphs: string[]; choices: Record<string, unknown>[]; [key: string]: unknown };
const read = (file: string) => JSON.parse(readFileSync(file, 'utf8')) as { events: Event[] };
const old = read('spec/content-v3.4-illustrated/content/events_v2_9.json');
// v3.6의 역사적 변경 범위는 v4.5 적용 전 스냅샷으로 검증한다.
const next = read('backups/before-v4.5/prepared/events_v2_9.json');
const six = ['birth_tax', 'village_well', 'school_map', 'first_wage', 'guard_toll', 'mina_festival'];
const ten: string[] = JSON.parse(readFileSync('spec/content-v3.6-story-engine-art/AUTHORING_REPORT_V3_5.json', 'utf8')).eventIds;
function logic(event: Event) {
  const { body: _body, bodyParagraphs: _paragraphs, choices, ...rest } = event;
  return { ...rest, choices: choices.map(c => {
    const { result: _result, resultNarrative: _narrative, resultParagraphs: _results, ...decision } = c;
    return decision;
  }) };
}

it('65개 사건과195개 선택의 ID·나이·조건·효과를 유지하고 문안만 갱신한다', () => {
  expect(next.events).toHaveLength(65);
  expect(new Set(next.events.map(e => e.id)).size).toBe(65);
  expect(next.events.map(logic)).toEqual(old.events.map(logic));
  expect(next.events.reduce((n, e) => n + e.choices.length, 0)).toBe(195);
  for (const event of next.events) {
    expect(event.bodyParagraphs.join('\n\n')).toBe(event.body);
    expect(new Set(event.choices.map(c => c.id)).size).toBe(event.choices.length);
    for (const c of event.choices) {
      expect((c.resultParagraphs as string[]).join('\n\n')).toBe(c.result);
      if (c.resultNarrative !== undefined) expect(c.resultNarrative).toBe(c.result);
    }
  }
});

it('v3.6은6개 사건 결과만 강화하며 v3.5의10개 재집필 범위와 구분한다', () => {
  const changed = next.events.filter((e, i) => JSON.stringify(e) !== JSON.stringify(old.events[i])).map(e => e.id);
  expect(changed.sort()).toEqual([...six, ...ten].sort());
  for (const id of six) {
    const before = old.events.find(e => e.id === id)!; const after = next.events.find(e => e.id === id)!;
    expect(after.body).toBe(before.body);
    expect(after.choices.map(c => c.result)).not.toEqual(before.choices.map(c => c.result));
  }
  const source = read('spec/content-v3.6-story-engine-art/content/events_v2_9.json');
  let repaired = 0;
  for (const event of source.events) for (const choice of event.choices) {
    const narrative = (choice.resultParagraphs as string[]).join('\n\n');
    if (choice.result !== narrative) { choice.result = narrative; if (choice.resultNarrative !== undefined) choice.resultNarrative = narrative; repaired++; }
  }
  expect(repaired).toBe(18);
  expect(next).toEqual(source);
});
