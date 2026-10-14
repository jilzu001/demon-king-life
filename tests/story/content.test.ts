import { describe, expect, it } from 'vitest';
import { assembleStory, safeContentPath } from '../../src/content/validate';
import { parseJson } from '../../src/content/json';
import { simulateAll } from '../../src/content/simulate';
import { example } from '../fixtures';

function documents() {
  return { manifest: structuredClone(example.manifest), chapter: { schemaVersion: 1, nodes: structuredClone(Object.values(example.nodes)) }, characters: { schemaVersion: 1, characters: structuredClone(Object.values(example.characters)) }, endings: { schemaVersion: 1, endings: structuredClone(Object.values(example.endings)) } };
}
describe('제공된 예제 계약', () => {
  it('11개 경로, 5개 엔딩, 8개 장면을 전부 검증한다', () => {
    const report = simulateAll(example);
    expect(report.terminalPaths).toBe(11); expect(report.reachableNodes).toBe(8); expect(report.maxDepth).toBe(5);
    expect(report.endings).toEqual({ end_prison: 2, end_captured: 6, end_early_death: 1, end_fraud_exposed: 1, end_fraud_passed: 1 });
    expect(report.warnings).toEqual([]);
  });
  it('탐색 상한에서는 완료를 선언하지 않는다', () => expect(() => simulateAll(example, 2)).toThrow('검증 불완전'));
  it('유효한 선택에 결과가 없거나 전부 비활성이면 배포 검증이 실패한다', () => {
    const d = documents(); d.chapter.nodes[0]!.choices[0]!.outcomes[0]!.when = { op: 'gt', path: 'player.combat', value: 8402 };
    expect(() => simulateAll(assembleStory(d.manifest, [d.chapter], d.characters, d.endings))).toThrow('적용 가능한 결과');
    for (const choice of d.chapter.nodes[0]!.choices) choice.enabledWhen = { op: 'gt', path: 'player.gold', value: 0 };
    expect(() => simulateAll(assembleStory(d.manifest, [d.chapter], d.characters, d.endings))).toThrow('소프트락');
  });
  it.each(['duplicate', 'missing', 'cycle', 'time', 'future', 'path', 'op', 'blank'])('정적 결함 %s를 빌드 전에 거부한다', kind => {
    const d = documents(); const node = d.chapter.nodes[0]!; const outcome = node.choices[0]!.outcomes[0]!;
    if (kind === 'duplicate') d.chapter.nodes.push(structuredClone(node));
    if (kind === 'missing') outcome.to.id = 'unknown';
    if (kind === 'cycle') outcome.to.id = node.id;
    if (kind === 'time') d.chapter.nodes[1]!.age = 19;
    if (kind === 'future') node.chronicle![0]!.age = 21;
    if (kind === 'path') outcome.when = { op: 'eq', path: 'npcs.unknown.alive', value: true };
    if (kind === 'op') (outcome.when as unknown as { op: string }).op = 'eval';
    if (kind === 'blank') node.body = '   ';
    expect(() => assembleStory(d.manifest, [d.chapter], d.characters, d.endings)).toThrow();
  });
  it('중복 키·주석·후행 쉼표·prototype 키·과대 파일을 거부한다', () => {
    for (const text of ['{"a":1,"a":2}', '{"a":1,}', '{/*x*/"a":1}', '{"__proto__":{}}', ' '.repeat(1_000_001)]) expect(() => parseJson(text)).toThrow();
    expect(parseJson('{"한글":"안전한 텍스트"}')).toEqual({ 한글: '안전한 텍스트' });
  });
  it('파일 경로 우회 및 다른 호스트 경로를 거부한다', () => {
    for (const path of ['chapters/../story.json', '/story.json', 'https://host/story.json', 'chapters//a.json']) expect(() => safeContentPath(path)).toThrow();
  });
});
