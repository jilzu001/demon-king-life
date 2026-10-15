import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadStory } from '../../src/content/load';
import { readExampleStory } from '../../scripts/read-story';
import { choose, createRun } from '../../src/engine/transition';
import { previousCompactStory, decodeCompatibleCompact, backupBeforeCompactUpgrade, COMPACT_V37_BACKUP_KEY } from '../../src/persistence/compact-compatible';
import { loadReselectBackup, RESELECT_BACKUP_KEY } from '../../src/persistence/reselect';
import { compactSlot } from '../../src/content/compact-contract';
import { runKey } from '../../src/persistence/save';
import type { GameState } from '../../src/engine/types';
const story = await readExampleStory('demon-king-compact');
const audited = await loadStory(async path => JSON.parse(readFileSync(`backups/before-v4.4/${path}`, 'utf8')));
it('기존13사건28선택/7엔딩을 보호하며 고백과 v3.8 신규 선택만 덧붙인다', () => {
  for (const [id, old] of Object.entries(previousCompactStory.nodes)) {
    const current = audited.nodes[id]!;
    expect({ ...current, choices: old.choices }).toEqual(old);
    expect(current.choices.slice(0, old.choices.length)).toEqual(old.choices);
  }
  for (const [id, old] of Object.entries(previousCompactStory.endings)) expect(audited.endings[id]).toEqual(old);
  const source = JSON.parse(readFileSync('spec/content-v3.6.1-confession-audit/chapters/01_complete.json', 'utf8'));
  for (const id of ['confession', 'confession_afterm', 'confession_chaos']) expect(audited.nodes[id]).toEqual(source.nodes.find((n: { id: string }) => n.id === id));
  expect(audited.nodes.exam!.choices.map(c => c.id)).toEqual(['attack', 'refuse', 'invoice', 'confess']);
  expect(audited.nodes.exam!.choices[3]!.text).toBe('미나에게 사랑한다고 고백한다.');
});
it('기존147종단 경로의 모든 중간 저장과100시드를 원장/상태/RNG 변경 없이 검증한다', () => {
  let terminals = 0;
  const visit = (state: GameState) => {
    expect(decodeCompatibleCompact(story, JSON.stringify(state))).toEqual({ ...state, storyVersion: story.manifest.version });
    if (state.ended) { terminals++; return; }
    for (const choice of previousCompactStory.nodes[state.currentNodeId!]!.choices) visit(choose(previousCompactStory, state, state.currentNodeId!, choice.id).nextState);
  };
  visit(createRun(previousCompactStory, 17, 'old-paths'));
  expect(terminals).toBe(147);
  for (let seed = 1; seed <= 100; seed++) {
    let old = createRun(previousCompactStory, seed, `seed-${seed}`);
    for (const id of ['family_accept', 'trust_mina', 'attack', 'forgive', 'ally', 'public_audit', 'walk_away', 'end_peace']) old = choose(previousCompactStory, old, old.currentNodeId!, id).nextState;
    expect(decodeCompatibleCompact(story, JSON.stringify(old))).toEqual({ ...old, storyVersion: story.manifest.version });
  }
});
it('구 버전으로 위장한 신 선택 원장과 변조 상태는 이관하지 않는다', () => {
  let state = createRun(story, 1, 'forged');
  for (const id of ['family_accept', 'trust_mina', 'confess']) state = choose(story, state, state.currentNodeId!, id).nextState;
  expect(() => decodeCompatibleCompact(story, JSON.stringify({ ...state, storyVersion: '2.2.0-compact' }))).toThrow();
  const old = createRun(previousCompactStory, 1, 'old'); old.player.gold = 999;
  expect(() => decodeCompatibleCompact(story, JSON.stringify(old))).toThrow();
});
it('구 원문 백업은 덮어쓰지 않으며 구 재선택 백업도 엄격한 이관으로 복원한다', () => {
  const old = createRun(previousCompactStory, 4, 'backup');
  const raw = JSON.stringify(old); const values = new Map([[runKey(compactSlot), raw], [RESELECT_BACKUP_KEY, raw]]);
  const storage = { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); }, removeItem: (k: string) => { values.delete(k); } };
  backupBeforeCompactUpgrade(storage); const backup = values.get(COMPACT_V37_BACKUP_KEY)!;
  expect(JSON.parse(backup).run).toBe(raw);
  values.set(runKey(compactSlot), JSON.stringify(createRun(previousCompactStory, 7, 'other'))); backupBeforeCompactUpgrade(storage);
  expect(values.get(COMPACT_V37_BACKUP_KEY)).toBe(backup);
  expect(loadReselectBackup(storage, story, 'restored')).toEqual({ ...old, storyVersion: story.manifest.version, runId: 'restored' });
});

