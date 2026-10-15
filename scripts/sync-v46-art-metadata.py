"""검수/설치된 실제 WebP를 기준으로 공개 매핑과 빌드용 메타를 함께 갱신한다."""
from pathlib import Path
import json,hashlib
root=Path(__file__).resolve().parents[1]
out=root/'src/content/generated'; out.mkdir(parents=True,exist_ok=True)
read=lambda p: json.loads(p.read_text(encoding='utf-8'))
write=lambda p,x: p.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
rows=read(root/'docs/v4.6/art-installed.json')
for row in rows:
 p=(root/'public'/row['path']).resolve()
 assert p.is_relative_to((root/'public').resolve()) and p.exists()
 assert hashlib.sha256(p.read_bytes()).hexdigest()==row['sha256']
public_art=root/'public/assets/ending_art_manifest_v4_4.json'
art=read(public_art)
for row in rows:
 if row['id'].startswith('ending_'): art['artByEndingId'][row['id']]=row['path']
write(public_art,art); write(out/'ending-art-v46.json',art)
public_cg=root/'public/assets/scene_art_manifest_v4_5.json'
cg=read(public_cg)
for rule in cg['rules']:
 row=next((r for r in rows if r['path']==rule['artPath']),None)
 if row:
  for key in ['width','height','bytes']: rule[key]=row[key]
write(public_cg,cg); write(out/'scene-art-v45-current.json',cg)
write(out/'art-assets-v46.json',{'assets':[{k:r[k] for k in ['id','path','width','height','bytes']} for r in rows]})
jobs={j['id']:j for j in read(root/'docs/v4.6/art-jobs.json')}
scene_ids={'child','exam','petition','prison','invoice','princess','audit','settlement','confession','confession_afterm','confession_chaos'}
labels={'confession':'고백을 꺼내는 주인공과 답을 망설이는 미나','confession_afterm':'사과 뒤 각자의 길로 걷는 주인공과 미나','confession_chaos':'황당한 고백에 당황한 미나와 중년 시험관','child':'열두 살 미나와 주인공이 나무칼로 연습하는 장면','exam':'용사 시험장에서 마주한 미나와 주인공','exam_attack':'미나에게 막힌 공격 시도','exam_confession':'고백을 꺼낸 주인공과 답을 망설이는 미나','petition':'탄원서를 검토하는 주인공과 담당자','prison':'수감 중인 주인공','invoice':'청구 서류를 내미는 주인공','princess':'주인공과 협상하는 에리시아 왕녀','audit':'장부를 함께 검토하는 주인공과 세렌 감사관','settlement':'아직 수락하지 않은 합의 제안'}
events=[]
for row in rows:
 job=jobs.get(row['id'],{})
 if job.get('group')!='event': continue
 node=job.get('nodeId')
 rule={key:row[key] for key in ['id','path','width','height']}
 rule.update(nodeId=node,age=job['age'],label=labels.get(node,node))
 if node in scene_ids: events.append(rule)
 elif node in ['exam_attack','exam_confession']:
  rule.update(nodeId='exam',choiceId='attack' if node=='exam_attack' else 'confess',outcomeId='out_attack' if node=='exam_attack' else 'out_confess'); events.append(rule)
write(out/'event-art-v46.json',{'rules':events})
index_path=root/'public/assets/assets.json'
index=read(index_path)
index['style']='v4.6 따뜻하고 자연스러운 회화풍 판타지 애니; 기존 보관 자산 유지'
index['source']='v4.6 독립 생성 원화와 승인 출생 원화; 구 자산은 경로 보호를 위해 보관'
for row in rows:
 entry=next((item for item in index['assets'] if item['path']==row['path']),None)
 if entry is None:
  entry=dict(id=row['id'],category='art_v4_6',label=row['id'],path=row['path']); index['assets'].append(entry)
 entry.update({key:row[key] for key in ['width','height','bytes']})
write(index_path,index)
print('Installed artwork metadata and official public maps synchronized')
