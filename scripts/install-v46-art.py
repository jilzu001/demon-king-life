"""시각 검수 목록에 명시한 실제 생성 파일만 최적화해 원자적으로 적용한다."""
from pathlib import Path
from PIL import Image
import json, hashlib, shutil, sys

root=Path(__file__).resolve().parents[1]
out=root/'docs/v4.6'
jobs={j['id']:j for j in json.loads((out/'art-jobs.json').read_text(encoding='utf-8'))}
attempts=[]
for name in ['art-generation-results.json','art-generation-portraits.json','art-generation-aux.json','art-generation-revisions.json','art-generation-scenes-revisions.json','art-generation-age-anchors.json','art-generation-age-anchors-more.json','art-generation-portraits-final.json','art-generation-portraits-women.json','art-generation-portraits-officials.json','art-generation-additional-scenes.json','art-generation-final-corrections.json']:
 if (out/name).exists(): attempts.extend(json.loads((out/name).read_text(encoding='utf-8')))
results={r['id']:r for r in attempts if r['status']=='generated'}
ledger_file=out/'art-installed.json'
ledger=json.loads(ledger_file.read_text(encoding='utf-8')) if ledger_file.exists() else []
assets_file=root/'public/assets/assets.json'
assets=json.loads(assets_file.read_text(encoding='utf-8'))
refresh='--refresh' in sys.argv
for id in [arg for arg in sys.argv[1:] if arg!='--refresh']:
 previous=next((row for row in ledger if row['id']==id),None)
 if previous and not refresh: continue
 if id=='approved-birth':
  source=root/'spec/content-v4.6-tree-art/assets/style_reference/APPROVED_birth_960.webp'
  target=root/'public/assets/illustrations/event_cg_v4_5/cg_birth_registry.webp'
  before=hashlib.sha256(target.read_bytes()).hexdigest()
  temp=target.with_suffix('.next.webp'); shutil.copyfile(source,temp)
 else:
  j=jobs[id]; source=Path(results[id]['source']); target=(root/'public'/j['target']).resolve()
  assert target.is_relative_to((root/'public').resolve())
  target.parent.mkdir(parents=True,exist_ok=True)
  before=hashlib.sha256(target.read_bytes()).hexdigest() if target.exists() else None
  im=Image.open(source).convert('RGB'); im.load()
  limit=(256,320) if j['group']=='legacy-portrait' else (512,640) if j['group']=='canonical' else (960,960)
  if id=='background-main': limit=(1920,1440)
  im.thumbnail(limit,Image.Resampling.LANCZOS)
  quality=68 if j['group']=='legacy-portrait' else 74
  temp=target.with_suffix('.next.webp'); im.save(temp,'WEBP',quality=quality,method=6)
  # PNG 원본은 Pages 입력 밖에 두고 OneDrive 원본 프로젝트에서 보관한다.
  originals=root/'art-source-v46'; originals.mkdir(exist_ok=True)
  shutil.copyfile(source,originals/(id+'.png'))
 check=Image.open(temp); check.load(); assert check.format=='WEBP'
 size=temp.stat().st_size
 assert size<200_000, (id,size)
 temp.replace(target)
 path=target.relative_to(root/'public').as_posix()
 row=dict(id=id,path=path,source=str(source),width=check.width,height=check.height,bytes=size,quality=quality if id!='approved-birth' else 'approved-original',sha256=hashlib.sha256(target.read_bytes()).hexdigest(),previousSha256=previous['previousSha256'] if previous else before,review='인물·장면·화풍·비율 시각 검수 통과')
 if previous: ledger[ledger.index(previous)]=row
 else: ledger.append(row)
 existing=next((asset for asset in assets['assets'] if asset['path']==path),None)
 if existing: existing.update(width=check.width,height=check.height,bytes=size)
 else: assets['assets'].append(dict(id=id,category='ending_v4_6' if id.startswith('ending_') else 'art_v4_6',label=id,path=path,width=check.width,height=check.height,bytes=size))
ledger_file.write_text(json.dumps(ledger,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
assets_file.write_text(json.dumps(assets,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
print(f'{len(ledger)} installed WebP files / {sum(r["bytes"] for r in ledger)} bytes')

import runpy
runpy.run_path(str(root/'scripts/sync-v46-art-metadata.py'))
