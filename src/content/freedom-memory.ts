import type { GameState, Story } from '../engine/types';
import { evaluate } from '../engine/conditions';

// 원장을 읽어 당시까지 실제로 얻은 플래그만 투영한다. 새 사건/선택/효과를 실행하지 않는다.
export function freedomChronicle(story: Story, state: GameState, nodeId: string) {
  const index=state.enteredNodeIds.indexOf(nodeId); if(index<0)return [];
  const flags=new Set(story.manifest.initialState.flags);
  const earned=(effects: typeof story.nodes[string]['entryEffects'])=>{
    for(const effect of effects??[]) if(effect.path==='flags') {
      if(effect.op==='addToSet') flags.add(String(effect.value));
      else if(effect.op==='removeFromSet') flags.delete(String(effect.value));
    }
  };
  for(const [i,id] of state.enteredNodeIds.entries()) {
    earned(story.nodes[id]!.entryEffects);if(i===index)break;
    const record=state.history[i]; if(!record)break;
    earned(story.nodes[id]!.choices.find(choice=>choice.id===record.choiceId)!.outcomes.find(outcome=>outcome.id===record.outcomeId)!.effects);
  }
  return (story.nodes[nodeId]!.chronicle??[]).filter(line=>evaluate(story,{...state,flags:[...flags]},line.when));
}
export function endingRecapLines(story: Story,state: GameState) {
  return state.endingId ? (story.endings[state.endingId]?.recapRules??[]).filter(rule=>evaluate(story,state,rule.when)).map(rule=>rule.text) : [];
}
export function endingFullText(story: Story,state: GameState) {
  return [story.endings[state.endingId!]!.body,...endingRecapLines(story,state)].join('\n\n');
}
