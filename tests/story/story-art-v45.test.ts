import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadStory } from '../../src/content/load';
import { readExampleStory } from '../../scripts/read-story';
import { createRun, choose } from '../../src/engine/transition';
import { decodeSave } from '../../src/persistence/migrate';
import { routeYears, storyEcho } from '../../src/content/route-years';
import { illustrationAsset, outcomeArtwork } from '../../src/ui/illustrations';
import { canonicalPortrait } from '../../src/ui/visual-identity';
import { annualVariants, annualLedgerKey } from '../../src/content/annual-variants';

const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const source = 'spec/content-v4.5-story-art';
const story = await readExampleStory('demon-king-compact');
const old = await loadStory(async path => read(`backups/before-v4.5/${path}`));
const rewrittenBodies = ['child', 'petition', 'invoice', 'office'];
const rewrittenOutcomes = ['invoice/bring_mina', 'exam/confess', 'confession/confess_sincere', 'settlement/reject_money'];
function run(ids: string[]) {
  let state = createRun(story, 17, 'v45-proof');
  for (const id of ids) state = choose(story, state, state.currentNodeId!, id).nextState;
  return state;
}
it('103개 기존 선택의 조건·결과ID·가중치·효과·목적지는 그대로이며 허용된4본문/4결과만 수정한다', () => {
  const input = read(`${source}/chapters/01_complete.json`).nodes;
  let count = 0;
  for (const node of Object.values(old.nodes)) {
    const current = story.nodes[node.id]!;
    const target = input.find((n: { id: string }) => n.id === node.id);
    expect(current.body).toBe(rewrittenBodies.includes(node.id) ? target.body : node.body);
    expect(current.chronicleSummary).toBe(node.id === 'child' ? target.chronicleSummary : node.chronicleSummary);
    expect({ ...current, body: node.body, chronicleSummary: node.chronicleSummary, choices: node.choices }).toEqual(node);
    for (const choice of node.choices) {
      const actual = current.choices.find(c => c.id === choice.id)!;
      expect({ ...actual, outcomes: choice.outcomes }).toEqual(choice);
      for (const outcome of choice.outcomes) {
        const next = actual.outcomes.find(o => o.id === outcome.id)!;
        expect({ ...next, narrative: outcome.narrative }).toEqual(outcome);
        expect(next.narrative).toBe(rewrittenOutcomes.includes(`${node.id}/${choice.id}`)
          ? target.choices.find((c: { id: string }) => c.id === choice.id).outcomes.find((o: { id: string }) => o.id === outcome.id).narrative : outcome.narrative);
      }
      count++;
    }
  }
  expect(count).toBe(103); expect(story.manifest.initialState).toEqual(old.manifest.initialState); expect(story.characters).toEqual(old.characters);
  const updated = ['ending_mina_wedding', 'ending_retirement_47', 'ending_mother_petition'];
  for (const ending of Object.values(old.endings)) expect(story.endings[ending.id]).toEqual({ ...ending, body: updated.includes(ending.id) ? read(`${source}/endings.json`).endings.find((e: { id: string }) => e.id === ending.id).body : ending.body });
});
it('확장65개 중4본문/12결과와6세 범위만 바뀌며 실제44사건/119선택에 연결된다', () => {
  const before = read('backups/before-v4.5/prepared/events_v2_9.json').events;
  const now = read('content/events_v2_9.json').events;
  const input = read(`${source}/content/events_v2_9.json`).events;
  expect(now.length).toBe(65); expect(Object.keys(story.nodes)).toHaveLength(44);
  const updated = ['birth_tax', 'mina_bridge', 'orphan_registry', 'old_mina'];
  for (const e of before) {
    const actual = now.find((x: { id: string }) => x.id === e.id)!;
    if (!updated.includes(e.id)) { expect(actual).toEqual(e); continue; }
    const target = input.find((x: { id: string }) => x.id === e.id);
    expect(actual.body).toBe(target.body); expect(story.nodes[e.id]!.body).toBe(target.body);
    expect(actual.ageRange).toEqual(e.id === 'birth_tax' ? [6, 6] : e.ageRange);
    for (const c of e.choices) {
      const next = actual.choices.find((x: { id: string }) => x.id === c.id);
      expect({ ...next, result: c.result, resultNarrative: c.resultNarrative, resultParagraphs: c.resultParagraphs }).toEqual({ ...c, resultNarrative: c.resultNarrative });
      expect(next.result).toBe(next.resultNarrative); expect(next.resultParagraphs.join('\n\n')).toBe(next.resultNarrative);
    }
  }
  expect(story.nodes.birth_tax!.age).toBe(6);
  expect(Object.values(story.nodes).reduce((sum, n) => sum + n.choices.length, 0)).toBe(119);
});
it('325개 기록은 선택·효과 없이5종 중1개이며 매 나이를 채우고 사건이 있는 해는 제외한다', () => {
  const annual = read(`${source}/content/annual_life_records_v4_2.json`);
  const before = read('spec/content-v4.4-ending-gallery/content/annual_life_records_v4_2.json');
  expect(annual.years).toHaveLength(65); let changes = 0;
  for (const [i, year] of annual.years.entries()) for (const [j, variant] of year.variants.entries()) {
    expect(year.variants).toHaveLength(5); expect(variant.choices).toEqual([]); expect(variant.effects).toEqual([]); expect(variant.text).not.toMatch(/[\r\n]/);
    if (variant.text !== before.years[i].variants[j].text) changes++;
  }
  expect(changes).toBe(50);
  const state = run(['explore_route_v45_birth_tax', 'birth_tax_1']);
  expect(routeYears(story, state, 'birth_tax').map(y => y.age)).toEqual([1, 2, 3, 4, 5]);
  expect(routeYears(story, state, 'child').map(y => y.age)).toEqual([7, 8, 9, 10, 11]);
  expect(routeYears(story, decodeSave(story, JSON.stringify(state)), 'child')).toEqual(routeYears(story, state, 'child'));
});
it('회상은실제선택·방문·보유플래그를모두요구하고여러조건도한문장만선택한다', () => {
  const state = run(['family_appeal', 'trust_mina', 'attack', 'forgive', 'ally', 'public_audit']);
  const echoes = storyEcho(story, state, 'hearing'); expect(echoes).toHaveLength(1); expect(echoes[0]!.id).toBe('echo_birth_appealed_hearing');
  const fake = structuredClone(state); fake.flags.push('birth_wage_claim');
  expect(storyEcho(story, fake, 'settlement')).toEqual([]);
  const mismatched = run(['family_accept', 'trust_mina', 'attack', 'forgive', 'ally', 'public_audit']); mismatched.flags.push('birth_appealed');
  expect(storyEcho(story, mismatched, 'hearing')[0]!.id).toBe('echo_public_audit_hearing');
});
it('구154종 연간 잔여플래그는 그대로읽고무시하지만다른변조는거절한다', () => {
  for (const node of Object.values(story.nodes)) for (const choice of node.choices) {
    expect(JSON.stringify([choice.enabledWhen, ...choice.outcomes.map(outcome => outcome.when)])).not.toMatch(/annual_(?:\d|pool_)/);
    expect(JSON.stringify(choice.outcomes.map(outcome => outcome.effects))).not.toMatch(/annual_(?:\d|pool_)/);
  }
  const state = run(['family_accept', 'trust_mina']); state.flags.push('annual_04_a', 'annual_pool_late_oldstory_b');
  expect(decodeSave(story, JSON.stringify(state))).toEqual(state);
  const next = choose(story, state, 'exam', 'invoice').nextState; expect(decodeSave(story, JSON.stringify(next))).toEqual(next);
  expect(next.flags).toContain('annual_04_a'); expect(storyEcho(story, next, 'invoice')).toEqual([]);
  for (const flag of ['annual_00_a', 'annual_66_b', 'annual_pool_not_real_a', 'made_up_flag']) expect(() => decodeSave(story, JSON.stringify({ ...state, flags: [...state.flags, flag] }))).toThrow();
  expect(() => decodeSave(story, JSON.stringify({ ...state, player: { ...state.player, gold: 999 } }))).toThrow();
});
it('CG는실제장면·나이·동행결과에만연결하고미나는은발기준초상화를유지한다', () => {
  const state = run(['family_accept', 'trust_mina', 'invoice', 'bring_mina']);
  const entry = state.history.at(-1)!; expect(outcomeArtwork(state, entry)?.path).toContain('cg_mina_royal_hall.webp');
  const absent = run(['family_accept', 'trust_mina', 'invoice', 'accept_invite']); expect(outcomeArtwork(absent, absent.history.at(-1)!)).toBeUndefined();
  const dead = structuredClone(state); dead.npcs.mina!.alive = false; expect(outcomeArtwork(dead, entry)).toBeUndefined();
  const broken = structuredClone(state); broken.npcs.mina!.relationship = 'estranged'; expect(outcomeArtwork(broken, entry)).toBeUndefined();
  const birth = createRun(story, 17, 'cg'); expect(illustrationAsset('birth', 'scene', { body: story.nodes.birth!.body, age: 0, state: birth })?.path).toContain('cg_birth_registry');
  expect(canonicalPortrait('/', 'mina')).toBe('/assets/illustrations/characters/mina.webp'); expect(canonicalPortrait('/', 'leon')).toBeUndefined();
  for (const rule of read(`${source}/assets/scene_art_manifest_v4_5.json`).rules) expect(readFileSync(`public/${rule.artPath}`).equals(readFileSync(`${source}/${rule.artPath}`))).toBe(true);
});
it('연간5종은5회차동안중복없이순환하고회차별표시원장을복원하며게임상태는바꾸지않는다', () => {
  const years = read(`${source}/content/annual_life_records_v4_2.json`).years.slice(0, 2);
  const values = new Map<string, string>();
  const port = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, text: string) => { values.set(key, text); }, removeItem: (key: string) => { values.delete(key); } };
  const rows = Array.from({ length: 5 }, (_, i) => {
    const state = createRun(story, 17, `cycle-${i}`); const before = JSON.stringify(state);
    const result = annualVariants(state, years, port); expect(JSON.stringify(state)).toBe(before); return result;
  });
  for (const index of [0, 1]) expect(new Set(rows.map(row => row[index]!.id)).size).toBe(5);
  expect(annualVariants(createRun(story, 17, 'cycle-0'), years, port)).toEqual(rows[0]);
  expect(annualVariants(createRun(story, 17, 'cycle-5'), years, port)).toEqual(rows[0]);
  values.set(annualLedgerKey, 'bad-json');
  expect(annualVariants(createRun(story, 17, 'fallback'), years, port)).toEqual(annualVariants(createRun(story, 17, 'fallback'), years));
  expect(values.get(annualLedgerKey)).toBe('bad-json');
});
