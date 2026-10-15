#!/usr/bin/env python3
"""Verify annual writing package structure only. Not a runtime play test."""
import json,sys,subprocess,collections
from pathlib import Path
r=Path(__file__).resolve().parents[1]
read=lambda path:json.loads((r/path).read_text(encoding='utf-8'))
a=read('content/annual_life_events_v4_1.json')['events'];cb=read('content/annual_memory_callbacks_v4_1.json')['hooks']
core=read('chapters/01_complete.json')['nodes'];ext=read('content/events_v2_9.json')['events']
errors=[]
def check(x,msg):
 if not x:errors.append(msg)
check(len(a)==65,'annual count');check([e['age'] for e in a]==list(range(1,66)),'age continuity')
check(len({x['id'] for x in a}|{x['id'] for x in core}|{x['id'] for x in ext})==len(a)+len(core)+len(ext),'event ID duplicates')
flags=set();option_cnt=0
for ev in a:
 age=ev['age'];check(ev['ageRange']==[age,age],'range '+ev['id']);check(ev['id']==f'annual_{age:02d}','id age '+ev['id'])
 check(ev['bodyParagraphs']==ev['body'].split('\n\n'),'bad paragraphs '+ev['id']);check(len(ev['body'])>70,'too short '+ev['id'])
 check(len(ev['chronicleSummary'])<100,'too long chronicle '+ev['id'])
 check(len(ev['choices'])>=2,'too few choices '+ev['id']);option_cnt+=len(ev['choices'])
 check(len({ch['text'] for ch in ev['choices']})==len(ev['choices']),'duplicate choice text '+ev['id'])
 check(len({ch['result'] for ch in ev['choices']})==len(ev['choices']),'duplicate results '+ev['id'])
 for c in ev['choices']:
  check(c['resultParagraphs']==c['result'].split('\n\n'),'bad result paras '+c['id']);check(len(c['result'])>40,'short result '+c['id'])
  check(c['effects']==[{'type':'setFlag','value':c['id']}],'bad effect '+c['id']);flags.add(c['id'])
 check(ev['selectionPolicy']=='fallback_only_when_age_has_no_higher_priority_story','wrong policy '+ev['id'])
pool=read('content/annual_generic_pool_v4_1.json')['events']
check(len(pool)==12,'pool count');check(len({x['id'] for x in pool})==len(pool),'pool id dup')
for x in pool:
 check(len(x['choices'])>=2,'pool few choices '+x['id'])
 check(x['bodyParagraphs']==x['body'].split('\n\n'),'pool paragraph mismatch '+x['id'])
 check(x['ageRange'][0]<x['ageRange'][1],'pool range '+x['id'])
 check(x['selectionPolicy']=='replace_generic_annual_only','wrong pool policy '+x['id'])
 for c in x['choices']:
  check(c['resultParagraphs']==c['result'].split('\n\n'),'pool result para mismatch '+c['id'])
check(len(cb)==26,'callback count');check(len({c['id'] for c in cb})==len(cb),'callback ID duplicates')
valid_targets={c['id'] for c in core}
for hook in cb:
 check(hook['flag'] in flags,'callback flag missing '+hook['id'])
 check(hook['sourceId'] in {x['id'] for x in a},'callback source missing '+hook['id'])
 check(hook['targetLayer']=='core' and hook['targetId'] in valid_targets,'callback target missing '+hook['id'])
 source_age=next(x['age'] for x in a if x['id']==hook['sourceId'])
 target_age=next(x['age'] for x in core if x['id']==hook['targetId'])
 check(source_age<target_age,'callback temporal regression '+hook['id'])
check(all(x['age'] in range(1,66) for x in a),'invalid age')
# Validate a pure interstitial age resolver: no skips, no repetition, no post-ending ages.
def bridge(current,target):return list(range(current+1,target))
for left,right in ((0,12),(12,20),(20,21),(21,29),(29,41),(41,47),(47,60),(47,62),(47,65)):
 missing=bridge(left,right)
 check(missing==list(range(left+1,right)),'bad bridge')
 check(all(i in [e['age'] for e in a] for i in missing),'bridge age missing')
for end in (20,21,47,60,62,65):check(not bridge(end,end),'same age inserted filler')
base=subprocess.run([sys.executable,str(r/'audit/validate_v4_0.py')],cwd=r,capture_output=True,text=True)
check(base.returncode==0,'v4.0 regression failed '+base.stdout[-1000:]+base.stderr[-1000:])
print(json.dumps({'status':'PASS' if not errors else 'FAIL','old_core':len(core),'old_extensions':len(ext),'annual':len(a),'covered_ages':[a[0]['age'],a[-1]['age']], 'annual_choices':option_cnt,'annual_callbacks':len(cb),'generic_pool':len(pool),'dedicated':sum(x['category']=='dedicated' for x in a),'generic':sum(x['category']=='generic' for x in a),'v4_0_regression':'PASS' if base.returncode==0 else 'FAIL','errors':errors},ensure_ascii=False,indent=2))
sys.exit(bool(errors))
