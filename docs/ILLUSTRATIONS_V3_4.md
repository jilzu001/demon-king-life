# v3.4 본문 일러스트 적용

먼저 `CODEX_APPLY_V3_4_MAIN_SCREEN.md`, 선행 v3.3 적용/집필 문서와 `assets/main_screen_illustration_policy.json`을 읽었다. 현재 공개 앱은 v2.6 축소판(원본 버전 `2.2.0-compact`, 13사건/28선택/7엔딩)이다. ZIP의 문서는 16개 핵심 사건과 하이브리드 엔진이 이미 적용됐다고 전제한다. 최신 지시의 **기존 스토리 JSON·분기·저장 스키마 보호**에 따라 이번 공개 반영은 화면 프레젠테이션과 이미지에 한정했다. ZIP의 다른 스토리로 현재 회차를 교체하지 않았다.

`spec/content-v3.4-illustrated/`에 통합 ZIP을 보존했다. `assets.json`의 경로/규격을 단일 원본으로 사용하며 45개 WebP를 바이트 변경 없이 `public/assets/illustrations/`에 복사했다. 총 562,860바이트(약550KiB). 실제 연결 이미지 6개는 합계110,156바이트(약108KiB)이며 필요한 장면에서만 로딩한다. 매니페스트/정책은 빌드에 포함하고, 그림 경로는 Vite BASE_URL에 연결해 GitHub Pages 하위 경로도 지원한다.

## 실제 연결

| 기존 사건/결말 | 그림 | 위치/근거 |
| --- | --- | --- |
| birth, child, quiet | village | 마을 도입 문단 뒤 |
| exam | mina | 실기 시험의 미나 등장 문단 뒤 |
| prison | prison | 판결 뒤 ‘감옥에서’ 문단 다음 |
| princess | elysia | 에리시아 등장 문단 뒤; 파일의 공식 라벨 확인 |
| hearing | mina | 미나가 증인석에서 일어서는 문단 뒤 |
| ending_peace | final_sunset | 노을 결말 서술 다음 |
| ending_throne | royal_trial | 국왕 대면 결말 서술 다음 |

그림의 실제 내용을 열어 확인했다. `royal_trial`에는 국왕이 있으므로 국왕이 등장하지 않는 보통 재판에 배치하지 않았다. `mina_romance`의 친밀한 장면은 선택 전 성공을 암시할 수 있고 현재 판에 해당 고백 사건이 없으므로 연결하지 않았다. 인물 별칭을 정사 NPC로 추가하거나 상단의 기존 연령·감정 초상화를 교체하지 않았다. audit, petition, invoice, settlement, final_trial, office 등에는 본문만 표시한다.

## 화면/읽기 보호

- 원문 문단 뒤에 figure를 하나만 삽입하고 본문·대사·선택 문구는 변경하지 않는다. 최근 연대기·대사 카드·선택 버튼에는 이미지를 넣지 않는다.
- 그림을 본문 흐름 안에 배치한다. PC 최대680×360px, 모바일 세로 최대480×240px, 실제 화면에서는 더 작게 제한한다. `object-fit:contain`, 원본 aspect-ratio와 width/height로 공간을 예약하며 강제 크롭을 하지 않는다.
- 스크롤 방식은 해당 문단과 그림을 함께 공개한다. 그림 전용 클릭 단계를 추가하지 않아 클릭당 한 문단/느린 자동 표시/일시정지/스킵을 유지한다.
- 페이지 방식은 즉시 표시하고 자동 스크롤하지 않는다. 실제 페이지 높이에 맞춰 그림을 줄이고 이미지 실패로 프레임이 제거될 때 페이지 수를 재측정한다.
- 로딩 실패는 그림 프레임만 제거해 텍스트/선택/저장을 계속한다. 첫 도입 이미지만 eager, 나머지는 lazy/async. 외부 이미지 서비스/AI API 호출 없음.
- 사용자의 최신 요청으로 **PC와 모바일 세로 화면만** 최적화한다. 추가했던 가로 전용 상태판 재배치는 제거했다.

## 검증과 실패 기록

`npm run check`의 단위111개, 콘텐츠/전수 분기, 브라우저98개를 실행했다. 처음 브라우저92개가 통과하고 6개가 테스트 전제 불일치로 실패했다. (1) 현재 판 첫 문단은 원래 즉시 공개되므로 그림도 함께 보여야 함, (2) 내려둔 선택 팝업은 표시 방식 변경 후에도 닫힌 상태로 유지함, (3) 신뢰된 일러스트와 본문 HTML 삽입 공격을 구분해야 함. 기대값/실제 조작 경로를 수정했고 해당6개 PC·모바일 재검사는 모두 통과했다. HTML 공격은 `.story-paragraph img` 없음/스크립트 미실행을 계속 검증한다. 검사 비활성화나 게임 엔진 수정은 하지 않았다.

이미지 비율 검사의 첫 실패는 `HTMLImageElement.width/height`가 CSS 크기를 정수로 반올림하는 데서 발생했다. 원본 width/height 속성과 실제 float 좌표를 비교하도록 측정 방식을 수정했다. 낮은 가로 화면의 본문 공간 부족도 발견했으나 사용자가 가로 지원을 제외했으므로 해당 추가 변경을 제거했다.

타입/콘텐츠/전수 분기/빌드가 통과했다. 기존 전체 원작98사건/34엔딩 도달 결과와 현재 판13사건/7엔딩/147종단 경로는 같다. 기존 JSON 5개와 신규 이미지45개는 원본 바이트 일치 검사로 보호한다.

실제 빌드 검수 명령:

```powershell
npx tsx scripts/verify-illustrations-ui.ts http://127.0.0.1:4175/ --screenshots
```

PC1280×900, 모바일 세로320×568/360×800/390×844/430×932, 글자150%, 스크롤/페이지 양쪽에서 출생·시험·감옥·재판·그림 없는 감사 사건·노을/국왕 결말 총70개 조합을 검사한다. 페이지의 모든 글자를 Range 좌표로 확인해 누락/중복 없이 한 번씩 보이는지, 이미지 전체 노출/비율/실제 로딩/선택 팝업/문서 넘침/원장 불변을 검사한다. 실제 휴대기기와 Safari/Firefox 검사는 포함하지 않는다.

## 공개 배포 확인

- 반영 커밋 `61194d948f4d0daff1677efdff3320bf48f75f12`. Actions [38552287323](https://github.com/jilzu001/demon-king-life/actions/runs/38552287323)의 build/deploy가 모두 성공했다. Ubuntu/Chromium에서 단위111개+브라우저98개=209개와 타입/콘텐츠/전수 분기/빌드를 전부 통과했다.
- [실제 플레이 주소](https://jilzu001.github.io/demon-king-life/)에 위 검수 스크립트를 실행해70개 PC/모바일 세로 조합 모두 종료코드0으로 통과했다. 공개 이미지45개와 기존 JSON5개도 각각 HTTP200 및 로컬 원본 바이트 일치를 확인했다.
- 로컬 빌드에서도 같은70개 검수가 통과했다. 마지막 수정 뒤 관련 PC/모바일14개 검사도 통과했다. Windows PowerShell5.1의 `Start-Game.ps1 -NoBrowser` 종료코드0으로 기존 바탕화면 서버 연결을 확인했다.

## 미연결 에셋39개

`protagonist, king, seria, rina, kyle, jero, yuri, rao, dark_nun, palace, market, tavern, forest, harbor, throne_room, mina_romance, royal_banquet, demon_protest, mina_retirement, second_demon, queens_letter, neutral, surprised, happy, embarrassed, angry, sad, thinking, confused, smug, tired, affection, reputation, money, unlock, save, settings, achievements, return_title`.

현재 사건과 맞지 않는 CG/장소/별칭 인물, 기존 초상화/아이콘 기능을 대체할 필요가 없는 이미지다. 임의의 장면을 새로 만들어 그림을 노출하지 않았다. 동봉65개 확장 사건과 시험 고백 3개 노드를 적용 완료했다고 보고하지 않는다.

## 이전 하이브리드 엔진 작업

진행 중이던 v2.9 엔진 변경은 `integration/hybrid-v2-9`의 `a258e58`에 보존해 이번 안정된 화면 배포와 분리했다. 2026-10-14 사용자는 로엔 조건 `ending_execution` → `ending_throne` 연결을 승인했다. `src/content/hybrid-aliases.ts`에 원본 엔딩/조건 ID를 변경하지 않는 읽기 별칭을 기록한다. 현재 공개 스토리에는 로엔 사건이 없으므로 이번 일러스트만의 배포가 해금 사건을 새로 활성화하지 않는다.

승인 뒤 해당 작업 브랜치의 `3d518af`에서 실제 사건 레지스트리의 기본 별칭까지 연결했다. 적격 다음 회차/20세에는 로엔을 선택하고 첫 회차/다른 엔딩/12세에는 제외되는 두 테스트와 타입/단위110개가 통과했다. 이 엔진 작업본은 아직 공개 배포하지 않았다.
