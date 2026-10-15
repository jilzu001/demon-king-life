from pathlib import Path
import json
P=Path(__file__).resolve().parents[1]
gallery=json.loads((P/'content/ending_gallery_v4_4.json').read_text())['endings']
original=json.loads((P/'endings.json').read_text())['endings']
cin=json.loads((P/'ending_cinematics.json').read_text())['endings']
arts=json.loads((P/'assets/ending_art_manifest_v4_4.json').read_text())['artByEndingId']
assert len(gallery)==len(original)==len(cin)==len(arts)==20
ids=[x['id'] for x in original]
assert len(set(ids))==20
assert [x['id'] for x in gallery]==ids
assert set(cin)==set(ids)==set(arts)
for x in gallery:
    id=x['id']; art=x['artPath']
    assert art==arts[id]==cin[id]['illustration'],(id,art)
    assert art.startswith('assets/illustrations/') and art.endswith('.webp'), id
    assert '..' not in art and (P/art).is_file(), id
    assert x['description'].strip() and x['fullText'].strip() and x['title'].strip()
    assert x['fullText']==next(e['body'] for e in original if e['id']==id),id
assert sum(1 for x in gallery if x['kind']=='new')==12
assert sum(1 for x in gallery if x['kind']=='legacy')==8
print('PASS: 20 endings, 20 safe WebP paths, 20 bodies preserved, 8 old illustration tokens replaced, 12 new images unchanged')
