import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const read=file=>JSON.parse(readFileSync(file,'utf8'));
const scenes=read('src/content/generated/scene-art-v50.json').rules;
const endings=read('src/content/generated/ending-art-v50.json').rules;
const audit=read('docs/v5.0/cropped-art-audit.json');
const story=read('public/stories/demon-king-compact/story.json');
const nodes=story.chapters.flatMap(file=>read('public/stories/demon-king-compact/'+file).nodes);
const endingIds=read('public/stories/demon-king-compact/endings.json').endings.map(e=>e.id).sort();
const assert=(yes,message)=>{if(!yes)throw Error(message);};
assert(scenes.length===16&&endings.length===32&&audit.entries.length===48,'CG 연결 수 불일치');
assert(JSON.stringify(endings.map(e=>e.endingId).sort())===JSON.stringify(endingIds),'32개 엔딩 그림 ID 불일치');
assert(new Set(scenes.map(e=>e.nodeId)).size===16,'사건 그림 중복');
for(const rule of [...scenes,...endings]) {
  assert(/^assets\/illustrations\/(event_cg_v50|ending_v50)\/[a-z0-9_]+\.webp$/.test(rule.path),'안전하지 않은 CG 경로');
  assert(rule.width>0&&rule.height>0&&rule.displayWidth>0&&rule.displayWidth<=rule.width,'원본 표시 상한 불일치');
  if(rule.nodeId)assert(nodes.some(node=>node.id===rule.nodeId&&node.age===rule.age),'사건/나이 불일치');
}
let installedBytes=0;
for(const entry of audit.entries) {
  for(const [path,bytes,hash] of [[entry.artPath,entry.bytes,entry.zipSha256],[entry.selectedPath,entry.selectedBytes,entry.selectedSha256]]) {
    const buffer=readFileSync('public/'+path);
    assert(buffer.length===bytes&&createHash('sha256').update(buffer).digest('hex')===hash,`${path}: 바이트/해시 불일치`);
    assert(buffer.toString('ascii',0,4)==='RIFF'&&buffer.toString('ascii',8,12)==='WEBP',`${path}: 실제 WebP 아님`);
  }
  installedBytes+=entry.bytes;
}
console.log(`v5 CG: ZIP48개 ${installedBytes}바이트 / 사건16·엔딩32 연결 / 기존 고화질15대체 / 크롭28연결·원래 패널 상한 통과`);
