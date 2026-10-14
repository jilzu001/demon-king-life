#!/usr/bin/env python3
"""Content-only QA: schema, static graph and deterministic seeded paths.
This is not a replacement for the engine's exhaustive reachable-state verifier.
"""
import json, random, sys, collections
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SCHEMAS=ROOT/'validation_schemas'

def load(rel):return json.loads((ROOT/rel).read_text(encoding='utf-8'))
manifest=load('story.json');characters=load('characters.json');endings=load('endings.json')
chapters=[(s,load(s)) for s in manifest['chapters']]
nodes={n['id']:n for _,doc in chapters for n in doc['nodes']}
endids={e['id'] for e in endings['endings']}

def get(st,path):
 cur=st
 for part in path.split('.'): cur=cur[part]
 return cur

def condition(c,st):
 if 'all' in c:return all(condition(x,st) for x in c['all'])
 if 'any' in c:return any(condition(x,st) for x in c['any'])
 if 'not' in c:return not condition(c['not'],st)
 a=get(st,c['path']);b=c['value']
 return {'eq':lambda:a==b,'neq':lambda:a!=b,'gt':lambda:a>b,
  'gte':lambda:a>=b,'lt':lambda:a<b,'lte':lambda:a<=b,
  'contains':lambda:b in a}[c['op']]()

def effect(st,e):
 obj=st;parts=e['path'].split('.')
 for part in parts[:-1]:obj=obj[part]
 key=parts[-1];prev=obj.get(key,0) if e['path'].startswith('inventory.') else obj[key]
 if e['op']=='set':new=e['value']
 elif e['op']=='add':new=prev+e['value']
 elif e['op']=='addToSet':new=list(dict.fromkeys(prev+[e['value']]))
 elif e['op']=='removeFromSet':new=[x for x in prev if x!=e['value']]
 else:raise ValueError(e)
 obj[key]=new

def assert_valid_state(st):
 assert st['player']['combat']>=0 and st['player']['magic']>=0 and st['player']['gold']>=0
 for who,n in st['npcs'].items():
  assert n['combat']>=0 and -100<=n['trust']<=100 and -100<=n['affection']<=100,(who,n)
 for key,amount in st['inventory'].items(): assert amount>=0
 assert len(st['flags'])==len(set(st['flags']))
 assert len(st['player']['crimes'])==len(set(st['player']['crimes']))

def validate_static():
 from jsonschema import Draft202012Validator
 mappings=[('story.json','story.schema.json'),('characters.json','characters.schema.json'),('endings.json','endings.schema.json')]+[(p,'chapter.schema.json') for p,_ in chapters]
 count=0
 for src,schema in mappings:
  errors=list(Draft202012Validator(json.loads((SCHEMAS/schema).read_text())).iter_errors(load(src)))
  if errors:raise AssertionError(f'{src}: {errors[0].json_path}: {errors[0].message}')
  count+=1
 assert len(nodes)==sum(len(doc['nodes']) for _,doc in chapters),'duplicated scene ID'
 assert len(endids)==len(endings['endings']),'duplicated ending ID'
 assert manifest['entryNodeId'] in nodes
 succ=collections.defaultdict(set); targeted_endings=set()
 for n in nodes.values():
  if 'chronicle' in n:
   for x in n['chronicle']:assert x['age']<=n['age']
  assert len({c['id'] for c in n['choices']})==len(n['choices']),n['id']
  for c in n['choices']:
   assert len({x['id'] for x in c['outcomes']})==len(c['outcomes']), (n['id'],c['id'])
   for o in c['outcomes']:
    tgt=o['to']['id']
    if o['to']['kind']=='node':
     assert tgt in nodes,(n['id'],tgt)
     assert nodes[tgt]['age']>=n['age'],(n['id'],tgt)
     succ[n['id']].add(tgt)
    else:
     assert tgt in endids,(n['id'],tgt)
     targeted_endings.add(tgt)
 colors={};order=[]
 def dfs(v):
  if colors.get(v)==1:raise AssertionError('cycle '+v)
  if colors.get(v)==2:return
  colors[v]=1
  for x in succ[v]:dfs(x)
  colors[v]=2;order.append(v)
 dfs(manifest['entryNodeId'])
 assert len(colors)==len(nodes),(len(colors),len(nodes),'unreachable nodes')
 # DAG + all nodes have choices going toward some ending; all endings targeted from reachable graph.
 assert targeted_endings==endids,('unreachable ending target',endids-targeted_endings)
 can_end=set()
 for v in order:
  n=nodes[v]
  if any(o['to']['kind']=='ending' for c in n['choices'] for o in c['outcomes']) or any(u in can_end for u in succ[v]):can_end.add(v)
 assert len(can_end)==len(nodes),('dead ends',set(nodes)-can_end)
 return count

def play(seed,strategy='random'):
 st=json.loads(json.dumps(manifest['initialState'],ensure_ascii=False))
 rng=random.Random(seed);node=nodes[manifest['entryNodeId']];state_trace=[]
 while True:
  assert len(state_trace)<35,(seed,'very long run')
  available=[c for c in node['choices'] if 'enabledWhen' not in c or condition(c['enabledWhen'],st)]
  assert available,(seed,node['id'],'no enabled choices')
  if strategy=='first': c=available[0]
  elif strategy=='last':c=available[-1]
  else:c=rng.choice(available)
  allowed=[o for o in c['outcomes'] if 'when' not in o or condition(o['when'],st)]
  assert allowed,(seed,node['id'],c['id'],'no eligible outcome')
  outcome=rng.choices(allowed,weights=[o['weight'] for o in allowed])[0]
  for e in outcome.get('effects',[]):effect(st,e)
  assert_valid_state(st)
  state_trace.append((node['id'],c['id'],outcome['id']))
  target=outcome['to']['id']
  if outcome['to']['kind']=='ending':
   if target=='end_blade':assert st['player']['alive'] is False
   return target,state_trace,st
  nextnode=nodes[target];assert nextnode['age']>=node['age']
  st['age']=nextnode['age']
  for e in nextnode.get('entryEffects',[]):effect(st,e)
  assert_valid_state(st)
  node=nextnode

if __name__=='__main__':
 try:
  schema_count=validate_static()
  counts=collections.Counter();cover_nodes=set();cover_edges=set();cover_ends=set()
  sample_count=30000
  for i in range(sample_count):
   kind,trace,st=play(i,['random','random','random','first','last'][i%5])
   counts[kind]+=1;cover_ends.add(kind)
   cover_nodes.update(n for n,_,_ in trace)
   cover_edges.update((n,c,o) for n,c,o in trace)
  target_edges=sum(len(c['outcomes']) for n in nodes.values() for c in n['choices'])
  msg=(f'Schema files validated: {schema_count}\nScenes: {len(nodes)}\nChoices: {sum(len(n["choices"]) for n in nodes.values())}\n'
       f'Outcomes: {target_edges}\nEndings: {len(endids)}\n'
       f'Structural graph: all nodes referenced and reachable; no cycles; all scenes can reach ending\n'
       f'Seeded runs: {sample_count}, all reached ending without state invariant violation\n'
       f'Coverage by sampling: scenes {len(cover_nodes)}/{len(nodes)}, ending IDs {len(cover_ends)}/{len(endids)}, concrete outcomes {len(cover_edges)}/{target_edges}\n'
       'Limitation: sampling is NOT exhaustive over every reachable state. The engine must run its exhaustive state verifier before release.\n')
  print(msg)
  (ROOT/'VERIFICATION_REPORT.md').write_text('# 콘텐츠 데이터 검증 결과\n\n```text\n'+msg+'```\n',encoding='utf-8')
 except Exception as e:
  print('FAILED',repr(e));raise
