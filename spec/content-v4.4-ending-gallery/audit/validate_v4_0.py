#!/usr/bin/env python3
"""Content integrity checks only, not a runtime or subjective prose-quality test."""
import json,collections,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1]
def load(f):return json.loads((root/f).read_text(encoding='utf-8'))
core=load('chapters/01_complete.json')['nodes'];ev=load('content/events_v2_9.json')['events'];ending=load('endings.json')['endings'];cin=load('ending_cinematics.json');hooks=load('content/narrative_callbacks_v3_9.json')['hooks']
err=[]
def ck(v,s):
 if not v:err.append(s)
ids={n['id'] for n in core};eids={e['id'] for e in ev};ends={x['id'] for x in ending};flags={*load('story.json')['initialState']['flags']}
coreflags=set(flags);extflags=set()
ck(len(core)==16,'core count not 16');ck(len(ev)==65,'extension count not 65');ck(len(ending)==8,'ending count not 8')
for n in core:
 ck(len(n.get('choices',[]))>=2,'too few core choices: '+n['id'])
 if 'bodyParagraphs' in n:ck(n['bodyParagraphs']==n['body'].split('\n\n'),'bad core paragraphs '+n['id'])
 for c in n.get('choices',[]):
  ck(bool(c.get('outcomes')),'missing outcome '+n['id']+'/'+c['id'])
  for o in c['outcomes']:
   dest=o['to'];ck(dest['id'] in (ids if dest['kind']=='node' else ends),f"missing destination {n['id']} {dest}")
   if dest['kind']=='node':ck(next(x for x in core if x['id']==dest['id'])['age']>=n['age'],f"age regression {n['id']}=>{dest['id']}")
   for eff in o.get('effects',[]):
    if eff.get('op')=='addToSet' and eff.get('path')=='flags':coreflags.add(eff['value'])
   if 'narrativeParagraphs' in o:ck(o['narrativeParagraphs']==o['narrative'].split('\n\n'),'bad core result para '+n['id'])
for e in ev:
 ck(len(e.get('body',''))>=400,'short extension body '+e['id'])
 ck(len(e.get('choices',[]))>=2,'too few ext choices '+e['id'])
 ck(e['bodyParagraphs']==e['body'].split('\n\n'),'bad ext paragraphs '+e['id'])
 ck(len({c['id'] for c in e['choices']})==len(e['choices']),'duplicate ext choice ids '+e['id'])
 ck(len({c['result'] for c in e['choices']})==len(e['choices']),'duplicate ext results '+e['id'])
 for c in e['choices']:
  ck(len(c.get('result',''))>=80,'short ext result '+e['id']+'/'+c['id'])
  ck(c['resultParagraphs']==c['result'].split('\n\n'),'bad ext result paragraphs '+e['id']+'/'+c['id'])
  for ef in c.get('effects',[]):
   if ef.get('type')=='setFlag':extflags.add(ef['value'])
for x in ending:
 ck(len(x['body'])>=400,'short ending '+x['id'])
 ck(x['id'] in cin['endings'],'missing cinematic '+x['id'])
 for r in x.get('recapRules',[]):
  when=r['when'];ck(when.get('value') in coreflags|extflags,'ending recap undeclared flag '+str(when))
for h in hooks:
 ck(h['targetId'] in (ids if h['targetLayer']=='core' else eids),'missing hook target '+str(h))
 ck(h['flag'] in coreflags|extflags,'missing hook flag '+str(h))
 ck(bool(h['text'].strip()),'empty hook '+str(h))
ck(len({(h['targetLayer'],h['targetId'],h['flag']) for h in hooks})==len(hooks),'duplicate callback')
# All current extension condition expressions use operators known in content; verify refs.
def walk(obj,ctx):
 if isinstance(obj,dict):
  if 'hasFlag' in obj: ck(obj['hasFlag'] in coreflags|extflags,'condition flag not set '+ctx+'/'+obj['hasFlag'])
  if 'metaHasEnding' in obj:ck(obj['metaHasEnding'] in ends,'invalid ending gate '+ctx+'/'+obj['metaHasEnding'])
  for v in obj.values():walk(v,ctx)
 elif isinstance(obj,list):
  for v in obj:walk(v,ctx)
for e in ev:walk(e['conditions'],e['id'])
assert next(e for e in ev if e['id']=='bread_union')['conditions']=={'all':[{'hasFlag':'bakery_opened'}]}
for id in ['prison_library','prison_cellmate','prison_meal']:
 assert next(e for e in ev if e['id']==id)['conditions']=={'all':[{'hasFlag':'attacked_mina'}]}
ck(any(c['id']=='confess' and '사랑한다고 고백' in c['text'] for n in core if n['id']=='exam' for c in n['choices']),'missing confession')
ck(load('story.json')['entryNodeId'] in ids,'invalid entry node')
print(json.dumps({'status':'PASS' if not err else 'FAIL','core':len(core),'extension':len(ev),'endings':len(ending),'extension_choices':sum(len(e['choices']) for e in ev),'core_choices':sum(len(n['choices']) for n in core),'callbacks':len(hooks),'min_extension_body_chars':min(len(e['body']) for e in ev),'min_ending_body_chars':min(len(e['body']) for e in ending),'errors':err},ensure_ascii=False,indent=2))
sys.exit(bool(err))
