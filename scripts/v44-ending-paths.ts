import { readExampleStory } from './read-story';
import { createRun, choose } from '../src/engine/transition';
import { decodeSave } from '../src/persistence/migrate';
import { endingArtworkPath } from '../src/content/ending-gallery';
import { ensure } from '../src/engine/types';
import { readFileSync } from 'node:fs';

const story = await readExampleStory('demon-king-compact');
const shared = ['family_accept', 'trust_mina', 'attack', 'forgive', 'ally', 'public_audit'];
const sincere = ['family_accept', 'trust_mina', 'confess', 'confess_sincere', 'support_mina'];
const invoice = ['family_accept', 'trust_mina', 'invoice', 'accept_invite'];
const prefixes: Record<string, string[]> = {
  mina_renounced: sincere, mina_wedding: sincere,
  confession_unanswered: ['family_accept', 'trust_mina', 'confess', 'confess_sincere', 'leave_mina', 'keep_records'],
  common_enemy: ['family_accept', 'trust_mina', 'refuse', 'keep_records', 'tell_mina'],
  double_license: ['family_accept', 'mina_rival', 'refuse', 'keep_records'],
  retirement_47: ['family_invoice', ...shared.slice(1)], paid_defeat: invoice, taxpayer: [...invoice, 'ally'],
  king: shared, bankrupt: shared, true_demon: shared,
  mother_petition: ['family_appeal', ...shared.slice(1, -1)],
};
const paths: { endingId: string; choices: string[] }[] = [
  { endingId: 'ending_escape', choices: ['family_accept', 'trust_mina', 'attack', 'escape_prison'] },
  { endingId: 'ending_fire', choices: ['family_accept', 'trust_mina', 'refuse', 'burn_office'] },
  { endingId: 'ending_throne', choices: [...invoice.slice(0, -1), 'threaten_king'] },
  { endingId: 'ending_ledger', choices: [...shared.slice(0, -1), 'steal_ledger'] },
  { endingId: 'ending_peace', choices: [...shared, 'walk_away', 'end_peace'] },
  { endingId: 'ending_reform', choices: [...shared, 'fight_case', 'reject_money', 'end_reform'] },
  { endingId: 'ending_office', choices: [...shared, 'fight_case', 'buy_office', 'end_office'] },
  { endingId: 'ending_love_scandal', choices: ['family_accept', 'trust_mina', 'confess', 'confess_absurd', 'embrace_fame'] },
];
for (const [suffix, prefix] of Object.entries(prefixes)) paths.push({ endingId: `ending_${suffix}`, choices: [...prefix,
  `explore_route_${suffix}`, `commit_route_${suffix}`, story.nodes[`bridge_route_${suffix}`]!.choices[0]!.id] });

const records = paths.map(path => {
  let state = createRun(story, 17, `actual-${path.endingId}`);
  for (const id of path.choices) {
    state = choose(story, state, state.currentNodeId!, id).nextState;
    ensure(JSON.stringify(decodeSave(story, JSON.stringify(state))) === JSON.stringify(state), '선택 중 저장 재현 실패');
  }
  ensure(state.ended && state.endingId === path.endingId, `${path.endingId}: 실제 도달 실패`);
  return { ...path, title: story.endings[path.endingId]!.title, age: state.age, history: state.history,
    artwork: endingArtworkPath(path.endingId), body: story.endings[path.endingId]!.body,
    finalChoice: path.choices.at(-1), imageBytes: readFileSync(`public/${endingArtworkPath(path.endingId)}`).length };
});
console.log(JSON.stringify(records, null, 2));
