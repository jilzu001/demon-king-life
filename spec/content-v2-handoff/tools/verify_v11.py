#!/usr/bin/env python3
"""v1.1 display-field validation; use together with verify_content.py"""
import json, pathlib, sys, collections
from jsonschema import Draft202012Validator
root=pathlib.Path(__file__).resolve().parents[1]
def obj(x):return json.loads((root/x).read_text(encoding='utf-8'))
manifest=obj('story.json');present=obj('presentation.json')
schema=obj('validation_schemas/presentation.schema.json')
errs=list(Draft202012Validator(schema).iter_errors(present))
assert not errs,errs[:2]
nodes=[n for file in manifest['chapters'] for n in obj(file)['nodes']]
ids={n['id'] for n in nodes}
assert len(ids)==len(nodes)==98
assert set(present['nodes'])==ids
assert present['storyId']==manifest['id']
assert present['storyVersion']==manifest['version']
keys=[(n['id'],c['id']) for n in nodes for c in n['choices']]
assert len(keys)==340 and len(set(keys))==340
assert all(c.get('description','').strip() for n in nodes for c in n['choices'])
assert len([d for d in present['nodes'].values() if d.get('dialogues')])==29
assert sum(len(d.get('dialogues',[])) for d in present['nodes'].values())==116
assert all(d['chronicleSummary'].strip() for d in present['nodes'].values())
assert all(not n.get('dialogues') and not n.get('chronicleSummary') for n in nodes), 'UI metadata must stay separate'
assert sum(len(c['outcomes']) for n in nodes for c in n['choices'])==363
assert len(obj('endings.json')['endings'])==34
print('v1.1 UI content validated: 98 summaries, 340 descriptions, 29 dialogue scenes / 116 lines; 363 outcomes; 34 endings.')
