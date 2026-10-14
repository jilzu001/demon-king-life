import { canonical } from './json';
import { describePath, getPath } from '../engine/paths';
import type { Condition, Effect, GameState, Story } from '../engine/types';

type Reads = Map<string, Set<string> | null>;
function mark(reads: Reads, path: string, member?: string) {
  if (member === undefined) reads.set(path, null);
  else if (!reads.has(path)) reads.set(path, new Set([member]));
  else reads.get(path)?.add(member);
}
function conditionReads(reads: Reads, condition?: Condition): void {
  if (!condition) return;
  if ('all' in condition) condition.all.forEach(c => conditionReads(reads, c));
  else if ('any' in condition) condition.any.forEach(c => conditionReads(reads, c));
  else if ('not' in condition) conditionReads(reads, condition.not);
  else mark(reads, condition.path, condition.op === 'contains' ? String(condition.value) : undefined);
}
// 이후 판정에 읽히는 값만 키로 투영한다. 실제 상태는 수정하지 않는다.
export function simulationKey(story: Story): (state: GameState) => string {
  const cache = new Map<string, Reads>();
  const ceilings = new Map<string, number>();
  const allEffects = Object.values(story.nodes).flatMap(node => [...(node.entryEffects ?? []), ...node.choices.flatMap(c => c.outcomes.flatMap(o => o.effects ?? []))]);
  const additivePaths = new Set(allEffects.filter(e => e.op === 'add').map(e => e.path));
  const thresholds = new Map<string, Set<number>>();
  const collectThresholds = (condition?: Condition): void => {
    if (!condition) return;
    if ('all' in condition) condition.all.forEach(collectThresholds);
    else if ('any' in condition) condition.any.forEach(collectThresholds);
    else if ('not' in condition) collectThresholds(condition.not);
    else if (typeof condition.value === 'number') {
      if (!thresholds.has(condition.path)) thresholds.set(condition.path, new Set());
      thresholds.get(condition.path)!.add(condition.value);
    }
  };
  for (const node of Object.values(story.nodes)) {
    for (const line of node.chronicle ?? []) collectThresholds(line.when);
    for (const choice of node.choices) {
      collectThresholds(choice.enabledWhen); for (const outcome of choice.outcomes) collectThresholds(outcome.when);
    }
  }
  // 법적 혼인 보호 검사도 동일한 임계값을 읽는다.
  if (!thresholds.has('npcs.erisia.trust')) thresholds.set('npcs.erisia.trust', new Set());
  thresholds.get('npcs.erisia.trust')!.add(65);
  for (const effect of allEffects) {
    if (typeof effect.value !== 'number') continue;
    const initial = getPath(story, story.manifest.initialState, effect.path);
    ceilings.set(effect.path, Math.max(ceilings.get(effect.path) ?? Number(initial), effect.op === 'set' ? effect.value : Number(initial)));
  }
  for (const effect of allEffects) if (effect.op === 'add' && typeof effect.value === 'number' && effect.value > 0) ceilings.set(effect.path, (ceilings.get(effect.path) ?? 0) + effect.value);
  const cloneReads = (reads: Reads): Reads => new Map([...reads].map(([path, members]) => [path, members === null ? null : new Set(members)]));
  const beforeEffects = (after: Reads, effects: Effect[]): Reads => {
    const reads = cloneReads(after);
    for (const effect of [...effects].reverse()) {
      const field = describePath(story, effect.path);
      if (effect.op === 'set') {
        reads.delete(effect.path); // 상수 덮어쓰기 이전 값은 후속 조건에 영향을 주지 않는다.
        if (effect.path.endsWith('.alive') || effect.path.endsWith('.relationship')) mark(reads, effect.path);
      } else if (effect.op === 'add') {
        const ceiling = ceilings.get(effect.path) ?? Infinity;
        const safePositive = Number(effect.value) >= 0 && field.max === undefined
          && Number.isFinite(ceiling) && (!field.integer || Number.isSafeInteger(ceiling));
        if (!safePositive) mark(reads, effect.path); // 음수 지출/관계 상한 등 이전 값으로 실패할 수 있다.
      } else {
        const members = reads.get(effect.path);
        members?.delete(String(effect.value));
        if (members?.size === 0) reads.delete(effect.path);
        if (effect.path === 'player.crimes') mark(reads, effect.path, String(effect.value));
      }
    }
    return reads;
  };
  const futureReads = (id: string): Reads => {
    if (cache.has(id)) return cache.get(id)!;
    const reads: Reads = new Map(); cache.set(id, reads);
    const node = story.nodes[id]!;
    for (const line of node.chronicle ?? []) {
      conditionReads(reads, line.when);
      for (const npc of line.presence ?? []) mark(reads, `npcs.${npc}.alive`);
    }
    for (const choice of node.choices) {
      conditionReads(reads, choice.enabledWhen);
      for (const outcome of choice.outcomes) {
        const targetReads = outcome.to.kind === 'node' ? futureReads(outcome.to.id) : new Map<string, Set<string> | null>();
        const targetEntry = outcome.to.kind === 'node' ? story.nodes[outcome.to.id]!.entryEffects ?? [] : [];
        const prior = beforeEffects(targetReads, [...(outcome.effects ?? []), ...targetEntry]);
        conditionReads(prior, outcome.when);
        for (const [path, members] of prior) {
          if (members === null) mark(reads, path); else for (const member of members) mark(reads, path, member);
        }
      }
    }
    return reads;
  };
  Object.keys(story.nodes).forEach(futureReads);
  return state => {
    if (state.ended) return canonical({ endingId: state.endingId });
    const values: Record<string, unknown> = { nodeId: state.currentNodeId, age: state.age, legalStatus: state.player.legalStatus, alive: state.player.alive };
    for (const [path, members] of futureReads(state.currentNodeId!)) {
      const value = getPath(story, state, path);
      // add가 전혀 없는 숫자는 임계값 비교의 결과가 같은 범위끼리 합칠 수 있다.
      // 상수 set 뒤에는 새 값으로 다시 판정하므로 금화/신뢰 자체를 변경하지 않는다.
      values[path] = members !== null ? [...members].sort().map(member => [member, (value as string[]).includes(member)])
        : typeof value === 'number' && !additivePaths.has(path)
          ? [...(thresholds.get(path) ?? [])].sort((a, b) => a - b).map(threshold => value < threshold ? -1 : value > threshold ? 1 : 0)
          : value;
    }
    // 전체 상태 불변식과 관계/법적 검사는 이후에도 유지한다.
    for (const [id, npc] of Object.entries(state.npcs)) values[`npc:${id}`] = { alive: npc.alive, relationship: npc.relationship };
    values.legalFlags = ['marriage_registered', 'married_erisia', 'attempted_attack_on_mina', ...Object.keys(state.npcs).map(id => `divorce_finalized_${id}`)].map(flag => [flag, state.flags.includes(flag)]);
    return canonical(values);
  };
}
