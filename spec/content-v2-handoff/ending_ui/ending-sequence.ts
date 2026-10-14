/** Drop-in ending presentation. No game engine assumptions beyond EndingRun. */
export type Memory = { id:string; age?:number; text:string; icon?:string };
export type EndingRun = { endingId:string; cardTitle:string; closingScene:string; innerVoice:string; tone:string; artKey:string; memories:Memory[] };
const KEY='demon-king-ending-collection-v2';
export function unlocked():string[]{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return []}}
export function unlock(id:string):void{const set=new Set(unlocked());set.add(id);localStorage.setItem(KEY,JSON.stringify([...set]));}
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
function art(key:string):string{
 const mark=key==='heart'?'♥':key==='crown'?'♛':key==='scroll'?'✧':'☾';
 return `<svg viewBox="0 0 320 160" role="img" aria-label="삶을 상징하는 그림" style="max-width:100%;height:auto"><rect width="320" height="160" rx="12" fill="#151e30"/><circle cx="160" cy="74" r="49" fill="#e4bb76" opacity=".12"/><path d="M0 133Q80 102 160 133T320 133V160H0" fill="#37425d"/><text x="160" y="105" text-anchor="middle" font-size="75" fill="#e5c48d">${mark}</text></svg>`;
}
export function mountEndingSequence(target:HTMLElement, run:EndingRun, onRestart:()=>void, onCollection:()=>void):()=>void {
 let phase=0, memoryIndex=0, disposed=false;
 const memories=run.memories.filter(m=>m&&m.id&&m.text).slice(-8);
 const next=()=>{if(phase===1 && memoryIndex<memories.length-1){memoryIndex++;}else{phase++;if(phase===3)unlock(run.endingId);}render();};
 const render=()=>{
  if(disposed)return;
  let inner='';
  if(phase===0)inner=`${art(run.artKey)}<p class="dk-narration">${escape(run.closingScene)}</p><button data-next>계속</button>`;
  if(phase===1){const m=memories[memoryIndex];inner=m?`${art(run.artKey)}<p class="dk-memory">${m.age==null?'':escape(String(m.age))+'세 · '}${escape(m.text)}</p><button data-next>계속</button>`:`${art(run.artKey)}<button data-next>계속</button>`;}
  if(phase===2)inner=`<p class="dk-thought">“${escape(run.innerVoice)}”</p><button data-next>계속</button>`;
  if(phase>=3)inner=`${art(run.artKey)}<h1>${escape(run.cardTitle)}</h1><p>새로운 결말이 기록되었습니다.</p><button data-restart>다시 시작</button><button data-collection>도감 보기</button>`;
  target.innerHTML=`<section class="dk-ending" aria-live="polite">${inner}</section>`;
  target.querySelector('[data-next]')?.addEventListener('click',next,{once:true});
  target.querySelector('[data-restart]')?.addEventListener('click',onRestart,{once:true});
  target.querySelector('[data-collection]')?.addEventListener('click',onCollection,{once:true});
 };
 render();return ()=>{disposed=true;target.replaceChildren()};
}
