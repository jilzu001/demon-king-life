"""현재 파일을 먼저 기록하고 승인 기준에 맞는 독립 원화 작업 목록을 만든다."""
from pathlib import Path
from PIL import Image
import csv, hashlib, json, re

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'spec/content-v4.6-tree-art'
OUT = ROOT / 'docs/v4.6'
OUT.mkdir(parents=True, exist_ok=True)
if (OUT/'art-inventory.csv').exists() and (OUT/'art-jobs.json').exists():
 print('Existing baseline inventory and reviewed prompts preserved; no regeneration.')
 raise SystemExit(0)
STYLE = 'Use the reference ONLY for painting style, not its subjects. Warm natural light, delicate cocoa linework, subtle watercolor and painterly anime cel shading, cream and navy accents, medieval fantasy. One independently painted coherent picture, no cut-and-paste, no collage, no panels, no UI, no letters or watermark. No extra unrelated characters. '
ACTORS = {
 'player': 'human man with tousled dark black-brown hair, brown eyes, ordinary build, black robe with restrained dark red accents, no magical power or aura',
 'mina': 'human woman knight with LONG silver hair past her shoulders, BLUE eyes, blue and silver practical armor, never red or short hair',
 'erisia': 'human princess with long golden blonde wavy hair, amber eyes, refined crimson and cream royal dress, distinct from silver-haired Mina',
 'king': 'human male king, silver-gray hair and beard, gold crown, purple and navy royal clothes, authoritative lined face',
 'auditor': 'human woman civil auditor, short very dark green-black hair, round glasses, dark green and cream administrative clothes, no crown or armor',
 'seria': 'human woman scholar, chestnut brown braided hair, brown eyes, round spectacles, modest navy and cream scholarly clothing',
 'rina': 'human woman, bright red hair in long twin braids, green eyes, confident adventurous burgundy outfit, NOT Mina or Leon',
 'kyle': 'human man, neatly tousled dark brown hair, brown eyes, navy officer coat with gold trim, distinctive calm narrow face',
 'jero': 'human man, short cropped black hair, dark eyes, clean-cut serious face, black and blue officer coat',
 'yuri': 'adult fantasy woman, brown hair with brown cat ears, brown eyes, cream and burgundy clothes, cheerful face',
 'rao': 'human man, short golden blond hair, blue eyes, open-collar dark vest, friendly face',
 'dark_nun': 'adult human woman, very pale lavender-silver hair, red eyes, dark hood and restrained silver religious jewelry, serious face, NOT Mina',
 'mother': 'young adult human mother, brown hair tied back, brown eyes, modest green and cream peasant dress, NOT silver-haired Mina',
 'father': 'young adult human father, short untidy brown hair, cream peasant shirt and worn brown vest, NOT the black-robed protagonist',
 'registrar': 'young adult human male birth registrar, short light brown hair, round glasses, navy administrative robe with gold motifs',
}
canonical = {'protagonist':'player','mina':'mina','elysia':'erisia','king':'king','seria':'seria','rina':'rina','kyle':'kyle','jero':'jero','yuri':'yuri','rao':'rao','dark_nun':'dark_nun'}
jobs = []
def add(id, target, prompt, group, **more):
 jobs.append(dict(id=id,target=target,prompt=STYLE+prompt,group=group,**more))
for asset,actor in canonical.items():
 age = 'a distinguished older adult' if actor == 'king' else 'a young adult around 20 to 30'
 add('canonical-'+asset, f'assets/illustrations/characters/{asset}.webp', f'Portrait: {ACTORS[actor]}, {age}. Neutral expression. Single person, complete head, shoulders and chest, softly blurred medieval interior, vertical 4:5. Preserve the identity and hair/eye colors from the identity reference if supplied; transfer only painting style from the birth reference.', 'canonical',actor=actor)
for actor in ['mother','father','registrar','auditor']:
 add('canonical-'+actor,f'assets/illustrations/characters/{actor}.webp',f'Independent single-person vertical 4:5 bust portrait: {ACTORS[actor]}. Neutral expression, entire head in frame, softly blurred office background.', 'canonical',actor=actor)
for key,age in [('baby',0),('child',12),('middle',40),('mature',55),('old',70)]:
 subject = 'a newborn human baby, tiny dark black hair, asleep, safely swaddled in cream fabric, no adult body' if age == 0 else ('a 12-year-old human boy, tousled dark hair, brown eyes, simple peasant shirt, clearly childlike proportions, no armor' if age == 12 else f'the same human male protagonist as the identity reference, age {age}, with natural age-appropriate lines and graying dark hair, ordinary build, simple black robe')
 add('player-'+key,f'assets/illustrations/characters/protagonist_{key}.webp',f'Independent vertical 4:5 portrait of {subject}. Whole head comfortably inside frame, no other person. Natural neutral expression, warm quiet medieval home.', 'canonical',actor='player',age=age)
for actor in ['player','mina','erisia','king','auditor']:
 for stage,age in [('early',24),('middle',42),('mature',57),('old',72)]:
  for emotion,expression in [('joy','quietly joyful smile'),('sad','sad, gently downcast'),('angry','angry and determined, no violence'),('tired','tired, heavy eyelids'),('confused','confused and surprised'),('neutral','calm neutral')]:
   age_spec=f'age {age}, natural age-appropriate facial structure and lines'
   if actor=='king': age_spec=f'elderly monarch, visual maturity stage {stage}; keep the reference identity, gray hair and beard'
   add(f'{actor}-{stage}-{emotion}',f'art/portraits/{actor}-{stage}-{emotion}-v2.webp',f'Independent vertical 4:5 bust portrait. {ACTORS[actor]}. {age_spec}. Expression: {expression}. Same person as identity reference, same hair and eye colors, outfit and face identity remain fixed between emotions. A softly blurred single medieval room, no other people.', 'legacy-portrait',actor=actor,stage=stage,emotion=emotion)
paths=json.loads((ROOT/'docs/v4.5/actual-ending-paths.json').read_text(encoding='utf-8'))
ending_doc=(SOURCE/'docs/04_ENDING_PROMPTS_20.md').read_text(encoding='utf-8')
for section in ending_doc.split('\n## ')[1:]:
 heading=section.splitlines()[0]; eid=re.search(r'\((ending_[a-z0-9_]+)\)',heading).group(1)
 prompt=re.search(r'\*\*프롬프트:\*\* (.+)',section).group(1)
 scene=prompt.split('과밀 군중 금지. ')[-1].split(' 오류 방지:')[0]
 age=next(p['age'] for p in paths if p['endingId']==eid)
 add(eid,f'assets/illustrations/ending_v4_6/{eid}.webp',f'One complete independent 4:3 ending scene. Protagonist is an ordinary human man aged {age}, tousled black-brown hair with graying appropriate to age, brown eyes, no magic aura. If Mina appears she has LONG SILVER hair and BLUE eyes and is the same age cohort. Scene: {scene} Do not add Mina unless the scene explicitly calls for her. No legible writing. Age appropriately, no gratuitous crowd.', 'ending',endingId=eid,age=age)
event_doc=(SOURCE/'docs/03_EVENT_PROMPTS.md').read_text(encoding='utf-8')
for section in event_doc.split('\n## ')[1:]:
 heading=section.splitlines()[0]; found=re.search(r'\*\*프롬프트:\*\* (.+)',section)
 if not found: continue
 eid=heading.split(' — ')[0]
 if eid=='birth': continue
 scene=found.group(1).split('과밀 군중 금지. ')[-1].split(' 오류 방지:')[0]
 target={'mina_royal_hall':'assets/illustrations/event_cg_v4_5/cg_mina_royal_hall.webp','hearing':'assets/illustrations/event_cg_v4_5/cg_public_hearing.webp'}.get(eid,f'assets/illustrations/event_cg_v4_6/{eid}.webp')
 add('event-'+eid,target,f'One complete independent 4:3 event illustration. {scene} Protagonist: ordinary human man with black-brown hair and brown eyes; no magic power. Mina: long SILVER hair and BLUE eyes, blue/silver knight armor; at age12 both children with peasant clothes, not adult bodies. No crowd except the explicitly requested people. This is a single coherent scene, never a portrait crop.', 'event',nodeId=eid)
for name in ['forest','harbor','market','palace','prison','tavern','throne_room','village']:
 add('background-'+name,f'assets/illustrations/backgrounds/{name}.webp',f'Independent 4:3 medieval fantasy {name.replace("_"," ")} environment, warm quiet naturally lit painterly scene, no people, no readable signs or UI. Fully coherent environment, not a collage.', 'background')
add('background-main','art/background-v1.webp','Independent wide medieval fantasy village street at dusk, warm welcoming windows, slate rooftops, muted navy shadows, no people, no lettering. A quiet low-contrast complete background painting.','background')
with (OUT/'art-jobs.json').open('w',encoding='utf-8') as f: json.dump(jobs,f,ensure_ascii=False,indent=2); f.write('\n')
with (OUT/'art-inventory.csv').open('w',encoding='utf-8-sig',newline='') as f:
 fields=['path','bytes','width','height','sha256','status','replacementJob','nodeId','age','speakerId','choiceId','outcomeId','flags','preview','approval']
 w=csv.DictWriter(f,fieldnames=fields); w.writeheader()
 by_target={j['target']:j for j in jobs}
 for p in sorted((ROOT/'public').rglob('*.webp')):
  target=p.relative_to(ROOT/'public').as_posix(); job=by_target.get(target); im=Image.open(p)
  status='제작 예정' if job else ('UI 작은 아이콘·대상 제외' if '/ui/' in target or '/expressions/' in target else '종전 원화·연결 조사 후 신규 전용 그림으로 교체/보관')
  if target.endswith('cg_birth_registry.webp'): status='승인된 동일 원화 최적화본으로 복원'
  w.writerow(dict(path=target,bytes=p.stat().st_size,width=im.width,height=im.height,sha256=hashlib.sha256(p.read_bytes()).hexdigest(),status=status,replacementJob=job['id'] if job else '',nodeId=job.get('nodeId','') if job else '',age=job.get('age','') if job else '',speakerId=job.get('actor','') if job else '',choiceId='bring_mina' if 'royal_hall' in target else '',outcomeId='out_bring_mina' if 'royal_hall' in target else '',flags='mina_witness' if 'royal_hall' in target else '',preview=target,approval='미제작·미검수'))
print(f'{len(jobs)} independent artwork jobs; live WebP inventory recorded before replacement')
