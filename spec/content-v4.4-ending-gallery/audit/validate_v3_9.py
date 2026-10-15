"""Validate authored v3.9 source package. Does not simulate actual browser engine."""
from pathlib import Path
import json, re
root=Path(__file__).resolve().parents[1]

def load(p):return json.loads((root/p).read_text(encoding='utf-8'))

core=load('chapters/01_complete.json')['nodes']
ext=load('content/events_v2_9.json')['events']
ends=load('endings.json')['endings']
links={n['id'] for n in core};end_ids={n['id'] for n in ends}
assert len(core)==16 and len(ext)==65 and len(links)==len(core)
assert len({e['id'] for e in ext})==len(ext)
assert sum(len(e['choices']) for e in ext)==195
assert sum(len(n['choices']) for n in core)==43
flag_values=set(load('story.json').get('initialState',{}).get('flags',[]))
for e in ext:
 assert len(e['choices'])>=2,e['id']
 assert e['body']=='\n\n'.join(e['bodyParagraphs']),e['id']
 assert e['chronicleSummary']
 for ch in e['choices']:
  assert ch['result']=='\n\n'.join(ch['resultParagraphs']),(e['id'],ch['id'])
  for effect in ch.get('effects',[]):
   if effect.get('type')=='setFlag':flag_values.add(effect['value'])
for node in core:
 assert len(node['choices'])>=2,node['id']
 assert node['body']=='\n\n'.join(node['bodyParagraphs']),node['id']
 for ch in node['choices']:
  assert ch.get('outcomes'),(node['id'],ch['id'])
  for outcome in ch['outcomes']:
   target=outcome['to'];key=target['id']
   assert (target['kind']=='node' and key in links) or (target['kind']=='ending' and key in end_ids),(node['id'],key)
   assert len(outcome.get('narrative',''))>=30,(node['id'],ch['id'])
   for effect in outcome.get('effects',[]):
    if effect.get('op')=='addToSet' and effect.get('path')=='flags':flag_values.add(effect['value'])
exam=next(n for n in core if n['id']=='exam')
assert [ch['id'] for ch in exam['choices']]==['attack_mina','stand_ground','absurd_invoice','confess']
assert exam['choices'][3]['text']=='미나에게 사랑한다고 고백한다.'
hooks=load('content/narrative_callbacks_v3_9.json')['hooks']
assert len(hooks)==24
for hook in hooks:
 assert hook['flag'] in flag_values,hook
 assert hook['targetId'] in (links if hook['targetLayer']=='core' else {e['id'] for e in ext}),hook
 assert len(hook['text'])>=40,hook
print('PASS: 16 core, 65 extensions, 43 core options, 195 extension choices, 24 callback authored specs')
print('NOTE: This is static data validation, not actual UI/engine tests')
