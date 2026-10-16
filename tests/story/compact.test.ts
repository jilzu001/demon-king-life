import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { preV48Story } from '../../src/content/compact-previous';
import { createRun, choose } from '../../src/engine/transition';
import { simulateAll } from '../../src/content/simulate';
import { decodeSave } from '../../src/persistence/migrate';
import { SaveStore, META_KEY, runKey } from '../../src/persistence/save';
import { compactSlot } from '../../src/content/compact-contract';
import { memoryEvents, memoryArtKey } from '../../src/ui/compact-ending';
import { narrativeLines } from '../../src/ui/narrative';
import { lifeEvents } from '../../src/ui/history';

const story = preV48Story; // 구 회차 계약 회귀. v4.8 신규 실행은 independent-routes.test.ts에서 검사한다.
const raw = JSON.parse(readFileSync('backups/before-v4.8/chapters/01_complete.json', 'utf8'));
function run(ids: string[]) {
  let state = createRun(story, 17, 'compact-test');
  for (const id of ids) state = choose(story, state, state.currentNodeId!, id).nextState;
  return state;
}
describe('축소 완결판 계약과 원작 보호', () => {
  it('출생 나이로 시작하고 이후 시간 역행 없이 저장을 재현한다', () => {
    expect(story.manifest.initialState.age).toBe(20);
    expect(createRun(story, 17, 'birth').age).toBe(0);
    const state = run(['family_accept', 'trust_mina', 'attack', 'escape_prison']);
    expect(state.history.map(h => h.age)).toEqual([0, 12, 20, 21]);
    expect(decodeSave(story, JSON.stringify(state))).toEqual(state);
  });
  it('44개 사건과20개 엔딩 및91664개 종단 경로가 모두 도달한다', () => {
    const report = simulateAll(story);
    expect(report.reachableNodes).toBe(44); expect(Object.keys(report.endings)).toHaveLength(20);
    expect(report.terminalPaths).toBe(91664); expect(report.warnings).toEqual([]);
  });
  it('표시 분류 별칭을 변환해도 원본과 ID·효과·가중치·목적지를 바꾸지 않는다', () => {
    for (const source of raw.nodes) for (const c of source.choices) for (const o of c.outcomes) {
      const actual = story.nodes[source.id]!.choices.find(choice => choice.id === c.id)!.outcomes.find(outcome => outcome.id === o.id)!;
      expect(actual).toEqual({ ...o, result: o.result === 'bad' ? 'failure' : o.result });
    }
    expect(raw.nodes.find((n: { id: string }) => n.id === 'prison').choices[2].outcomes[0].result).toBe('bad');
  });
  it('별도 저장 슬롯과 도감은 원작 데이터를 건드리지 않으며 마지막 화면에서만 해금한다', () => {
    const values = new Map([[runKey('demon-king'), 'original-run'], [META_KEY, 'original-meta']]);
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
    const store = new SaveStore(story, () => storage, new Set(Object.keys(story.endings)), compactSlot);
    const state = run(['family_accept', 'trust_mina', 'attack', 'escape_prison']);
    store.commit(state, false);
    expect(store.loadMeta().discoveredEndings['demon-king']).toBeUndefined();
    store.commit(state); store.commit(state);
    expect(store.loadMeta().discoveredEndings['demon-king']).toEqual(['ending_escape']);
    expect(store.load()).toEqual(state);
    expect(values.get(runKey('demon-king'))).toBe('original-run'); expect(values.get(META_KEY)).toBe('original-meta');
  });
  it('선택한 경로의 사건만 시간순으로 회상하고 부족한 기록을 채우지 않는다', () => {
    const state = run(['family_accept', 'trust_mina', 'refuse', 'burn_office']);
    const memories = memoryEvents(story, state);
    expect(memories.map(m => m.node.id)).toEqual(['birth', 'child', 'exam', 'petition']);
    expect(memoryEvents(story, { ...state, history: [] })).toEqual([]);
    const summary = lifeEvents(story, state).find(e => e.nodeId === 'petition');
    expect(summary?.summary).toBe(story.nodes.petition!.chronicleSummary);
    expect(summary?.summary).not.toContain('“');
    expect(memoryArtKey('constructor')).toBe('silhouette');
  });
  it('문단은 빈 줄 기준이며 연속 대사·CRLF와 문장부호를 그대로 보존한다', () => {
    expect(narrativeLines('서술. 한 문단.\r\n\r\n“첫 대사.”\r\n\r\n“둘째 대사.”')).toEqual(['서술. 한 문단.', '“첫 대사.”', '“둘째 대사.”']);
    expect(narrativeLines('문장. 문장.')).toEqual(['문장. 문장.']);
  });
});
