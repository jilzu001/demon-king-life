import { test, expect, type Page } from '@playwright/test';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import type { Story } from '../../src/engine/types';
import { narrativeLines } from '../../src/ui/narrative';

const fixture=JSON.parse(execFileSync(process.execPath,['--import','tsx','scripts/v50-ui-fixtures.ts'],{encoding:'utf8'})) as {story:Story;expected:Record<string,{fullText:string;recaps:string[]}>;legacy:string};
const story=fixture.story;
const paths = JSON.parse(readFileSync('docs/v5.0/actual-ending-paths.json','utf8')) as {endingId:string;title:string;choices:string[];nodes:string[];age:number}[];
const art = JSON.parse(readFileSync('src/content/generated/scene-art-v50.json','utf8')).rules as {nodeId:string;path:string;width:number;height:number}[];
const key='existence-sim:v1:run:demon-king:v5', metaKey='existence-sim:v1:meta:demon-king:v5';
async function raw(page:Page) { return page.evaluate(key=>localStorage.getItem(key),key); }
async function start(page:Page) {await page.goto('./');await expect(page.locator('[data-enter]')).toBeEnabled();await page.locator('[data-enter]').click();await expect(page.locator('#current-event')).toBeAttached();}
async function ready(page:Page) {
  await expect(page.locator('#current-event')).toBeAttached();
  if(await page.locator('[data-reading="true"]').count()) await page.locator('#reading-skip').click();
  await expect(page.locator('#choice-dialog')).toBeVisible();await page.clock.runFor(450);
}
async function select(page:Page,id:string) {
  await ready(page);const choice=page.locator(`[data-choice="${id}"]`);await expect(choice).toBeEnabled();await choice.click();
  await expect(page.locator('#choice-aftermath')).toBeVisible();await expect(page.locator('#current-event')).toHaveCount(0);
  await page.clock.runFor(450);await page.locator('#reading-skip').click();await expect(page.locator('#choice-aftermath')).toHaveCount(0);
}
test.beforeEach(async({page})=>{const time=new Date('2026-10-16T00:00:00Z');await page.clock.install({time});await page.clock.pauseAt(time);});

for(const path of paths) test(`v5 실제 UI 도달·중간저장·주마등·해금·상세: ${path.endingId}`,async({page})=>{
  test.setTimeout(90000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await start(page);
  for(const [i,id] of path.choices.entries()) {
    const node=story.nodes[path.nodes[i]!]!;await ready(page);
    expect(await page.locator('[data-choice] .choice-title').allTextContents()).toEqual(node.choices.map(c=>c.text));
    expect(await page.locator('[data-choice] .choice-description').allTextContents()).toEqual(node.choices.map(c=>c.description!));
    await select(page,id);const saved=JSON.parse((await raw(page))!);expect(saved.history.at(-1).choiceId).toBe(id);
    if(i===3) {await page.reload();await expect(page.locator('#current-event')).toBeAttached();expect(JSON.parse((await raw(page))!)).toEqual(saved);}
  }
  const saved=JSON.parse((await raw(page))!);expect(saved.endingId).toBe(path.endingId);expect(saved.age).toBe(path.age);
  const expected=fixture.expected[path.endingId]!;
  await expect(page.locator('[data-ending-phase="0"]')).toBeVisible();await expect(page.locator('[data-ending-phase="0"] .cinematic-text')).toHaveText(narrativeLines(story.endings[path.endingId]!.body));
  await expect(page.locator('.cinematic-scene svg, .cinematic-scene .ending-art')).toHaveCount(0);
  expect(JSON.parse((await page.evaluate(key=>localStorage.getItem(key),metaKey))!).discoveredEndings['demon-king']??[]).not.toContain(path.endingId);
  await page.getByRole('button',{name:'이어서',exact:true}).click();const memories:string[]=[];
  while(await page.locator('[data-ending-phase="1"]').count()) {
    const id=(await page.locator('[data-memory-node]').getAttribute('data-memory-node'))!;memories.push(id);expect(saved.enteredNodeIds).toContain(id);
    const image=page.locator('.cinematic-scene img');
    if(await image.count()) {await expect.poll(()=>image.evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);expect((await image.getAttribute('src'))!).toContain('/event_cg_v50/');}
    await expect(page.locator('.cinematic-scene svg')).toHaveCount(0);await page.getByRole('button',{name:'이어서',exact:true}).click();
  }
  expect(memories).toEqual(path.nodes);await expect(page.locator('[data-ending-phase="2"]')).toBeVisible();
  for(const text of expected.recaps) await expect(page.locator('.cinematic-scene')).toContainText(text);
  await page.getByRole('button',{name:'이어서',exact:true}).click();await expect(page.locator('[data-ending-phase="3"] h1')).toHaveText(path.title);
  await page.reload();await expect(page.locator('[data-ending-phase="3"]')).toBeVisible();expect(JSON.parse((await raw(page))!)).toEqual(saved);
  await page.getByRole('button',{name:'도감 보기',exact:true}).click();await expect(page.locator('.ending-gallery-list li')).toHaveCount(32);await expect(page.locator('.ending-gallery-locked')).toHaveCount(31);
  await page.locator(`[data-ending-detail="${path.endingId}"]`).click();await expect(page.locator('.ending-detail h3')).toHaveText(path.title);
  await expect(page.locator('.ending-full-text p')).toHaveText(narrativeLines(expected.fullText));
  await expect(page.locator('.ending-art-pending')).toBeVisible();await expect(page.locator('.ending-detail img, .ending-detail svg')).toHaveCount(0);
  expect(await page.locator('.menu-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await page.getByRole('button',{name:'닫기',exact:true}).click();await expect(page.locator('.ending-gallery-list li')).toHaveCount(32);
  const dir='docs/v5.0/browser';mkdirSync(dir,{recursive:true});writeFileSync(`${dir}/${test.info().project.name}-${path.endingId}.json`,JSON.stringify({endingId:path.endingId,choices:path.choices,nodes:path.nodes,age:saved.age,memories,saveRestored:true,unlockedAfterLastCard:true,endingArt:'제작 대기: 이미지 요청 없음',errors},null,2)+'\n');expect(errors).toEqual([]);
});

test('새32개 도감 잠금은 제목·본문·그림을 노출하지 않는다',async({page})=>{
  await start(page);const before=await raw(page);await page.getByRole('button',{name:'저장 관리 · 엔딩 도감',exact:true}).click();
  await expect(page.locator('.ending-gallery-list li')).toHaveCount(32);await expect(page.locator('[data-ending-detail], .ending-detail, .menu-dialog img')).toHaveCount(0);
  for(const ending of Object.values(story.endings)) expect(await page.locator('.ending-gallery').innerText()).not.toContain(ending.title);
  expect(await raw(page)).toBe(before);
});

test('저용량 WebP7개 HTTP200·바이트 일치와 실제6장면 표시·원본 비율·확대 상한',async({page,request})=>{
  test.setTimeout(90000);const files=JSON.parse(readFileSync('docs/v5.0/illustration-audit.json','utf8')).assets as {artPath?:string;path?:string;bytes:number;sha256:string}[];
  for(const file of files) {const response=await request.get(file.artPath??file.path!);expect(response.status()).toBe(200);const bytes=await response.body();expect(bytes.length).toBe(file.bytes);expect(createHash('sha256').update(bytes).digest('hex')).toBe(file.sha256);expect(bytes.length).toBeLessThan(120000);}
  const displayed=new Set<string>();await start(page);
  // 실제 경로 플레이 중 나타난 그림만 검사한다. 상태를 주입하지 않는다.
  for(const target of art) {
    if(displayed.has(target.nodeId)) continue;
    const path=paths.find(p=>p.nodes.includes(target.nodeId))!;
    await page.getByRole('button',{name:'저장 관리 · 엔딩 도감',exact:true}).click();await page.locator('.menu-dialog').getByRole('button',{name:'새 회차 시작',exact:true}).click();
    for(const id of path.choices.slice(0,path.nodes.indexOf(target.nodeId))) await select(page,id);
    await ready(page);await page.getByRole('button',{name:'잠시 내리기',exact:true}).click();const image=page.locator('#current-event .story-illustration img');
    await expect.poll(()=>image.evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);
    const bounds=await image.evaluate((img:HTMLImageElement)=>{const r=img.getBoundingClientRect();return {w:r.width,h:r.height,nw:img.naturalWidth,nh:img.naturalHeight,src:img.currentSrc};});
    if(test.info().project.use.isMobile) for(const width of [320,390,430]) {
      await page.setViewportSize({width,height:800});
      const box=await image.boundingBox();expect(box!.width).toBeLessThanOrEqual(width);
      expect(await page.locator('body').evaluate(el=>el.scrollWidth<=innerWidth)).toBe(true);
    }
    expect(bounds.src.endsWith('/'+target.path)).toBe(true);expect(bounds.w).toBeLessThanOrEqual(bounds.nw+1);expect(bounds.h).toBeLessThanOrEqual(bounds.nh+1);expect(bounds.w/bounds.h).toBeCloseTo(bounds.nw/bounds.nh,2);displayed.add(target.nodeId);
  }
  expect(displayed.size).toBe(6);mkdirSync('docs/v5.0/screenshots',{recursive:true});await page.screenshot({path:`docs/v5.0/screenshots/art-${test.info().project.name}.png`});
});

test('자동 한문단·클릭·선택후 서술·한줄 연대기·페이지·글자/밝기·타이틀을 유지한다',async({page})=>{
  await start(page);await expect(page.locator('#current-event .story-paragraph:visible')).toHaveCount(1);await expect(page.locator('#choice-dialog')).not.toBeVisible();
  const count=await page.locator('#current-event .story-paragraph:visible').count();await page.clock.runFor(30000);expect(await page.locator('#current-event .story-paragraph:visible').count()).toBeGreaterThan(count);
  await page.locator('#current-event').click();await ready(page);await page.getByRole('button',{name:'잠시 내리기',exact:true}).click();
  const before=await raw(page);await page.getByRole('button',{name:'저장 관리 · 엔딩 도감',exact:true}).click();await page.locator('#text-size').fill('150');
  await page.locator('#text-brightness').fill('20');await page.getByRole('button',{name:'닫기',exact:true}).click();
  await page.locator('#reading-mode').click();await expect(page.locator('.page-window')).toBeVisible();expect(await raw(page)).toBe(before);
  await page.locator('#reading-skip').click();if(!await page.locator('#choice-dialog').isVisible()) await page.locator('.choice-launch').click();
  await page.locator('[data-choice="birth_appeal"]').click();await expect(page.locator('#choice-aftermath')).toBeVisible();await expect(page.locator('#current-event')).toHaveCount(0);await page.clock.runFor(450);await page.locator('#reading-skip').click();
  await expect(page.locator('#current-event')).toBeAttached();await expect(page.locator('.timeline-text')).toHaveCount(1);await expect(page.locator('.timeline-text')).toHaveCSS('white-space','nowrap');
  await page.getByRole('button',{name:'저장 관리 · 엔딩 도감',exact:true}).click();const saved=await raw(page);await page.getByRole('button',{name:'타이틀로 가기',exact:true}).click();await expect(page.locator('[data-enter]')).toBeVisible();expect(await raw(page)).toBe(saved);
  await page.locator('[data-enter]').click();await expect(page.locator('#current-event')).toBeAttached();expect(await raw(page)).toBe(saved);
  await page.reload();await expect(page.locator('.page-window')).toBeVisible();expect(await page.evaluate(()=>localStorage.getItem('demon-king:ui:text-percent'))).toBe('150');
  await page.screenshot({path:`docs/v5.0/screenshots/controls-${test.info().project.name}.png`});
});

test('구판 저장은 자동 삭제/변환하지 않고 내보낼 수 있으며 새 저장 JSON은 가져온다',async({page})=>{
  const legacy=fixture.legacy;
  const oldKey='existence-sim:v1:run:demon-king:compact',oldMeta='existence-sim:v1:meta:demon-king:compact';
  await page.addInitScript(({oldKey,oldMeta,legacy})=>{if(!localStorage.getItem(oldKey)){localStorage.setItem(oldKey,legacy);localStorage.setItem('existence-sim:v1:backup:before-import:demon-king:compact','older-protected-backup');localStorage.setItem(oldMeta,JSON.stringify({saveSchemaVersion:1,discoveredEndings:{'demon-king':['ending_peace']}}));}},{oldKey,oldMeta,legacy});
  await start(page);await select(page,'birth_appeal');const newSave=(await raw(page))!;
  await page.getByRole('button',{name:'저장 관리 · 엔딩 도감',exact:true}).click();
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'업데이트 전 회차 JSON 내보내기',exact:true}).click();const file=await download;const stream=await file.createReadStream();const chunks:Buffer[]=[];for await(const chunk of stream!)chunks.push(chunk);expect(Buffer.concat(chunks).toString('utf8')).toBe(legacy);
  await page.locator('#save-file').setInputFiles({name:'old.json',mimeType:'application/json',buffer:Buffer.from(legacy)});await expect(page.getByText('이 저장은 이전 판의 기록입니다.',{exact:false})).toBeVisible();expect(await raw(page)).toBe(newSave);
  await page.getByRole('button',{name:'저장 관리 · 엔딩 도감',exact:true}).click();await page.locator('#save-file').setInputFiles({name:'new.json',mimeType:'application/json',buffer:Buffer.from(newSave)});await expect(page.locator('#current-event')).toBeAttached();expect(await raw(page)).toBe(newSave);
  expect(await page.evaluate(()=>localStorage.getItem('existence-sim:v1:backup:before-import:demon-king:compact'))).toBe('older-protected-backup');
  expect(await page.evaluate(key=>localStorage.getItem(key),oldKey)).toBe(legacy);expect(JSON.parse((await page.evaluate(key=>localStorage.getItem(key),oldMeta))!).discoveredEndings['demon-king']).toEqual(['ending_peace']);
});
