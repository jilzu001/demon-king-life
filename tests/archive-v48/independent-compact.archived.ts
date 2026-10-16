import { test, expect, type Page } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
const read=(file:string)=>JSON.parse(readFileSync(file,'utf8'));
const matrix=read('spec/content-v48-independent/demon_king_v48/route_matrix.json') as {route:string;entry:string;middle:string;final:string;ending_options:string[]}[];
const authored=read('public/stories/demon-king-compact/chapters/04_v48_independent_life_routes.json').nodes as {id:string;age:number;choices:{id:string;text:string}[]}[];
const key='existence-sim:v1:run:demon-king:compact', meta='existence-sim:v1:meta:demon-king:compact';
async function ready(page:Page) {
  if(await page.locator('#reading-skip').isEnabled()) await page.locator('#reading-skip').click();
  await page.clock.runFor(400);await expect(page.locator('#choice-dialog')).toBeVisible();
}
async function pick(page:Page,id:string) {
  await ready(page);await page.locator(`[data-choice="${id}"]`).click();await page.clock.runFor(400);
  if(await page.locator('#reading-skip').isEnabled()) await page.locator('#reading-skip').click();
}
async function start(page:Page) {
  const now=new Date('2026-10-16T00:00:00Z');await page.clock.install({time:now});await page.clock.pauseAt(now);
  await page.goto('./');await page.locator('[data-enter]').click();
}
async function verifyScene(page:Page,id:string) {
  await ready(page);const node=authored.find(node=>node.id===id)!;
  const state=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),key);
  expect(state.currentNodeId).toBe(id);expect(state.age).toBe(node.age);
  for(const choice of node.choices) await expect(page.locator(`[data-choice="${choice.id}"] .choice-title`)).toHaveText(choice.text);
}
for(const route of matrix) test(`v4.8/${route.route}: 실제 독립 생애·중년 조건·두 결말·도감`,async({page})=>{
  test.setTimeout(90000);await start(page);
  for(const [index,mode] of ['protect','delegate'].entries()) {
    if(index){await page.getByRole('button',{name:'도감 보기',exact:true}).click();await page.locator('.menu-dialog').getByRole('button',{name:'새 회차 시작',exact:true}).click();}
    const axis=route.route.split('_')[1]!;
    for(const id of ['family_accept','trust_mina',axis])await pick(page,id);
    await verifyScene(page,`v48_${axis}_gate`);await pick(page,`${route.route}_enter`);
    await verifyScene(page,route.entry);const entry=authored.find(node=>node.id===route.entry)!;
    await pick(page,entry.choices[index]!.id);await verifyScene(page,route.middle);
    await pick(page,`${route.route}_${mode}`);await verifyScene(page,route.final);
    const final=authored.find(node=>node.id===route.final)!;
    await expect(page.locator(`[data-choice="${final.choices[index]!.id}"]`)).toBeEnabled();
    await expect(page.locator(`[data-choice="${final.choices[1-index]!.id}"]`)).toBeDisabled();
    const state=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),key);
    expect(state.enteredNodeIds.filter((id:string)=>id.startsWith('v48_'))).toEqual([`v48_${axis}_gate`,route.entry,route.middle,route.final]);
    await page.reload();await verifyScene(page,route.final);
    expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),key)).toEqual(state);
    await pick(page,final.choices[index]!.id);
    expect((await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),key)).endingId).toBe(route.ending_options[index]);
    for(let guard=0;guard<18&&!await page.locator('[data-ending-phase="3"]').count();guard++)await page.getByRole('button',{name:'이어서',exact:true}).click();
    await expect(page.locator('[data-ending-phase="3"]')).toBeVisible();
    expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).discoveredEndings['demon-king'],meta)).toContain(route.ending_options[index]);
  }
});

test('v4.8 트리 검색·사건 합류·접기/펼치기·과거 경로 색과 저장 불변',async({page})=>{
  await start(page);await pick(page,'family_accept');await pick(page,'trust_mina');await pick(page,'refuse');
  await pick(page,'v48_refuse_court_enter');await pick(page,'v48_refuse_court_witness');
  await page.getByRole('button',{name:'저장 관리 · 엔딩 도감',exact:true}).click();await page.locator('[data-ending-tree-open]').click();
  const tree=page.locator('.ending-tree-dialog');const before=await page.evaluate(()=>JSON.stringify(Object.keys(localStorage).sort().map(key=>[key,localStorage.getItem(key)])));
  await expect(tree.locator('[data-tree-type="scene"]')).toHaveCount(72);
  await expect(tree.locator('[data-tree-type="step"]')).toHaveCount(195);
  await expect(tree.locator('.tree-node.is-visited')).toHaveCount(12);
  await page.getByRole('searchbox',{name:'사건·선택 검색'}).fill('판결문 이전의 사람들');await tree.getByRole('button',{name:'검색',exact:true}).click();
  await expect(tree.locator('.tree-detail')).toContainText('29세');
  await tree.getByRole('button',{name:'이 분기 접기',exact:true}).click();
  await expect(tree.locator('[data-tree-node="step:v48_refuse_court_middle:v48_refuse_court_protect:out_v48_refuse_court_protect"]')).toBeHidden();
  await expect(tree.locator('[data-tree-node="scene:v48_invoice_business_middle"]')).toBeVisible();
  await tree.getByRole('button',{name:'모두 펼치기',exact:true}).click();
  await expect(tree.locator('[data-tree-node="step:v48_refuse_court_middle:v48_refuse_court_protect:out_v48_refuse_court_protect"]')).toBeVisible();
  expect(await page.evaluate(()=>JSON.stringify(Object.keys(localStorage).sort().map(key=>[key,localStorage.getItem(key)])))).toBe(before);
  mkdirSync('docs/v4.8/screenshots',{recursive:true});await page.screenshot({path:`docs/v4.8/screenshots/${test.info().project.name}-tree.png`});
});
