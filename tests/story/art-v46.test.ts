import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import installed from '../../src/content/generated/art-assets-v46.json';
import { canonicalPortrait } from '../../src/ui/visual-identity';
import { illustrationAsset, outcomeArtwork } from '../../src/ui/illustrations';
import { createRun, choose } from '../../src/engine/transition';
import { readExampleStory } from '../../scripts/read-story';

const story = await readExampleStory('demon-king-compact');
it('검수 후 설치한 실제 WebP만 연결하고 파일 크기·해시·메타와 공개 자산 목록이 일치한다', () => {
  const ledger = JSON.parse(readFileSync('docs/v4.6/art-installed.json', 'utf8')) as { id: string; path: string; width: number; height: number; bytes: number; sha256: string }[];
  const index = JSON.parse(readFileSync('public/assets/assets.json', 'utf8')).assets as { path: string; width: number; height: number; bytes: number }[];
  expect(new Set(ledger.map(row => row.id)).size).toBe(ledger.length);
  expect(new Set(ledger.map(row => row.path)).size).toBe(ledger.length);
  expect(installed.assets).toHaveLength(ledger.length);
  for (const row of ledger) {
    const bytes = readFileSync(`public/${row.path}`);
    expect(bytes.subarray(0, 4).toString()).toBe('RIFF'); expect(bytes.subarray(8, 12).toString()).toBe('WEBP');
    expect(bytes.length).toBe(row.bytes); expect(bytes.length).toBeLessThan(200_000);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(row.sha256);
    expect(installed.assets.find(asset => asset.id === row.id)).toEqual({ id: row.id, path: row.path, width: row.width, height: row.height, bytes: row.bytes });
    expect(index.find(asset => asset.path === row.path)).toMatchObject({ width: row.width, height: row.height, bytes: row.bytes });
  }
});
it('출생·유아·아동·청년·중년·장년·노년의 화면 초상화를 나이에 맞게 선택한다', () => {
  for (const [age, file] of [[0, 'protagonist_baby'], [3, 'protagonist_toddler'], [8, 'protagonist_school'], [12, 'protagonist_child'], [20, 'protagonist'], [41, 'protagonist_middle'], [55, 'protagonist_mature'], [70, 'protagonist_old']] as const) {
    expect(canonicalPortrait('/demon-king-life/', 'player', age)).toBe(`/demon-king-life/assets/illustrations/characters/${file}.webp`);
  }
});
it('실제 방문과 해당 나이·선택·판정이 있는 그림만 표시하며 미래/가짜 결과는 연결하지 않는다', () => {
  let state = createRun(story, 17, 'v46-art');
  expect(illustrationAsset('exam', 'scene', { body: story.nodes.exam!.body, age: 20, state })?.id).not.toBe('event-exam');
  for (const id of ['family_accept', 'trust_mina']) state = choose(story, state, state.currentNodeId!, id).nextState;
  expect(illustrationAsset('exam', 'scene', { body: story.nodes.exam!.body, age: 20, state })?.id).toBe('event-exam');
  expect(illustrationAsset('exam', 'scene', { body: story.nodes.exam!.body, age: 12, state })?.id).not.toBe('event-exam');
  state = choose(story, state, 'exam', 'attack').nextState;
  const entry = state.history.at(-1)!; expect(outcomeArtwork(state, entry)?.id).toBe('event-exam_attack');
  expect(outcomeArtwork(state, { ...entry, choiceId: 'confess', outcomeId: 'out_confess' })).toBeUndefined();
  expect(outcomeArtwork(state, { ...entry, age: 60 })).toBeUndefined();
  expect(illustrationAsset('truth_evidence', 'scene', { body: '', age: 55, state })).toBeUndefined();
});
