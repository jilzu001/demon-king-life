"""직접 본 비교 시트의 판정과 파일 증거를 합쳐 전수 검수표를 만든다."""
import csv
import hashlib
import json
from collections import Counter
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
source = root / 'spec/content-v3.7-visual-audit'
manifest = json.loads((source / 'assets/assets.json').read_text(encoding='utf-8'))['assets']
inventory = json.loads((source / 'audit/VISUAL_ASSET_INVENTORY_V3_7.json').read_text(encoding='utf-8'))['assets']
rows = []
def add(path, public, actor, status, screen, action, reason, sheet):
    image = Image.open(path)
    rows.append(dict(file=str(path.relative_to(root)).replace('\\', '/'), publicPath=public,
        width=image.width, height=image.height, bytes=path.stat().st_size,
        sha256=hashlib.sha256(path.read_bytes()).hexdigest(), actor=actor, status=status,
        screens=screen, action=action, reason=reason, evidence=sheet))

baseline = {
    'protagonist': ('주인공', '검은 뾰족머리/갈색 계열 눈/검은 제복. 기본 신원 표식으로만 사용; 연령별 장면 CG 아님.'),
    'mina': ('미나', '은회색 머리/옆 땋은 머리/차가운 청회색 눈/검정·은색 갑옷의 동일 원본. 어린이·노년 변형 승인 없음.'),
    'elysia': ('에리시아(erisia)', '금발/청록 계열 눈/붉은색·흰색 왕실 의상/왕관. 이름 별칭과 원본 인물 대조.'),
    'king': ('국왕', '흰 수염/금색 왕관/털 장식 왕실 망토. 다른 시트의 국왕 얼굴은 별도 승인하지 않음.'),
}
bindings = {'protagonist': '왼쪽 상태창·ending_peace', 'mina': '대사 상태창·child/exam/hearing/confession/afterm/chaos 본문·실제 미나 사건 회상',
    'elysia': '에리시아 대사 상태창·princess 본문', 'king': 'ending_throne',
    'village': 'birth/quiet 본문', 'prison': 'prison 본문'}
event_reasons = {
    'mina_wooden_sword': ('미나 추정', 'FAIL', '따뜻한 갈색 눈/풀어진 머리와 얼굴이 기준 청회색 눈·옆 땋은 머리와 불일치. 12세 동일 인물·갑옷 설정 미확정.'),
    'mina_romance': ('미나·주인공 추정', 'UNKNOWN', '애정 행동/얼굴/나이가 현재 선택 결과에 일치한다는 근거 없음. 고백 성공 그림으로 사용 금지.'),
    'mina_retirement': ('미나 추정', 'UNKNOWN', '노년 동일 인물의 얼굴·의상 변화 승인 근거 없음.'),
    'royal_trial': ('국왕·주인공 추정', 'UNKNOWN', '기준 얼굴/의상의 동일성 불확실. 처형 결과에 임의 연결하지 않음.'),
    'final_sunset': ('주인공 추정', 'UNKNOWN', '등을 보인 얼굴/나이 불명 인물. 60세 결말 인물이라는 증거 부족.'),
}
for asset in manifest:
    aid, cat, path = asset['id'], asset['category'], asset['path']
    actual = root / 'public' / path
    assert actual.read_bytes() == (source / path).read_bytes()
    if aid in baseline:
        actor, reason = baseline[aid]; status = 'PASS'; action = '검증된 기본 초상화로 통일'
    elif cat in ['backgrounds', 'ui']:
        actor, status = '특정 인물 없음', 'PASS'
        reason = '배경/기호 자체 검수 통과. 특정 인물의 신원/나이 증거로 쓰지 않음.'
        action = '관련 화면만 사용' if aid in bindings else '파일 보존·미연결'
    elif cat == 'characters':
        actor, status, action = asset['label'] + '(공개 판 인물 미대응)', 'UNKNOWN', '미연결'
        reason = '캐릭터 시트 그림은 확인했으나 현재 스토리 actor ID/설정과의 대응 근거 없음. 레온·감사관으로 재명명 금지.'
    elif cat == 'expressions':
        actor, status, action = '공용 표정 시트 인물 미확정', 'UNKNOWN', 'NPC 대용 금지·미연결'
        reason = '다른 조각/글자 일부가 포함된 공용 시트. 이름 있는 캐릭터의 얼굴로 검증되지 않음.'
    else:
        actor, status, reason = event_reasons.get(aid, ('다수/미확정 인물', 'UNKNOWN', '직접 검수했으나 기준 인물의 얼굴/의상/나이와 실제 방문 결과를 확정할 수 없음.'))
        action = 'child는 기준 미나 초상화로 대체' if aid == 'mina_wooden_sword' else '기준 초상화로 대체' if aid in ['royal_trial', 'final_sunset'] else '미연결'
    add(actual, path, actor, status, bindings.get(aid, '공개 화면 미연결'), action, reason, 'docs/v37-review/provided-1~5.png')

for item in inventory:
    path = item['path']
    if not path.startswith('assets/flashback/'):
        continue
    reason = '얼굴/나이/집단 구성 또는 실제 방문 사건·선택 결과와의 대응을 확인할 수 없음. 포스터의 예시 나이는 정식 설정이 아님.'
    if 'childhood' in path:
        reason = '회색 머리 소녀의 눈/헤어 실루엣이 기준 미나와 불일치. 검증된 12세 CG 없음.'
    add(source / path, '', '미나/주인공/친구들 추정·미확정', 'UNKNOWN', '회상 연결 보류',
        'spec 보관·실제 기록 텍스트/기호/기준 초상화로 회상 유지', reason, 'docs/v37-review/provided-1~5.png')

for path in sorted((root / 'public/art/portraits').glob('*.webp')):
    actor = path.name.split('-')[0]
    fail = actor in ['mina', 'player']
    reason = {'mina': '붉은 짧은 머리/실사 얼굴/검은 갑옷. 은회색 머리·청회색 눈의 기준 미나와 불일치.',
        'player': '갈색 계열 실사 얼굴/헤어와 기준 검은 뾰족머리 웹툰 얼굴이 불일치.',
        'erisia': '금발 땋은 머리/이마 장신구/흰·청색 의상과 기준 붉은·흰 의상 얼굴의 동일성 미확정.',
        'king': '갈색/검은 수염·로브와 기준 흰 수염/왕실 망토의 나이·얼굴 변화 승인 없음.',
        'auditor': '안경 쓴 여성 실사 초상화. 현 감사관과 동일 인물이라는 공식 기준 이미지/나이 자료 없음.'}[actor]
    add(path, str(path.relative_to(root / 'public')).replace('\\', '/'), actor, 'FAIL' if fail else 'UNKNOWN',
        '공개 판 연결 중단·보관 원작 전용 자산 유지', '삭제 없이 기준 초상화로 대체; 감사관은 배경', reason,
        f'docs/v37-review/legacy-{actor}.png')
add(root / 'public/art/background-v1.webp', 'art/background-v1.webp', '인물 없음', 'PASS', '타이틀·내레이션 오른쪽 배경',
    '원본 크기 이하 contain 유지', '인물 없는 성곽/마당. NPC 대사를 묘사하지 않음.', '원본 직접 열람')
assert len(rows) == 177
counts = dict(Counter(row['status'] for row in rows))
report = dict(date='2026-10-15', scope='공개 이미지167개 + 신규 회상 원본10개; 중복 ZIP 동일 바이트는 재집계하지 않음',
    images=len(rows), counts=counts, canonicalAgeEmotionVariants='미승인·현재 기본 초상화만 사용',
    symbolicArt='compact-ending.ts의10개 SVG는 얼굴 없는 기호. 실제 기록 문구와 함께 유지. 래스터177개와 별도.', rows=rows)
report['symbolicAssets'] = [dict(file=f'src/ui/compact-ending.ts#{key}', actor='특정 인물 없음', status='PASS',
    screens='실제 사건 회상/마지막 엔딩 카드', action='얼굴 없는 기호로 유지', reason='벡터 선 그림. 나이/감정/동일 얼굴을 주장하지 않음.')
    for key in ['silhouette', 'sunset', 'scroll', 'office', 'stairs', 'fire', 'crown', 'book', 'bars', 'sword']]
(root / 'docs/V3_7_VISUAL_AUDIT.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
with (root / 'docs/V3_7_VISUAL_AUDIT.csv').open('w', newline='', encoding='utf-8-sig') as file:
    writer = csv.DictWriter(file, fieldnames=list(rows[0]), lineterminator='\n'); writer.writeheader(); writer.writerows(rows)
print(json.dumps(dict(images=len(rows), counts=counts), ensure_ascii=False))
