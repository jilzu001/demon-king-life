"""작가 문안에서 확정한 대사의 정확한 문단만 연결한다. 추측/기본 화자 없음."""
import json
from pathlib import Path
root = Path(__file__).resolve().parents[1]
nodes = json.loads((root / 'public/stories/demon-king-compact/chapters/01_complete.json').read_text(encoding='utf-8'))['nodes']
approved = {
    'child': {'mina': [1, 3, 5, 7, 9, 12, 14, 16, 18]},
    'exam': {'mina': [8, 17]}, 'prison': {'mina': [6]},
    'princess': {'erisia': [1, 3, 6, 8, 10, 13, 15, 17]},
    'audit': {'auditor': [1, 4, 6, 8, 11, 13], 'mina': [15], 'erisia': [17]},
    'hearing': {'mina': [13]}, 'final_trial': {'mina': [5, 7], 'erisia': [10]},
    'confession': {'mina': [3, 5, 12, 14]},
    'confession_afterm': {'mina': [1, 3, 9, 11, 14, 17, 23]},
    'confession_chaos': {'mina': [6, 8, 17]},
}
result = {}
for node in nodes:
    lines = node['body'].split('\n\n')
    result[node['id']] = [{'index': i, 'text': lines[i], 'speaker': actor} for actor, indices in approved.get(node['id'], {}).items() for i in indices]
(root / 'src/ui/compact-speakers.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
