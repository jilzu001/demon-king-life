import type { GameState, Story } from '../engine/types';
import pools from './generated/daily-life-v50.json';

// 화면용 일상이다. 게임 RNG·효과·플래그·저장 원장에는 관여하지 않는다.
export function freedomDaily(story: Story, state: GameState, nodeId: string) {
  const index=state.enteredNodeIds.indexOf(nodeId); if(index<1)return [];
  const from=story.nodes[state.enteredNodeIds[index-1]!]!.age, until=story.nodes[nodeId]!.age;
  const past=state.history.slice(0,index);
  const gate=past.find(entry=>entry.choiceId.startsWith('gate_to_'))?.choiceId.replace('gate_to_','');
  const rows=[];
  for(let age=from+1;age<until;age++) {
    const group=age<6?'infancy':age<12?'childhood':age<20?'youth':gate&&Object.hasOwn(pools,gate)?gate:'common';
    const variants=pools[group as keyof typeof pools];
    const hash=(year:number)=>{
      let value=state.rng.seed>>>0;
      for(const char of `${group}:${year}`) value=Math.imul(value^char.charCodeAt(0),16777619)>>>0;
      return value%variants.length;
    };
    let choice=-1;
    // 같은 문장이 바로 이어지는 일은 피하되 재열람/복원/새 기기에서 다시 뽑지 않는다.
    for(let year=1;year<=age;year++) { const next=hash(year); choice=next===choice?(next+1)%variants.length:next; }
    rows.push({id:`v5-daily:${group}:${age}:${choice}`,age,text:variants[choice]!,daily:true});
  }
  return rows;
}
