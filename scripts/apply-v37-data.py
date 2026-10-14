"""제공된 고백 분기만 추가한다. 기존 선택과 원본 ZIP은 변경하지 않는다."""
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
target = root / 'public/stories/demon-king-compact'
source = root / 'spec/content-v3.6.1-confession-audit'
def read(path):
    return json.loads(path.read_text(encoding='utf-8'))
def write(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

chapter = read(target / 'chapters/01_complete.json')
incoming = read(source / 'chapters/01_complete.json')
assert len(chapter['nodes']) == 13
exam = next(n for n in chapter['nodes'] if n['id'] == 'exam')
confess = next(c for n in incoming['nodes'] if n['id'] == 'exam' for c in n['choices'] if c['id'] == 'confess')
confess['text'] = '미나에게 사랑한다고 고백한다.'
exam['choices'].append(confess)
chapter['nodes'].extend(n for n in incoming['nodes'] if n['id'] in ['confession', 'confession_afterm', 'confession_chaos'])
write(target / 'chapters/01_complete.json', chapter)
manifest = read(target / 'story.json')
manifest['version'] = '2.3.0-compact'
write(target / 'story.json', manifest)
endings = read(target / 'endings.json')
love = next(e for e in read(source / 'endings.json')['endings'] if e['id'] == 'ending_love_scandal')
endings['endings'].append(love)
write(target / 'endings.json', endings)
cinematic = read(target / 'ending_cinematics.json')
# 작가의 기존 결말 문장만 나누며 새 서사를 만들지 않는다.
sentences = love['body'].rsplit(' 당신은 그날', 1)
assert len(sentences) == 2
cinematic['endings'][love['id']] = dict(finalScene=sentences[0], reflection='당신은 그날' + sentences[1], illustration='book')
write(target / 'ending_cinematics.json', cinematic)
flashbacks = source / 'assets/illustrations/flashbacks'
destination = root / 'public/assets/illustrations/flashbacks'
destination.mkdir(parents=True, exist_ok=True)
for asset in flashbacks.glob('*.webp'):
    (destination / asset.name).write_bytes(asset.read_bytes())
